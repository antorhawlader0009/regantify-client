import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Check, type LucideIcon } from 'lucide-react';

// Form building blocks from the dashboard theme (regantify-new-theme's
// settings/Field.tsx). Inputs forward their ref so react-hook-form's
// register() works on them directly.

const inputBase =
  'w-full rounded-lg border border-line bg-white text-sm text-regantify-text outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500';

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Right-aligned content in the section header (e.g. a badge). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-regantify-text">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-regantify-text">
        {label} {optional && <span className="font-normal text-neutral-500">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        hint && <div className="mt-1.5 text-xs text-neutral-500">{hint}</div>
      )}
    </div>
  );
}

type IconInputProps = { icon: LucideIcon } & InputHTMLAttributes<HTMLInputElement>;

export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(({ icon: Icon, className = '', ...props }, ref) => (
  <div className="relative">
    <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
    <input ref={ref} {...props} className={`${inputBase} h-11 pl-10 pr-3 ${className}`} />
  </div>
));
IconInput.displayName = 'IconInput';

type IconTextareaProps = { icon: LucideIcon } & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const IconTextarea = forwardRef<HTMLTextAreaElement, IconTextareaProps>(({ icon: Icon, ...props }, ref) => (
  <div className="relative">
    <Icon size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-neutral-500" />
    <textarea ref={ref} {...props} className={`${inputBase} min-h-[96px] resize-none py-3 pl-10 pr-3`} />
  </div>
));
IconTextarea.displayName = 'IconTextarea';

export function SaveButton({
  children,
  busy,
  disabled,
  saved,
  error,
}: {
  children: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  /** Short success text shown next to the button with a check icon, e.g. "Saved". */
  saved?: string | null;
  error?: string | null;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={busy || disabled}
        className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
      >
        {busy ? 'Saving…' : children}
      </button>
      {saved && <SavedNote text={saved} />}
      {error && <span className="animate-pop-in text-sm text-red-600">{error}</span>}
    </div>
  );
}

/** The green "Saved" note with a check icon, shown next to a save button. */
export function SavedNote({ text }: { text: string }) {
  return (
    <span className="animate-pop-in inline-flex items-center gap-1 text-sm text-emerald-600">
      <Check size={15} aria-hidden />
      {text}
    </span>
  );
}

/** Shows `text` for a moment, then clears it — for the "Saved" note next to a save button. */
export function flashFor(set: (v: string | null) => void, text: string, ms = 2500) {
  set(text);
  window.setTimeout(() => set(null), ms);
}
