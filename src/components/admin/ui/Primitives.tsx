import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/* Small shared pieces for the Super Admin panel (admin-panel-new-theme.md Step 3): badge, button, empty state, skeleton. Admin only. */

export type BadgeTone = 'orange' | 'green' | 'red' | 'blue' | 'purple' | 'neutral';

const BADGE: Record<BadgeTone, string> = {
  orange: 'bg-[var(--tint-orange-bg)] text-[var(--tint-orange-fg)]',
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-sky-50 text-sky-700',
  purple: 'bg-violet-50 text-violet-700',
  neutral: 'bg-[var(--console-tile)] text-regantify-text-muted ring-1 ring-inset ring-[var(--console-tile-line)]',
};

/** A small rounded label. Red is for problems (never amber). */
export function Badge({ tone = 'neutral', children, dot = false }: { tone?: BadgeTone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ${BADGE[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON: Record<ButtonVariant, string> = {
  primary: 'bg-[image:var(--console-accent-gradient)] text-white shadow-[0_6px_14px_rgba(245,87,108,0.25)] hover:brightness-105',
  secondary: 'bg-white text-regantify-text ring-1 ring-inset ring-[rgb(var(--c-line))] hover:bg-[var(--console-tile)]',
  ghost: 'text-regantify-text hover:bg-regantify-search',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

/** The panel's button: a gradient primary, a light secondary, a ghost and a red danger. `loading` shows a spinner and disables it. */
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode }>(
  function Button({ variant = 'primary', size = 'md', loading = false, icon, className = '', children, disabled, type = 'button', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
          size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[14px]'
        } ${BUTTON[variant]} ${className}`}
        {...rest}
      >
        {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : icon}
        {children}
      </button>
    );
  },
);

/** What a card shows when it has nothing yet. Never a fake chart or made-up numbers. */
export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      {icon && <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--console-tile)] text-regantify-text-muted [&>svg]:h-5 [&>svg]:w-5">{icon}</span>}
      <p className="mt-3 text-[14px] font-medium text-regantify-text">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[13px] text-regantify-text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A grey placeholder block while data loads. */
export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <span className={`block animate-pulse rounded-lg bg-[var(--console-skeleton)] ${className}`} aria-hidden />;
}
