import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ImagePlus, Loader2, RotateCcw, MessageSquare, Undo2 } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { productAiChatApi, type ProductChatMessage } from '../../lib/productAiChatApi';
import { applyProductAiOps, buildAiForm, photoRefs, type AiFormAccess } from '../../lib/productAiApply';
import { htmlToText } from './ProductFormKit';
import { useAuthStore } from '../../store/authStore';
import { viewerOf } from '../../lib/useStaffAccess';
import { canOpenPath } from '../../lib/staffPermissions';

const AI_CREDITS_PAGE = '/vendor/ai-automation/ai-chat-bot';
/** What the browser sends back of the conversation: the last few turns are enough for follow-ups. */
const HISTORY = 8;

function isOutOfCredits(e: unknown): boolean {
  const res = (e as { response?: { status?: number; data?: { code?: string } } })?.response;
  return res?.status === 402 && res.data?.code === 'AI_CREDITS_EMPTY';
}

interface ChatLine {
  id: number;
  role: 'user' | 'assistant' | 'info';
  text: string;
  /** Small pictures of photos just added, each with the name the assistant uses (P3...). */
  thumbs?: { src: string; ref: string }[];
  /** What this answer changed in the form. */
  filled?: string[];
  /** Things the assistant could not do. */
  notes?: string[];
  /** Set on the latest answer only: puts the form back as it was. */
  undo?: () => void;
}

const EXAMPLES = ['Write a description', 'Add sizes S, M, L, XL', 'Suggest search words'];

/**
 * Add/Edit Product's AI chat (under Status). The seller says what they want or adds photos and the assistant changes the open form:
 * every text field, price and stock, the variations (sizes, colours, any option) with each variation's own price, stock and photo,
 * the photos themselves, and the status. A photo added in the chat gets a name (P3...) the seller can refer to ("P3 is the blue one,
 * price 340"). Nothing is saved: the form is only filled in, the latest answer can be undone, and the seller presses Save. The server
 * (ProductAiChatService) refuses a price, stock or brand the seller never said and only deletes when asked. Paid in AI Credits.
 */
