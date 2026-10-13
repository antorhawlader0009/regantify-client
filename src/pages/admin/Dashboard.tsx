import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleCheck, Loader2, Receipt } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { adminDashboardApi, type AdminOverview, type Compared, type OverviewRange } from '../../lib/adminDashboardApi';
import { ColumnChart, PALETTE, TrendChart } from '../../components/analytics/TrendChart';
import { bucketLabel, changeOf, formatCompact, formatTaka, formatValue, type ValueKind } from '../../components/analytics/format';
import { SmsBalanceCard } from '../../components/admin/SmsBalanceCard';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';

const RANGES: Array<{ id: OverviewRange; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'month', label: 'This month' },
];

function formatAmount(value: string) {
  return formatTaka(Number(value));
}

/** "+12.5%" in green (or red when a rise is bad, like plans that ended); nothing when there is nothing to compare with. */
function Change({ value, kind = 'count', badWhenUp }: { value: Compared; kind?: ValueKind; badWhenUp?: boolean }) {
  const c = changeOf(value, kind);
  if (!c || c.value === 0) return null;
  const up = c.value > 0;
  const good = badWhenUp ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? 'text-green-700' : 'text-red-700'}`}>
      <Icon size={13} />
      {c.label}
    </span>
  );
}

function Card({ title, to, children, className = '' }: { title: string; to?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-white ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2 className="text-[13px] font-semibold text-regantify-text">{title}</h2>
        {to && (
          <Link to={to} className="inline-flex items-center gap-1 text-xs text-regantify-text-muted hover:text-regantify-cta">
            Open <ArrowRight size={12} />
          </Link>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Row({ label, value, change, kind, note, badWhenUp }: { label: string; value: string; change?: Compared; kind?: ValueKind; note?: string; badWhenUp?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-black/5 py-2 last:border-b-0">
      <div>
        <p className="text-sm text-regantify-text">{label}</p>
        {note && <p className="text-xs text-regantify-text-muted">{note}</p>}
      </div>
      <div className="flex items-baseline gap-2 text-right">
        {change && <Change value={change} kind={kind} badWhenUp={badWhenUp} />}
        <span className="text-sm font-medium tabular-nums text-regantify-text">{value}</span>
      </div>
    </div>
  );
}

/** One cell of the ledger strip at the top: a number you read first, its label above, its change and note under. Opens the page behind it. */
function Kpi({ label, value, change, kind, hint, to }: { label: string; value: string; change?: Compared; kind?: ValueKind; hint?: string; to: string }) {
  const c = change ? changeOf(change, kind ?? 'count') : null;
  return (
    <Link to={to} className="group block px-5 py-4 transition-colors hover:bg-white/[0.04] focus-visible:outline-offset-[-2px]">
      <p className="text-[12px] text-[var(--console-rail-text)]">{label}</p>
      <p className="mt-1.5 text-[28px] font-medium leading-none tabular-nums text-white">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-[12px] text-[#8fb0a4]">
        {c && c.value !== 0 && (
          <span className={`inline-flex items-center gap-0.5 font-medium ${c.value > 0 ? 'text-[#7ee0b0]' : 'text-[#f4a3a3]'}`}>
            {c.value > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {c.label}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </Link>
  );
}

interface ActionItem {
  key: string;
  text: string;
  to: string;
  tone: 'red' | 'amber';
}

/** Everything that waits for the platform team, only what is non-zero. Each line opens the page where it is dealt with. */
function actionItems(d: AdminOverview['needsAction']): ActionItem[] {
  const items: ActionItem[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (d.sms.level === 'CRITICAL' || d.sms.level === 'LOW')
    items.push({ key: 'sms', text: `Platform SMS balance is ${d.sms.balance === null ? 'low' : formatTaka(d.sms.balance)}. Top up bulksmsbd.net before OTPs stop.`, to: '/admin/system-status', tone: d.sms.level === 'CRITICAL' ? 'red' : 'amber' });
  else if (d.sms.configured && d.sms.error)
    items.push({ key: 'sms', text: `Could not read the platform SMS balance: ${d.sms.error}`, to: '/admin/system-status', tone: 'amber' });
  if (d.lateJobs.length) items.push({ key: 'jobs', text: `${plural(d.lateJobs.length, 'background job looks', 'background jobs look')} stopped: ${d.lateJobs.slice(0, 2).join(', ')}${d.lateJobs.length > 2 ? '…' : ''}`, to: '/admin/system-status', tone: 'red' });
  if (d.paidNotApplied) items.push({ key: 'paid', text: `${plural(d.paidNotApplied, 'payment', 'payments')} received but not applied to the store`, to: '/admin/system-status', tone: 'red' });
  if (d.withdrawPending.count) items.push({ key: 'wd', text: `${plural(d.withdrawPending.count, 'withdraw request', 'withdraw requests')} waiting (${formatTaka(d.withdrawPending.amount)})`, to: '/admin/finance/payouts', tone: 'amber' });
  if (d.withdrawToPay.count) items.push({ key: 'wdpay', text: `${plural(d.withdrawToPay.count, 'approved withdrawal', 'approved withdrawals')} to send and mark paid (${formatTaka(d.withdrawToPay.amount)})`, to: '/admin/finance/payouts', tone: 'amber' });
  if (d.planRequests) items.push({ key: 'plan', text: `${plural(d.planRequests, 'plan request', 'plan requests')} waiting`, to: '/admin/plan-requests', tone: 'amber' });
  if (d.kycSubmitted) items.push({ key: 'kyc', text: `${plural(d.kycSubmitted, 'verification', 'verifications')} sent in, waiting for you`, to: '/admin/verification', tone: 'amber' });
  if (d.supportWaiting) items.push({ key: 'sup', text: `${plural(d.supportWaiting, 'support ticket', 'support tickets')} unanswered for over 24 hours`, to: '/admin/support', tone: 'red' });
  if (d.failedWebhooks) items.push({ key: 'hook', text: `${plural(d.failedWebhooks, 'webhook delivery', 'webhook deliveries')} failed in the last 24 hours`, to: '/admin/system-status', tone: 'amber' });
  return items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'red' ? -1 : 1));
}

const SOURCE_LABEL = { STOREFRONT: 'Online store', MANUAL: 'Entered by the store', POS: 'Counter (POS)' } as const;

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<OverviewRange>('30d');
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin', 'overview', range],
    queryFn: () => adminDashboardApi.overview(range),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
  const viewer = useAdminViewer();
  const canSeeFees = adminCan(viewer, 'money.view');
  const fees = useQuery({ queryKey: ['admin', 'dashboard', 'platform-revenue'], queryFn: () => adminDashboardApi.getPlatformRevenue(), enabled: canSeeFees });

  const items = data ? actionItems(data.needsAction) : [];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-0.5 text-regantify-text-muted">
            {data ? `Hello ${(user?.fullName ?? 'there').split(' ')[0]}. Numbers compared with ${data.period.previousLabel}, refreshed every minute.` : 'The whole platform at a glance.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && <Loader2 size={14} className="animate-spin text-neutral-400" />}
          <div className="inline-flex rounded-lg border border-line bg-white p-0.5" role="tablist" aria-label="Period">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={range === r.id}
                onClick={() => setRange(r.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${range === r.id ? 'bg-regantify-black text-white' : 'text-regantify-text-muted hover:text-regantify-text'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && !data && <p className="py-10 text-center text-sm text-red-600">Could not load the dashboard.</p>}
      {isLoading && !data && (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      )}

      {data && (
        <>
          <div className="overflow-hidden rounded-xl bg-regantify-topbar shadow-[0_1px_0_rgba(12,43,37,0.4)]">
            <div className="grid grid-cols-2 divide-x divide-white/10 lg:grid-cols-4 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-white/10 lg:[&>*:nth-child(n+3)]:border-t-0">
              <Kpi label="Platform income" value={formatTaka(data.income.total.current)} change={data.income.total} kind="money" hint="plans, packs, fees" to="/admin/finance/revenue" />
              <Kpi label="Monthly recurring revenue" value={formatTaka(data.subscriptions.mrr)} hint={`${data.subscriptions.payingStores} paying ${data.subscriptions.payingStores === 1 ? 'store' : 'stores'}`} to="/admin/plans" />
              <Kpi label="Active stores" value={String(data.stores.active7d)} hint={`of ${data.stores.total}, last 7 days`} to="/admin/vendors/all" />
              <Kpi label="Orders value (GMV)" value={formatTaka(data.gmv.total.current)} change={data.gmv.total} kind="money" hint={`${data.gmv.orders.current} orders`} to="/admin/orders" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
          <Card title={items.length ? `Needs action now (${items.length})` : 'Needs action now'} className="lg:col-span-2">
            {items.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-green-700">
                <CircleCheck size={16} /> Nothing needs you right now.
              </p>
            ) : (
              <ul className="divide-y divide-black/5">
                {items.map((i) => (
                  <li key={i.key}>
                    <Link to={i.to} className="relative flex items-center gap-3 py-2.5 pl-3 text-[13.5px] text-regantify-text hover:text-black">
                      <span className={`absolute inset-y-2 left-0 w-[3px] rounded-full ${i.tone === 'red' ? 'bg-red-600' : 'bg-amber-500'}`} aria-hidden />
                      <span className="flex-1">{i.text}</span>
                      <ArrowRight size={14} className="text-neutral-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <SmsBalanceCard />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Platform income" to="/admin/finance/revenue">
              <Row label="Plans" value={formatTaka(data.income.plans.current)} change={data.income.plans} kind="money" />
              <Row label="SMS packs" value={formatTaka(data.income.sms.current)} change={data.income.sms} kind="money" />
              <Row label="AI credit packs" value={formatTaka(data.income.ai.current)} change={data.income.ai} kind="money" />
              <Row label="Platform fees on orders" value={formatTaka(data.income.platformFees.current)} change={data.income.platformFees} kind="money" />
              <Row label="Total" value={formatTaka(data.income.total.current)} change={data.income.total} kind="money" />
              <p className="mt-3 rounded-lg bg-regantify-content px-3 py-2 text-xs text-regantify-text-muted">
                Not income: {formatTaka(data.income.walletTopups.current)} added to store wallets (their own money, held by the platform)
                {data.income.debtsCleared.current > 0 ? ` and ${formatTaka(data.income.debtsCleared.current)} of old store debts paid inside purchases` : ''}.
              </p>
            </Card>

            <Card title="Subscriptions" to="/admin/plans">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-regantify-text-muted">
                      <th className="pb-2 font-medium">Plan</th>
                      <th className="pb-2 text-right font-medium">Stores</th>
                      <th className="pb-2 text-right font-medium">Per month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subscriptions.plans.map((p) => (
                      <tr key={p.code} className="border-t border-black/5">
                        <td className="py-2">{p.name}</td>
                        <td className="py-2 text-right tabular-nums">{p.stores}</td>
                        <td className="py-2 text-right tabular-nums">{formatTaka(p.mrr)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-black/5 text-regantify-text-muted">
                      <td className="py-2">Free</td>
                      <td className="py-2 text-right tabular-nums">{data.subscriptions.freeStores}</td>
                      <td className="py-2 text-right tabular-nums">৳0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <Row label="First plan payment" note="stores that paid for a plan for the first time" value={String(data.subscriptions.newPaying.current)} change={data.subscriptions.newPaying} />
                <Row label="Plan payments again" note="a paying store paid again" value={String(data.subscriptions.renewals.current)} change={data.subscriptions.renewals} />
                <Row label="Upgrades" note="moved to a dearer paid plan" value={String(data.subscriptions.upgrades.current)} change={data.subscriptions.upgrades} />
                <Row label="Downgrades" note="moved to a cheaper paid plan" value={String(data.subscriptions.downgrades.current)} change={data.subscriptions.downgrades} badWhenUp />
                <Row label="Plans that ended" note="ran out and went back to Free" value={String(data.subscriptions.ended.current)} change={data.subscriptions.ended} badWhenUp />
              </div>
            </Card>

            <Card title="Stores" to="/admin/vendors/all">
              <Row label="All stores" value={String(data.stores.total)} />
              <Row label="Active in the last 7 days" note="owner signed in or an order came" value={String(data.stores.active7d)} />
              <Row label="New in this period" value={String(data.stores.signups.current)} change={data.stores.signups} />
              <Row label="New today / last 7 days" value={`${data.stores.signupsToday} / ${data.stores.signups7d}`} />
              <Row label="Suspended" value={String(data.stores.suspended)} />
              <Row label="Waiting for approval" value={String(data.stores.pending)} />
              <Row label="Being verified (KYC)" value={String(data.stores.underKyc)} />
            </Card>

            <Card title="Orders across all stores" to="/admin/orders">
              <Row label="Orders" note="cancelled, unpaid and returned left out" value={String(data.gmv.orders.current)} change={data.gmv.orders} />
              <Row label="Value (GMV)" value={formatTaka(data.gmv.total.current)} change={data.gmv.total} kind="money" />
              <Row label="Average order" value={formatTaka(data.gmv.average.current)} change={data.gmv.average} kind="money" />
              {(Object.keys(SOURCE_LABEL) as Array<keyof typeof SOURCE_LABEL>).map((s) => (
                <Row key={s} label={SOURCE_LABEL[s]} value={`${data.gmv.bySource[s].orders} · ${formatTaka(data.gmv.bySource[s].gmv)}`} />
              ))}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Platform income, last 30 days">
              <TrendChart
                data={data.charts.income}
                series={[{ key: 'income', label: 'Income', color: PALETTE.blue }]}
                kind="money"
                bucket="day"
                ariaLabel="Platform income per day for the last 30 days"
              />
            </Card>
            <Card title="New stores per day, last 30 days">
              <ColumnChart
                data={data.charts.signups.map((d) => ({
                  key: d.bucket,
                  value: d.signups,
                  tick: bucketLabel(d.bucket, 'day'),
                  tooltip: `${bucketLabel(d.bucket, 'day', true)}: ${formatValue(d.signups, 'count')} new ${d.signups === 1 ? 'store' : 'stores'}`,
                }))}
                label="New stores"
                ariaLabel="New stores per day for the last 30 days"
                tickEvery={7}
              />
            </Card>
          </div>
        </>
      )}

      {canSeeFees && <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <Receipt size={16} className="text-regantify-text-muted" />
          <p className="text-[13px] font-semibold text-regantify-text">Recent platform fees</p>
          <span className="ml-auto text-xs text-regantify-text-muted">all-time: {fees.data ? formatAmount(fees.data.totalRevenue) : '…'}</span>
        </div>
        {fees.isLoading ? (
          <div className="p-8 text-center text-sm text-regantify-text-muted">Loading…</div>
        ) : !fees.data?.recent.length ? (
          <div className="p-8 text-center text-sm text-regantify-text-muted">No platform fees collected yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th>Order</th>
                <th>Store</th>
                <th className="text-right">Fee</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {fees.data.recent.map((row) => (
                <tr key={row.id}>
                  <td className="console-id text-regantify-text">{row.invoiceNumber ? `ORDER-${row.invoiceNumber}` : '—'}</td>
                  <td className="text-regantify-text">{row.vendorName ?? '—'}</td>
                  <td className="text-right font-medium text-regantify-text">{formatAmount(row.amount)}</td>
                  <td className="text-regantify-text-muted">
                    {new Date(row.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>}
    </div>
  );
}
