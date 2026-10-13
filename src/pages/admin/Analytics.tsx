import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { adminAnalyticsApi, type Adoption } from '../../lib/adminAnalyticsApi';
import { ColumnChart } from '../../components/analytics/TrendChart';
import { bucketLabel, formatTaka } from '../../components/analytics/format';
import { formatDhakaDateTime } from '../../lib/dhakaDate';

// Super Admin > Analytics (super-admin-plan.md Step 16). One endpoint, cached 10 minutes on the server; the definitions are printed at the top.
const TABS = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'growth', label: 'Growth' },
  { id: 'retention', label: 'Retention' },
  { id: 'usage', label: 'Usage' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function Card({ title, hint, children, className = '' }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-black/5 bg-white p-5 ${className}`}>
      <h2 className="text-sm font-semibold text-regantify-text">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-regantify-text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4">
      <p className="text-xs text-regantify-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-regantify-text">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-regantify-text-muted">{sub}</p>}
    </div>
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

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-black/5">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-regantify-black text-regantify-text' : 'border-transparent text-regantify-text-muted hover:text-regantify-text'}`}>
            {t.label}
          </button>
        ))}
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
              <div className="overflow-x-auto">
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
                <ColumnChart
                  data={revenue.incomeByMonth.map((m) => ({ key: m.month, value: m.total, tick: bucketLabel(m.month, 'month'), tooltip: `${monthLong(m.month)}: ${formatTaka(m.total)} (plans ${formatTaka(m.plans)}, SMS ${formatTaka(m.sms)}, AI ${formatTaka(m.ai)}, fees ${formatTaka(m.fees)})` }))}
                  label="Income"
                  ariaLabel="Platform income per month for the last 12 months"
                  tickEvery={2}
                />
              </Card>
              <Card title="Plan income, last 12 months" hint="What each plan brought in through PayStation.">
                {revenue.incomePerPlan.length === 0 ? (
                  <p className="text-sm text-regantify-text-muted">No plan was paid for through PayStation yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr><th className={th}>Plan</th><th className={th}>Payments</th><th className={th}>Income</th></tr></thead>
                    <tbody>
                      {revenue.incomePerPlan.map((p) => (
                        <tr key={p.plan} className="border-t border-black/5"><td className={td}>{p.plan}</td><td className={td}>{p.payments}</td><td className={td}>{formatTaka(p.amount)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          </>
        )}

        {tab === 'growth' && (
          <>
            <Card title="Sign-ups per day, last 90 days">
              <ColumnChart
                data={growth.signupsPerDay.map((d) => ({ key: d.day, value: d.count, tick: bucketLabel(d.day, 'day'), tooltip: `${bucketLabel(d.day, 'day', true)}: ${d.count} sign-ups` }))}
                label="Sign-ups"
                ariaLabel="Sign-ups per day for the last 90 days"
                tickEvery={15}
              />
            </Card>
            <Card title="Sign-ups per week" hint="Weeks start on Monday.">
              <ColumnChart
                data={growth.signupsPerWeek.map((w) => ({ key: w.week, value: w.count, tick: bucketLabel(w.week, 'day'), tooltip: `Week of ${bucketLabel(w.week, 'day', true)}: ${w.count} sign-ups` }))}
                label="Sign-ups"
                ariaLabel="Sign-ups per week"
                tickEvery={4}
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
                        {r.active.map((v, i) => (<td key={`a${i}`} className={td}>{pctText(v)}</td>))}
                        {r.paying.map((v, i) => (<td key={`p${i}`} className={td}>{pctText(v)}</td>))}
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
              <table className="w-full text-sm">
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
                <ColumnChart data={usage.smsPerDay.map((d) => ({ key: d.day, value: d.count, tick: bucketLabel(d.day, 'day'), tooltip: `${bucketLabel(d.day, 'day', true)}: ${d.count} SMS` }))} label="SMS" ariaLabel="SMS credits used per day" tickEvery={7} />
              </Card>
              <Card title="AI credits spent per day, last 30 days">
                <ColumnChart data={usage.aiCreditsPerDay.map((d) => ({ key: d.day, value: d.count, tick: bucketLabel(d.day, 'day'), tooltip: `${bucketLabel(d.day, 'day', true)}: ${d.count.toLocaleString('en-US')} credits` }))} label="Credits" ariaLabel="AI credits spent per day" tickEvery={7} />
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
