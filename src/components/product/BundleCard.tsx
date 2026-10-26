import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { productsApi, type Product } from '../../lib/productsApi';
import { SectionCard } from './ProductFormPieces';

export const MIN_BUNDLE_PARTS = 2;
export const MAX_BUNDLE_PARTS = 10;
/** "Pick N" box (IDEA-22): the shopper picks this many pieces from the listed products, which may be up to 30. */
export const MIN_PICK = 2;
export const MAX_PICK = 20;
export const MAX_PICK_CHOICES = 30;

/** One part of the set as the form holds it. */
export interface BundlePart {
  productId: string;
  name: string;
  sku: string;
  photoUrl: string | null;
  /** What it sells for on its own today (the sale price when it has one). */
  unitPrice: number;
  /** In stock now; null = no stock count (unlimited). */
  stock: number | null;
  quantity: number;
}

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** A saved bundle's parts (the product API's bundleItems) as the form's list. */
export function bundlePartsFromProduct(
  items:
    | Array<{
        quantity: number;
        component: { id: string; name: string; sku: string; photoUrls: string[]; price: string; discountPrice?: string | null; stockQuantity: number | null };
      }>
    | undefined,
): BundlePart[] {
  return (items ?? []).map((b) => ({
    productId: b.component.id,
    name: b.component.name,
    sku: b.component.sku,
    photoUrl: b.component.photoUrls[0] ?? null,
    unitPrice: Number(b.component.discountPrice ?? b.component.price),
    stock: b.component.stockQuantity,
    quantity: b.quantity,
  }));
}

/** The parts as the product API takes them. */
export const bundleItemsPayload = (parts: BundlePart[]) => parts.map((p) => ({ productId: p.productId, quantity: p.quantity }));

/**
 * How many whole sets (or, for a "pick N" box, boxes) the parts' stock allows (null = unlimited). A box needs `pick` pieces and takes at most
 * `quantity` of one choice; s boxes can be filled when the choices supply s * pick pieces. Same rule as the server (products/product-bundle.ts).
 */
export function setsAvailable(parts: BundlePart[], pick: number | null = null): number | null {
  if (pick) {
    const open = parts.filter((p) => p.stock === null);
    const counted = parts.filter((p) => p.stock !== null);
    const openMost = open.reduce((sum, p) => sum + p.quantity, 0);
    if (openMost >= pick) return null;
    const fillable = (n: number) => counted.reduce((sum, p) => sum + Math.min(Math.max(0, p.stock as number), n * p.quantity), 0) + n * openMost >= n * pick;
    let lo = 0;
    let hi = Math.floor(counted.reduce((sum, p) => sum + Math.max(0, p.stock as number), 0) / Math.max(1, pick - openMost));
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fillable(mid)) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
  let fewest: number | null = null;
  for (const p of parts) {
    if (p.stock === null) continue;
    const sets = Math.max(0, Math.floor(p.stock / Math.max(1, p.quantity)));
    fewest = fewest === null ? sets : Math.min(fewest, sets);
  }
  return fewest;
}

/** The message for a bundle that cannot be saved yet, or null when its parts are fine. */
export function bundleError(parts: BundlePart[], pick: number | null = null): string | null {
  if (parts.length < MIN_BUNDLE_PARTS) return `Pick at least ${MIN_BUNDLE_PARTS} products for the ${pick ? 'box' : 'bundle'}.`;
  if (pick) {
    if (!Number.isInteger(pick) || pick < MIN_PICK || pick > MAX_PICK) return `Shoppers can pick ${MIN_PICK} to ${MAX_PICK} items for a box.`;
    const room = parts.reduce((sum, p) => sum + p.quantity, 0);
    if (room < pick) return `Shoppers pick ${pick} items, but these choices allow only ${room} in one box. Add more choices or allow more of each.`;
  }
  return null;
}

/** What the picked pieces add up to when bought one by one: the cheapest and the dearest box the choices allow (null when it cannot be filled). */
export function pickPriceRange(parts: BundlePart[], pick: number): { cheapest: number; dearest: number } | null {
  const fill = (order: BundlePart[]) => {
    let left = pick;
    let total = 0;
    for (const p of order) {
      const take = Math.min(p.quantity, left);
      total += take * p.unitPrice;
      left -= take;
    }
    return left === 0 ? total : null;
  };
  const cheapest = fill([...parts].sort((a, b) => a.unitPrice - b.unitPrice));
  const dearest = fill([...parts].sort((a, b) => b.unitPrice - a.unitPrice));
  return cheapest === null || dearest === null ? null : { cheapest, dearest };
}

