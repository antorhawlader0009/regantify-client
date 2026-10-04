import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import '../../pages/vendor/pos/pos-theme.css';

/* The POS's own small UI kit, in its light theme (pos-theme.css). */

export function Panel({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-[10px] border border-pos-line bg-pos-surface p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'quiet';

const BUTTON: Record<ButtonVariant, string> = {
  primary: 'bg-pos-go text-white hover:opacity-90',
  secondary: 'border border-pos-line bg-pos-surface text-pos-ink hover:bg-pos-page',
  quiet: 'text-pos-ink hover:bg-pos-page',
};

export const PosButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>(
  function PosButton({ variant = 'secondary', className = '', type = 'button', ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 text-sm font-medium disabled:opacity-50 ${BUTTON[variant]} ${className}`}
        {...props}
      />
    );
  },
);

const FIELD = 'h-10 w-full rounded-md border border-pos-line bg-pos-surface px-3 text-sm text-pos-ink placeholder:text-pos-muted';

export const PosInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PosInput(
  { className = '', ...props },
  ref,
) {
  return <input ref={ref} className={`${FIELD} ${className}`} {...props} />;
});

export function PosSelect({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${FIELD} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function PosTextarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-md border border-pos-line bg-pos-surface px-3 py-2 text-sm text-pos-ink placeholder:text-pos-muted ${className}`}
      {...props}
    />
  );
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[13px] font-medium text-pos-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-pos-muted">{hint}</span>}
    </label>
  );
}

/** An on/off row: the label and what it does on the left, the switch on the right. */
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs leading-5 text-pos-muted">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-pos-go' : 'bg-pos-line'
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

/** A centred dialog in the POS theme (it renders in a portal, so it carries pos-root itself). */
export function PosDialog({
  open,
  onOpenChange,
  title,
  children,
  width = 'max-w-md',
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
        <RadixDialog.Overlay className="pos-root pos-overlay fixed inset-0 z-40" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={`pos-root fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] ${width} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[10px] bg-pos-surface shadow-xl focus:outline-none`}
        >
          <div className="flex items-center justify-between border-b border-pos-line px-5 py-4">
            <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
            <RadixDialog.Close className="rounded-md p-1 text-pos-muted hover:text-pos-ink" aria-label="Close">
              <X size={18} />
            </RadixDialog.Close>
          </div>
          <div className="px-5 py-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/** "৳1,250" or "৳1,250.50": money as the counter shows it. */
export function taka(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `৳${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
