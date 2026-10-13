import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CircleAlert, Loader2, Search } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';
import { adminOrdersApi, type AdminOrderQuery } from '../../../lib/adminOrdersApi';
import { apiErrorMessage } from '../../../lib/api';
import { formatTaka } from '../../../components/analytics/format';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';

const STATUSES = ['PENDING', 'PROCESSING', 'SHIPPING', 'READY_FOR_PICKUP', 'COMPLETED', 'ON_HOLD', 'PAYMENT_INITIATED', 'PAYMENT_FAILED', 'CANCELLED', 'RETURN', 'REFUNDED', 'STOCK_OUT'];
const field = 'rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none';
export const niceStatus = (s: string) => s.replace(/_/g, ' ').toLowerCase();

const RISK: Record<string, string> = { HIGH: 'bg-red-100 text-red-700', MEDIUM: 'bg-amber-100 text-amber-800' };

/**
 * Super Admin > Orders (super-admin-plan.md Step 7): find any order of any store. Type an order number, phone, tracking ID, PayStation invoice or SSLCommerz
 * tran id, or pick dates (up to 120 days). A payment that belongs to no order is shown by itself, which is the answer to "I paid but there is no order".
 */
export default function AdminOrders() {
  const [form, setForm] = useState<AdminOrderQuery>({});
  const [applied, setApplied] = useState<AdminOrderQuery | null>(null);
  const [page, setPage] = useState(1);
  const [showMore, setShowMore] = useState(false);

  const stores = useQuery({ queryKey: ['admin-vendors', 'names'], queryFn: () => adminApi.listVendors({ perPage: 100, sortBy: 'storeName', sortOrder: 'asc' }), staleTime: 5 * 60_000 });
  const params = applied ? { ...applied, page } : null;
  const { data, isFetching, error } = useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => adminOrdersApi.search(params!),
    enabled: !!params,
    placeholderData: (p) => p,
    retry: false,
  });

  const set = <K extends keyof AdminOrderQuery>(k: K, v: AdminOrderQuery[K] | '') => setForm((f) => ({ ...f, [k]: v === '' ? undefined : v }));

  return (
    <div className="max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold text-regantify-text">Orders</h1>
      <p className="mb-4 text-sm text-regantify-text-muted">Find any order of any store. Type an order number, phone, tracking ID, PayStation invoice or SSLCommerz id, or pick dates.</p>

      <form
        className="mb-5 space-y-3 rounded-2xl border border-black/5 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setApplied({ ...form, q: form.q?.trim() || undefined });
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[18rem] flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input value={form.q ?? ''} onChange={(e) => set('q', e.target.value)} placeholder="ORDER-12, 017…, tracking ID, invoice number…" className={`${field} w-full pl-10`} autoFocus />
          </div>
          <select value={form.vendorId ?? ''} onChange={(e) => set('vendorId', e.target.value)} className={field}>
            <option value="">Any store</option>
            {(stores.data?.vendors ?? []).map((v) => (
              <option key={v.id} value={v.id}>{v.storeName}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-regantify-text-muted">
            From <input type="date" value={form.from ?? ''} onChange={(e) => set('from', e.target.value)} className={field} />
          </label>
          <label className="flex items-center gap-2 text-xs text-regantify-text-muted">
            to <input type="date" value={form.to ?? ''} onChange={(e) => set('to', e.target.value)} className={field} />
          </label>
          <button type="submit" className="rounded-xl bg-regantify-cta px-5 py-2 text-sm font-medium text-white">Search</button>
          <button type="button" onClick={() => setShowMore((v) => !v)} className="text-xs text-regantify-text-muted underline">{showMore ? 'Fewer filters' : 'More filters'}</button>
        </div>
        {showMore && (
          <div className="flex flex-wrap items-center gap-3">
            <select value={form.status ?? ''} onChange={(e) => set('status', e.target.value)} className={field}>
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{niceStatus(s)}</option>
              ))}
            </select>
            <select value={form.source ?? ''} onChange={(e) => set('source', e.target.value)} className={field}>
              <option value="">Any source</option>
              <option value="STOREFRONT">Online store</option>
              <option value="MANUAL">Entered by the store</option>
              <option value="POS">Counter (POS)</option>
            </select>
            <select value={form.paymentMethod ?? ''} onChange={(e) => set('paymentMethod', e.target.value)} className={field}>
              <option value="">Any payment</option>
              <option value="COD">Cash on delivery</option>
              <option value="ONLINE_PAYMENT">Online payment</option>
              <option value="SSLCOMMERZ">SSLCommerz</option>
            </select>
            <select value={form.courier ?? ''} onChange={(e) => set('courier', e.target.value)} className={field}>
              <option value="">Any courier</option>
              <option value="PATHAO">Pathao</option>
              <option value="STEADFAST">SteadFast</option>
              <option value="REDX">RedX</option>
              <option value="NONE">None / own</option>
            </select>
            <select value={form.risk ?? ''} onChange={(e) => set('risk', e.target.value)} className={field}>
              <option value="">Any risk</option>
              <option value="MEDIUM_UP">Medium or high</option>
              <option value="HIGH">High only</option>
            </select>
            <input type="number" min={0} placeholder="Min ৳" value={form.minAmount ?? ''} onChange={(e) => set('minAmount', e.target.value === '' ? '' : Number(e.target.value))} className={`${field} w-28`} />
            <input type="number" min={0} placeholder="Max ৳" value={form.maxAmount ?? ''} onChange={(e) => set('maxAmount', e.target.value === '' ? '' : Number(e.target.value))} className={`${field} w-28`} />
          </div>
        )}
      </form>

      {!applied && <p className="py-10 text-center text-sm text-regantify-text-muted">Search to see orders.</p>}
      {isFetching && !data && <Loader2 className="mx-auto mt-6 animate-spin text-neutral-400" />}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{apiErrorMessage(error, 'Could not search.')}</p>}

      {data && applied && (
        <>
          {data.hint && <p className="mb-3 rounded-xl bg-blue-50 px-4 py-2.5 text-xs text-blue-900">{data.hint}</p>}

          {data.payments.map((p) => (
            <div key={p.id} className={`mb-3 rounded-2xl border bg-white p-4 text-sm ${p.orderId ? 'border-black/5' : 'border-red-200'}`}>
              <p className="font-medium text-regantify-text">
                {p.kind === 'PAYSTATION' ? 'PayStation payment' : 'SSLCommerz payment'} {p.reference} · {formatTaka(p.amount)} · {p.status.toLowerCase()}
              </p>
              <p className="mt-0.5 text-xs text-regantify-text-muted">
                {p.storeName} · {p.purpose.replace(/_/g, ' ').toLowerCase()} · {formatDhakaDateTime(p.createdAt)} · {p.applied ? 'applied' : 'not applied'}
              </p>
              {p.orderId ? (
                <Link to={`/admin/orders/${p.orderId}`} className="mt-1 inline-block text-xs text-regantify-cta hover:underline">Open its order</Link>
              ) : (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-red-700">
                  <CircleAlert size={13} /> {p.purpose === 'STOREFRONT_ORDER' ? 'This payment has no order.' : 'This payment is for a store purchase (plan, pack or wallet), not an order.'}
                </p>
              )}
            </div>
          ))}

          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-regantify-content text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Store</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-regantify-text-muted">No order found.{data.payments.length ? '' : ' Check the spelling, or widen the dates.'}</td>
                    </tr>
                  )}
                  {data.items.map((o) => (
                    <tr key={o.id} className="border-t border-black/5">
                      <td className="px-4 py-2.5">
                        <Link to={`/admin/orders/${o.id}`} className="font-medium text-regantify-cta hover:underline">{o.publicCode ?? `ORDER-${o.number}`}</Link>
                        {o.risk && <span className={`ml-2 rounded px-1.5 py-0.5 text-[11px] font-medium ${RISK[o.risk] ?? ''}`}>{o.risk.toLowerCase()} risk</span>}
                      </td>
                      <td className="px-4 py-2.5"><Link to={`/admin/vendors/${o.vendorId}`} className="hover:underline">{o.storeName}</Link></td>
                      <td className="whitespace-nowrap px-4 py-2.5">{formatDhakaDateTime(o.createdAt)}</td>
                      <td className="px-4 py-2.5">{o.customerName}<div className="text-xs text-regantify-text-muted">{o.customerPhone}</div></td>
                      <td className="px-4 py-2.5">{niceStatus(o.status)}<div className="text-xs text-regantify-text-muted">{o.source.toLowerCase()}</div></td>
                      <td className="px-4 py-2.5">{o.paymentMethod.toLowerCase().replace(/_/g, ' ')}{o.tracking && <div className="text-xs text-regantify-text-muted">{o.courier !== 'NONE' ? `${o.courier.toLowerCase()} ` : ''}{o.tracking}</div>}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatTaka(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-black/5 px-4 py-3 text-sm text-regantify-text-muted">
              <span>{data.total} found</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-black/10 px-3 py-1 disabled:opacity-40">Previous</button>
                <span>{page} / {Math.max(1, Math.ceil(data.total / data.perPage))}</span>
                <button type="button" disabled={page >= Math.ceil(data.total / data.perPage)} onClick={() => setPage(page + 1)} className="rounded-lg border border-black/10 px-3 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
