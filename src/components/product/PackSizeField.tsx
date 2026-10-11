import { Field } from './ProductFormPieces';

const inputClass = 'h-10 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

/**
 * Sold in packs (TellMe idea 102): "Sell in steps of" makes the quantity go up by that many (a dozen eggs, a 250 g pack) and refuses any other
 * number at checkout; the unit name ("dozen") shows beside the price. Prices, discounts, bundles and stock still count single pieces.
 * StorePal's checkout only. 1 or empty = any number.
 */
export function PackSizeField({ step, onStep, unit, onUnit }: { step: string; onStep: (v: string) => void; unit: string; onUnit: (v: string) => void }) {
  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex flex-wrap gap-4">
        <Field label="Sell in steps of" hint="Optional. 6 means 6, 12, 18… Price and stock still count single pieces.">
          <input type="text" inputMode="numeric" value={step} onChange={(e) => onStep(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1" className={`${inputClass} w-28`} />
        </Field>
        <Field label="Unit name" hint="Shown beside the price, like “/ dozen”.">
          <input type="text" maxLength={20} value={unit} onChange={(e) => onUnit(e.target.value)} placeholder="e.g. dozen" className={`${inputClass} w-40`} />
        </Field>
      </div>
    </div>
  );
}
