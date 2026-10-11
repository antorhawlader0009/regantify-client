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
}: {
  value: PickedItem[];
  onChange: (items: PickedItem[]) => void;
  /** The product being edited: it cannot suggest itself. */
  excludeId?: string;
}) {
  const handle = (items: PickedItem[]) => onChange(items.filter((i) => i.id !== excludeId).slice(0, MAX_ADDONS));
  return (
    <div>
      <ProductPicker label="Show with this (optional)" selected={value} onChange={handle} />
      <p className="mt-1 text-xs text-neutral-500">
        Up to {MAX_ADDONS} products. When a shopper has this product in the cart, these are offered under it (StorePal store). Products with
        sizes or colours are not offered.
      </p>
    </div>
  );
}
