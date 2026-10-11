import { Field } from './ProductFormPieces';

const inputClass = 'h-10 w-32 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

/**
 * Reorder reminder (TellMe idea 85): about how many days one purchase lasts. Once that many days have passed since a Completed order, the
 * customer gets one SMS with a link to buy it again (turn the SMS on in Stock Settings). Empty = no reminder for this product.
 */
export function ReorderDaysField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="mt-5 border-t border-line pt-5">
      <Field label="Lasts about (days)" hint="Optional. For things people buy again, like face wash or oil. After this many days an SMS offers a one-tap reorder. Needs “Reorder reminder SMS” on in Stock Settings.">
        <input type="text" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Not set" className={inputClass} />
      </Field>
    </div>
  );
}
