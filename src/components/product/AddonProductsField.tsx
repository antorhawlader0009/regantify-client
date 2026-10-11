import { ProductPicker, type PickedItem } from '../../pages/vendor/marketing/MarketingKit';

export const MAX_ADDONS = 3;

/**
 * Add/Edit Product > "Show with this" (TellMe idea 48): up to 3 other products the cart suggests, in one tap, when
 * this product is in it (a cover with a phone, a refill with a pen). StorePal stores only. Products with sizes or
 * colours, hidden or sold-out ones are skipped by the store when it shows them.
 */
export function AddonProductsField({
  value,
  onChange,
  excludeId,
  together = [],
}: {
  value: PickedItem[];
  onChange: (items: PickedItem[]) => void;
  /** The product being edited: it cannot suggest itself. */
  excludeId?: string;
  /** What real orders pair with this product (TellMe idea 97), shown read only with a one-click way to take them over. */
  together?: Array<{ id: string; name: string; photoUrl: string | null }>;
}) {
  const handle = (items: PickedItem[]) => onChange(items.filter((i) => i.id !== excludeId).slice(0, MAX_ADDONS));
  return (
    <div>
      <ProductPicker label="Show with this (optional)" selected={value} onChange={handle} />
      <p className="mt-1 text-xs text-neutral-500">
        Up to {MAX_ADDONS} products. When a shopper has this product in the cart, these are offered under it (StorePal store). Products with
        sizes or colours are not offered. Your picks come first; the store fills the rest with what customers buy together.
      </p>
      {together.length > 0 && (
        <div className="mt-2 rounded-lg border border-line bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          <p className="font-medium text-regantify-text">Usually sold together with this (from your last 90 days of orders)</p>
          <p className="mt-0.5">{together.map((t) => t.name).join(' · ')}</p>
          <button
            type="button"
            onClick={() => handle([...value, ...together.filter((t) => !value.some((v) => v.id === t.id)).map((t) => ({ id: t.id, label: t.name, photoUrl: t.photoUrl }))])}
            className="mt-1 font-medium text-regantify-cta hover:underline"
          >
            Add them to my picks
          </button>
        </div>
      )}
    </div>
  );
}
