import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Package, Plus, Search, Trash2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { productInputClass } from '../product/ProductFormPieces';
import { productsApi, type Product, type ProductVariant } from '../../lib/productsApi';
import { ordersApi, type Order } from '../../lib/ordersApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

/** Order statuses whose items can still change (OrdersService.updateItems, ITEMS_EDITABLE_STATUSES). */
const EDITABLE_STATUSES = new Set(['PENDING', 'ON_HOLD', 'PROCESSING', 'STOCK_OUT']);

/** Same checks the server makes, so the button only shows where saving can work. */
export function canEditOrderItems(order: Order): boolean {
  return (
    order.source !== 'POS' &&
    order.paymentMethod === 'COD' &&
    EDITABLE_STATUSES.has(order.status) &&
    order.courierBookingStatus !== 'BOOKED' &&
    order.courierBookingStatus !== 'BOOKING'
  );
}

interface Line {
  key: string;
  productId?: string;
  variantId?: string;
  productName: string;
  image?: string | null;
  unitPrice: string;
  quantity: number;
}

const money = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const variantLabel = (v: ProductVariant) => Object.values(v.optionValues).join(' / ');
/** Shop price of a product or one of its variations, as the storefront shows it. */
function shopPrice(product: Product, variant?: ProductVariant): number {
  return Number(variant?.discountPrice ?? variant?.listPrice ?? product.discountPrice ?? product.price);
}

/**
 * "Edit items" on Order detail: change quantities, swap a variation (M -> L), remove a line or add
 * another product, after the customer changed their mind on the confirmation call.
 */
export function EditOrderItemsDialog({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<Line[]>([]);
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    if (!open) return;
    setLines(
      order.items.map((i) => ({
        key: i.id,
        productId: i.productId ?? undefined,
        variantId: i.variantId ?? undefined,
        productName: i.productName,
        image: i.productImage,
        unitPrice: String(Number(i.unitPrice)),
        quantity: i.quantity,
      })),
    );
    setDeliveryCharge(String(Number(order.deliveryCharge)));
    setSearch('');
  }, [open, order]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  // The catalog products behind the lines, for their variations and prices.
  const productIds = useMemo(() => [...new Set(lines.map((l) => l.productId).filter((id): id is string => Boolean(id)))].sort(), [lines]);
  const { data: products = {} } = useQuery({
    queryKey: ['order-edit-products', productIds],
    queryFn: async () => {
      const found = await Promise.all(productIds.map((id) => productsApi.findOne(id).catch(() => null)));
      return Object.fromEntries(found.filter((p): p is Product => Boolean(p)).map((p) => [p.id, p]));
    },
    enabled: open && productIds.length > 0,
    placeholderData: (prev) => prev,
  });

  const { data: results = [], isFetching: searching } = useQuery({
    queryKey: ['orders-product-search', debounced],
    queryFn: () => productsApi.list({ search: debounced, perPage: 6 }).then((r) => r.products),
    enabled: open && debounced.length > 0,
  });

  const update = (key: string, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addProduct = (product: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id && !product.variants?.length);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        {
          key: `new-${product.id}-${Date.now()}`,
          productId: product.id,
          productName: product.name,
          image: product.photoUrls[0],
          unitPrice: String(shopPrice(product)),
          quantity: Math.max(1, product.minOrderQuantity ?? 1),
        },
      ];
    });
    setSearch('');
  };

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.unitPrice) || 0) * l.quantity, 0);
  const delivery = Number(deliveryCharge) || 0;
  const missingVariant = lines.find((l) => l.productId && (products[l.productId]?.variants?.length ?? 0) > 0 && !l.variantId);

  const save = useMutation({
    mutationFn: () =>
      ordersApi.updateItems(order.id, {
        items: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          unitPrice: Number(l.unitPrice) || 0,
          quantity: l.quantity,
        })),
        deliveryCharge: delivery,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['order-history', order.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Order items updated.');
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update the items. Please try again.')),
  });

  const handleSave = () => {
    if (lines.length === 0) return toast.error('An order needs at least one item.');
    if (missingVariant) return toast.error(`Choose a variation for ${missingVariant.productName}.`);
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Edit items" maxWidth="max-w-2xl">
      <div className="space-y-4 px-6 pb-6 pt-4">
        <ul className="divide-y divide-line rounded-lg border border-line">
          {lines.map((line) => {
            const product = line.productId ? products[line.productId] : undefined;
            const variants = product?.variants ?? [];
            return (
              <li key={line.key} className="flex flex-wrap items-center gap-3 p-3">
                {line.image ? (
                  <img src={line.image} alt="" className="h-10 w-10 shrink-0 rounded-md border border-line object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-400">
                    <Package size={15} aria-hidden />
                  </span>
                )}
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-medium text-regantify-text">{line.productName}</p>
                  {variants.length > 0 && (
                    <select
                      value={line.variantId ?? ''}
                      onChange={(e) => {
                        const variant = variants.find((v) => v.id === e.target.value);
                        update(line.key, { variantId: variant?.id, unitPrice: variant && product ? String(shopPrice(product, variant)) : line.unitPrice });
                      }}
                      aria-label="Variation"
                      className={`${productInputClass} mt-1 !py-1 text-xs`}
                    >
                      <option value="">Choose a variation…</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {variantLabel(v)} ({v.stock} in stock)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <label className="flex items-center gap-1 text-xs text-neutral-500">
                  ৳
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={line.unitPrice}
                    onChange={(e) => update(line.key, { unitPrice: e.target.value })}
                    aria-label="Price for one"
                    className={`${productInputClass} !w-24 !py-1 text-sm`}
                  />
                </label>
                <div className="inline-flex items-center overflow-hidden rounded-md border border-line">
                  <button type="button" onClick={() => update(line.key, { quantity: Math.max(1, line.quantity - 1) })} className="flex h-8 w-8 items-center justify-center hover:bg-neutral-50" aria-label="One less">
                    <Minus size={13} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => update(line.key, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                    aria-label="Quantity"
                    className="h-8 w-12 border-x border-line text-center text-sm outline-none"
                  />
                  <button type="button" onClick={() => update(line.key, { quantity: line.quantity + 1 })} className="flex h-8 w-8 items-center justify-center hover:bg-neutral-50" aria-label="One more">
                    <Plus size={13} />
                  </button>
                </div>
                <span className="w-20 text-right text-sm font-medium tabular-nums">{money((Number(line.unitPrice) || 0) * line.quantity)}</span>
                <button
                  type="button"
                  onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remove ${line.productName}`}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
          {lines.length === 0 && <li className="p-4 text-center text-sm text-neutral-500">No items. Add a product below.</li>}
        </ul>

        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Add a product: search by name or SKU" className={`${productInputClass} pl-9`} />
          {debounced && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
              {results.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => addProduct(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50">
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="shrink-0 tabular-nums text-neutral-500">{money(shopPrice(p))}</span>
                  </button>
                </li>
              ))}
              {!searching && results.length === 0 && <li className="px-3 py-2 text-sm text-neutral-500">No products found.</li>}
            </ul>
          )}
        </div>

        <div className="space-y-2 border-t border-line pt-3 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{money(subtotal)}</span>
          </div>
          <label className="flex items-center justify-between gap-3 text-neutral-600">
            <span>Delivery charge</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(e.target.value)}
              className={`${productInputClass} !w-28 !py-1 text-right`}
            />
          </label>
          <p className="text-xs text-neutral-500">VAT, discount and platform charge are worked out again when you save. Stock is adjusted for the change.</p>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={save.isPending} className={primaryBtn}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
