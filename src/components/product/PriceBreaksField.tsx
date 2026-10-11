import { Field } from './ProductFormPieces';

const inputClass =
  'h-10 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15';

export const MAX_PRICE_BREAKS = 4;

/** One row while editing, as typed. */
export interface PriceBreakRow {
  minQty: string;
  price: string;
}

/** A saved product's breaks as rows. */
export function breakRowsFromProduct(breaks: Array<{ minQty: number; price: number }> | null | undefined): PriceBreakRow[] {
  return (breaks ?? []).map((b) => ({ minQty: String(b.minQty), price: String(b.price) }));
}

/** The rows that are complete, as the product API takes them (the server cleans them again). */
export function breakPayload(rows: PriceBreakRow[]): Array<{ minQty: number; price: number }> {
  return rows
    .map((r) => ({ minQty: Math.floor(Number(r.minQty)), price: Number(r.price) }))
    .filter((r) => Number.isFinite(r.minQty) && r.minQty >= 2 && Number.isFinite(r.price) && r.price > 0);
}

/**
 * Add / Edit Product: "Cheaper when you buy more" (TellMe idea 67). Up to 4 steps: from N pieces of this product in one order (all
 * its variations together) each piece costs less. Shoppers see the steps on the product page and the price follows the quantity in
 * the cart. The lowest of the normal price, a campaign, a flash sale and the step price always wins; a step never raises a price.
 * Your own Add Order and the POS keep typing prices by hand.
 */
export function PriceBreaksField({
  rows,
  onChange,
  price,
  cost,
}: {
  rows: PriceBreakRow[];
  onChange: (rows: PriceBreakRow[]) => void;
  /** The price a piece costs without a step (the sale price when there is one), as typed. */
  price: string;
  /** What a piece costs you, as typed; a step under it is flagged. */
  cost: string;
}) {
  const set = (i: number, patch: Partial<PriceBreakRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const regular = Number(price);
  const costNum = cost.trim() ? Number(cost) : null;
  return (
    <div className="mt-5 border-t border-line pt-4">
      <Field label="Cheaper when you buy more" hint="For wholesale or bulk buyers, e.g. 10 or more at ৳450 each. Optional, up to 4 steps.">
        <div className="space-y-2">
          {rows.map((r, i) => {
            const p = Number(r.price);
            const tooHigh = r.price !== '' && Number.isFinite(regular) && regular > 0 && p >= regular;
            const underCost = r.price !== '' && costNum !== null && Number.isFinite(costNum) && p < costNum;
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-neutral-600">From</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={2}
                  value={r.minQty}
                  onChange={(e) => set(i, { minQty: e.target.value.replace(/\D/g, '') })}
                  aria-label={`Step ${i + 1} pieces`}
                  className={`${inputClass} w-24`}
                />
                <span className="text-sm text-neutral-600">pieces, each ৳</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={r.price}
                  onChange={(e) => set(i, { price: e.target.value })}
                  aria-label={`Step ${i + 1} price`}
                  className={`${inputClass} w-28`}
                />
                <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-sm text-neutral-500 hover:text-red-600">
                  Remove
                </button>
                {tooHigh && <span className="text-xs text-amber-700">Not lower than the normal price, so it will be ignored.</span>}
                {underCost && <span className="text-xs text-red-700">Below your cost: each piece sold at this step loses money.</span>}
              </div>
            );
          })}
          {rows.length < MAX_PRICE_BREAKS && (
            <button type="button" onClick={() => onChange([...rows, { minQty: '', price: '' }])} className="text-sm font-medium text-brand hover:underline">
              + Add a price step
            </button>
          )}
        </div>
      </Field>
    </div>
  );
}
