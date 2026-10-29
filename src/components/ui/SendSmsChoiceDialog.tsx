import type { ReactNode } from 'react';
import { MessageSquareText } from 'lucide-react';
import { Dialog } from './Dialog';

/**
 * "Also send this by SMS?" after an action that a shopper may want to hear about (a question's answer, a refund). Three
 * choices: Cancel (nothing happens), save without a text, or save and text it from the store's SMS credits. The message
 * should say who gets it and what it costs.
 */
export function SendSmsChoiceDialog({
  open,
  onOpenChange,
  title,
  message,
  onSend,
  onSkip,
  busy = false,
  sendDisabled = false,
  skipLabel = 'Save without SMS',
  sendLabel = 'Save and send SMS',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: ReactNode;
  onSend: () => void;
  onSkip: () => void;
  busy?: boolean;
  /** No phone, or too few credits: the send button stays off and the message says why. */
  sendDisabled?: boolean;
  skipLabel?: string;
  sendLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} maxWidth="max-w-md">
      <div className="px-6 pb-6 pt-3">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
            <MessageSquareText size={17} aria-hidden />
          </span>
          <div className="text-sm leading-relaxed text-neutral-600">{message}</div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm text-neutral-500 hover:text-regantify-text disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
          >
            {skipLabel}
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={busy || sendDisabled}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Working…' : sendLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
