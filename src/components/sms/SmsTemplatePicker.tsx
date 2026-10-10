import { useState, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkPlus, Pencil, Trash2 } from 'lucide-react';
import { SMS_WORDS, smsApi, type SmsTemplate } from '../../lib/smsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { productInputClass } from '../product/ProductFormPieces';

const MAX_TEMPLATES = 20;
const QUERY_KEY = ['sms-templates'];

/**
 * Saved SMS messages (TellMe idea 30), above the message box of SMS > Send to customers and Order detail's SMS: pick
 * one to fill the box, save what is written as a new one, add the words {name}, {order} and {store} (filled in for
 * each customer when it is sent), and manage the saved list. The text is the box's own (`message`, `setMessage`).
 */
export function SmsTemplatePicker({
  message,
  setMessage,
  textareaRef,
}: {
  message: string;
  setMessage: (text: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const queryClient = useQueryClient();
  const { data: templates = [] } = useQuery({ queryKey: QUERY_KEY, queryFn: smsApi.listTemplates, staleTime: 60_000 });
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [managing, setManaging] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const save = useMutation({
    mutationFn: () => smsApi.createTemplate(name.trim(), message.trim()),
    onSuccess: (t) => {
      toast.success(`Saved “${t.name}”.`);
      setSaving(false);
      setName('');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save this message. Please try again.')),
  });

  /** Puts a word where the cursor is (or at the end), and keeps the cursor after it. */
  function insertWord(word: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? message.length;
    const end = el?.selectionEnd ?? message.length;
    const next = (message.slice(0, start) + word + message.slice(end)).slice(0, 1000);
    setMessage(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + word.length, start + word.length);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Saved messages"
          value=""
          onChange={(e) => {
            const t = templates.find((x) => x.id === e.target.value);
            if (t) setMessage(t.body);
          }}
          className={`${productInputClass} !w-auto min-w-[180px] !py-1.5`}
        >
          <option value="">{templates.length === 0 ? 'No saved messages yet' : 'Use a saved message…'}</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setSaving((v) => !v)} disabled={!message.trim() || templates.length >= MAX_TEMPLATES} className={`${outlineBtn} !h-8 !px-2.5 text-xs`} title={templates.length >= MAX_TEMPLATES ? `You can keep ${MAX_TEMPLATES} saved messages` : 'Keep this message to use again'}>
          <BookmarkPlus size={13} aria-hidden />
          Save this message
        </button>
        {templates.length > 0 && (
          <button type="button" onClick={() => setManaging(true)} className="text-xs text-neutral-500 underline hover:text-neutral-800">
            Manage
          </button>
        )}
      </div>

      {saving && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 60))}
            autoFocus
            placeholder="Name, e.g. Eid offer"
            aria-label="Name for this saved message"
            className={`${productInputClass} !w-56 !py-1.5`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) save.mutate();
            }}
          />
          <button type="button" onClick={() => save.mutate()} disabled={!name.trim() || save.isPending} className={`${primaryBtn} !h-8 !px-3 text-xs`}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
        <span>Add:</span>
        {SMS_WORDS.map((w) => (
          <button key={w.word} type="button" onClick={() => insertWord(w.word)} title={w.hint} className="rounded border border-line bg-neutral-50 px-1.5 py-0.5 font-mono text-neutral-700 hover:bg-neutral-100">
            {w.word}
          </button>
        ))}
        <span>filled in for each customer when it is sent.</span>
      </div>

      <ManageDialog open={managing} onOpenChange={setManaging} templates={templates} onChanged={refresh} onUse={(t) => setMessage(t.body)} />
    </div>
  );
}

/** The saved list: use, rename or rewrite, or delete a message. */
function ManageDialog({
  open,
  onOpenChange,
  templates,
  onChanged,
  onUse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: SmsTemplate[];
  onChanged: () => void;
  onUse: (t: SmsTemplate) => void;
}) {
  const [editing, setEditing] = useState<SmsTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editBody, setEditBody] = useState('');
  const [deleting, setDeleting] = useState<SmsTemplate | null>(null);

  const update = useMutation({
    mutationFn: () => smsApi.updateTemplate(editing!.id, editName.trim(), editBody.trim()),
    onSuccess: () => {
      toast.success('Saved.');
      setEditing(null);
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save the change.')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => smsApi.deleteTemplate(id),
    onSuccess: () => {
      setDeleting(null);
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t delete it. Please try again.')),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} title="Saved messages" maxWidth="max-w-lg">
        <div className="space-y-2 px-6 pb-6 pt-3">
          {templates.length === 0 && <p className="text-sm text-neutral-500">Nothing saved yet.</p>}
          <ul className="divide-y divide-line rounded-lg border border-line">
            {templates.map((t) => (
              <li key={t.id} className="px-3 py-2.5">
                {editing?.id === t.id ? (
                  <div className="space-y-2">
                    <input value={editName} onChange={(e) => setEditName(e.target.value.slice(0, 60))} aria-label="Name" className={`${productInputClass} !py-1.5`} />
                    <textarea value={editBody} onChange={(e) => setEditBody(e.target.value.slice(0, 1000))} rows={3} aria-label="Message" className={productInputClass} />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditing(null)} className={`${outlineBtn} !h-8 text-xs`}>
                        Cancel
                      </button>
                      <button type="button" onClick={() => update.mutate()} disabled={!editName.trim() || !editBody.trim() || update.isPending} className={`${primaryBtn} !h-8 text-xs`}>
                        {update.isPending ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-regantify-text">{t.name}</p>
                      <p className="line-clamp-2 whitespace-pre-line text-xs text-neutral-500">{t.body}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUse(t);
                        onOpenChange(false);
                      }}
                      className="shrink-0 rounded px-2 py-1 text-xs text-brand hover:bg-neutral-100"
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit ${t.name}`}
                      onClick={() => {
                        setEditing(t);
                        setEditName(t.name);
                        setEditBody(t.body);
                      }}
                      className="shrink-0 rounded p-1.5 text-neutral-500 hover:bg-neutral-100"
                    >
                      <Pencil size={13} />
                    </button>
                    <button type="button" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)} className="shrink-0 rounded p-1.5 text-red-600 hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete “${deleting?.name ?? ''}”?`}
        message="This only removes the saved copy. Messages already sent are not affected."
        confirmLabel="Delete"
        busy={remove.isPending}
        danger
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