/**
 * Add / Edit Product: "Bundle" (TellMe idea 51). A product made of 2 to 10 of the store's own products, each with a
 * quantity per set, sold at the price set above. It keeps no stock of its own: the fewest sets its parts allow is what
 * shows on the store, an order takes every part's stock (and the stock history says so), and Cancel or Return gives it
 * back. Only products without sizes or colours can go in.
 */
export function BundleCard({
  isBundle,
  onIsBundle,
  parts,
  onParts,
  pick,
  onPick,
  price,
  discountPrice,
  excludeId,
}: {
  isBundle: boolean;
  onIsBundle: (value: boolean) => void;
  parts: BundlePart[];
  onParts: (parts: BundlePart[]) => void;
  /** `null` = a fixed set (every part goes in); a number = a box the shopper fills with that many pieces. */
  pick: number | null;
  onPick: (value: number | null) => void;
  /** The bundle's own price fields, as typed. */
  price: string;
  discountPrice: string;
  /** The product being edited: it cannot hold itself. */
  excludeId?: string;
}) {
  const [query, setQuery] = useState('');
  const { data } = useQuery({
    queryKey: ['bundle-parts-search', query],
    queryFn: () => productsApi.list({ search: query.trim(), perPage: 8 }),
    enabled: isBundle && query.trim().length > 0,
  });
  const taken = new Set(parts.map((p) => p.productId));
  const results = (data?.products ?? []).filter((p: Product) => p.id !== excludeId && !taken.has(p.id));

  const separate = parts.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);
  const bundlePrice = Number(discountPrice.trim() || price);
  const saving = separate - bundlePrice;
  const sets = setsAvailable(parts, pick);
  const maxParts = pick ? MAX_PICK_CHOICES : MAX_BUNDLE_PARTS;
  const range = pick ? pickPriceRange(parts, pick) : null;

  const add = (p: Product) => {
    if (parts.length >= maxParts) return;
    const unusable = (p.variants?.length ?? 0) > 0 || p.isBundle || p.isPreOrder;
    if (unusable) return;
    onParts([
      ...parts,
      {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        photoUrl: p.photoUrls[0] ?? null,
        unitPrice: Number(p.discountPrice ?? p.price),
        stock: p.stockQuantity ?? null,
        quantity: 1,
      },
    ]);
    setQuery('');
  };

  return (
    <SectionCard
      title="Bundle"
      id="bundle"
      description="Sell several of your products together as one set, like “Shirt + Belt + Wallet” or an Eid combo."
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={isBundle}
          onChange={(e) => onIsBundle(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-brand"
        />
        <span>
          <span className="block text-sm text-regantify-text">This product is a bundle of other products</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">
            It has no stock or variations of its own. Its stock is the fewest sets the products inside allow, and each order takes every part
            out of stock.
          </span>
        </span>
      </label>

      {isBundle && (
        <div className="mt-4 space-y-3">
          <div className="space-y-2 rounded-lg border border-line p-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="radio" name="bundle-mode" checked={!pick} onChange={() => onPick(null)} className="mt-1 h-4 w-4 cursor-pointer accent-brand" />
              <span className="text-sm text-regantify-text">
                Fixed set
                <span className="block text-xs text-neutral-500">Every product below goes into each set, like Shirt + Belt + Wallet.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="radio" name="bundle-mode" checked={!!pick} onChange={() => onPick(pick ?? 3)} className="mt-1 h-4 w-4 cursor-pointer accent-brand" />
              <span className="text-sm text-regantify-text">
                Shopper picks
                <span className="block text-xs text-neutral-500">
                  The shopper fills the box with any N of the products below, like “any 3 attar for ৳999”. The price above is for the whole box.
                </span>
              </span>
            </label>
            {pick ? (
              <label className="ml-6 flex flex-wrap items-center gap-2 text-sm text-regantify-text">
                Items to pick
                <input
                  type="number"
                  inputMode="numeric"
                  min={MIN_PICK}
                  max={MAX_PICK}
                  value={pick}
                  onChange={(e) => onPick(Math.min(MAX_PICK, Math.max(MIN_PICK, Number(e.target.value.replace(/\D/g, '')) || MIN_PICK)))}
                  className="h-9 w-16 rounded-lg border border-line px-2 text-sm outline-none focus:border-brand"
                />
                <span className="text-xs text-neutral-500">Short lists sell best: pick 3 from 12 beats “any 3 from the whole shop”.</span>
              </label>
            ) : null}
          </div>
          {parts.length > 0 && (
            <ul className="space-y-2">
              {parts.map((p) => (
                <li key={p.productId} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded bg-neutral-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-regantify-text">{p.name}</p>
                    <p className="text-xs text-neutral-500">
                      {taka(p.unitPrice)} each · {p.stock === null ? 'unlimited stock' : `${p.stock} in stock`}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                    {pick ? 'Most per box' : 'Qty'}
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={99}
                      value={p.quantity}
                      onChange={(e) =>
                        onParts(parts.map((x) => (x.productId === p.productId ? { ...x, quantity: Math.min(99, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)) } : x)))
                      }
                      className="h-9 w-16 rounded-lg border border-line px-2 text-sm text-regantify-text outline-none focus:border-brand"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => onParts(parts.filter((x) => x.productId !== p.productId))}
                    aria-label={`Remove ${p.name}`}
                    className="rounded p-1 text-neutral-400 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {parts.length < maxParts && (
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search your products to add (2 to ${maxParts})`}
                className="h-10 w-full rounded-lg border border-line pl-9 pr-3 text-sm text-regantify-text outline-none focus:border-brand"
              />
              {query.trim() && (
                <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
                  {results.length === 0 && <li className="px-3 py-2 text-sm text-neutral-500">No products match.</li>}
                  {results.map((p: Product) => {
                    const unusable = (p.variants?.length ?? 0) > 0 || p.isBundle || p.isPreOrder;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={unusable}
                          onClick={() => add(p)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="truncate text-regantify-text">{p.name}</span>
                          <span className="shrink-0 text-xs text-neutral-500">
                            {unusable ? (p.isBundle ? 'a bundle' : p.isPreOrder ? 'pre-order' : 'has variations') : taka(Number(p.discountPrice ?? p.price))}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {parts.length >= MIN_BUNDLE_PARTS && (
            <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
              <p>
                Bought one by one:{' '}
                <span className="font-medium text-regantify-text">
                  {pick ? (range ? `${taka(range.cheapest)} to ${taka(range.dearest)} (depends on what is picked)` : 'add more choices to fill a box') : taka(separate)}
                </span>
              </p>
              {pick && range && Number.isFinite(bundlePrice) && bundlePrice > 0 && (
                <p className="mt-0.5">
                  Box price: <span className="font-medium text-regantify-text">{taka(bundlePrice)}</span>
                  {bundlePrice < range.cheapest ? (
                    <span className="text-green-700"> · shoppers always save</span>
                  ) : bundlePrice >= range.dearest ? (
                    <span className="text-amber-700"> · the box costs as much as the dearest picks bought separately</span>
                  ) : (
                    <span className="text-amber-700"> · picking cheap items costs less than the box</span>
                  )}
                </p>
              )}
              {!pick && Number.isFinite(bundlePrice) && bundlePrice > 0 && (
                <p className="mt-0.5">
                  Bundle price: <span className="font-medium text-regantify-text">{taka(bundlePrice)}</span>
                  {saving > 0 ? (
                    <span className="text-green-700"> · shoppers save {taka(saving)} ({Math.round((saving / separate) * 100)}%)</span>
                  ) : (
                    <span className="text-amber-700"> · the bundle costs the same or more than buying separately</span>
                  )}
                </p>
              )}
              <p className="mt-0.5">
                {pick ? 'Boxes' : 'Sets'} you can sell now:{' '}
                <span className="font-medium text-regantify-text">{sets === null ? 'unlimited' : sets}</span>
              </p>
            </div>
          )}
          <p className="text-xs text-neutral-500">
            Only products without sizes or colours can go in a bundle.{' '}
            {pick ? 'Each order saves what the shopper picked and takes exactly those products out of stock. ' : ''}Change the products or quantities later and it
            applies to new orders; orders already placed keep what they had.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
