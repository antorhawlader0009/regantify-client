import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { adminAnalyticsApi, type Adoption } from '../../lib/adminAnalyticsApi';
import { GradientAreaChart, GradientBarChart, GradientDonut, SERIES, bucketLabel, formatCompact, formatTaka } from '../../components/admin/charts';
import { Card as AdminCard, CardHeader } from '../../components/admin/ui/Card';
import { RangeTabs } from '../../components/admin/ui/RangeTabs';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { adminHelpApi } from '../../lib/helpApi';

// Super Admin > Analytics (super-admin-plan.md Step 16). One endpoint, cached 10 minutes on the server; the definitions are printed at the top.
const TABS = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'growth', label: 'Growth' },
  { id: 'retention', label: 'Retention' },
  { id: 'usage', label: 'Usage' },
  { id: 'feedback', label: 'Seller rating' },
  { id: 'views', label: 'Simple mode' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function Card({ title, hint, children, className = '' }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <AdminCard className={className}>
      <CardHeader title={title} subtitle={hint} />
      {children}
    </AdminCard>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[var(--console-card-shadow)]">
      <p className="text-[13px] font-medium text-regantify-text-muted">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-tight tracking-tight tabular-nums text-regantify-text">{value}</p>
      {sub && <p className="mt-1 text-xs text-regantify-text-muted">{sub}</p>}
    </div>
  );
}

/** A retention or funnel share as a cell tinted by its size: one hue, light to dark (a sequential scale), with the number always written. */
function HeatCell({ value }: { value: number | null }) {
  if (value === null) return <td className={`${td} text-regantify-text-muted`}>—</td>;
  const a = Math.max(0.06, Math.min(1, value / 100) * 0.55);
  return (
    <td className={`${td} font-medium ${value >= 60 ? 'admin-heat-strong' : ''}`} style={{ background: `rgba(234, 88, 12, ${a})` }}>
      {value}%
    </td>
  );
}

const th = 'py-1.5 pr-3 text-left text-xs font-medium text-regantify-text-muted';
const td = 'py-1.5 pr-3 tabular-nums text-regantify-text';
const monthLong = (m: string) => bucketLabel(m, 'month', true);
const pctText = (v: number | null) => (v === null ? '—' : `${v}%`);
const signed = (n: number) => (n === 0 ? '—' : `${n > 0 ? '+' : '−'}${formatTaka(Math.abs(n))}`);