export function ProductAiChat({
  getAccess,
  photosUploading,
  onAddPhotos,
}: {
  /** The form as it is right now: its values, its setters and its photo list. Called when a message is sent and when its answer arrives. */
  getAccess: () => AiFormAccess;
  photosUploading: boolean;
  onAddPhotos: (files: FileList) => void;
}) {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  // True while photos added here wait to be shown to the assistant (lets the seller press send with no text).
  const [hasNew, setHasNew] = useState(false);
  const history = useRef<ProductChatMessage[]>([]);
  const notesByUrl = useRef(new Map<string, string>());
  // Photos added through this chat that the assistant has not seen yet (they are "new" for it).
  const newIds = useRef(new Set<string>());
  const idsBeforeAdd = useRef<Set<string> | null>(null);
  const nextId = useRef(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const listEnd = useRef<HTMLDivElement>(null);
  // The page's access changes every render (it reads the live form); an answer arrives later, so always call the newest one.
  const accessRef = useRef(getAccess);
  accessRef.current = getAccess;

  const photos = getAccess().values.photos;
  // Spot the photos that just appeared after the seller added files here.
  useEffect(() => {
    const before = idsBeforeAdd.current;
    if (!before) return;
    const added = accessRef.current().values.photos.filter((p) => !before.has(p.id));
    if (added.length === 0) return;
    for (const p of added) newIds.current.add(p.id);
    idsBeforeAdd.current = null;
    setHasNew(true);
  }, [photos]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [lines, busy]);

  const push = (line: Omit<ChatLine, 'id'>) => setLines((prev) => [...prev.map((l) => ({ ...l, undo: undefined })), { ...line, id: nextId.current++ }]);
  const canBuy = canOpenPath(viewerOf(useAuthStore.getState().user), AI_CREDITS_PAGE);

  const send = async (override?: string) => {
    const typed = (override ?? text).trim();
    if (busy || photosUploading) return;
    const hasNew = newIds.current.size > 0;
    const content = typed || (hasNew ? 'Here is the new photo. Use what you can from it.' : '');
    if (!content) return;
    setError(null);
    setOutOfCredits(false);
    setText('');
    push({ role: 'user', text: content });
    history.current = [...history.current, { role: 'user' as const, content }].slice(-HISTORY);
    setBusy(true);

    const access = accessRef.current();
    const { list, map } = photoRefs(access.values.photos, newIds.current, notesByUrl.current);
    const form = buildAiForm(access.values, access.categories, map, htmlToText);
    const categories = access.categories.map((c) => ({ name: c.name, parent: c.parentId ? access.categories.find((p) => p.id === c.parentId)?.name : undefined }));

    try {
      const answer = await productAiChatApi.chat({ messages: history.current, form, categories, photos: list });
      for (const n of answer.photoNotes) notesByUrl.current.set(n.url, n.note);
      // Every photo was shown to the assistant now (looked at or not): they are no longer new.
      newIds.current.clear();
      setHasNew(false);
      const result = answer.ops.length > 0 ? applyProductAiOps(answer.ops, map, accessRef.current()) : null;
      history.current = [...history.current, { role: 'assistant' as const, content: answer.reply || 'Done.' }].slice(-HISTORY);
      push({
        role: 'assistant',
        text: answer.reply,
        filled: result?.labels,
        notes: [...new Set([...answer.notes, ...(result?.notes ?? [])])],
        undo: result && result.labels.length > 0 ? result.undo : undefined,
      });
    } catch (e) {
      if (isOutOfCredits(e)) setOutOfCredits(true);
      else setError(apiErrorMessage(e, "The assistant couldn't answer. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const clear = () => {
    setLines([]);
    setError(null);
    setOutOfCredits(false);
    history.current = [];
    notesByUrl.current = new Map();
    newIds.current = new Set();
    setHasNew(false);
  };

  const pickPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const images = Array.from(files).filter((f) => /^image\/(jpe?g|png|webp|gif)$/.test(f.type));
    if (images.length === 0) return;
    const first = accessRef.current().values.photos.length;
    idsBeforeAdd.current = new Set(accessRef.current().values.photos.map((p) => p.id));
    onAddPhotos(files);
    // New photos go to the end of the gallery, so their names follow the current count.
    const thumbs = images.slice(0, 6).map((f, i) => ({ src: URL.createObjectURL(f), ref: `P${first + i + 1}` }));
    push({
      role: 'info',
      text: `${images.length} ${images.length === 1 ? 'photo' : 'photos'} added to the product. Tell me about ${images.length === 1 ? 'it' : 'them'}, for example: "${thumbs[0].ref} is the blue one, price 340, stock 5".`,
      thumbs,
    });
  };

  const canSend = !busy && !photosUploading && (text.trim().length > 0 || hasNew);

  return (
    <section className="rounded-xl border border-line bg-white p-4" aria-label="AI assistant">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-regantify-text">
          <MessageSquare size={15} className="text-brand" aria-hidden />
          AI assistant
        </h2>
        {lines.length > 0 && (
          <button type="button" onClick={clear} title="Start a new chat" className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-regantify-text">
            <RotateCcw size={12} aria-hidden />
            New chat
          </button>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="space-y-2.5">
          <p className="text-sm text-neutral-600">
            Tell me about the product, or add photos. I can fill in and change anything on this page: text, price, stock, sizes and colours (each with its own price, stock and photo), photos and status. You check it and save.
          </p>
          <p className="text-xs text-neutral-500">Try: “cotton panjabi, M L XL, white and blue, price 1200”, or add a photo and say “add it as a variant, price 340, stock 5”.</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => void send(ex)}
                disabled={busy || photosUploading}
                className="rounded-full border border-line bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1" role="log" aria-live="polite">
          {lines.map((l) =>
            l.role === 'info' ? (
              <div key={l.id} className="space-y-1.5 text-center">
                {l.thumbs && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {l.thumbs.map((t) => (
                      <span key={t.ref} className="relative inline-block h-11 w-11 overflow-hidden rounded-md border border-line bg-neutral-100">
                        <img src={t.src} alt="" className="h-full w-full object-cover" />
                        <span className="absolute bottom-0 left-0 rounded-tr bg-neutral-900/80 px-1 text-[10px] font-semibold leading-tight text-white">{t.ref}</span>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-neutral-500">{l.text}</p>
              </div>
            ) : l.role === 'user' ? (
              <div key={l.id} className="flex justify-end">
                <p className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-lime/40 px-3 py-2 text-sm text-regantify-text">{l.text}</p>
              </div>
            ) : (
              <div key={l.id} className="max-w-[94%] space-y-1.5">
                {l.text && <p className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-neutral-100 px-3 py-2 text-sm text-regantify-text">{l.text}</p>}
                {l.filled && l.filled.length > 0 && (
                  <p className="px-1 text-xs text-emerald-700">
                    Changed: {l.filled.join(', ')}.{' '}
                    {l.undo && (
                      <button type="button" onClick={l.undo} className="inline-flex items-center gap-0.5 font-medium text-neutral-600 underline hover:text-regantify-text">
                        <Undo2 size={11} aria-hidden />
                        Undo
                      </button>
                    )}
                  </p>
                )}
                {l.notes?.map((n) => (
                  <p key={n} className="px-1 text-xs text-amber-700">
                    {n}
                  </p>
                ))}
              </div>
            ),
          )}
          {busy && (
            <p className="flex items-center gap-1.5 px-1 text-xs text-neutral-500">
              <Loader2 size={13} className="animate-spin" aria-hidden />
              Working on it…
            </p>
          )}
          <div ref={listEnd} />
        </div>
      )}

      {outOfCredits && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Your store is out of AI Credits, so the assistant can&apos;t answer right now.{' '}
          {canBuy ? (
            <Link to={AI_CREDITS_PAGE} className="font-medium underline">
              Get more credits
            </Link>
          ) : (
            'Ask the store owner to add more.'
          )}
        </p>
      )}
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      <div className="mt-3 flex items-end gap-1.5">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => {
            pickPhotos(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          title="Add photos to this product"
          aria-label="Add photos"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-neutral-600 hover:bg-neutral-50"
        >
          <ImagePlus size={16} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          onKeyDown={onKey}
          rows={2}
          placeholder="Describe the product…"
          aria-label="Message to the AI assistant"
          className="min-h-9 flex-1 resize-none rounded-lg border border-line px-2.5 py-1.5 text-sm text-regantify-text placeholder:text-neutral-400 focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          title={photosUploading ? 'Wait for the photo to finish uploading' : 'Send'}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-400">Uses AI Credits. It only fills the form: you check it and press Save.</p>
    </section>
  );
}
