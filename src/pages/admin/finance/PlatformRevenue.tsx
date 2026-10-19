import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Download, Loader2 } from 'lucide-react';
import { adminFinanceApi, downloadText, type RevenueGroup } from '../../../lib/adminFinanceApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { GradientBarChart, GradientDonut, formatCompact, formatTaka } from '../../../components/admin/charts';
import { Card, CardHeader } from '../../../components/admin/ui/Card';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';

const field = 'rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none';
const th = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-regantify-text-muted';

function Revenue() {
  const [group, setGroup] = useState<RevenueGroup>('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-revenue', group, from, to], queryFn: () => adminFinanceApi.revenue(group, from || undefined, to || undefined) });

  async function exportCsv() {
    try {
      downloadText('platform-revenue.csv', await adminFinanceApi.revenueCsv(group, from || undefined, to || undefined));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not export.'));
    }
  }
  const cell = 'px-4 py-2.5 text-right tabular-nums';
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={group} onChange={(e) => setGroup(e.target.value as RevenueGroup)} className={field}>
          <option value="day">By day</option>
          <option value="month">By month</option>
          <option value="store">By store</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-regantify-text-muted">
          From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
        </label>
        <label className="flex items-center gap-2 text-xs text-regantify-text-muted">
          to <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
        </label>
        <span className="text-xs text-regantify-text-muted">Leave the dates empty for the last 30 days.</span>
        <button type="button" onClick={exportCsv} className={`${field} ml-auto inline-flex items-center gap-1.5`}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {isLoading && <Loader2 className="mx-auto mt-10 animate-spin text-neutral-400" />}
      {error && <p className="py-10 text-center text-sm text-red-600">{apiErrorMessage(error, 'Could not load the report.')}</p>}
      {data && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-5">
            {[
              ['Total income', data.totals.total],
              ['Plans', data.totals.plans],
              ['SMS packs', data.totals.sms],
              ['AI packs', data.totals.ai],
              ['Order fees', data.totals.fees],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-2xl bg-white p-5 shadow-[var(--console-card-shadow)]">
                <p className="text-[13px] font-medium text-regantify-text-muted">{label}</p>
                <p className="mt-1 text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-regantify-text">{formatTaka(value as number)}</p>
              </div>
            ))}
          </div>
          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="By kind" subtitle="this period" />
              <GradientDonut
                label="Platform income by kind"
                slices={[
                  { key: 'plans', label: 'Plans', value: data.totals.plans },
                  { key: 'sms', label: 'SMS packs', value: data.totals.sms },
                  { key: 'ai', label: 'AI packs', value: data.totals.ai },
                  { key: 'fees', label: 'Order fees', value: data.totals.fees },
                ]}
                format={formatTaka}
                centerValue={formatCompact(data.totals.total, 'money')}
                centerCaption="income"
                height={220}
              />
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title={group === 'store' ? 'Top stores' : group === 'month' ? 'Per month' : 'Per day'} subtitle="plans, SMS, AI packs and order fees" />
              <GradientBarChart
                label={`Platform income ${group === 'store' ? 'by store, top 15' : group === 'month' ? 'per month' : 'per day'}, by kind`}
                rows={group === 'store' ? [...data.rows].sort((a, b) => b.total - a.total).slice(0, 15) : data.rows}
                xKey="label"
                series={[
                  { key: 'plans', label: 'Plans' },
                  { key: 'sms', label: 'SMS' },
                  { key: 'ai', label: 'AI packs' },
                  { key: 'fees', label: 'Fees' },
                ]}
                stacked
                format={formatTaka}
                axisFormat={(n) => formatCompact(n, 'money')}
                height={250}
              />
            </Card>
          </div>
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-regantify-content text-left">
                    <th className={th}>{group === 'store' ? 'Store' : group === 'month' ? 'Month' : 'Day'}</th>
                    <th className={`${th} text-right`}>Plans</th>
                    <th className={`${th} text-right`}>SMS packs</th>
                    <th className={`${th} text-right`}>AI packs</th>
                    <th className={`${th} text-right`}>Order fees</th>
                    <th className={`${th} text-right`}>Total</th>
                    <th className={`${th} text-right`}>Wallet top-ups</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-regantify-text-muted">Nothing in this period.</td>
                    </tr>
                  )}
                  {data.rows.map((r) => (
                    <tr key={r.key} className="border-t border-black/5">
                      <td className="px-4 py-2.5">{group === 'store' ? <Link to={`/admin/vendors/${r.key}`} className="text-regantify-cta hover:underline">{r.label}</Link> : r.label}</td>
                      <td className={cell}>{formatTaka(r.plans)}</td>
                      <td className={cell}>{formatTaka(r.sms)}</td>
                      <td className={cell}>{formatTaka(r.ai)}</td>
                      <td className={cell}>{formatTaka(r.fees)}</td>
                      <td className={`${cell} font-medium`}>{formatTaka(r.total)}</td>
                      <td className={`${cell} text-regantify-text-muted`}>{formatTaka(r.walletTopups)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-2 text-xs text-regantify-text-muted">
            Income is what stores paid through PayStation for plans and packs (less any old store debt the payment cleared) plus the platform fees on orders. Wallet top-ups are the stores’ own money held by the platform, so they are not income. A shopper’s order payment is never counted. Compare the total with PayStation’s statement for the same dates.
          </p>
        </>
      )}
    </div>
  );
}

