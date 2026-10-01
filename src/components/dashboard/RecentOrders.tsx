import { Link } from 'react-router-dom';
import { ArrowRight, Package, Receipt } from 'lucide-react';
import type { DashboardRecentOrder } from '../../lib/dashboardApi';
import { formatValue } from '../analytics/format';
import { OrderStatusBadge } from '../../pages/vendor/order/orderStatus';

const th = 'border-r border-line px-3 py-2.5 text-left font-normal last:border-r-0';
const td = 'border-r border-line px-3 py-2.5 last:border-r-0';

/** "Just now", "12 min ago", "3 h ago", "Yesterday", else "24 Sep" (Dhaka). */
function timeAgo(iso: string, now = Date.now()) {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const dhakaDay = (t: number) => new Date(t + 6 * 60 * 60_000).toISOString().slice(0, 10);
  if (dhakaDay(new Date(iso).getTime()) === dhakaDay(now - 24 * 60 * 60_000)) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Dhaka' });
}

function exactTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' });
}

function ItemCell({ order }: { order: DashboardRecentOrder }) {
  const item = order.firstItem;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {item?.image ? (
        <img src={item.image} alt="" className="h-8 w-8 shrink-0 rounded border border-line bg-neutral-100 object-cover" loading="lazy" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-neutral-100 text-neutral-400">
          <Package size={14} aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate">{item?.name ?? 'No items'}</p>
        {order.itemCount > 1 && <p className="text-xs text-neutral-500">+{order.itemCount - 1} more</p>}
      </div>
    </div>
  );
}

/**
 * Dashboard > the 5 newest orders (dashboard-plan.md Step 7), in the
 * Orders table's style on wide screens and a stacked list on phones.
 * Totals are the vendor's (a customer-paid online gateway fee left out),
 * the same number the Orders page shows.
 */
export function RecentOrders({ orders }: { orders: DashboardRecentOrder[] }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4" aria-labelledby="recent-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="recent-title" className="text-[15px] font-semibold text-regantify-text">
          Recent orders
        </h2>
        <Link to="/vendor/orders" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          View all
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
            <Receipt size={18} aria-hidden />
          </span>
          <p className="mt-2 text-sm font-medium text-regantify-text">No orders yet</p>
          <p className="mt-0.5 text-xs text-neutral-500">New orders show up here the moment they’re placed.</p>
        </div>
      ) : (
        <>
          {/* Wide screens: the Orders table's hairline grid */}
          <div className="hidden overflow-x-auto rounded-lg border border-line md:block">
            <table className="w-full min-w-[640px] border-collapse text-[14px] text-regantify-text">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600">
                  <th className={th}>Invoice</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Items</th>
                  <th className={th}>Total</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-line transition-colors hover:bg-neutral-50/70">
                    <td className={`${td} whitespace-nowrap`}>
                      <Link to={`/vendor/orders/${o.id}`} className="font-medium text-brand hover:underline">
                        ORDER-{o.invoiceNumber}
                      </Link>
                      <p className="mt-0.5 text-xs text-neutral-500" title={exactTime(o.createdAt)}>
                        {timeAgo(o.createdAt)}
                      </p>
                    </td>
                    <td className={`${td} max-w-[200px]`}>
                      <p className="truncate">{o.customerName}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{o.customerPhone}</p>
                    </td>
                    <td className={`${td} max-w-[240px]`}>
                      <ItemCell order={o} />
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <p className="dash-money font-medium tabular-nums">{formatValue(o.total, 'money')}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{o.paymentMethod}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      <OrderStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one stacked row per order, the whole row tappable */}
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link to={`/vendor/orders/${o.id}`} className="flex items-start gap-3 px-3 py-3 active:bg-neutral-50">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-nowrap font-medium text-brand">ORDER-{o.invoiceNumber}</p>
                    <p className="mt-0.5 truncate text-sm text-regantify-text">
                      {o.customerName}
                      <span className="text-xs text-neutral-500"> · {timeAgo(o.createdAt)}</span>
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {o.firstItem?.name ?? 'No items'}
                      {o.itemCount > 1 && ` +${o.itemCount - 1} more`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="dash-money text-sm font-semibold tabular-nums text-regantify-text">{formatValue(o.total, 'money')}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
