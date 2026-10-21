import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, MessageCircle, Trash2, Zap } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { instantCheckoutApi, type CreatedInstantLink, type InstantLinkLine, type InstantProduct, type InstantZone } from '../../lib/instantCheckoutApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const input = 'mt-1 block h-9 w-full rounded-lg border border-line bg-white px-2.5 text-sm text-regantify-text focus:border-brand focus:outline-none';

export interface InstantCustomer {
  customerName?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
}

/**
 * "Instant checkout link": pick the products a customer asked for and fill in their details; the customer opens the link and
 * lands in the store's checkout already filled in, so they only choose how to pay and tap Place order. Opened from Orders and
 * from a saved chat (Orders > Chat orders, with its details and `chatRecordId`, so the order marks the chat as ordered).
 */
export function InstantCheckoutDialog({
  open,
  onOpenChange,
  customer,
  chatRecordId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: InstantCustomer;
  chatRecordId?: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<InstantProduct | null>(null);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [lines, setLines] = useState<Array<InstantLinkLine & { key: string }>>([]);
  const [name, setName] = useState(customer?.customerName ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [district, setDistrict] = useState(customer?.district ?? '');
  const [zone, setZone] = useState<InstantZone | ''>(/dhaka/i.test(customer?.district ?? '') ? 'DHAKA' : '');
  const [coupon, setCoupon] = useState('');
  const [hours, setHours] = useState(72);
  const [made, setMade] = useState<CreatedInstantLink | null>(null);
  const [lang, setLang] = useState<'en' | 'bn'>('bn');

  const { data: found } = useQuery({
    queryKey: ['instant-products', search],
    queryFn: () => instantCheckoutApi.products(search),
    enabled: open && !picked && search.trim().length >= 2,
  });

  const create = useMutation({
    mutationFn: () =>
      instantCheckoutApi.create({
        lines: lines.map(({ slug, name: n, quantity, options: o }) => ({ slug, name: n, quantity, options: o })),
        customerName: name.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        district: district.trim() || undefined,
        zone: zone || undefined,
        couponCode: coupon.trim() || undefined,
        expiresInHours: hours,
        chatRecordId,
      }),
    onSuccess: (r) => {
      setMade(r);
      void queryClient.invalidateQueries({ queryKey: ['instant-links'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not make the link.')),
  });

  const pick = (p: InstantProduct) => {
    setPicked(p);
    setOptions(Object.fromEntries(p.options.map((o) => [o.name, o.values[0] ?? ''])));
    setQty(1);
  };
  const addLine = () => {
    if (!picked) return;
    const label = picked.options.length ? `${picked.name} (${Object.values(options).join(' / ')})` : picked.name;
    setLines((cur) => [...cur, { key: `${picked.id}-${Date.now()}`, slug: picked.slug, name: label, quantity: Math.max(1, Math.min(999, qty)), options }]);
    setPicked(null);
    setSearch('');
  };
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied.`);
    } catch {
      toast.error('Could not copy. Select it and copy it by hand.');
    }
  };
  const waNumber = /^01[3-9]\d{8}$/.test(phone.trim()) ? `88${phone.trim()}` : '';

  const reset = (o: boolean) => {
    if (!o) {
      setMade(null);
      setLines([]);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={reset} title="Instant checkout link" maxWidth="max-w-lg">
      <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
        {made ? (
          <>
            <p className="flex items-center gap-2 font-medium text-emerald-700">
              <Zap size={16} aria-hidden /> The link is ready. Send it to the customer.
            </p>
            <div className="flex items-center gap-2">
              <input readOnly value={made.url} onFocus={(e) => e.currentTarget.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-neutral-50 px-3 text-xs" />
              <button type="button" onClick={() => copy(made.url, 'Link')} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-white px-3 font-medium hover:bg-neutral-50">
                <Copy size={15} /> Link
              </button>
            </div>
            <div>
              <div className="mb-1 flex gap-1 text-xs">
                {(['bn', 'en'] as const).map((l) => (
                  <button key={l} type="button" onClick={() => setLang(l)} className={`rounded-full px-2.5 py-0.5 ${lang === l ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                    {l === 'bn' ? 'Bangla' : 'English'}
                  </button>
                ))}
              </div>
              <textarea readOnly rows={3} value={made.message[lang]} className="w-full rounded-lg border border-line bg-neutral-50 p-2 text-xs" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(made.message[lang], 'Message')} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-regantify-cta px-3 font-medium text-white hover:bg-regantify-cta-dark">
                  <Copy size={15} /> Copy message
                </button>
                {waNumber && (
                  <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(made.message[lang])}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 hover:bg-neutral-50">
                    <MessageCircle size={15} /> Open in WhatsApp
                  </a>
                )}
              </div>
            </div>
            <p className="text-xs text-neutral-500">It works until {new Date(made.expiresAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}, once. The order then shows here under Chat orders &gt; Instant checkout links.</p>
          </>
        ) : (
          <>
            <p className="text-neutral-600">Pick the products and fill in the customer. They open the link, check the order and confirm in one tap. Prices and stock are checked again when they open it.</p>

            {!picked ? (
              <div>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a product by name or SKU…" className="h-10 w-full rounded-lg border border-line px-3" />
                {found && found.length > 0 && (
                  <ul className="mt-1 max-h-48 divide-y divide-line overflow-auto rounded-lg border border-line">
                    {found.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => pick(p)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-neutral-50">
                          <span className="truncate">{p.name}</span>
                          <span className="shrink-0 text-xs text-neutral-500">৳{p.price}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-line p-3">
                <p className="font-medium text-regantify-text">{picked.name}</p>
                {picked.options.map((o) => (
                  <label key={o.name} className="block text-xs text-neutral-500">
                    {o.name}
                    <select value={options[o.name] ?? ''} onChange={(e) => setOptions((cur) => ({ ...cur, [o.name]: e.target.value }))} className={input}>
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
                  <input type="number" min={1} max={999} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={`${input} w-24`} />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={addLine} className="h-9 rounded-lg bg-regantify-cta px-4 font-medium text-white hover:bg-regantify-cta-dark">
                    Add
                  </button>
                  <button type="button" onClick={() => setPicked(null)} className="h-9 rounded-lg border border-line px-3 text-neutral-600 hover:bg-neutral-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {lines.length > 0 && (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {lines.map((l) => (
                  <li key={l.key} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 truncate">
                      {l.name} <span className="text-neutral-500">× {l.quantity}</span>
                    </span>
                    <button type="button" onClick={() => setLines((cur) => cur.filter((x) => x.key !== l.key))} className="text-neutral-400 hover:text-red-600" aria-label="Remove">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-neutral-500">
                Customer name
                <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
              </label>
              <label className="text-xs text-neutral-500">
                Phone
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className={input} />
              </label>
              <label className="text-xs text-neutral-500 sm:col-span-2">
                Address
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
              </label>
              <label className="text-xs text-neutral-500">
                District
                <input value={district} onChange={(e) => setDistrict(e.target.value)} className={input} />
              </label>
              <label className="text-xs text-neutral-500">
                Delivery area
                <select value={zone} onChange={(e) => setZone(e.target.value as InstantZone | '')} className={input}>
                  <option value="">Customer picks</option>
                  <option value="DHAKA">Inside Dhaka</option>
                  <option value="AROUND_DHAKA">Around Dhaka</option>
                  <option value="OUTSIDE_DHAKA">Outside Dhaka</option>
                </select>
              </label>
              <label className="text-xs text-neutral-500">
                Coupon code (optional)
                <input value={coupon} onChange={(e) => setCoupon(e.target.value)} className={input} />
              </label>
              <label className="text-xs text-neutral-500">
                Link works for
                <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={input}>
                  <option value={24}>1 day</option>
                  <option value={72}>3 days</option>
                  <option value={168}>7 days</option>
                </select>
              </label>
            </div>
            <p className="text-xs text-neutral-500">The details only fill the checkout for them; they can still change anything. Phone and address are stored encrypted.</p>
            <button type="button" disabled={lines.length === 0 || create.isPending} onClick={() => create.mutate()} className="h-10 w-full rounded-lg bg-regantify-cta font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60">
              Make the link
            </button>
          </>
        )}
      </div>
    </Dialog>
  );
}
