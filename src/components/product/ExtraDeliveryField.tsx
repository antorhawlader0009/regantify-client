import { Field } from './ProductFormPieces';

const inputClass = 'h-10 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

/**
 * "Extra delivery charge" (TellMe idea 117): a flat amount added to the delivery charge when this product is in the cart, for a product that is light but
 * awkward (a mirror, a piece of furniture, chilled food). Once per order, or for every piece. A free-shipping coupon or discount waives it, pickup pays none,
 * and it adds to the weight charge if the store uses one. Storefront orders only.
 */
export function ExtraDeliveryField({ amount, onAmount, perPiece, onPerPiece }: { amount: string; onAmount: (v: string) => void; perPiece: boolean; onPerPiece: (v: boolean) => void }) {
  return (
    <div className="mt-5 border-t border-line pt-5">
      <div className="flex flex-wrap gap-4">
        <Field label="Extra delivery charge (৳)" hint="Optional. Added to the delivery charge when this product is bought, for heavy or special items.">
          <input type="text" inputMode="decimal" value={amount} onChange={(e) => onAmount(e.target.value.replace(/[^\d.]/g, '').slice(0, 7))} placeholder="0" className={`${inputClass} w-32`} />
        </Field>
        <Field label="Charged">
          <select value={perPiece ? 'PIECE' : 'ORDER'} onChange={(e) => onPerPiece(e.target.value === 'PIECE')} className={`${inputClass} w-48`}>
            <option value="ORDER">Once per order</option>
            <option value="PIECE">For every piece</option>
          </select>
        </Field>
      </div>
    </div>
  );
}
