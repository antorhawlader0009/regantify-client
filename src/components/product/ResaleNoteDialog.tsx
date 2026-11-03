import { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';

const BD_MOBILE = /^(?:\+?88)?01[3-9]\d{8}$/;

/**
 * A confirm step with a short note (a request message, an invitation, why something ends). `minLength` > 0 makes the note required.
 * `askPhone` adds a required phone box (a reseller's request: the supplier calls it before approving).
 */
export function ResaleNoteDialog({
  title,
  message,
  label,
  placeholder,
  confirmLabel,
  minLength = 0,
  busy = false,
  danger = false,
  askPhone,
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
  askPhone?: { label: string; hint?: string; initial?: string | null };
  onConfirm: (note: string, phone?: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState(askPhone?.initial ?? '');
  const cleanPhone = phone.replace(/[\s-]/g, '');
  const phoneOk = !askPhone || BD_MOBILE.test(cleanPhone);
  const ok = note.trim().length >= minLength && phoneOk;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title} maxWidth="max-w-md">
      <div className="space-y-3">
        {message && <p className="text-sm text-neutral-600">{message}</p>}
        {askPhone && (
          <label className="block text-sm text-regantify-text">
            {askPhone.label}
            <input
              type="tel"
              inputMode="tel"
              maxLength={16}
              value={phone}
              placeholder="01XXXXXXXXX"
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:border-brand focus:outline-none"
            />
            {askPhone.hint && <span className="mt-1 block text-xs text-neutral-500">{askPhone.hint}</span>}
            {phone && !phoneOk && <span className="mt-1 block text-xs text-red-600">Write a Bangladeshi mobile number, like 01712345678.</span>}
          </label>
        )}
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
            onClick={() => onConfirm(note.trim(), askPhone ? cleanPhone : undefined)}
            className={danger ? `${primaryBtn} !bg-red-600 !text-white hover:!bg-red-700` : primaryBtn}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
