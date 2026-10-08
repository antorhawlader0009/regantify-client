import { CLOSE_REASON_LABEL, type CloseReasonCode } from '../../lib/closeReasons';

/**
 * A "why" dropdown for an order that is being cancelled or returned (or one that was closed without a reason). The
 * answers feed Analytics > Orders > "Why orders didn't go through", so the choices are fixed; "Other" is there for
 * the rest. `value` '' = nothing chosen yet.
 */
export function CloseReasonSelect({
  choices,
  value,
  onChange,
  label = 'Why?',
  id,
}: {
  choices: CloseReasonCode[];
  value: CloseReasonCode | '';
  onChange: (code: CloseReasonCode | '') => void;
  label?: string;
  id?: string;
}) {
  return (
    <label className="mt-3 block text-sm font-medium text-regantify-text" htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as CloseReasonCode | '')}
        className="mt-1.5 block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-regantify-text focus:outline-none focus:border-brand"
      >
        <option value="">Choose a reason</option>
        {choices.map((code) => (
          <option key={code} value={code}>
            {CLOSE_REASON_LABEL[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
