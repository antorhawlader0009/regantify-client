import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HandCoins } from 'lucide-react';
import { api, apiErrorMessage } from '../../../lib/api';
import { EmptyState, PageHeader, PageSection, PillTabs, outlineBtn } from '../../../components/ui/PageKit';

type Status = 'AWAITING_SUPPLIER' | 'HELD' | 'PAID' | 'REVERSED';

interface EarningsPage {
  totals: { paid: number; held: number; waiting: number; reversed: number; platformFee: number };
  total: number;
  page: number;
  perPage: number;
  items: Array<{
    id: string;
    orderId: string;
    orderRef: string | null;
    customerName: string | null;
    orderTotal: number | null;
    supplier: string;
    earning: number;
    feePercent: number;
    fee: number;
    net: number;
    status: Status;
    deliveredAt: string;
    paidAt: string | null;
    releaseAt: string | null;
    reversedAt: string | null;
  }>;
}

const money = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const STATUS: Record<Status, { label: string; className: string }> = {
  PAID: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700' },
  HELD: { label: 'On its way', className: 'bg-sky-50 text-sky-700' },
  AWAITING_SUPPLIER: { label: 'Waiting for the supplier', className: 'bg-amber-50 text-amber-800' },
  REVERSED: { label: 'Returned', className: 'bg-neutral-100 text-neutral-600' },
};

/**
 * Finance > Reseller earnings (RESELLER-plan.md Step 11): what this store earned selling other stores' products, order by order. An earning
 * is paid to the wallet when the supplier's courier reports the parcel delivered, less Regantify's share; it waits when the supplier's
 * wallet can't pay it yet (the supplier then takes no new orders until it does), and is taken back if the courier reports a return.
 * Withdraw it with the normal Withdraw page.
 */
export default function ResellerEarnings() {
  const [tab, setTab] = useState<'ALL' | Status>('ALL');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reseller-earnings', tab, page],
    queryFn: () => api.get<EarningsPage>('/v1/resale/money/earnings', { params: { status: tab === 'ALL' ? undefined : tab, page } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <PageSection>
      <PageHeader
        title="Reseller earnings"
        description="What you earned selling other stores’ products. Each earning reaches your wallet when the parcel is delivered, after Regantify’s share."
        actions={
          <Link to="/vendor/finance/wallet" className={outlineBtn}>
            Wallet and withdraw
          </Link>
        }
      />

      {data && (
        <div className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {[
            { label: 'Paid to your wallet', value: money(data.totals.paid) },
            { label: 'On its way', value: money(data.totals.held) },
            { label: 'Waiting for suppliers', value: money(data.totals.waiting) },
            { label: 'Regantify’s share', value: money(data.totals.platformFee) },
          ].map((s) => (
            <div key={s.label} className="bg-white px-4 py-3">
              <p className="text-xs text-neutral-500">{s.label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-regantify-text">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <PillTabs
        tabs={[
          { id: 'ALL', label: 'All' },
          { id: 'PAID', label: 'Paid' },
          { id: 'AWAITING_SUPPLIER', label: 'Waiting' },
          { id: 'HELD', label: 'On its way' },
          { id: 'REVERSED', label: 'Returned' },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
      />

      {isLoading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : isError ? (
        <EmptyState icon={HandCoins} title="Could not load your earnings" hint={apiErrorMessage(error, 'Please try again.')} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={HandCoins} title="No reseller earnings yet" hint="When a resold product's parcel is delivered, your earning shows here." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2 text-left font-normal">Order</th>
                <th className="px-3 py-2 text-left font-normal">Supplier</th>
                <th className="px-3 py-2 text-left font-normal">Delivered</th>
                <th className="px-3 py-2 text-right font-normal">Earning</th>
                <th className="px-3 py-2 text-right font-normal">Regantify</th>
                <th className="px-3 py-2 text-right font-normal">You get</th>
                <th className="px-3 py-2 text-left font-normal">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <Link to={`/vendor/orders/${r.orderId}`} className="font-medium text-brand hover:underline">
                      {r.orderRef ?? 'Order'}
                    </Link>
                    {r.customerName && <p className="text-xs text-neutral-500">{r.customerName}</p>}
                  </td>
                  <td className="px-3 py-2">{r.supplier}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{day(r.deliveredAt)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(r.earning)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-600">{r.fee > 0 ? `${money(r.fee)} (${r.feePercent}%)` : '-'}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{money(r.net)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS[r.status].className}`}>{STATUS[r.status].label}</span>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {r.status === 'PAID' ? day(r.paidAt) : r.status === 'HELD' ? `on ${day(r.releaseAt)}` : r.status === 'REVERSED' ? day(r.reversedAt) : 'paid when the supplier adds money'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-neutral-600">
          <button type="button" className={outlineBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" className={outlineBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </PageSection>
  );
}
