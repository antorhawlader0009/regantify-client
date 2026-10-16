import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';

/** A confirm step with a short note (a request message, an invitation, why something ends). `minLength` > 0 makes the note required. */
export function ResaleNoteDialog({
  title,
  message,
  label,
  placeholder,
  confirmLabel,
  minLength = 0,
  busy = false,
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message?: string;
  label: string;
  placeholder?: string;
  confirmLabel: string;
  minLength?: number;
  busy?: boolean;
  danger?: boolean;
  onConfirm: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const ok = note.trim().length >= minLength;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title} maxWidth="max-w-md">
      <div className="space-y-3">
        {message && <p className="text-sm text-neutral-600">{message}</p>}
        <label className="block text-sm text-regantify-text">
          {label} {minLength === 0 && <span className="text-neutral-400">(optional)</span>}
          <textarea
            rows={3}
            maxLength={300}
            value={note}
            placeholder={placeholder}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:border-brand focus:outline-none"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineBtn}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!ok || busy}
            onClick={() => onConfirm(note.trim())}
            className={danger ? `${primaryBtn} !bg-red-600 !text-white hover:!bg-red-700` : primaryBtn}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
