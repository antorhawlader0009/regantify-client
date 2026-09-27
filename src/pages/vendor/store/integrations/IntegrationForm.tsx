import type { ReactNode } from 'react';
import { AlertTriangle, Info, RotateCw } from 'lucide-react';

// Shared layout pieces for the Store > Integrations settings pages
// (FacebookPixel.tsx, GoogleAnalytics.tsx).

export const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white focus:outline-none focus:border-regantify-cta transition-colors disabled:bg-black/[0.03] disabled:text-regantify-text-muted';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-medium text-regantify-text mb-2">{title}</h2>
      <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">{children}</div>
    </section>
  );
}

export function Row({ label, hint, children }: { label: string; hint: ReactNode; children: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[1fr_18rem] gap-2 sm:gap-6 p-5">
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">{label}</label>
        {children}
      </div>
      <p className="text-sm text-regantify-text-muted sm:pt-7">{hint}</p>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`mt-1 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-regantify-cta' : 'bg-black/15'
      }`}
    >
      <span
        className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/** Shown instead of the form when the settings couldn't be loaded, so the page never spins forever. */
export function LoadError({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-8 flex flex-col items-center gap-3 text-center">
      <AlertTriangle size={20} className="text-red-600" />
      <p className="text-sm text-regantify-text">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-black/[0.03] transition-colors disabled:opacity-50"
      >
        <RotateCw size={15} className={retrying ? 'animate-spin' : undefined} />
        Try again
      </button>
    </div>
  );
}

export function Notice({ tone, children }: { tone: 'warning' | 'error' | 'info'; children: ReactNode }) {
  const toneClass =
    tone === 'error' ? 'bg-red-50 text-red-700' : tone === 'info' ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-800';
  const Icon = tone === 'info' ? Info : AlertTriangle;
  return (
    <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${toneClass}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
