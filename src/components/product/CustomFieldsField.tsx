import { Field } from './ProductFormPieces';

const inputClass =
  'h-10 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15';

export const MAX_CUSTOM_FIELDS = 3;

export interface CustomFieldRow {
  label: string;
  required: boolean;
  maxLength: string;
}

export function customRowsFromProduct(fields: Array<{ label: string; required: boolean; maxLength: number }> | null | undefined): CustomFieldRow[] {
  return (fields ?? []).map((f) => ({ label: f.label, required: f.required, maxLength: String(f.maxLength) }));
}

/** The complete rows as the product API takes them. */
export function customFieldsPayload(rows: CustomFieldRow[]) {
  return rows
    .filter((r) => r.label.trim())
    .map((r) => ({ label: r.label.trim(), required: r.required, maxLength: Math.min(200, Math.max(1, Number(r.maxLength) || 40)) }));
}

/**
 * Add / Edit Product: "Ask the shopper" (TellMe idea 75), for printed names, engravings and custom cakes. Up to 3 boxes shown under the
 * price on the product page; a required box left empty stops Add to Cart. The text is cleaned of HTML, limited in length and saved on the
 * order line (the packing list and the invoice show it). An optional fee per piece is added by the server when any box is filled in.
 * Not for bundles. Orders with such text cannot be edited with Edit items (split or cancel them instead).
 */
export function CustomFieldsField({
  rows,
  onChange,
  fee,
  onFee,
}: {
  rows: CustomFieldRow[];
  onChange: (rows: CustomFieldRow[]) => void;
  fee: string;
  onFee: (v: string) => void;
}) {
  const set = (i: number, patch: Partial<CustomFieldRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="mt-5 border-t border-line pt-4">
      <Field label="Ask the shopper" hint="For names to print, engraving text and the like. Up to 3 boxes. Optional.">
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                value={r.label}
                maxLength={40}
                onChange={(e) => set(i, { label: e.target.value })}
                placeholder="e.g. Name to print"
                aria-label={`Box ${i + 1} name`}
                className={`${inputClass} w-56`}
              />
              <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                <input type="checkbox" checked={r.required} onChange={(e) => set(i, { required: e.target.checked })} className="h-4 w-4 accent-brand" />
                Required
              </label>
              <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                Up to
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={200}
                  value={r.maxLength}
                  onChange={(e) => set(i, { maxLength: e.target.value.replace(/\D/g, '') })}
                  aria-label={`Box ${i + 1} length`}
                  className={`${inputClass} w-20`}
                />
                letters
              </label>
              <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-sm text-neutral-500 hover:text-red-600">
                Remove
              </button>
            </div>
          ))}
          {rows.length < MAX_CUSTOM_FIELDS && (
            <button type="button" onClick={() => onChange([...rows, { label: '', required: false, maxLength: '40' }])} className="text-sm font-medium text-brand hover:underline">
              + Add a box
            </button>
          )}
          {rows.some((r) => r.label.trim()) && (
            <label className="mt-1 flex items-center gap-2 text-sm text-neutral-600">
              Extra fee per piece (৳)
              <input type="number" inputMode="decimal" min={0} step="any" value={fee} onChange={(e) => onFee(e.target.value)} placeholder="0" className={`${inputClass} w-28`} />
              <span className="text-xs text-neutral-500">Added when the shopper fills in a box, e.g. ৳50 for printing.</span>
            </label>
          )}
        </div>
      </Field>
    </div>
  );
}
