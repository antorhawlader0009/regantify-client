import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import type { LmsStage } from '../../lib/lmsApi';
import { STAGE_RULE } from './stageStyles';
import '../../pages/vendor/lms/lms-theme.css';

/*
 * The LMS's own small UI kit, in its light theme. Dialogs and the drawer
 * render in a portal outside the page, so they carry `lms-root`
 * themselves to get the theme's colours and fonts.
 */

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

const BUTTON: Record<ButtonVariant, string> = {
  primary: 'bg-lms-ink text-white hover:opacity-90',
  secondary: 'border border-lms-line bg-lms-surface text-lms-ink hover:bg-lms-page',
  quiet: 'text-lms-ink hover:bg-lms-page',
  danger: 'border border-lms-line bg-lms-surface text-lms-alert hover:bg-lms-page',
};

export const LmsButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>(
  function LmsButton({ variant = 'secondary', className = '', type = 'button', ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3.5 text-sm font-medium disabled:opacity-50 ${BUTTON[variant]} ${className}`}
        {...props}
      />
    );
  },
);

const FIELD = 'h-9 w-full rounded-md border border-lms-line bg-lms-surface px-3 text-sm text-lms-ink placeholder:text-lms-muted';

export const LmsInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function LmsInput(
  { className = '', ...props },
  ref,
) {
  return <input ref={ref} className={`${FIELD} ${className}`} {...props} />;
});

export function LmsSelect({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${FIELD} pr-8 ${className}`} {...props}>
      {children}
    </select>
  );
}

export function LmsTextarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-md border border-lms-line bg-lms-surface px-3 py-2 text-sm text-lms-ink placeholder:text-lms-muted ${className}`}
      {...props}
    />
  );
}

/** A label above a field, with an optional hint under it. */
export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[13px] font-medium text-lms-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-lms-muted">{hint}</span>}
    </label>
  );
}

/** The stage's colour rule plus its name: colour is never the only signal. */
export function StageMark({ stage, label }: { stage: LmsStage; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className={`h-3.5 w-1 rounded-full ${STAGE_RULE[stage]}`} />
      {label}
    </span>
  );
}

/** A centred dialog (Add lead, lost reason, save view). */
export function LmsDialog({
  open,
  onOpenChange,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="lms-root lms-overlay fixed inset-0 z-40" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={`lms-root fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] ${width} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[10px] bg-lms-surface shadow-xl focus:outline-none`}
        >
          <div className="flex items-center justify-between border-b border-lms-line px-5 py-4">
            <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
            <RadixDialog.Close className="rounded-md p-1 text-lms-muted hover:text-lms-ink" aria-label="Close">
              <X size={18} />
            </RadixDialog.Close>
          </div>
          <div className="px-5 py-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** The right-side lead drawer: 480px, full screen on a phone. */
export function LmsDrawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="lms-root lms-overlay fixed inset-0 z-40" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="lms-root fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-lms-surface shadow-2xl focus:outline-none sm:w-[480px]"
        >
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
          <RadixDialog.Close
            className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-lms-muted hover:bg-lms-page hover:text-lms-ink"
            aria-label="Close"
          >
            <X size={18} />
          </RadixDialog.Close>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
