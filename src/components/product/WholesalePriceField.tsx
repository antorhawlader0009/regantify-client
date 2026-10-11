import { Field } from './ProductFormPieces';

const inputClass = 'h-10 w-40 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

/**
 * Wholesale price (TellMe idea 79): shown and charged only to a logged-in customer whose phone carries the store's wholesale tag
 * (Customers > Note & tags; the tag name is in Stock Settings). The lowest of it and the other prices wins. StorePal only.
 */
export function WholesalePriceField({ value, onChange, price }: { value: string; onChange: (value: string) => void; price: string }) {
  const wholesale = Number(value);
  const regular = Number(price);
  return (
    <div className="mt-5 border-t border-line pt-5">
      <Field label="Wholesale price" hint="Optional. Only customers with the wholesale tag, and only after they log in, see and pay this. Nobody else ever sees it.">
        <input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))} placeholder="Not set" className={inputClass} />
      </Field>
      {value !== '' && regular > 0 && wholesale >= regular && <p className="mt-1.5 text-xs text-amber-700">This is not lower than the normal price, so it will never be used.</p>}
    </div>
  );
}
