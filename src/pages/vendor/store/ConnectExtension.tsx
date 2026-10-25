import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, KeyRound, MessageSquareText, ShieldCheck, ShoppingCart, Sparkles, Trash2, Zap } from 'lucide-react';
import { InstantCheckoutDialog } from '../../../components/order/InstantCheckoutDialog';
import { InstantLinksList } from '../../../components/order/InstantLinksList';
import { EmptyState, PageHeader, PageSection, PillTabs, SearchBox, TableFooter, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Dialog } from '../../../components/ui/Dialog';
import { chatExtensionApi, type ChatRecord, type ChatRecordEdit, type ChatRecordPhoto } from '../../../lib/chatExtensionApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';

const inputClass = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:border-brand focus:outline-none';
const SOURCE_LABEL: Record<ChatRecord['source'], string> = { FB_MESSAGES: 'Messenger', BUSINESS_INBOX: 'Business inbox', WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', OTHER: 'Chat' };
const RETENTION_CHOICES = [7, 30, 60, 90, 180, 365];

// Store > Connect Extension: everything about the Chat order saver extension in one page (the user's rule, 2026-10-23;
// it was Orders > Chat orders, which now redirects to the "chats" tab). The tab is kept in ?tab= so links can open one.
type ExtensionTab = 'connect' | 'settings' | 'chats' | 'links';
const EXTENSION_TABS: { id: ExtensionTab; label: string }[] = [
  { id: 'connect', label: 'Connect' },
  { id: 'settings', label: 'AI and privacy' },
  { id: 'chats', label: 'Saved chats' },
  { id: 'links', label: 'Checkout links' },
];

/** Install steps per browser: the same zip works in Chrome and Microsoft Edge (both run Chrome extensions). */
type InstallBrowser = 'chrome' | 'edge';
const INSTALL_STEPS: Record<InstallBrowser, { label: string; page: string; steps: string[] }> = {
  chrome: {
    label: 'Chrome',
    page: 'chrome://extensions',
    steps: [
      'Turn on “Developer mode” at the top right.',
      'Press “Load unpacked” and pick the unzipped folder.',
      'Pin it: press the puzzle icon in the toolbar, then the pin beside Regantify.',
    ],
  },
  edge: {
    label: 'Microsoft Edge',
    page: 'edge://extensions',
    steps: [
      'Turn on “Developer mode” (on the left side of the page, at the bottom).',
      'Press “Load unpacked” and pick the unzipped folder.',
      'Pin it: press the puzzle icon in the toolbar, then the eye icon beside Regantify (“Show in toolbar”).',
    ],
  },
};

/**
 * Downloading the extension: the zip lives on R2 (uploaded with `npm run ext:upload` in server/), so a store installs it
 * with "Load unpacked" in Chrome or Edge until it is on the browsers' web stores.
 */
function DownloadCard() {
  const { data: download, isLoading } = useQuery({ queryKey: ['chat-extension-download'], queryFn: chatExtensionApi.download, staleTime: 5 * 60_000 });
  const [browser, setBrowser] = useState<InstallBrowser>(() => (/\bEdg\//.test(navigator.userAgent) ? 'edge' : 'chrome'));
  const guide = INSTALL_STEPS[browser];

  return (
    <div className="rounded-xl border border-line p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-regantify-text">
        <Download size={16} aria-hidden /> Download the extension
      </h2>
      <p className="mt-1 text-xs text-neutral-600">One file for Google Chrome and Microsoft Edge on a computer. It doesn't work on phones.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {download ? (
          <>
            <a href={download.url} download className={primaryBtn}>
              <Download size={15} aria-hidden /> Download for Chrome and Edge
            </a>
            <span className="text-xs text-neutral-500">
              Version {download.version}
              {download.size ? ` · ${Math.max(1, Math.round(download.size / 1024))} KB` : ''}
              {download.uploadedAt ? ` · updated ${formatDhakaDateTime(download.uploadedAt)}` : ''}
            </span>
          </>
        ) : (
          <p className="text-sm text-neutral-500">{isLoading ? 'Checking for the download…' : 'The download is not ready yet. Please try again later or contact support.'}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h3 className="mr-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">How to install it in</h3>
        {(Object.keys(INSTALL_STEPS) as InstallBrowser[]).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBrowser(b)}
            aria-pressed={browser === b}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${browser === b ? 'border-brand bg-brand/5 text-regantify-text' : 'border-line text-neutral-600 hover:text-regantify-text'}`}
          >
            {INSTALL_STEPS[b].label}
          </button>
        ))}
      </div>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-neutral-600">
        <li>Download the file above and unzip it (right click › Extract All). Keep the folder; {guide.label} uses it from there.</li>
        <li>
          In {guide.label}, open{' '}
          <button
            type="button"
            className="font-mono text-regantify-text underline decoration-dotted"
            title="Copy"
            onClick={() => navigator.clipboard.writeText(guide.page).then(() => toast.success('Copied. Paste it in the address bar.'))}
          >
            {guide.page}
          </button>{' '}
          (type or paste it in the address bar; a website can't open it for you).
        </li>
        {guide.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
        <li>When a new version comes, download it again, unzip it over the same folder and press the reload button on the extension's card.</li>
      </ol>
    </div>
  );
}

/** Linking the Chrome extension: a one-time code and the browsers already linked. */
function ConnectCard() {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const { data: status } = useQuery({ queryKey: ['chat-extension-status'], queryFn: chatExtensionApi.status });
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const pair = useMutation({
    mutationFn: chatExtensionApi.pairCode,
    onSuccess: (c) => setCode(c),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not make a code. Please try again.')),
  });
  const revoke = useMutation({
    mutationFn: chatExtensionApi.revokeDevice,
    onSuccess: () => {
      toast.success('The browser is disconnected.');
      void queryClient.invalidateQueries({ queryKey: ['chat-extension-status'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect it.')),
  });

  return (
    <div className="rounded-xl border border-line p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-regantify-text">
        <KeyRound size={16} aria-hidden /> Connect the extension
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-neutral-600">
        <li>Install the Regantify Chat Order Saver in Chrome or Edge (download it above).</li>
        <li>Press “Make a pairing code” below and type the code into the extension (it works once, for 10 minutes).</li>
        <li>
          Open a customer chat on Messenger (facebook.com/messages or messenger.com), the Meta Business Suite inbox, Instagram Direct, TikTok messages or WhatsApp Web, then click the
          Regantify tab on the right edge (or press Alt+Shift+R) to open the side panel. Nothing is read until you press “Read this chat”.
        </li>
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className={primaryBtn} onClick={() => pair.mutate()} disabled={pair.isPending}>
          Make a pairing code
        </button>
        {code && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-brand bg-brand/5 px-3 py-1.5">
            <span className="font-mono text-lg font-semibold tracking-widest text-regantify-text">{code.code}</span>
            <button
              type="button"
              className="text-neutral-500 hover:text-regantify-text"
              aria-label="Copy the code"
              onClick={() => navigator.clipboard.writeText(code.code).then(() => toast.success('Code copied.'))}
            >
              <Copy size={15} />
            </button>
            <span className="text-xs text-neutral-500">works until {formatDhakaDateTime(code.expiresAt)}</span>
          </div>
        )}
      </div>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Linked browsers</h3>
      {!status?.devices.length ? (
        <p className="mt-1 text-sm text-neutral-500">No browser is linked yet.</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {status.devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="font-medium text-regantify-text">{d.name}</span>
              <span className="text-xs text-neutral-500">
                linked by {d.linkedBy} · {formatDhakaDateTime(d.createdAt)}
                {d.lastUsedAt ? ` · last used ${formatDhakaDateTime(d.lastUsedAt)}` : ''}
              </span>
              {/* The server lets the owner disconnect any browser and everyone else only their own. */}
              <button type="button" className={`${outlineBtn} ml-auto`} onClick={() => revoke.mutate(d.id)} disabled={revoke.isPending} title={isOwner ? undefined : 'You can disconnect your own browser'}>
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** What is collected, how long it is kept, and the owner's export / delete-all. */
function PrivacyCard() {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const { data: status } = useQuery({ queryKey: ['chat-extension-status'], queryFn: chatExtensionApi.status });
  const [confirmAll, setConfirmAll] = useState(false);
  const save = useMutation({
    mutationFn: chatExtensionApi.updateSettings,
    onSuccess: () => {
      toast.success('Saved.');
      void queryClient.invalidateQueries({ queryKey: ['chat-extension-status'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  const removeAll = useMutation({
    mutationFn: chatExtensionApi.removeAll,
    onSuccess: (r) => {
      toast.success(`${r.deleted} saved chats deleted.`);
      setConfirmAll(false);
      void queryClient.invalidateQueries({ queryKey: ['chat-records'] });
      void queryClient.invalidateQueries({ queryKey: ['chat-extension-status'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete them.')),
  });
  const download = async () => {
    try {
      const data = await chatExtensionApi.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `saved-chats-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not download them.'));
    }
  };

  return (
    <div className="rounded-xl border border-line p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-regantify-text">
        <ShieldCheck size={16} aria-hidden /> Privacy and data
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-neutral-600">
        <li>The extension reads only the chat open on your screen, only when you press a button, and only the last {status?.messageLimit ?? 30} messages already loaded in it (it never scrolls to load older ones).</li>
        <li>You see and can edit everything before it is sent. It never clicks, types or sends anything on Facebook or WhatsApp.</li>
        <li>Saved: customer name, phone, address, items and note (phone, address and messages are encrypted).</li>
        <li>“Suggest reply” sends the messages to our AI provider (Anthropic) with phone numbers and addresses hidden. Nothing from it is saved.</li>
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="chat-retention" className="text-neutral-700">
          Delete saved chats after
        </label>
        <select
          id="chat-retention"
          value={status?.retentionDays ?? 90}
          disabled={!isOwner || save.isPending}
          onChange={(e) => save.mutate({ retentionDays: Number(e.target.value) })}
          className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
        >
          {RETENTION_CHOICES.map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
        <label htmlFor="chat-limit" className="ml-2 text-neutral-700">
          Messages read per chat
        </label>
        <select
          id="chat-limit"
          value={status?.messageLimit ?? 30}
          disabled={!isOwner || save.isPending}
          onChange={(e) => save.mutate({ messageLimit: Number(e.target.value) })}
          className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
        >
          {[10, 20, 30, 40, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {isOwner && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={outlineBtn} onClick={download}>
            <Download size={15} /> Download all (JSON)
          </button>
          <button type="button" className={`${outlineBtn} text-red-700`} onClick={() => setConfirmAll(true)} disabled={!status?.recordCount}>
            <Trash2 size={15} /> Delete all saved chats
          </button>
          <Link to="/legal/chat-extension-privacy" className="self-center text-xs text-brand underline" target="_blank">
            Privacy policy
          </Link>
        </div>
      )}
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Delete all saved chats?"
        message={`All ${status?.recordCount ?? 0} saved chats of this store are deleted for good. Orders you already made from them are not touched.`}
        confirmLabel="Delete all"
        danger
        busy={removeAll.isPending}
        onConfirm={() => removeAll.mutate()}
      />
    </div>
  );
}

const INSTRUCTIONS_MAX = 1000;
const INSTRUCTION_IDEAS = [
  'কাস্টমারকে "আপু" বা "ভাইয়া" বলে ডাকবে।',
  'নিজে থেকে কোনো ছাড় বা ডিসকাউন্ট দেবে না।',
  'উত্তর ছোট রাখবে, ইমোজি দেবে না।',
  'অর্ডার নিতে নাম, ফোন নম্বর আর পুরো ঠিকানা চাইবে।',
];

/**
 * The store's own instructions for the extension's AI reply drafts (the same text the side panel edits). Kept per store
 * on the server, owner only to change; Regantify's own rules still come first (no invented prices, stock or dates).
 */
function AiInstructionsCard() {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const { data: status } = useQuery({ queryKey: ['chat-extension-status'], queryFn: chatExtensionApi.status });
  const saved = status?.replyInstructions ?? '';
  const [text, setText] = useState<string | null>(null);
  const value = text ?? saved;
  const save = useMutation({
    mutationFn: () => chatExtensionApi.updateSettings({ replyInstructions: value.trim() }),
    onSuccess: () => {
      toast.success(value.trim() ? 'Saved. The next replies follow your instructions.' : 'Instructions removed.');
      setText(null);
      void queryClient.invalidateQueries({ queryKey: ['chat-extension-status'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  const addIdea = (line: string) => {
    const cur = value.trim();
    if (cur.includes(line)) return;
    const next = (cur ? `${cur}\n` : '') + line;
    if (next.length > INSTRUCTIONS_MAX) return toast.error('That would be too long.');
    setText(next);
  };

  return (
    <div className="rounded-xl border border-line p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-regantify-text">
        <Sparkles size={16} aria-hidden /> AI instructions
      </h2>
      <p className="mt-1 text-xs text-neutral-600">
        Tell the AI how your shop answers: how to greet, what never to promise, facts like delivery days. Every reply draft for your store follows it. It can’t make the AI invent prices or stock.
      </p>
      <textarea
        value={value}
        onChange={(e) => setText(e.target.value)}
        maxLength={INSTRUCTIONS_MAX}
        rows={6}
        readOnly={!isOwner}
        placeholder={isOwner ? 'e.g. Call customers Apu or Bhaiya. Never offer a discount. Delivery inside Dhaka takes 2 days.' : 'No instructions yet. The store owner can add them.'}
        aria-label="AI instructions"
        className={`${inputClass} mt-2`}
      />
      {isOwner ? (
        <>
          <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
            <span>Ideas (tap to add)</span>
            <span className="tabular-nums">
              {value.length}/{INSTRUCTIONS_MAX}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {INSTRUCTION_IDEAS.map((line) => (
              <button key={line} type="button" onClick={() => addIdea(line)} className="rounded-full border border-line px-2.5 py-1 text-xs text-neutral-700 hover:border-brand">
                + {line}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className={primaryBtn} onClick={() => save.mutate()} disabled={save.isPending || text === null || value === saved}>
              Save
            </button>
            {text !== null && value !== saved && (
              <button type="button" className={outlineBtn} onClick={() => setText(null)}>
                Cancel
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="mt-1 text-xs text-neutral-500">Only the store owner can change these.</p>
      )}
    </div>
  );
}

/** One kept photo, loaded through the signed-in session; deleting it is final. */
function KeptPhoto({ photo, recordId }: { photo: ChatRecordPhoto; recordId: string }) {
  const queryClient = useQueryClient();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    chatExtensionApi
      .photoUrl(photo.id)
      .then((u) => {
        url = u;
        if (cancelled) URL.revokeObjectURL(u);
        else setSrc(u);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.id]);
  const remove = useMutation({
    mutationFn: () => chatExtensionApi.deletePhoto(photo.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['chat-record-photos', recordId] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete the photo.')),
  });
  return (
    <figure className="w-28">
      {src ? (
        <a href={src} target="_blank" rel="noopener noreferrer">
          <img src={src} alt="Customer photo" className="h-28 w-28 rounded-lg border border-line object-cover" />
        </a>
      ) : (
        <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-500">{failed ? 'Not available' : 'Loading…'}</div>
      )}
      <figcaption className="mt-1 text-[11px] text-neutral-500">
        Deleted {formatDhakaDateTime(photo.deletesAt).split(',')[0]} ·{' '}
        <button type="button" className="text-red-700 underline" onClick={() => remove.mutate()} disabled={remove.isPending}>
          Delete
        </button>
      </figcaption>
    </figure>
  );
}

/** One saved chat: its details (editable), the messages that were kept, delete and "Make order". */
function RecordDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['chat-record', id], queryFn: () => chatExtensionApi.record(id) });
  const { data: photos } = useQuery({ queryKey: ['chat-record-photos', id], queryFn: () => chatExtensionApi.photos(id) });
  const [edit, setEdit] = useState<ChatRecordEdit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [instant, setInstant] = useState(false);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['chat-records'] });
    void queryClient.invalidateQueries({ queryKey: ['chat-record', id] });
  };
  const save = useMutation({
    mutationFn: (body: ChatRecordEdit) => chatExtensionApi.update(id, body),
    onSuccess: () => {
      toast.success('Saved.');
      setEdit(null);
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  const remove = useMutation({
    mutationFn: () => chatExtensionApi.remove(id),
    onSuccess: () => {
      toast.success('Deleted.');
      refresh();
      void queryClient.invalidateQueries({ queryKey: ['chat-extension-status'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete it.')),
  });

  const field = (key: keyof ChatRecordEdit, label: string, multiline = false) => (
    <label className="block text-xs text-neutral-600">
      {label}
      {multiline ? (
        <textarea rows={2} className={inputClass} value={edit?.[key] ?? ''} onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} />
      ) : (
        <input className={inputClass} value={edit?.[key] ?? ''} onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} />
      )}
    </label>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Saved chat" maxWidth="max-w-xl">
      <div className="space-y-3 px-6 pb-6 pt-3 text-sm">
        {!data ? (
          <p className="text-neutral-500">Loading…</p>
        ) : edit ? (
          <div className="space-y-2">
            {field('customerName', 'Customer name')}
            {field('phone', 'Phone')}
            {field('address', 'Address', true)}
            {field('district', 'District')}
            {field('items', 'Items', true)}
            {field('note', 'Note', true)}
            <div className="flex justify-end gap-2">
              <button type="button" className={outlineBtn} onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button type="button" className={primaryBtn} onClick={() => save.mutate(edit)} disabled={save.isPending}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-neutral-500">Customer</dt>
              <dd className="text-regantify-text">{data.customerName}</dd>
              <dt className="text-neutral-500">Phone</dt>
              <dd className="text-regantify-text">{data.phone ?? '—'}</dd>
              <dt className="text-neutral-500">Address</dt>
              <dd className="whitespace-pre-wrap text-regantify-text">{[data.address, data.district].filter(Boolean).join(', ') || '—'}</dd>
              <dt className="text-neutral-500">Items</dt>
              <dd className="whitespace-pre-wrap text-regantify-text">{data.items ?? '—'}</dd>
              {data.note && (
                <>
                  <dt className="text-neutral-500">Note</dt>
                  <dd className="whitespace-pre-wrap text-regantify-text">{data.note}</dd>
                </>
              )}
              <dt className="text-neutral-500">From</dt>
              <dd className="text-regantify-text">
                {SOURCE_LABEL[data.source]} · {formatDhakaDateTime(data.createdAt)}
              </dd>
            </dl>
            {data.messages.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-neutral-50 p-2 text-xs">
                {data.messages.map((m, i) => (
                  <p key={i} className={m.from === 'store' ? 'text-right text-neutral-600' : 'text-regantify-text'}>
                    <span className="font-medium">{m.from === 'store' ? 'You' : 'Customer'}:</span> {m.text}
                  </p>
                ))}
              </div>
            )}
            {photos && photos.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-600">Customer photos (kept 90 days)</p>
                <div className="flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <KeptPhoto key={p.id} photo={p} recordId={id} />
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button type="button" className={`${outlineBtn} text-red-700`} onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} /> Delete
              </button>
              <button
                type="button"
                className={outlineBtn}
                onClick={() => setEdit({ customerName: data.customerName, phone: data.phone ?? '', address: data.address ?? '', district: data.district ?? '', items: data.items ?? '', note: data.note ?? '' })}
              >
                Edit
              </button>
              {data.orderId ? (
                <Link to={`/vendor/orders/${data.orderId}`} className={primaryBtn}>
                  Open the order
                </Link>
              ) : (
                <>
                  <button type="button" className={outlineBtn} onClick={() => setInstant(true)} title="Send the customer a link: they confirm the order in one tap">
                    <Zap size={15} /> Instant checkout link
                  </button>
                  <button type="button" className={primaryBtn} onClick={() => navigate(`/vendor/orders/add?fromChat=${data.id}`)}>
                    <ShoppingCart size={15} /> Make order
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      {instant && data && (
        <InstantCheckoutDialog
          open={instant}
          onOpenChange={setInstant}
          chatRecordId={data.id}
          customer={{ customerName: data.customerName, phone: data.phone, address: data.address, district: data.district }}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this saved chat?"
        message="It is deleted for good. An order already made from it is not touched."
        confirmLabel="Delete"
        danger
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Dialog>
  );
}

export default function ConnectExtension() {
  const [params, setParams] = useSearchParams();
  const tab: ExtensionTab = EXTENSION_TABS.some((t) => t.id === params.get('tab')) ? (params.get('tab') as ExtensionTab) : 'connect';
  const setTab = (id: ExtensionTab) => setParams(id === 'connect' ? {} : { tab: id }, { replace: true });
  const { data: status } = useQuery({ queryKey: ['chat-extension-status'], queryFn: chatExtensionApi.status });

  return (
    <div className="space-y-3">
      <PageSection>
        <PageHeader
          title="Connect Extension"
          description="The Regantify Chrome extension reads a customer chat on Messenger, Instagram, TikTok or WhatsApp Web when you press it, writes a reply with AI and saves the order to your store. Everything about it is here."
        />
        <PillTabs
          tabs={EXTENSION_TABS.map((t) => (t.id === 'chats' ? { ...t, count: status?.recordCount } : t))}
          value={tab}
          onChange={setTab}
          className="mb-0"
        />
      </PageSection>

      {tab === 'connect' && (
        <PageSection>
          <div className="space-y-3">
            <DownloadCard />
            <ConnectCard />
          </div>
        </PageSection>
      )}
      {tab === 'settings' && (
        <PageSection>
          <div className="grid gap-3 lg:grid-cols-2">
            <AiInstructionsCard />
            <PrivacyCard />
          </div>
        </PageSection>
      )}
      {tab === 'chats' && <SavedChats />}
      {tab === 'links' && <InstantLinksList />}
    </div>
  );
}

/** The chats saved from the extension, with a search and the detail dialog. */
function SavedChats() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['chat-records', q, page], queryFn: () => chatExtensionApi.records(q, page) });

  return (
    <PageSection>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold text-regantify-text">Saved chats</h2>
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Name, phone or item"
        />
      </div>
      {isLoading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
      ) : !data?.items.length ? (
        <EmptyState icon={MessageSquareText} title={q ? 'Nothing matches' : 'No saved chats yet'} hint="Open a customer chat, open the Regantify side panel, read the chat, check the details and save." />
      ) : (
        <>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {data.items.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpen(r.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2.5 text-left hover:bg-neutral-50">
                  <span className="font-medium text-regantify-text">{r.customerName}</span>
                  <span className="text-sm tabular-nums text-neutral-600">{r.phone ?? 'No phone'}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-neutral-500">{[r.address, r.district].filter(Boolean).join(', ')}</span>
                  <span className="text-xs text-neutral-500">{SOURCE_LABEL[r.source] ?? 'Chat'}</span>
                  {r.autoSaved && (
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600" title="Saved by itself while a reply was written">
                      Auto-saved
                    </span>
                  )}
                  {r.orderId && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Ordered</span>}
                  <span className="text-xs text-neutral-500">{formatDhakaDateTime(r.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
          <TableFooter page={data.page} perPage={data.perPage} total={data.total} onPageChange={setPage} />
        </>
      )}
      {open && <RecordDialog id={open} onClose={() => setOpen(null)} />}
    </PageSection>
  );
}
