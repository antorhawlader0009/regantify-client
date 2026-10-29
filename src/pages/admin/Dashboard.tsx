import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowDownRight, ArrowUpRight, CircleCheck, Landmark, Loader2, Receipt, Repeat, ShoppingBag, Sparkles, Store as StoreIcon, TrendingDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { adminDashboardApi, type AdminOverview, type Compared, type OverviewRange } from '../../lib/adminDashboardApi';
// This page is imported eagerly by App.tsx, so its charts come from the lazy wrappers (Recharts stays out of the first download).
import {
  LazyGradientBarChart as GradientBarChart,
  LazyGradientDonut as GradientDonut,
  LazyRadialRings as RadialRings,
  LazySparkline as Sparkline,
} from '../../components/admin/charts/lazy';
import { SERIES, bucketLabel, formatCompact, formatTaka, formatValue, type ValueKind } from '../../components/admin/charts/theme';
import { Card, CardHeader } from '../../components/admin/ui/Card';
import { RangeTabs } from '../../components/admin/ui/RangeTabs';
import { ChangeTag, StatCard } from '../../components/admin/ui/StatCard';
import { ListTile } from '../../components/admin/ui/ListTile';
import { EmptyState, Skeleton } from '../../components/admin/ui/Primitives';
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
/** A label and a value with its change, one line in a card. */
function Row({ label, value, change, kind, note, badWhenUp }: { label: string; value: string; change?: Compared; kind?: ValueKind; note?: string; badWhenUp?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--console-tile-line)] py-2.5 last:border-b-0">
      <div>
        <p className="text-[13.5px] text-regantify-text">{label}</p>
        {note && <p className="text-xs text-regantify-text-muted">{note}</p>}
      </div>
      <div className="flex items-baseline gap-2 text-right">
        {change && <ChangeTag value={change} kind={kind} badWhenUp={badWhenUp} />}
        <span className="text-[13.5px] font-semibold tabular-nums text-regantify-text">{value}</span>
      </div>
    </div>
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
  const day = (v: string | number) => bucketLabel(String(v), 'day');
  const dayLong = (v: string | number) => bucketLabel(String(v), 'day', true);
  const taka = (n: number) => formatTaka(n);
  const takaShort = (n: number) => formatCompact(n, 'money');

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-0.5 text-regantify-text-muted">
            {data ? `Hello ${(user?.fullName ?? 'there').split(' ')[0]}. Numbers compared with ${data.period.previousLabel}, refreshed every minute.` : 'The whole platform at a glance.'}
          </p>
        </div>
        <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-full bg-white px-1.5 py-1 shadow-[var(--console-card-shadow)]">
          {isFetching && <Loader2 size={14} className="ml-1 animate-spin text-neutral-400" />}
          <RangeTabs options={RANGES} value={range} onChange={setRange} />
        </div>
      </div>

      {error && !data && <p className="py-10 text-center text-sm text-red-600">Could not load the dashboard.</p>}
      {isLoading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[150px] w-full rounded-2xl" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Platform income"
              value={formatTaka(data.income.total.current)}
              change={data.income.total}
              kind="money"
              hint="plans, packs, fees"
              icon={<Landmark />}
              tone="orange"
              to="/admin/finance/revenue"
              chart={<Sparkline values={data.charts.income.map((d) => d.income)} color={SERIES.orange} />}
            />
            <StatCard
              label="Monthly recurring revenue"
              value={formatTaka(data.subscriptions.mrr)}
              hint={`${data.subscriptions.payingStores} paying ${data.subscriptions.payingStores === 1 ? 'store' : 'stores'}`}
              icon={<Repeat />}
              tone="purple"
              to="/admin/plans"
            />
            <StatCard
              label="Active stores"
              value={String(data.stores.active7d)}
              hint={`of ${data.stores.total}, last 7 days`}
              icon={<StoreIcon />}
              tone="cyan"
              to="/admin/vendors/all"
              chart={<Sparkline values={data.charts.signups.map((d) => d.signups)} color={SERIES.cyan} />}
            />
            <StatCard
              label="Orders value (GMV)"
              value={formatTaka(data.gmv.total.current)}
              change={data.gmv.total}
              kind="money"
              hint={`${data.gmv.orders.current} orders`}
              icon={<ShoppingBag />}
              tone="green"
              to="/admin/orders"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Stores by plan" subtitle="every store, today" to="/admin/plans" toLabel="Plans" />
              <GradientDonut
                label="Stores on each plan"
                slices={[
                  ...data.subscriptions.plans.map((p) => ({ key: p.code, label: p.name, value: p.stores })),
                  { key: 'FREE', label: 'Free', value: data.subscriptions.freeStores },
                ].sort((a, b) => b.value - a.value)}
                format={(n) => `${n} ${n === 1 ? 'store' : 'stores'}`}
                centerValue={String(data.subscriptions.payingStores + data.subscriptions.freeStores)}
                centerCaption="stores"
                pill={data.subscriptions.payingStores ? `${data.subscriptions.payingStores} paying` : undefined}
              />
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Platform income" subtitle="per day, last 30 days" to="/admin/finance/revenue" toLabel="Revenue" />
              <GradientBarChart
                label="Platform income per day for the last 30 days"
                rows={data.charts.income}
                xKey="bucket"
                series={[{ key: 'income', label: 'Income' }]}
                xLabel={day}
                tooltipTitle={dayLong}
                format={taka}
                axisFormat={takaShort}
                height={290}
              />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title={items.length ? `Needs action now (${items.length})` : 'Needs action now'} />
              {items.length === 0 ? (
                <ListTile title="Nothing needs you right now." icon={<CircleCheck />} tone="green" />
              ) : (
                <div className="space-y-2.5">
                  {items.map((i) => (
                    <ListTile key={i.key} title={i.text} icon={<AlertCircle />} tone="red" to={i.to} />
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <CardHeader title="Store health" subtitle="share of all stores" to="/admin/vendors/all" toLabel="Stores" />
              <RadialRings
                label="Share of stores that pay and that were active in the last 7 days"
                rings={[
                  { key: 'paying', label: 'Paying', value: data.subscriptions.payingStores, max: data.stores.total, detail: `${data.subscriptions.payingStores} of ${data.stores.total} stores` },
                  { key: 'active', label: 'Active, 7 days', value: data.stores.active7d, max: data.stores.total, detail: `${data.stores.active7d} of ${data.stores.total} stores` },
                ]}
                centerCaption="paying"
              />
            </Card>
            <SmsBalanceCard />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Where income came from" subtitle="this period" to="/admin/finance/revenue" />
              <GradientDonut
                label="Platform income by kind"
                slices={[
                  { key: 'plans', label: 'Plans', value: data.income.plans.current },
                  { key: 'sms', label: 'SMS packs', value: data.income.sms.current },
                  { key: 'ai', label: 'AI credit packs', value: data.income.ai.current },
                  { key: 'fees', label: 'Fees on orders', value: data.income.platformFees.current },
                ]}
                format={taka}
                centerValue={takaShort(data.income.total.current)}
                centerCaption="income"
                height={220}
              />
              <div className="mt-4">
                <Row label="Plans" value={formatTaka(data.income.plans.current)} change={data.income.plans} kind="money" />
                <Row label="SMS packs" value={formatTaka(data.income.sms.current)} change={data.income.sms} kind="money" />
                <Row label="AI credit packs" value={formatTaka(data.income.ai.current)} change={data.income.ai} kind="money" />
                <Row label="Platform fees on orders" value={formatTaka(data.income.platformFees.current)} change={data.income.platformFees} kind="money" />
                <Row label="Total" value={formatTaka(data.income.total.current)} change={data.income.total} kind="money" />
              </div>
              <p className="mt-3 rounded-xl bg-[var(--console-tile)] px-3 py-2 text-xs text-regantify-text-muted">
                Not income: {formatTaka(data.income.walletTopups.current)} added to store wallets (their own money, held by the platform)
                {data.income.debtsCleared.current > 0 ? ` and ${formatTaka(data.income.debtsCleared.current)} of old store debts paid inside purchases` : ''}.
              </p>
            </Card>

            <Card>
              <CardHeader title="Orders across all stores" subtitle="cancelled, unpaid and returned left out" to="/admin/orders" />
              <GradientDonut
                label="Order value by where the order was made"
                slices={(Object.keys(SOURCE_LABEL) as Array<keyof typeof SOURCE_LABEL>).map((s) => ({ key: s, label: SOURCE_LABEL[s], value: data.gmv.bySource[s].gmv }))}
                format={taka}
                centerValue={takaShort(data.gmv.total.current)}
                centerCaption="GMV"
                height={220}
              />
              <div className="mt-4">
                <Row label="Orders" value={String(data.gmv.orders.current)} change={data.gmv.orders} />
                <Row label="Value (GMV)" value={formatTaka(data.gmv.total.current)} change={data.gmv.total} kind="money" />
                <Row label="Average order" value={formatTaka(data.gmv.average.current)} change={data.gmv.average} kind="money" />
                {(Object.keys(SOURCE_LABEL) as Array<keyof typeof SOURCE_LABEL>).map((s) => (
                  <Row key={s} label={SOURCE_LABEL[s]} value={`${data.gmv.bySource[s].orders} · ${formatTaka(data.gmv.bySource[s].gmv)}`} />
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Plan moves" subtitle="this period" to="/admin/plans" />
              <div className="space-y-2.5">
                <ListTile title="First plan payment" subtitle="paid for a plan for the first time" icon={<Sparkles />} tone="green" trailing={<MoveValue value={data.subscriptions.newPaying} />} />
                <ListTile title="Plan payments again" subtitle="a paying store paid again" icon={<Repeat />} tone="cyan" trailing={<MoveValue value={data.subscriptions.renewals} />} />
                <ListTile title="Upgrades" subtitle="moved to a dearer plan" icon={<ArrowUpRight />} tone="purple" trailing={<MoveValue value={data.subscriptions.upgrades} />} />
                <ListTile title="Downgrades" subtitle="moved to a cheaper plan" icon={<ArrowDownRight />} tone="orange" trailing={<MoveValue value={data.subscriptions.downgrades} badWhenUp />} />
                <ListTile title="Plans that ended" subtitle="went back to Free" icon={<TrendingDown />} tone="red" trailing={<MoveValue value={data.subscriptions.ended} badWhenUp />} />
              </div>
            </Card>

            <Card>
              <CardHeader title="Stores" to="/admin/vendors/all" />
              <Row label="All stores" value={String(data.stores.total)} />
              <Row label="Active in the last 7 days" note="owner signed in or an order came" value={String(data.stores.active7d)} />
              <Row label="New in this period" value={String(data.stores.signups.current)} change={data.stores.signups} />
              <Row label="New today / last 7 days" value={`${data.stores.signupsToday} / ${data.stores.signups7d}`} />
              <Row label="Suspended" value={String(data.stores.suspended)} />
              <Row label="Waiting for approval" value={String(data.stores.pending)} />
              <Row label="Being verified (KYC)" value={String(data.stores.underKyc)} />
            </Card>

            <Card>
              <CardHeader title="New stores" subtitle="per day, last 30 days" />
              <GradientBarChart
                label="New stores per day for the last 30 days"
                rows={data.charts.signups}
                xKey="bucket"
                series={[{ key: 'signups', label: 'New stores', color: SERIES.purple }]}
                xLabel={day}
                tooltipTitle={dayLong}
                format={(n) => formatValue(n, 'count')}
                height={250}
              />
            </Card>
          </div>
        </>
      )}

      {canSeeFees && (
        <Card flush>
          <div className="flex items-center gap-3 px-5 pb-3 pt-5 sm:px-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--tint-orange-bg)] text-regantify-cta">
              <Receipt size={18} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-regantify-text">Recent platform fees</h2>
              <p className="text-[13px] text-regantify-text-muted">all-time: {fees.data ? formatAmount(fees.data.totalRevenue) : '…'}</p>
            </div>
          </div>
          {fees.isLoading ? (
            <div className="p-8 text-center text-sm text-regantify-text-muted">Loading…</div>
          ) : !fees.data?.recent.length ? (
            <EmptyState icon={<Receipt />} title="No platform fees collected yet." />
          ) : (
            <div className="overflow-x-auto px-5 pb-5 sm:px-6">
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
                      <td className="console-id text-regantify-text">{row.invoiceNumber ? `ORDER-${row.invoiceNumber}` : '-'}</td>
                      <td className="text-regantify-text">{row.vendorName ?? '-'}</td>
                      <td className="text-right font-medium text-regantify-text">{formatAmount(row.amount)}</td>
                      <td className="text-regantify-text-muted">{new Date(row.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/** A plan-move count with its change, for the ListTile's right side. */
function MoveValue({ value, badWhenUp }: { value: Compared; badWhenUp?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <ChangeTag value={value} badWhenUp={badWhenUp} />
      <span className="text-[15px] font-semibold tabular-nums">{value.current}</span>
    </span>
  );
}
