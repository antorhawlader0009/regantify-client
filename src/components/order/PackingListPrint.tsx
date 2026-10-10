import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { codDue, orderRef, ordersApi, type Order } from '../../lib/ordersApi';
import { getVendorSettings } from '../../lib/vendorApi';
import { printElement } from '../../lib/printElement';
import { toast } from '../../lib/toast';

type Mode = 'BOTH' | 'PICK' | 'SLIPS';

const taka = (n: number) => `৳${n.toLocaleString('en-US')}`;
const optionsText = (o: Record<string, string> | null | undefined) => Object.values(o ?? {}).filter(Boolean).join(' / ');
const stamp = () => new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' });

/** One line of the pick list: a product (and option combination) with its total across the selected orders. */
interface PickLine {
  key: string;
  name: string;
  options: string;
  sku: string;
  image: string | null;
  quantity: number;
  /** Which orders it is for, with how many each, e.g. "ORDER-12 ×2". */
  orders: { ref: string; quantity: number }[];
}

/** Adds up the same product and option across orders, so the shelf is visited once. Sorted by name, then option. */
function buildPickList(orders: Order[]): PickLine[] {
  const lines = new Map<string, PickLine>();
  for (const order of orders) {
    for (const item of order.items) {
      const options = optionsText(item.selectedOptions);
      const key = `${item.variantId ?? item.productId ?? item.productSku}|${item.productName}|${options}`;
      const line = lines.get(key) ?? { key, name: item.productName, options, sku: item.productSku, image: item.productImage ?? null, quantity: 0, orders: [] };
      line.quantity += item.quantity;
      line.orders.push({ ref: orderRef(order), quantity: item.quantity });
      lines.set(key, line);
    }
  }
  return [...lines.values()].sort((a, b) => a.name.localeCompare(b.name) || a.options.localeCompare(b.options));
}

/**
 * Orders list "Print packing list" (TellMe idea 26): the paper for whoever packs. Two kinds, both without prices or
 * profit: a pick list (every selected order's products added up, so the shelf is visited once) and a packing slip per
 * order (what goes in its box, the customer's note, and the cash the courier collects). Phone numbers and street
 * addresses are left off on purpose: the packer doesn't need them.
 */
