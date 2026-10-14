import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Timer } from 'lucide-react';
import { deliveryTimesApi } from '../../lib/deliveryTimesApi';
import { formatDhakaDate } from '../../lib/dhakaDate';
import { Dialog } from '../../components/ui/Dialog';

const th = 'px-4 py-2 font-normal';
const thR = 'px-4 py-2 text-right font-normal';
const td = 'px-4 py-2.5';
const tdR = 'px-4 py-2.5 text-right tabular-nums';
const ZONE: Record<string, string> = { DHAKA: 'Inside Dhaka', AROUND_DHAKA: 'Around Dhaka', OUTSIDE_DHAKA: 'Outside Dhaka' };
const STATUS: Record<string, string> = {
  PENDING: 'Pending',
  ON_HOLD: 'On hold',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipping',
  STOCK_OUT: 'Stock out',
  READY_FOR_PICKUP: 'Ready for pickup',
  PARTIAL_PAYMENT_PENDING: 'Advance pending',
  COMPLETED: 'Delivered',
};

/**
 * Super Admin > Stores > Delivery times (super-admin-new.md Step 12): orders that did not reach the customer within the Digital Commerce guideline window
 * (5 days inside Dhaka, 10 days elsewhere, from the order date), per store. Stores with many late orders also score higher in Trust and safety.
 */
export default function DeliveryTimes() {
  const [days, setDays] = useState(30);
  const [store, setStore] = useState<{ id: string; name: string } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admin-delivery-times', days], queryFn: () => deliveryTimesApi.stores(days) });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Timer className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">Delivery times</h1>
            <p className="max-w-3xl text-sm text-regantify-text-muted">
              The government's Digital Commerce guideline expects delivery within {data?.rules.sameCityDays ?? 5} days in the same city and {data?.rules.otherDays ?? 10} days elsewhere.
              Inside Dhaka counts as the same city. Counted from the order date; a delivery day the customer picked later moves the deadline. POS sales, pickups and pre-orders are left
              out.
            </p>
          </div>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
          {[30, 60, 90].map((d) => (
            <option key={d} value={d}>
              Orders of the last {d} days
            </option>
          ))}
        </select>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="Still on the way, past the deadline" value={data.totals.openLate.toLocaleString('en-US')} />
            <Tile label="Delivered" value={data.totals.delivered.toLocaleString('en-US')} />
            <Tile
              label="Delivered late"
              value={data.totals.deliveredLate.toLocaleString('en-US')}
              hint={data.totals.delivered ? `${Math.round((data.totals.deliveredLate / data.totals.delivered) * 100)}% of deliveries` : undefined}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                  <th className={th}>Store</th>
                  <th className={thR}>Late, still open</th>
                  <th className={thR}>Delivered</th>
                  <th className={thR}>Delivered late</th>
                  <th className={thR}>Average days</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {data.stores.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-regantify-text-muted">
                      No store has a late order in this period.
                    </td>
                  </tr>
                )}
                {data.stores.map((s) => (
                  <tr key={s.vendorId} className="border-b border-line last:border-0">
                    <td className={td}>
                      <Link to={`/admin/vendors/${s.vendorId}`} className="font-medium text-regantify-text hover:underline">
                        {s.storeName}
                      </Link>
                      <span className="console-id ml-1.5 text-xs text-regantify-text-muted">{s.subdomain}</span>
                    </td>
                    <td className={`${tdR} ${s.openLate > 0 ? 'font-medium text-red-700' : ''}`}>{s.openLate}</td>
                    <td className={tdR}>{s.delivered}</td>
                    <td className={tdR}>
                      {s.deliveredLate}
                      {s.latePercent !== null && <span className="ml-1 text-xs text-regantify-text-muted">({s.latePercent}%)</span>}
                    </td>
                    <td className={tdR}>{s.avgDays ?? '-'}</td>
                    <td className={`${td} text-right`}>
                      <button type="button" onClick={() => setStore({ id: s.vendorId, name: s.storeName })} className="text-sm font-medium text-regantify-text hover:underline">
                        Late orders
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {store && <StoreOrdersDialog vendorId={store.id} name={store.name} days={days} onClose={() => setStore(null)} />}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs text-regantify-text-muted">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-regantify-text">{value}</p>
      {hint && <p className="text-xs text-regantify-text-muted">{hint}</p>}
    </div>
  );
}

function StoreOrdersDialog({ vendorId, name, days, onClose }: { vendorId: string; name: string; days: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-delivery-times', vendorId, days], queryFn: () => deliveryTimesApi.storeOrders(vendorId, days) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Late orders: ${name}`} maxWidth="max-w-4xl">
      <div className="p-5 pt-3">
        {isLoading || !data ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-neutral-400" />
          </div>
        ) : data.orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-regantify-text-muted">No late orders in this period.</p>
        ) : (
          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                  <th className="px-3 py-2 font-normal">Order</th>
                  <th className="px-3 py-2 font-normal">Area</th>
                  <th className="px-3 py-2 font-normal">Placed</th>
                  <th className="px-3 py-2 font-normal">Deadline</th>
                  <th className="px-3 py-2 font-normal">Now</th>
                  <th className="px-3 py-2 text-right font-normal">Days late</th>
                  <th className="px-3 py-2 font-normal">Courier</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">
                      <Link to={`/admin/orders/${o.id}`} className="console-id font-medium hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs">{ZONE[o.zone] ?? o.zone}</td>
                    <td className="px-3 py-2 text-xs">{formatDhakaDate(o.createdAt)}</td>
                    <td className="px-3 py-2 text-xs">{formatDhakaDate(o.deadline)}</td>
                    <td className="px-3 py-2 text-xs">{o.stillOpen ? <span className="font-medium text-red-700">{STATUS[o.status] ?? o.status}</span> : `Delivered ${formatDhakaDate(o.deliveredAt!)}`}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{o.daysLate}</td>
                    <td className="px-3 py-2 text-xs">
                      {o.courier ?? '-'}
                      {o.daysToBooking !== null && <span className="block text-regantify-text-muted">booked after {o.daysToBooking} days</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Dialog>
  );
}
