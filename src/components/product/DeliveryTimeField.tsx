import { Field } from './ProductFormPieces';

const inputClass = 'h-10 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

const days = (v: string) => v.replace(/\D/g, '').slice(0, 2);

/**
 * "Expected delivery time" for this product: days from the order until it reaches the customer, inside and outside Dhaka.
 * Only when a zone has a number does the product page's delivery check show "expected <date>" for that zone (the store's off
 * days and order cut-off still count). Empty = no expected date. Around Dhaka uses the outside-Dhaka number.
 */
export function DeliveryTimeField({ dhaka, onDhaka, outside, onOutside }: { dhaka: string; onDhaka: (v: string) => void; outside: string; onOutside: (v: string) => void }) {
  return (
    <div className="mt-5 border-t border-line pt-5">
      <p className="mb-1 text-sm font-medium text-regantify-text">Expected delivery time</p>
      <p className="mb-3 text-xs text-neutral-500">Optional. Days from the order until the customer gets it. When set, the product page shows the expected date. Leave empty to hide it.</p>
      <div className="flex flex-wrap gap-4">
        <Field label="Inside Dhaka (days)">
          <input type="text" inputMode="numeric" value={dhaka} onChange={(e) => onDhaka(days(e.target.value))} placeholder="e.g. 2" className={`${inputClass} w-32`} />
        </Field>
        <Field label="Outside Dhaka (days)">
          <input type="text" inputMode="numeric" value={outside} onChange={(e) => onOutside(days(e.target.value))} placeholder="e.g. 4" className={`${inputClass} w-32`} />
        </Field>
      </div>
    </div>
  );
}