export default function AdminAnalytics() {
  const [tab, setTab] = useState<TabId>('revenue');
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-analytics'], queryFn: adminAnalyticsApi.get, staleTime: 5 * 60_000 });

  if (isLoading) return <Loader2 className="mx-auto mt-16 animate-spin text-neutral-400" />;
  if (isError || !data) return <p className="mt-10 text-center text-sm text-regantify-text-muted">Analytics could not be loaded. Please try again.</p>;
  const { growth, revenue, retention, usage } = data;
  const lost = revenue.lostLastMonth;

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold text-regantify-text">Analytics</h1>
      <p className="mt-1 text-sm text-regantify-text-muted">The whole platform: money, growth, who stays, and how stores use it. Updated every 10 minutes (last: {formatDhakaDateTime(data.generatedAt)}).</p>
      <details className="mt-3 rounded-xl bg-white px-4 py-2.5 text-sm text-regantify-text-muted ring-1 ring-black/5">
        <summary className="cursor-pointer font-medium text-regantify-text">What the numbers mean</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {data.definitions.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </details>

      <div className="mt-5 inline-flex max-w-full overflow-x-auto rounded-full bg-white p-1.5 shadow-[var(--console-card-shadow)]">
        <RangeTabs options={TABS} value={tab} onChange={setTab} label="Analytics section" />
      </div>

      <div className="mt-6 space-y-4">
        {tab === 'revenue' && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="MRR now" value={formatTaka(revenue.mrrNow)} sub={`${revenue.payingStores} paying stores`} />
              <Stat label={`Lost in ${monthLong(lost.month)}`} value={`${lost.stores} ${lost.stores === 1 ? 'store' : 'stores'}`} sub={lost.stores ? `${formatTaka(lost.mrr)} of MRR${lost.estimated ? ' (estimated)' : ''}` : 'none'} />
              <Stat label="Platform income, this month" value={formatTaka(revenue.incomeByMonth[revenue.incomeByMonth.length - 1]?.total ?? 0)} sub="plans, SMS, AI packs and fees" />
              <Stat label="Paying plans" value={String(revenue.payingNow.length)} sub={revenue.payingNow.map((p) => `${p.plan} ${p.stores}`).join(' · ') || 'none'} />
            </div>

            <Card title={`Paying stores lost in ${monthLong(lost.month)}`} hint="A paid plan that ended and was not renewed. By plan, then each store.">
              {lost.stores === 0 ? (
                <p className="text-sm text-regantify-text-muted">No paying store was lost last month.</p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr><th className={th}>Plan</th><th className={th}>Stores</th><th className={th}>MRR lost</th></tr>
                    </thead>
                    <tbody>
                      {lost.byPlan.map((p) => (
                        <tr key={p.plan} className="border-t border-black/5"><td className={td}>{p.plan}</td><td className={td}>{p.stores}</td><td className={td}>{formatTaka(p.mrr)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <ul className="max-h-60 divide-y divide-black/5 overflow-y-auto text-sm">
                    {lost.list.map((s) => (
                      <li key={`${s.vendorId}-${s.at}`} className="flex items-center justify-between gap-3 py-1.5">
                        <Link to={`/admin/vendors/${s.vendorId}`} className="truncate font-medium text-regantify-cta hover:underline">{s.storeName}</Link>
                        <span className="shrink-0 text-xs text-regantify-text-muted">{s.plan} · {formatTaka(s.mrr)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lost.estimated && <p className="mt-3 text-xs text-regantify-text-muted">Rebuilt from “plan ended” notices: plan history was not kept before this report existed.</p>}
            </Card>

            <Card title="MRR by month" hint="Where recurring revenue came from and went: new stores, upgrades, downgrades and lost stores.">
              <GradientAreaChart
                label="Monthly recurring revenue at the end of each month"
                rows={revenue.mrrByMonth}
                xKey="month"
                series={[{ key: 'mrr', label: 'MRR at end', color: SERIES.purple }]}
                xLabel={(v) => bucketLabel(String(v), 'month')}
                tooltipTitle={(v) => monthLong(String(v))}
                format={formatTaka}
                axisFormat={(n) => formatCompact(n, 'money')}
                height={240}
              />
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr><th className={th}>Month</th><th className={th}>MRR at end</th><th className={th}>New</th><th className={th}>Upgrade</th><th className={th}>Downgrade</th><th className={th}>Lost</th></tr>
                  </thead>
                  <tbody>
                    {[...revenue.mrrByMonth].reverse().map((m) => (
                      <tr key={m.month} className="border-t border-black/5">
                        <td className={td}>{monthLong(m.month)}{m.estimated && <span className="ml-1 text-xs text-regantify-text-muted">est.</span>}</td>
                        <td className={`${td} font-medium`}>{formatTaka(m.mrr)}</td>
                        <td className={td}>{signed(m.newMrr)} <span className="text-xs text-regantify-text-muted">{m.newStores || ''}</span></td>
                        <td className={td}>{signed(m.upgradeMrr)} <span className="text-xs text-regantify-text-muted">{m.upgradeStores || ''}</span></td>
                        <td className={td}>{signed(m.downgradeMrr)} <span className="text-xs text-regantify-text-muted">{m.downgradeStores || ''}</span></td>
                        <td className={td}>{signed(m.lostMrr)} <span className="text-xs text-regantify-text-muted">{m.lostStores || ''}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Platform income by month" hint="Money the platform earned: plans, SMS packs, AI packs and order fees. Wallet top-ups are not income.">
                <GradientBarChart
                  label="Platform income per month for the last 12 months, by kind"
                  rows={revenue.incomeByMonth}
                  xKey="month"
                  series={[
                    { key: 'plans', label: 'Plans' },
                    { key: 'sms', label: 'SMS' },
                    { key: 'ai', label: 'AI packs' },
                    { key: 'fees', label: 'Fees' },
                  ]}
                  stacked
                  xLabel={(v) => bucketLabel(String(v), 'month')}
                  tooltipTitle={(v) => monthLong(String(v))}
                  format={formatTaka}
                  axisFormat={(n) => formatCompact(n, 'money')}
                />
              </Card>
              <Card title="Plan income, last 12 months" hint="What each plan brought in through PayStation.">
                {revenue.incomePerPlan.length === 0 ? (
                  <p className="text-sm text-regantify-text-muted">No plan was paid for through PayStation yet.</p>
                ) : (
                  <>
                  <GradientDonut
                    label="Plan income for the last 12 months, by plan"
                    slices={[...revenue.incomePerPlan].sort((a, b) => b.amount - a.amount).map((p) => ({ key: p.plan, label: p.plan, value: p.amount }))}
                    format={formatTaka}
                    centerValue={formatCompact(revenue.incomePerPlan.reduce((s, p) => s + p.amount, 0), 'money')}
                    centerCaption="12 months"
                    height={210}
                  />
                  <table className="mt-4 w-full text-sm">
                    <thead><tr><th className={th}>Plan</th><th className={th}>Payments</th><th className={th}>Income</th></tr></thead>
                    <tbody>
                      {revenue.incomePerPlan.map((p) => (
                        <tr key={p.plan} className="border-t border-black/5"><td className={td}>{p.plan}</td><td className={td}>{p.payments}</td><td className={td}>{formatTaka(p.amount)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  </>
                )}
              </Card>
            </div>
          </>
        )}

        {tab === 'growth' && (
          <>
            <Card title="Sign-ups per day, last 90 days">
              <GradientBarChart
                label="Sign-ups per day for the last 90 days"
                rows={growth.signupsPerDay}
                xKey="day"
                series={[{ key: 'count', label: 'Sign-ups', color: SERIES.cyan }]}
                xLabel={(v) => bucketLabel(String(v), 'day')}
                tooltipTitle={(v) => bucketLabel(String(v), 'day', true)}
                format={(n) => String(n)}
              />
            </Card>
            <Card title="Sign-ups per week" hint="Weeks start on Monday.">
              <GradientAreaChart
                label="Sign-ups per week"
                rows={growth.signupsPerWeek}
                xKey="week"
                series={[{ key: 'count', label: 'Sign-ups', color: SERIES.cyan }]}
                xLabel={(v) => bucketLabel(String(v), 'day')}
                tooltipTitle={(v) => `Week of ${bucketLabel(String(v), 'day', true)}`}
                format={(n) => String(n)}
                height={240}
              />
            </Card>
            <Card title="Sign-up to first product to first order" hint="By the month the store signed up.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr><th className={th}>Signed up in</th><th className={th}>Stores</th><th className={th}>Added a product</th><th className={th}>Got an order</th><th className={th}>Median days to first order</th></tr></thead>
                  <tbody>
                    {[...growth.funnel].reverse().map((f) => (
                      <tr key={f.month} className="border-t border-black/5">
                        <td className={td}>{monthLong(f.month)}</td>
                        <td className={td}>{f.signups}</td>
                        <td className={td}>{f.withProduct} <span className="text-xs text-regantify-text-muted">{pctText(f.productPct)}</span></td>
                        <td className={td}>{f.withOrder} <span className="text-xs text-regantify-text-muted">{pctText(f.orderPct)}</span></td>
                        <td className={td}>{f.medianDaysToFirstOrder === null ? '—' : `${f.medianDaysToFirstOrder} days`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {tab === 'retention' && (
          <Card title="Who stays" hint="Of the stores that signed up in a month, the share still active (an order that month) and still paying, 1, 2, 3 and 6 months later. A dash means that month has not finished yet.">
            {retention.every((r) => r.signups === 0) ? (
              <p className="text-sm text-regantify-text-muted">No sign-ups in the last 8 months.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr>
                      <th className={th}>Signed up in</th><th className={th}>Stores</th>
                      {['1', '2', '3', '6'].map((m) => (<th key={`a${m}`} className={th}>Active after {m}m</th>))}
                      {['1', '2', '3', '6'].map((m) => (<th key={`p${m}`} className={th}>Paying after {m}m</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...retention].reverse().filter((r) => r.signups > 0).map((r) => (
                      <tr key={r.month} className="border-t border-black/5">
                        <td className={td}>{monthLong(r.month)}</td>
                        <td className={td}>{r.signups}</td>
                        {r.active.map((v, i) => (<HeatCell key={`a${i}`} value={v} />))}
                        {r.paying.map((v, i) => (<HeatCell key={`p${i}`} value={v} />))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === 'usage' && (
          <>
            <Card title="Stores by size, last 30 days" hint={`${usage.storesWithSales30d} of ${usage.activeStoresTotal} active stores sold something. Size = the store's sales in 30 days.`}>
              <GradientDonut
                label="Stores by sales size in the last 30 days"
                slices={usage.bySize.map((b) => ({ key: b.label, label: b.label, value: b.stores }))}
                format={(n) => `${n} ${n === 1 ? 'store' : 'stores'}`}
                centerValue={String(usage.bySize.reduce((s, b) => s + b.stores, 0))}
                centerCaption="stores"
                height={210}
              />
              <table className="mt-4 w-full text-sm">
                <thead><tr><th className={th}>Size</th><th className={th}>Stores</th><th className={th}>Orders</th><th className={th}>GMV</th></tr></thead>
                <tbody>
                  {usage.bySize.map((b) => (
                    <tr key={b.label} className="border-t border-black/5"><td className={td}>{b.label}</td><td className={td}>{b.stores}</td><td className={td}>{b.orders.toLocaleString('en-US')}</td><td className={td}>{formatTaka(b.gmv)}</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Top 20 stores by sales, last 30 days">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead><tr><th className={th}>#</th><th className={th}>Store</th><th className={th}>Plan</th><th className={th}>Orders</th><th className={th}>GMV</th></tr></thead>
                  <tbody>
                    {usage.top.map((s, i) => (
                      <tr key={s.vendorId} className="border-t border-black/5">
                        <td className={td}>{i + 1}</td>
                        <td className={td}><Link to={`/admin/vendors/${s.vendorId}`} className="font-medium text-regantify-cta hover:underline">{s.storeName}</Link> <span className="text-xs text-regantify-text-muted">{s.subdomain}</span></td>
                        <td className={td}>{s.plan}</td><td className={td}>{s.orders}</td><td className={td}>{formatTaka(s.gmv)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Features in use" hint={`Out of ${usage.activeStoresTotal} active stores. AI = used AI credits in the last 30 days.`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(
                  [['LMS', usage.adoption.lms], ['POS', usage.adoption.pos], ['Couriers', usage.adoption.couriers], ['Own domain', usage.adoption.customDomain], ['AI', usage.adoption.ai]] as Array<[string, Adoption]>
                ).map(([label, a]) => (
                  <Stat key={label} label={label} value={pctText(a.pct)} sub={`${a.stores} stores`} />
                ))}
              </div>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="SMS used per day, last 30 days" hint="SMS credits stores spent sending (one per text part).">
                <GradientBarChart
                  label="SMS credits used per day for the last 30 days"
                  rows={usage.smsPerDay}
                  xKey="day"
                  series={[{ key: 'count', label: 'SMS', color: SERIES.green }]}
                  xLabel={(v) => bucketLabel(String(v), 'day')}
                  tooltipTitle={(v) => bucketLabel(String(v), 'day', true)}
                  format={(n) => n.toLocaleString('en-US')}
                  height={240}
                />
              </Card>
              <Card title="AI credits spent per day, last 30 days">
                <GradientBarChart
                  label="AI credits spent per day for the last 30 days"
                  rows={usage.aiCreditsPerDay}
                  xKey="day"
                  series={[{ key: 'count', label: 'Credits', color: SERIES.purple }]}
                  xLabel={(v) => bucketLabel(String(v), 'day')}
                  tooltipTitle={(v) => bucketLabel(String(v), 'day', true)}
                  format={(n) => n.toLocaleString('en-US')}
                  axisFormat={(n) => formatCompact(n)}
                  height={240}
                />
              </Card>
            </div>
          </>
        )}
        {tab === 'feedback' && <NpsTab />}
        {tab === 'views' && <DashboardViewsTab />}
      </div>
    </div>
  );
}

/** A two-column count table (page, number) for the Simple mode tab. */
function PathCounts({ rows, unit }: { rows: Array<{ path: string; count: number }>; unit: string }) {
  if (rows.length === 0) return <p className="text-sm text-regantify-text-muted">Nothing yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className="py-2 text-left font-medium text-regantify-text-muted">Page</th>
          <th className="py-2 text-right font-medium text-regantify-text-muted">{unit}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.path} className="border-t border-black/5">
            <td className="py-2 font-mono text-[13px] text-regantify-text">{r.path}</td>
            <td className="py-2 text-right tabular-nums text-regantify-text">{r.count.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Simple mode vs Full mode (SIMPLE-VIEW-plan.md Step 12): how store owners use the two views over the last 30 days.
 * The pages people open, pin or leave Simple mode from most often are the candidates to move into Simple mode.
 */
function DashboardViewsTab() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-analytics-views'], queryFn: adminAnalyticsApi.dashboardViews, staleTime: 5 * 60_000 });
  if (isLoading) return <Loader2 className="mx-auto mt-10 animate-spin text-neutral-400" />;
  if (isError || !data) return <p className="text-sm text-regantify-text-muted">Could not load this. Please try again.</p>;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Owners in Simple mode" value={data.owners.simple.toLocaleString()} />
        <Stat label="Owners in Full mode" value={data.owners.full.toLocaleString()} />
        <Stat label="Switched to Full mode" value={data.switches.toFull.toLocaleString()} sub={`Last 30 days (since ${data.since})`} />
        <Stat label="Switched to Simple mode" value={data.switches.toSimple.toLocaleString()} sub={`Pages added to menus: ${data.pinsAdded.toLocaleString()}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Full mode pages opened from Simple mode" hint="Once per page per browser session.">
          <PathCounts rows={data.hiddenPagesOpened} unit="Opened" />
        </Card>
        <Card title="Pages most added to menus" hint="Pinned right now, across all accounts.">
          <PathCounts rows={data.pinned.map((p) => ({ path: p.path, count: p.people }))} unit="People" />
        </Card>
        <Card title="Where people leave Simple mode" hint="&quot;Switch to Full mode&quot; pressed from a note on this page.">
          <PathCounts rows={data.leftFrom} unit="Times" />
        </Card>
      </div>
    </>
  );
}

/**
 * Seller rating (super-admin-new.md Step 11): the owners' answers to "How likely are you to recommend Regantify?" (0-10, asked once every 90 days).
 * NPS = % who gave 9-10 minus % who gave 0-6, so it runs from -100 to 100.
 */
function NpsTab() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-nps'], queryFn: adminHelpApi.nps, staleTime: 5 * 60_000 });
  if (isLoading || !data) return <Loader2 className="mx-auto mt-10 animate-spin text-neutral-400" />;
  const l = data.last90;
  const td = 'px-3 py-2';
  return (
    <>
      <Card title="Last 90 days" hint="Owners are asked once every 90 days, from their store's 15th day. NPS = share of 9-10 answers minus share of 0-6 answers.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="NPS" value={l.nps === null ? '-' : String(l.nps)} sub={`${l.responses} answers`} />
          <Stat label="Would recommend (9-10)" value={String(l.promoters)} sub={l.responses ? `${Math.round((l.promoters / l.responses) * 100)}%` : '-'} />
          <Stat label="Neutral (7-8)" value={String(l.passives)} />
          <Stat label="Unhappy (0-6)" value={String(l.detractors)} sub={l.responses ? `${Math.round((l.detractors / l.responses) * 100)}%` : '-'} />
          <Stat label="Skipped" value={String(l.skipped)} />
        </div>
        {l.responses > 0 && (
          <div className="mx-auto mt-5 max-w-md">
            <GradientDonut
              label="Seller answers in the last 90 days: would recommend, neutral, unhappy"
              slices={[
                { key: 'pro', label: 'Would recommend', value: l.promoters, color: SERIES.green },
                { key: 'pas', label: 'Neutral', value: l.passives, color: SERIES.cyan },
                { key: 'det', label: 'Unhappy', value: l.detractors, color: SERIES.orange },
              ]}
              format={(n) => `${n} ${n === 1 ? 'answer' : 'answers'}`}
              centerValue={l.nps === null ? '-' : String(l.nps)}
              centerCaption="NPS"
              height={220}
            />
          </div>
        )}
      </Card>
      <Card title="By month">
        {data.byMonth.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">No answers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs text-regantify-text-muted">
                  <th className={`${td} font-normal`}>Month</th>
                  <th className={`${td} text-right font-normal`}>NPS</th>
                  <th className={`${td} text-right font-normal`}>Answers</th>
                  <th className={`${td} text-right font-normal`}>9-10</th>
                  <th className={`${td} text-right font-normal`}>7-8</th>
                  <th className={`${td} text-right font-normal`}>0-6</th>
                  <th className={`${td} text-right font-normal`}>Skipped</th>
                </tr>
              </thead>
              <tbody>
                {[...data.byMonth].reverse().map((m) => (
                  <tr key={m.month} className="border-t border-black/5">
                    <td className={td}>{monthLong(m.month)}</td>
                    <td className={`${td} text-right font-medium tabular-nums`}>{m.nps === null ? '-' : m.nps}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.responses}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.promoters}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.passives}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.detractors}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="What owners wrote" hint="The latest 20 answers that came with a comment.">
        {data.comments.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">No comments yet.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {data.comments.map((c) => (
              <li key={c.id} className="flex gap-3 py-2.5 text-sm">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${c.score >= 9 ? 'bg-emerald-50 text-emerald-800' : c.score >= 7 ? 'bg-neutral-100 text-neutral-700' : 'bg-red-50 text-red-700'}`}>
                  {c.score}
                </span>
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap break-words text-regantify-text">{c.reason}</p>
                  <p className="text-xs text-regantify-text-muted">
                    <Link to={`/admin/vendors/${c.vendorId}`} className="hover:underline">
                      {c.storeName}
                    </Link>
                    {c.planCode ? ` · ${c.planCode}` : ''} · {formatDhakaDateTime(c.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
