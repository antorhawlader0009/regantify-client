import { Field } from './ProductFormPieces';

const inputClass =
  'h-10 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15';

/** What the card holds while editing: '' = use the store default. */
export interface PolicyValue {
  warrantyKind: string;
  warrantyCustom: string;
  returnDays: string;
  returnCondition: string;
}

export const EMPTY_POLICY: PolicyValue = { warrantyKind: '', warrantyCustom: '', returnDays: '', returnCondition: '' };

export const WARRANTY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'NONE', label: 'No warranty' },
  { value: 'D7', label: '7 days' },
  { value: 'M1', label: '1 month' },
  { value: 'M6', label: '6 months' },
  { value: 'Y1', label: '1 year' },
  { value: 'CUSTOM', label: 'Write my own' },
];

export const RETURN_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '0', label: 'No returns or exchange' },
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
];

/** The server's product fields as the card's value. */
export function policyFromProduct(p: {
  warrantyKind?: string | null;
  warrantyCustom?: string | null;
  returnDays?: number | null;
  returnCondition?: string | null;
}): PolicyValue {
  return {
    warrantyKind: p.warrantyKind ?? '',
    warrantyCustom: p.warrantyCustom ?? '',
    returnDays: p.returnDays === null || p.returnDays === undefined ? '' : String(p.returnDays),
    returnCondition: p.returnCondition ?? '',
  };
}

/** The card's value as the fields the product API takes (null = the store default). */
export function policyToPayload(v: PolicyValue) {
  return {
    warrantyKind: v.warrantyKind || null,
    warrantyCustom: v.warrantyKind === 'CUSTOM' ? v.warrantyCustom.trim() || null : null,
    returnDays: v.returnDays === '' ? null : Number(v.returnDays),
    returnCondition: v.returnCondition.trim() || null,
  };
}

/**
 * Add / Edit Product: "Warranty and returns" (TellMe idea 54). Shown under the Buy button on the product page and printed
 * under the item on the invoice. "Store default" uses what is set in Store > Stock Settings; with no default either, nothing
 * shows.
 */
export function PolicyField({
  value,
  onChange,
  compact,
}: {
  value: PolicyValue;
  onChange: (next: PolicyValue) => void;
  /** Used inside Stock Settings, where the first choice means "nothing" and not "the store default". */
  compact?: boolean;
}) {
  const set = (patch: Partial<PolicyValue>) => onChange({ ...value, ...patch });
  const none = compact ? 'Not set' : 'Store default';
  return (
    <Field
      label="Warranty and returns"
      hint={compact ? undefined : 'Shown under the Buy button and on the invoice. Leave on “Store default” to use the store-wide setting.'}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            Warranty
            <select value={value.warrantyKind} onChange={(e) => set({ warrantyKind: e.target.value })} className={inputClass} aria-label="Warranty">
              <option value="">{none}</option>
              {WARRANTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {value.warrantyKind === 'CUSTOM' && (
            <input
              value={value.warrantyCustom}
              onChange={(e) => set({ warrantyCustom: e.target.value.slice(0, 60) })}
              maxLength={60}
              placeholder="e.g. 2 years on the motor"
              aria-label="Warranty text"
              className={`${inputClass} w-56`}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            Return or exchange
            <select value={value.returnDays} onChange={(e) => set({ returnDays: e.target.value })} className={inputClass} aria-label="Return or exchange">
              <option value="">{none}</option>
              {RETURN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {value.returnDays !== '' && value.returnDays !== '0' && (
            <input
              value={value.returnCondition}
              onChange={(e) => set({ returnCondition: e.target.value.slice(0, 100) })}
              maxLength={100}
              placeholder="Condition, e.g. if the packet is unopened"
              aria-label="Return condition"
              className={`${inputClass} w-72`}
            />
          )}
        </div>
      </div>
    </Field>
  );
}