function Reconciliation() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-reconciliation'], queryFn: adminFinanceApi.reconciliation, refetchInterval: 60_000 });
  const apply = useMutation({
    mutationFn: (id: string) => adminFinanceApi.applyPayment(id),
    onSuccess: (r) => {
      toast.success(r.alreadyFulfilled ? 'It was already applied.' : r.status === 'SUCCESS' ? 'Applied.' : `PayStation says: ${r.status.toLowerCase()}.`);
      qc.invalidateQueries({ queryKey: ['admin-reconciliation'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not apply it.')),
  });
  if (isLoading || !data) return <Loader2 className="mx-auto mt-10 animate-spin text-neutral-400" />;
  const clean = !data.notApplied.length && !data.orderNotWaiting.length && !data.doublePaid.length;
  return (
    <div className="space-y-5">
      {clean && (
        <p className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white p-5 text-sm text-green-700">
          <CircleCheck size={16} /> Every PayStation payment is applied, and no order was paid twice.
        </p>
      )}
      {data.notApplied.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-regantify-text">Paid at PayStation but not applied ({data.notApplied.length})</h2>
          <p className="mb-3 text-xs text-regantify-text-muted">The money arrived but the store did not get what it paid for. “Apply now” asks PayStation again and finishes the job. It is safe to press twice.</p>
          {data.notApplied.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 py-2.5 text-sm">
              <div>
                <Link to={`/admin/vendors/${p.vendorId}`} className="font-medium text-regantify-cta hover:underline">{p.storeName}</Link>
                <p className="text-xs text-regantify-text-muted">{p.invoiceNumber} · {p.purpose.replace(/_/g, ' ').toLowerCase()} · {formatTaka(p.amount)} · since {formatDhakaDateTime(p.since)}</p>
              </div>
              <button type="button" disabled={apply.isPending} onClick={() => apply.mutate(p.id)} className="rounded-lg bg-regantify-cta px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                Apply now
              </button>
            </div>
          ))}
        </section>
      )}
      {data.orderNotWaiting.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-regantify-text">Paid online, but the order is cancelled, failed or returned ({data.orderNotWaiting.length})</h2>
          <p className="mb-3 text-xs text-regantify-text-muted">The shopper’s money is with the store. The store may owe a refund (they see it in Orders &gt; Refunds to pay).</p>
          {data.orderNotWaiting.map((p) => (
            <div key={p.id} className="border-t border-black/5 py-2.5 text-sm">
              <Link to={`/admin/vendors/${p.vendorId}`} className="font-medium text-regantify-cta hover:underline">{p.storeName}</Link>
              <p className="text-xs text-regantify-text-muted">
                Order {p.orderNumber ?? '—'} ({p.orderStatus?.replace(/_/g, ' ').toLowerCase()}) · {p.invoiceNumber} · {formatTaka(p.amount)} · paid {p.paidAt ? formatDhakaDateTime(p.paidAt) : ''}
              </p>
            </div>
          ))}
        </section>
      )}
      {data.doublePaid.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-regantify-text">One order paid more than once ({data.doublePaid.length})</h2>
          <p className="mb-3 text-xs text-regantify-text-muted">Look at each in PayStation. The extra money may need to go back to the shopper.</p>
          {data.doublePaid.map((d) => (
            <div key={d.orderId} className="border-t border-black/5 py-2.5 text-sm">
              {d.vendorId ? <Link to={`/admin/vendors/${d.vendorId}`} className="font-medium text-regantify-cta hover:underline">{d.storeName}</Link> : d.storeName}
              <p className="text-xs text-regantify-text-muted">
                Order {d.orderNumber ?? '—'} ({d.orderStatus?.replace(/_/g, ' ').toLowerCase()}) · {d.payments} payments · {formatTaka(d.total)} in all
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/** Super Admin > Platform Revenue and Reconciliation (super-admin-plan.md Step 6). */
export default function PlatformRevenue() {
  const [tab, setTab] = useState<'revenue' | 'reconciliation'>('revenue');
  return (
    <div className="max-w-6xl">
      <h1 className="mb-4 text-2xl font-semibold text-regantify-text">Platform Revenue</h1>
      <div className="mb-5 flex gap-1 border-b border-black/5">
        {(
          [
            ['revenue', 'Revenue'],
            ['reconciliation', 'Reconciliation'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`px-4 py-2 text-sm font-medium ${tab === id ? 'border-b-2 border-regantify-cta text-regantify-text' : 'text-regantify-text-muted hover:text-regantify-text'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'revenue' ? <Revenue /> : <Reconciliation />}
    </div>
  );
}
