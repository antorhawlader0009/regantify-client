import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from './Dialog';

/**
 * "Are you sure?" in the dashboard theme, instead of the browser's
 * window.confirm (theme-update-plan.md). The message says what will
 * happen; the button says the action ("Delete coupon"), never just "OK".
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  onConfirm,
  danger = false,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  /** Red button + warning icon, for deleting or anything that can't be undone. */
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} maxWidth="max-w-md">
      <div className="px-6 pb-6 pt-3">
        <div className="flex gap-3">
          {danger && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={17} aria-hidden />
            </span>
          )}
          <div className="text-sm leading-relaxed text-neutral-600">{message}</div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-white transition-colors disabled:opacity-60 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
