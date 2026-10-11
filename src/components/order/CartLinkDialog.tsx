import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link2, Trash2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { productsApi, type Product } from '../../lib/productsApi';
import { getVendorSettings } from '../../lib/vendorApi';
import { storefrontStoreUrl } from '../../lib/storefrontUrl';
import { encodeCartLink, MAX_CART_LINK_LINES, type CartLinkLine } from '../../lib/cartLink';
import { toast } from '../../lib/toast';

interface Row extends CartLinkLine {
  key: string;
  name: string;
}

/**
 * Orders > "Cart link" (TellMe idea 77): pick products (with their options) and quantities, copy a link to send on WhatsApp or
 * Messenger. The shopper opens it with the cart filled and goes straight to checkout. Nothing is saved: the link holds slugs,
 * options and quantities, and the store looks every line up again at today's price and stock when it is opened.
 */
export function CartLinkDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [coupon, setCoupon] = useState('');
  const [picked, setPicked] = useState<Product | null>(null);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);

  const { data: settings } = useQuery({ queryKey: ['vendor-settings'], queryFn: getVendorSettings, enabled: open });
  const { data: found } = useQuery({
    queryKey: ['cart-link-products', search],
    queryFn: () => productsApi.list({ search, visibility: 'PUBLIC', perPage: 8 }),
    enabled: open && search.trim().length >= 2 && !picked,
  });
  const pick = useMutation({
    mutationFn: (id: string) => productsApi.findOne(id),
    onSuccess: (p) => {
      setPicked(p);
      setOptions(Object.fromEntries((p.variationOptions ?? []).map((o) => [o.name, o.values[0] ?? ''])));
      setQty(1);
    },
  });

  const addRow = () => {
    if (!picked || !picked.slug) return;
    if (rows.length >= MAX_CART_LINK_LINES) {
      toast.error(`A cart link holds at most ${MAX_CART_LINK_LINES} lines.`);
      return;
    }
    const hasOptions = (picked.variationOptions ?? []).length > 0;
    const label = hasOptions ? `${picked.name} (${Object.values(options).join(' / ')})` : picked.name;
    setRows((r) => [...r, { key: `${picked.id}-${Date.now()}`, slug: picked.slug!, quantity: Math.max(1, qty), options: hasOptions ? options : {}, name: label }]);
    setPicked(null);
    setSearch('');
  };

  const link = rows.length && settings ? `${storefrontStoreUrl(settings.subdomain)}/cart-link/${encodeCartLink(rows)}${coupon.trim() ? `?coupon=${encodeURIComponent(coupon.trim())}` : ''}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy. Select the link and copy it by hand.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Cart link" maxWidth="max-w-lg">
      <div className="space-y-4 px-6 pb-6 pt-3">
        <p className="text-sm text-neutral-600">Pick the products a customer asked for and send them one link. They open it with the cart filled and tap “Checkout”. Prices and stock are checked again when they open it.</p>

        {!picked ? (
          <div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a product…" className="h-10 w-full rounded-lg border border-line px-3 text-sm" />
            {found && found.products.length > 0 && (
              <ul className="mt-1 max-h-48 divide-y divide-line overflow-auto rounded-lg border border-line">
                {found.products.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => pick.mutate(p.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50">
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-line p-3">
            <p className="text-sm font-medium text-regantify-text">{picked.name}</p>
            {(picked.variationOptions ?? []).map((o) => (
              <label key={o.id} className="block text-xs text-neutral-500">
                {o.name}
                <select value={options[o.name] ?? ''} onChange={(e) => setOptions((cur) => ({ ...cur, [o.name]: e.target.value }))} className="mt-1 block h-9 w-full rounded-lg border border-line bg-white px-2 text-sm text-regantify-text">
                  {o.values.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label className="block text-xs text-neutral-500">
              Quantity
              <input type="number" min={1} max={999} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="mt-1 block h-9 w-24 rounded-lg border border-line px-2 text-sm text-regantify-text" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={addRow} className="h-9 rounded-lg bg-regantify-cta px-4 text-sm font-medium text-white hover:bg-regantify-cta-dark">
                Add to link
              </button>
              <button type="button" onClick={() => setPicked(null)} className="h-9 rounded-lg border border-line px-3 text-sm text-neutral-600 hover:bg-neutral-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line text-sm">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0 truncate">
                  {r.name} <span className="text-neutral-500">× {r.quantity}</span>
                </span>
                <button type="button" onClick={() => setRows((cur) => cur.filter((x) => x.key !== r.key))} className="text-neutral-400 hover:text-red-600" aria-label="Remove">
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {rows.length > 0 && (
          <>
            <label className="block text-xs text-neutral-500">
              Coupon link name (optional)
              <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="The link name of a coupon" className="mt-1 block h-9 w-full rounded-lg border border-line px-3 text-sm text-regantify-text" />
            </label>
            <div className="flex items-center gap-2">
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-neutral-50 px-3 text-xs" />
              <button type="button" onClick={copy} disabled={!link} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60">
                <Link2 size={15} /> Copy
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
