import { useQuery } from '@tanstack/react-query';
import { lmsApi, type LmsFieldDef } from '../../lib/lmsApi';
import { formatPhone } from './format';
import { Field, LmsInput, LmsSelect } from './ui';

/** The store's extra fields, in their saved order. */
export function useLmsFields() {
  return useQuery({ queryKey: ['lms', 'fields'], queryFn: lmsApi.fields, staleTime: 60_000 });
}

/** A stored value as people read it: dates as "5 Oct 2026", phones grouped. */
export function formatExtraValue(def: LmsFieldDef, value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') return '';
  if (def.type === 'DATE') {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? String(value) : `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
  }
  if (def.type === 'PHONE') return formatPhone(String(value));
  if (def.type === 'NUMBER') return Number(value).toLocaleString('en-US');
  return String(value);
}

/** Form values are kept as strings; this is what goes to the server ('' clears a value). */
export type ExtraValues = Record<string, string>;

export function toExtraValues(defs: LmsFieldDef[], stored: Record<string, string | number> | undefined): ExtraValues {
  return Object.fromEntries(defs.map((d) => [d.key, stored?.[d.key] !== undefined ? String(stored[d.key]) : '']));
}

/** Only the fields that changed, with '' sent as null so the server clears them. */
export function changedExtraValues(before: ExtraValues, after: ExtraValues): Record<string, string | null> {
  const changed: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(after)) {
    if ((before[key] ?? '') !== value) changed[key] = value.trim() === '' ? null : value.trim();
  }
  return changed;
}

/** One input per extra field, in a two-column grid. */
export function ExtraFieldInputs({
  defs,
  values,
  onChange,
}: {
  defs: LmsFieldDef[];
  values: ExtraValues;
  onChange: (key: string, value: string) => void;
}) {
  if (!defs.length) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {defs.map((def) => {
        const value = values[def.key] ?? '';
        const set = (e: { target: { value: string } }) => onChange(def.key, e.target.value);
        return (
          <Field key={def.key} label={def.label}>
            {def.type === 'SELECT' ? (
              <LmsSelect value={value} onChange={set}>
                <option value="">Not set</option>
                {def.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </LmsSelect>
            ) : def.type === 'DATE' ? (
              <LmsInput type="date" value={value} onChange={set} />
            ) : def.type === 'NUMBER' ? (
              <LmsInput type="number" step="any" value={value} onChange={set} className="tabular-nums" />
            ) : def.type === 'PHONE' ? (
              <LmsInput inputMode="tel" placeholder="01XXXXXXXXX" value={value} onChange={set} className="tabular-nums" />
            ) : (
              <LmsInput value={value} onChange={set} maxLength={500} />
            )}
          </Field>
        );
      })}
    </div>
  );
}