export function PackingListPrint({ ids, open, onOpenChange }: { ids: string[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const [mode, setMode] = useState<Mode>('BOTH');
  const [pictures, setPictures] = useState(true);
  const [showCash, setShowCash] = useState(true);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['packing-list-orders', ids],
    queryFn: () => Promise.all(ids.map((id) => ordersApi.findOne(id))),
    enabled: open && ids.length > 0,
  });
  // Owner-only; for staff the store name quietly stays empty.
  const { data: store } = useQuery({ queryKey: ['vendor-settings'], queryFn: getVendorSettings, enabled: open, retry: false, staleTime: 5 * 60_000 });

  const sorted = useMemo(() => [...(orders ?? [])].sort((a, b) => a.invoiceNumber - b.invoiceNumber), [orders]);
  const pick = useMemo(() => buildPickList(sorted), [sorted]);
  const pieces = pick.reduce((n, l) => n + l.quantity, 0);

  async function print() {
    if (!sheetRef.current || !orders) return;
    setPrinting(true);
    try {
      await printElement(sheetRef.current, `Packing list (${orders.length} orders)`);
    } catch {
      toast.error('Could not open the print window. Please try again.');
    } finally {
      setPrinting(false);
    }
  }

  const choice = (value: Mode, label: string, hint: string) => (
    <label className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${mode === value ? 'border-brand bg-brand/5' : 'border-line'}`}>
      <input type="radio" name="packing-mode" checked={mode === value} onChange={() => setMode(value)} className="mt-1" />
      <span>
        <span className="block text-sm font-medium text-regantify-text">{label}</span>
        <span className="block text-xs text-neutral-500">{hint}</span>
      </span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Print packing list" maxWidth="max-w-md">
      <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
        <p className="text-neutral-600">
          {isLoading
            ? `Getting ${ids.length} ${ids.length === 1 ? 'order' : 'orders'} ready…`
            : isError
              ? 'Could not load the orders. Close this and try again.'
              : `${sorted.length} ${sorted.length === 1 ? 'order' : 'orders'}, ${pieces} ${pieces === 1 ? 'piece' : 'pieces'} to pack. No prices or phone numbers are printed.`}
        </p>

        <div className="space-y-2">
          {choice('BOTH', 'Pick list and packing slips', 'The list for the shelf first, then one slip per order for the box.')}
          {choice('PICK', 'Pick list only', 'Every product added up across the orders.')}
          {choice('SLIPS', 'Packing slips only', 'One slip per order.')}
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-neutral-700">
            <input type="checkbox" checked={pictures} onChange={(e) => setPictures(e.target.checked)} />
            Show product pictures
          </label>
          {mode !== 'PICK' && (
            <label className="flex items-center gap-2 text-neutral-700">
              <input type="checkbox" checked={showCash} onChange={(e) => setShowCash(e.target.checked)} />
              Show the cash to collect on each slip
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Close
          </button>
          <button type="button" onClick={print} disabled={!orders || printing} className={primaryBtn}>
            <Printer size={15} />
            {printing ? 'Preparing…' : 'Print'}
          </button>
        </div>
      </div>

      {/* What gets printed: kept off-screen, printElement copies it into its own page. */}
      {orders && (
        <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 w-[210mm]">
          <div ref={sheetRef} className="text-regantify-text">
            {mode !== 'SLIPS' && (
              <section style={mode === 'BOTH' ? { breakAfter: 'page' } : undefined}>
                <div className="mb-4 flex items-end justify-between border-b border-neutral-300 pb-2">
                  <div>
                    <p className="text-xl font-semibold">Pick list</p>
                    {store?.storeName && <p className="text-sm text-neutral-600">{store.storeName}</p>}
                  </div>
                  <p className="text-right text-xs text-neutral-600">
                    {sorted.length} {sorted.length === 1 ? 'order' : 'orders'} · {pieces} {pieces === 1 ? 'piece' : 'pieces'}
                    <br />
                    {stamp()}
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-300 text-left text-[11px] uppercase tracking-wider text-neutral-500">
                      <th className="w-8 py-1.5" />
                      {pictures && <th className="w-14 py-1.5" />}
                      <th className="py-1.5 font-medium">Product</th>
                      <th className="w-16 py-1.5 text-center font-medium">Qty</th>
                      <th className="py-1.5 font-medium">For orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pick.map((l) => (
                      <tr key={l.key} className="break-inside-avoid border-b border-neutral-200 align-top">
                        <td className="py-2">
                          <span className="inline-block h-4 w-4 rounded-sm border border-neutral-500" />
                        </td>
                        {pictures && (
                          <td className="py-2">{l.image ? <img src={l.image} alt="" className="h-11 w-11 rounded border border-neutral-200 object-cover" /> : null}</td>
                        )}
                        <td className="py-2 pr-3">
                          <p className="font-medium">{l.name}</p>
                          <p className="text-xs text-neutral-600">{[l.options, l.sku && `SKU ${l.sku}`].filter(Boolean).join(' · ')}</p>
                        </td>
                        <td className="py-2 text-center text-lg font-semibold tabular-nums">{l.quantity}</td>
                        <td className="py-2 text-xs text-neutral-600">{l.orders.map((o) => `${o.ref}${o.quantity > 1 ? ` ×${o.quantity}` : ''}`).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {mode !== 'PICK' && (
              <section className="space-y-3">
                {sorted.map((order) => {
                  const cash = codDue(order);
                  const courier = order.courierProvider !== 'NONE' ? order.courierProvider : order.manualCourierName;
                  const tracking = order.courierTrackingCode ?? order.manualTrackingId;
                  return (
                    <div key={order.id} className="break-inside-avoid rounded-lg border border-neutral-400 p-3">
                      <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-2">
                        <div className="min-w-0">
                          <p className="text-base font-semibold">{orderRef(order)}</p>
                          <p className="text-sm">
                            {order.customerName}
                            {order.shippingDistrict ? <span className="text-neutral-600"> · {order.shippingDistrict}</span> : null}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-neutral-600">
                          {courier && <p>{String(courier).charAt(0) + String(courier).slice(1).toLowerCase()}</p>}
                          {tracking && <p className="tabular-nums">{tracking}</p>}
                          {showCash && (
                            <p className="mt-1 text-sm font-semibold text-regantify-text">{order.paymentMethod === 'COD' ? (cash > 0 ? `Collect ${taka(cash)}` : 'Advance paid') : 'Paid online'}</p>
                          )}
                        </div>
                      </div>
                      <ul className="divide-y divide-neutral-100">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-3 py-1.5">
                            <span className="inline-block h-4 w-4 shrink-0 rounded-sm border border-neutral-500" />
                            {pictures && (item.productImage ? <img src={item.productImage} alt="" className="h-10 w-10 shrink-0 rounded border border-neutral-200 object-cover" /> : <span className="h-10 w-10 shrink-0" />)}
                            <span className="min-w-0 flex-1 text-sm">
                              <span className="block font-medium">{item.productName}</span>
                              <span className="block text-xs text-neutral-600">{[optionsText(item.selectedOptions), item.productSku && `SKU ${item.productSku}`].filter(Boolean).join(' · ')}</span>
                            </span>
                            <span className="shrink-0 text-lg font-semibold tabular-nums">×{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      {(order.customerNote || order.staffNote) && (
                        <div className="mt-1.5 space-y-0.5 rounded bg-neutral-100 px-2 py-1.5 text-xs">
                          {order.customerNote && (
                            <p>
                              <span className="font-medium">Customer note:</span> {order.customerNote}
                            </p>
                          )}
                          {order.staffNote && (
                            <p>
                              <span className="font-medium">Staff note:</span> {order.staffNote}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
