import type { ReactNode } from 'react';

/**
 * Small dark-theme form primitives shared by every section settings form
 * in the landing page builder. Kept separate from the dashboard's own
 * light-theme inputs on purpose — the builder is its own visual surface
 * (landing-plan.md §0).
 */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-slate-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] leading-relaxed text-slate-600">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[12.5px] text-slate-100 ' +
  'placeholder:text-slate-600 focus:border-white/20 focus:outline-none';

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : ''}
      min={min}
      max={max}
      placeholder={placeholder}
      onChange={(e) => {
        const n = e.target.value === '' ? 0 : Number(e.target.value);
        onChange(Number.isNaN(n) ? 0 : n);
      }}
      className={inputClass}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} resize-y`}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`${inputClass} [&>option]:bg-[#15151D]`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="min-w-0">
        <span className="block text-[12px] text-slate-200">{label}</span>
        {hint && <span className="block text-[10.5px] leading-relaxed text-slate-600">{hint}</span>}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
          checked ? 'bg-violet-600' : 'bg-white/15'
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

/** A labeled group of repeatable rows (slides, FAQ items, reviews, ...). */
export function RepeaterRow({
  index,
  onRemove,
  children,
}: {
  index: number;
  onRemove?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
          #{index + 1}
        </span>
        {onRemove && (
          <button onClick={onRemove} className="text-[11px] text-slate-500 hover:text-red-400">
            Remove
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-dashed border-white/15 py-1.5 text-[11.5px]
        text-slate-400 transition-colors hover:border-white/25 hover:text-slate-200"
    >
      {label}
    </button>
  );
}
