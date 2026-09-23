/**
 * Plain labeled checkbox with an optional hint line — the light-dashboard
 * counterpart of components/landing/fields.tsx's dark-canvas Toggle.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-black/20 accent-regantify-cta cursor-pointer disabled:cursor-not-allowed"
      />
      <span>
        <span className="block text-sm text-regantify-text">{label}</span>
        {hint && <span className="block text-xs text-regantify-text-muted mt-0.5 leading-relaxed">{hint}</span>}
      </span>
    </label>
  );
}
