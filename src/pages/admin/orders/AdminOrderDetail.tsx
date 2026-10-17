import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { adminOrdersApi } from '../../../lib/adminOrdersApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { formatTaka } from '../../../components/analytics/format';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { niceStatus } from './AdminOrders';
import { BackLink } from '../../../components/ui/BackLink';

function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-black/5 bg-white p-5 ${className}`}>
      <h2 className="mb-2 text-sm font-semibold text-regantify-text">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 py-2 last:border-0">
      <span className="text-sm text-regantify-text-muted">{label}</span>
      <span className="text-right text-sm text-regantify-text">{children}</span>
    </div>
  );
}

const money = (n: number | null) => (n === null ? '—' : formatTaka(n));

/** Super Admin > one order, read only (super-admin-plan.md Step 7): items, money, history, payments at both gateways, courier events and Super Admin's notes. */
export default function AdminOrderDetail() {
  const { orderId = '' } = useParams();
  const qc = useQueryClient();
  const { data: o, isLoading, error } = useQuery({ queryKey: ['admin-order', orderId], queryFn: () => adminOrdersApi.detail(orderId) });
  const [note, setNote] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-order', orderId] });

  const addNote = useMutation({
    mutationFn: () => adminOrdersApi.addNote(orderId, note.trim()),
    onSuccess: () => {
      setNote('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the note.')),
  });
  const recheck = useMutation({
    mutationFn: () => adminOrdersApi.recheckPayment(orderId),
    onSuccess: (r) => {
      toast.success(r.paid ? `Payment found. The order is now ${niceStatus(r.status)}.` : 'The gateway has no new payment for it.');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not check the payment.')),
  });

  if (isLoading) return <Loader2 className="mx-auto mt-16 animate-spin text-neutral-400" />;
  if (error || !o) return <p className="py-10 text-center text-sm text-red-600">Could not find this order.</p>;

  const th = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted';
  return (
    <div className="max-w-6xl">
      <BackLink to="/admin/orders" label="Orders" className="" />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-regantify-text">{o.publicCode ?? `ORDER-${o.number}`}</h1>
        <span className="rounded-md bg-black/5 px-2 py-1 text-xs font-medium">{niceStatus(o.status)}</span>
        {o.trashed && <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700">in the trash</span>}
        <Link to={`/admin/vendors/${o.store.id}`} className="text-sm text-regantify-cta hover:underline">{o.store.storeName}</Link>
        <span className="text-xs text-regantify-text-muted">{formatDhakaDateTime(o.createdAt)} · {o.source.toLowerCase()}</span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card title="Customer">
          <Row label="Name">{o.customer.name}</Row>
          <Row label="Phone"><Link to={`/admin/customers/${o.customer.phone.replace(/[^0-9]/g, '').slice(-10).padStart(11, '0')}`} className="text-regantify-cta hover:underline">{o.customer.phone}</Link></Row>
          <Row label="Address">{o.customer.address}</Row>
          <Row label="Zone">{niceStatus(o.customer.zone)}</Row>
          {o.customer.note && <Row label="Customer’s note">{o.customer.note}</Row>}
        </Card>

        <Card title="Money">
          <Row label="Items">{money(o.money.subtotal)}</Row>
          <Row label="Delivery">{money(o.money.delivery)}</Row>
          {!!o.money.vat && <Row label="VAT">{money(o.money.vat)}</Row>}
          <Row label={`Platform charge (paid by ${o.money.platformChargePayer.toLowerCase()})`}>{money(o.money.platformCharge)}</Row>
          {!!o.money.discount && <Row label={o.money.discountLabel ?? 'Discount'}>−{money(o.money.discount)}</Row>}
          <Row label="Total"><strong>{money(o.money.total)}</strong></Row>
          <Row label="Payment">{o.money.paymentMethod.toLowerCase().replace(/_/g, ' ')}</Row>
          {!!o.money.advance && <Row label="Advance paid">{money(o.money.advance)} ({o.money.advanceMethod?.toLowerCase()})</Row>}
          <Row label="Platform fee booked">{o.money.platformFeesBooked.length ? o.money.platformFeesBooked.map((f) => money(f.amount)).join(', ') : 'Not yet'}</Row>
          <Row label="Settled at completion">{o.money.settledAt ? formatDhakaDateTime(o.money.settledAt) : 'No'}</Row>
        </Card>

        <Card title="Items" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={`${th} text-right`}>Price</th>
                <th className={`${th} text-right`}>Qty</th>
                <th className={`${th} text-right`}>Line</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id} className="border-t border-black/5">
                  <td className="px-3 py-2">
                    {i.productName}
                    {i.isGift && <span className="ml-2 rounded bg-black/5 px-1.5 py-0.5 text-[11px]">free gift</span>}
                    {Object.keys(i.selectedOptions ?? {}).length > 0 && <div className="text-xs text-regantify-text-muted">{Object.entries(i.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')}</div>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTaka(i.unitPrice)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{i.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTaka(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Payments at the gateways" className="lg:col-span-2">
          {o.payments.paystation.length + o.payments.gateway.length === 0 ? (
            <p className="text-sm text-regantify-text-muted">No online payment was started for this order (cash on delivery).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Gateway</th>
                    <th className={th}>Invoice / tran id</th>
                    <th className={th}>Status</th>
                    <th className={th}>Applied</th>
                    <th className={th}>Started</th>
                    <th className={`${th} text-right`}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {o.payments.paystation.map((p) => (
                    <tr key={p.id} className="border-t border-black/5">
                      <td className="px-3 py-2">PayStation{p.paymentMethod ? ` (${p.paymentMethod})` : ''}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.invoiceNumber}{p.trxId && <div>trx {p.trxId}</div>}</td>
                      <td className="px-3 py-2">{p.status.toLowerCase()}</td>
                      <td className="px-3 py-2">{p.fulfilledAt ? formatDhakaDateTime(p.fulfilledAt) : p.status === 'SUCCESS' ? 'NOT APPLIED' : '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatDhakaDateTime(p.createdAt)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTaka(p.amount)}</td>
                    </tr>
                  ))}
                  {o.payments.gateway.map((g) => (
                    <tr key={g.id} className="border-t border-black/5">
                      <td className="px-3 py-2">SSLCommerz{g.cardType ? ` (${g.cardType})` : ''}</td>
                      <td className="px-3 py-2 font-mono text-xs">{g.invoiceNumber}{g.valId && <div>val {g.valId}</div>}</td>
                      <td className="px-3 py-2">{g.status.toLowerCase()}</td>
                      <td className="px-3 py-2">{g.fulfilledAt ? formatDhakaDateTime(g.fulfilledAt) : g.status === 'SUCCESS' ? 'NOT APPLIED' : '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatDhakaDateTime(g.createdAt)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatTaka(g.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {o.canRecheck && (
            <button type="button" disabled={recheck.isPending} onClick={() => recheck.mutate()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-regantify-cta px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
              <RefreshCw size={13} className={recheck.isPending ? 'animate-spin' : ''} /> Check the payment with the gateway again
            </button>
          )}
          {!o.canRecheck && o.payments.paystation.some((p) => p.status === 'SUCCESS' && !p.fulfilledAt) && (
            <p className="mt-3 text-xs text-red-700">A payment is paid but not applied. Open Platform Revenue &gt; Reconciliation to apply it.</p>
          )}
        </Card>

        <Card title="Status history">
          {o.history.map((h) => (
            <div key={h.id} className="border-b border-black/5 py-2 last:border-0">
              <p className="text-sm text-regantify-text">
                {h.fromStatus ? `${niceStatus(h.fromStatus)} → ` : ''}
                {niceStatus(h.toStatus)}
                {h.correction && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">correction</span>}
              </p>
              <p className="text-xs text-regantify-text-muted">
                {formatDhakaDateTime(h.createdAt)}
                {h.changedBy ? ` · ${h.changedBy}` : ''}
                {h.note ? ` · ${h.note}` : ''}
              </p>
            </div>
          ))}
        </Card>

        <Card title="Courier">
          <Row label="Courier">{o.courier.provider === 'NONE' ? (o.courier.manualCourier ?? 'None') : o.courier.provider.toLowerCase()}</Row>
          <Row label="Booking">{o.courier.bookingStatus.toLowerCase().replace(/_/g, ' ')}</Row>
          {o.courier.status && <Row label="Courier says">{o.courier.status}</Row>}
          {(o.courier.trackingCode || o.courier.manualTracking || o.courier.consignmentId) && <Row label="Tracking ID">{o.courier.trackingCode ?? o.courier.manualTracking ?? o.courier.consignmentId}</Row>}
          {o.courier.codAmount !== null && <Row label="Cash to collect">{money(o.courier.codAmount)}</Row>}
          {o.courier.deliveryFee !== null && <Row label="Courier fee">{money(o.courier.deliveryFee)}</Row>}
          {o.courier.events.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {o.courier.events.map((e) => (
                <p key={e.id} className="border-t border-black/5 py-1.5 text-xs text-regantify-text-muted">
                  {formatDhakaDateTime(e.createdAt)} · {e.event}
                  {e.rawStatus ? ` (${e.rawStatus})` : ''}
                  {e.appliedStatus ? ` → ${niceStatus(e.appliedStatus)}` : ''}
                </p>
              ))}
            </div>
          )}
        </Card>

        {o.risk && (
          <Card title="Risk">
            <p className="text-sm text-regantify-text">{o.risk.level.toLowerCase()}</p>
            {Array.isArray(o.risk.reasons) && <ul className="mt-1 list-disc pl-5 text-xs text-regantify-text-muted">{(o.risk.reasons as string[]).map((r) => <li key={r}>{r}</li>)}</ul>}
          </Card>
        )}

        <Card title="Notes by the Regantify team" className="lg:col-span-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} placeholder="For example: paid at PayStation, checked, told the store" className="w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm focus:outline-none" />
          <button type="button" disabled={note.trim().length < 2 || addNote.isPending} onClick={() => addNote.mutate()} className="mt-2 rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save note</button>
          <p className="mt-1 text-xs text-regantify-text-muted">Only the Regantify team sees notes. They can’t be edited or deleted.</p>
          {o.notes.map((n) => (
            <div key={n.id} className="mt-3 border-t border-black/5 pt-2">
              <p className="whitespace-pre-wrap text-sm text-regantify-text">{n.text}</p>
              <p className="text-xs text-regantify-text-muted">{n.authorName} · {formatDhakaDateTime(n.createdAt)}</p>
            </div>
          ))}
        </Card>
      </div>
      <p className="mt-4 text-xs text-regantify-text-muted">This page is read only. To change the order’s status, ask the store, or open the store with “Login as Vendor” (can make changes).</p>
    </div>
  );
}
