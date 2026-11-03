import { Link } from 'react-router-dom';
import { Handshake } from 'lucide-react';
import { OrderComments } from '../../../components/order/OrderComments';
import { OrderTimeline } from '../../../components/order/OrderTimeline';
import { orderRef, type Order, type OrderStatusHistoryEntry, type ResaleOrderInfo } from '../../../lib/ordersApi';
import { OrderStatusBadge } from './orderStatus';
import { ContactLinks } from '../../../components/resale/ContactLinks';
import { BackLink } from '../../../components/ui/BackLink';

const money = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' }) : '');

const SETTLEMENT_TEXT: Record<NonNullable<ResaleOrderInfo['settlement']>['status'], string> = {
  DUE: 'Owed: the supplier pays it directly',
  AWAITING_SUPPLIER: 'Owed: the supplier pays it directly',
  SETTLED: 'Marked paid by the supplier on',
  HELD: 'Paid through Regantify (old) on',
  PAID: 'Paid through Regantify (old) on',
  REVERSED: 'Nothing owed: the parcel was returned',
};

/**
 * The resale card on Order detail. On a supplier's order: who sold it and the reseller's earning, which the supplier pays directly after
 * delivery and then marks paid in Marketing > Reseller > Money record. On a reseller's order: the supplier and the earning it owes.
 * Since 2026-11-03 no reseller money passes through Regantify; this card only shows the record and the other store's phone.
 */
export function ResaleCard({ info }: { info: ResaleOrderInfo }) {
  const st = info.settlement;
  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5">
      <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-regantify-text">
        <Handshake size={16} aria-hidden />
        {info.role === 'SUPPLIER' ? `Sold by ${info.partner?.storeName ?? 'a reseller'}` : `Shipped by ${info.partner?.storeName ?? 'the supplier'}`}
      </h2>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-600">{info.role === 'SUPPLIER' ? 'Reseller’s earning (you pay it directly after delivery)' : 'Your earning (the supplier pays you directly)'}</dt>
          <dd className="font-medium tabular-nums">{money(info.earning)}</dd>
        </div>
        {st && (
          <div className="flex justify-between gap-3 sm:col-span-2">
            <dt className="text-neutral-600">
              {SETTLEMENT_TEXT[st.status]} {st.status === 'SETTLED' ? day(st.settledAt ?? null) : st.status === 'PAID' || st.status === 'HELD' ? day(st.paidAt) : ''}
              {st.status === 'SETTLED' && st.settledNote ? <span className="text-xs"> ({st.settledNote})</span> : null}
            </dt>
            <dd className="font-medium tabular-nums">{info.role === 'RESELLER' ? money(st.net) : money(st.earning)}</dd>
          </div>
        )}
      </dl>
      {info.role === 'SUPPLIER' && info.whiteLabel && (
        <p className="mt-2 text-xs text-neutral-600">
          The invoice and parcel sticker print “{info.whiteLabel.storeName}”{info.whiteLabel.phone ? ` (${info.whiteLabel.phone})` : ''}, not your store. Book it with your connected courier.
        </p>
      )}
      {info.role === 'SUPPLIER' && info.onlineHeld && (
        <p className="mt-2 text-xs text-neutral-600">
          {info.onlineHeld.releasedAt
            ? `The shopper paid ${money(info.onlineHeld.amount)} online. It reached your wallet on ${day(info.onlineHeld.releasedAt)}; if the order did not go through, refund the shopper from Orders > Refunds to pay.`
            : `The shopper paid ${money(info.onlineHeld.amount)} online. Regantify holds it and adds it to your wallet when the courier reports the parcel delivered.`}
        </p>
      )}
      {info.partner?.phone && (
        <div className="mt-2">
          <ContactLinks phone={info.partner.phone} label={info.role === 'SUPPLIER' ? 'Reseller' : 'Supplier'} />
        </div>
      )}
      {st && (st.status === 'DUE' || st.status === 'AWAITING_SUPPLIER') && (
        <p className="mt-2 text-xs text-neutral-600">
          {info.role === 'SUPPLIER' ? 'Pay the reseller directly, then mark it paid in ' : 'If it is late, call the supplier. See all in '}
          <Link to={`/vendor/marketing/reseller?view=money${info.role === 'SUPPLIER' ? '&side=supplier' : ''}`} className="font-medium underline">
            Money record
          </Link>
          .
        </p>
      )}
    </section>
  );
}

/**
 * A reseller's order of a product it resells (Step 11): read only. The supplier ships it with its courier and its status follows the
 * supplier's order, so nothing here changes it; the order's comments stay open (for the store's own team), and the shopper can still
 * cancel or fix the address from the tracking page while it hasn't left. Every action is refused on the server too.
 */
export function ResaleOrderView({ order, history }: { order: Order; history: OrderStatusHistoryEntry[] }) {
  const itemsTotal = order.items.reduce((n, i) => n + Number(i.lineTotal), 0);
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <BackLink to="/vendor/orders" label="All orders" className="" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-regantify-text">{orderRef(order)}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          A product you resell: the supplier ships this order with their courier, and its status follows theirs. You can’t change it here. The
          shopper can still cancel it or fix the address from their tracking page while it hasn’t left.
        </p>
      </div>

      {order.resale && <ResaleCard info={order.resale} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-[15px] font-semibold text-regantify-text">Items</h2>
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-2 text-sm">
                  {it.productImage ? <img src={it.productImage} alt="" className="h-10 w-10 rounded border border-line object-cover" /> : <div className="h-10 w-10 rounded border border-line bg-neutral-50" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-regantify-text">{it.productName}</p>
                    {it.selectedOptions && Object.keys(it.selectedOptions).length > 0 && (
                      <p className="text-xs text-neutral-500">{Object.values(it.selectedOptions as Record<string, string>).join(' / ')}</p>
                    )}
                  </div>
                  <span className="tabular-nums text-neutral-600">
                    {it.quantity} × {money(Number(it.unitPrice))}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-neutral-600">Items</dt><dd className="tabular-nums">{money(itemsTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-600">Delivery (the supplier’s charge)</dt><dd className="tabular-nums">{money(Number(order.deliveryCharge))}</dd></div>
              <div className="flex justify-between font-medium"><dt>Customer pays (cash on delivery)</dt><dd className="tabular-nums">{money(Number(order.total))}</dd></div>
            </dl>
          </section>
          <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-[15px] font-semibold text-regantify-text">Timeline</h2>
            <OrderTimeline orderId={order.id} history={history} hasCourier={false} />
          </section>
          <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
            <h2 className="mb-3 text-[15px] font-semibold text-regantify-text">Comments</h2>
            <OrderComments orderId={order.id} />
          </section>
        </div>
        <div className="min-w-0 space-y-4">
          <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
            <h2 className="mb-2 text-[15px] font-semibold text-regantify-text">Customer</h2>
            <p className="text-sm font-medium text-regantify-text">{order.customerName}</p>
            <p className="text-sm text-neutral-600">{order.customerPhone}</p>
            <p className="mt-2 text-sm text-regantify-text">{order.shippingAddress}</p>
            <p className="text-xs text-neutral-500">{[order.shippingCity, order.shippingDistrict].filter(Boolean).join(', ')}</p>
            {order.customerNote && <p className="mt-2 text-xs text-neutral-600">Note: {order.customerNote}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
