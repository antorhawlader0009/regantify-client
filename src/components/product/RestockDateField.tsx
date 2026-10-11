import { Field } from './ProductFormPieces';

const inputClass = 'h-10 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

/**
 * "Back in stock on" (TellMe idea 114): the day a sold-out product is expected again. The store shows "Out of stock · back about 20 Nov" only while the
 * product is sold out and the day has not passed, then it hides by itself; a restock hides it too. Optional. StorePal only.
 */
export function RestockDateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-5 border-t border-line pt-5">
      <Field label="Back in stock on" hint="Optional. When this product is sold out, customers see “Out of stock · back about …”. It disappears by itself once there is stock again or the day has passed.">
        <div className="flex items-center gap-3">
          <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} w-48`} />
          {value && (
            <button type="button" onClick={() => onChange('')} className="text-xs text-red-600">
              Clear
            </button>
          )}
        </div>
      </Field>
    </div>
  );
}
