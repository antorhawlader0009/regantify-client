import { Link } from 'react-router-dom';
import { Card, CardLink, EmptyState, KpiCard, KpiStrip } from '../../../components/analytics/AnalyticsUi';
import { PALETTE, TrendChart } from '../../../components/analytics/TrendChart';
import { formatTaka, COMPARE_LABEL, sharePct } from '../../../components/analytics/format';
import { TabState, useAnalytics, type TabProps } from './useAnalytics';

export function CustomersTab({ range }: TabProps) {
  const query = useAnalytics('customers', range);
  const compareLabel = COMPARE_LABEL;

  return (
    <TabState query={query}>
      {(data) => {
        const repeatPct = sharePct(data.repeatRate.repeatCustomers, data.repeatRate.customers);
        const { customers, newCustomers, returningCustomers } = data.kpis;
        return (
          <>
            <KpiStrip cols={3}>
              <KpiCard label="Customers who ordered" value={customers} kind="count" hint="Counted by phone number" compareLabel={compareLabel} />
              <KpiCard label="New customers" value={newCustomers} kind="count" hint="First order ever in this period" compareLabel={compareLabel} />
              <KpiCard label="Returning customers" value={returningCustomers} kind="count" hint="Had ordered from you before" compareLabel={compareLabel} />
            </KpiStrip>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2" title="New vs returning customers" subtitle={data.bucket === 'month' ? 'Per month' : 'Per day'}>
                {customers.current === 0 ? (
                  <EmptyState text="No customers ordered in this period yet." />
                ) : (
                  <TrendChart
                    data={data.trend}
                    series={[
                      { key: 'newCustomers', label: 'New', color: PALETTE.blue },
                      { key: 'returningCustomers', label: 'Returning', color: PALETTE.orange },
                    ]}
                    kind="count"
                    bucket={data.bucket}
                    ariaLabel="New and returning customers over time"
                  />
                )}
              </Card>

              <Card title="Customer loyalty" subtitle="All time, not just this period">
                <div className="flex flex-col items-center text-center py-2">
                  <LoyaltyRing pct={repeatPct} />
                  <p className="mt-3 text-sm text-regantify-text">
                    <b className="font-semibold">{data.repeatRate.repeatCustomers}</b> of {data.repeatRate.customers} customers ordered more than once.
                  </p>
                  <p className="mt-1 text-xs text-regantify-text-muted">Online shops usually see 20–30%. A thank-you SMS or a return coupon helps.</p>
                </div>
              </Card>
            </div>

            <Card title="Top customers" subtitle="Who spent the most in this period" action={<CardLink to="/vendor/customers">All customers</CardLink>}>
              {data.topCustomers.length === 0 ? (
                <EmptyState text="No customers ordered in this period yet." />
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-left text-[12px] text-regantify-text-muted">
                        <th className="px-5 pb-2 font-normal">Customer</th>
                        <th className="px-3 pb-2 font-normal">Area</th>
                        <th className="px-3 pb-2 font-normal text-right">Orders</th>
                        <th className="px-3 pb-2 font-normal text-right">Spent</th>
                        <th className="px-5 pb-2 font-normal text-right">Last order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCustomers.map((c) => (
                        <tr key={c.phone} className="border-t border-black/5 hover:bg-black/[0.015]">
                          <td className="px-5 py-2.5">
                            <Link to={`/vendor/customers/${encodeURIComponent(c.phone)}`} className="flex items-center gap-3 group">
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-regantify-content text-xs font-semibold text-regantify-text">
                                {c.name.trim().charAt(0).toUpperCase() || '?'}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-regantify-text group-hover:underline">{c.name}</span>
                                <span className="block text-xs text-regantify-text-muted">{c.phone}</span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-regantify-text-muted">{c.district || '—'}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{c.orders}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatTaka(c.spent)}</td>
                          <td className="px-5 py-2.5 text-right text-regantify-text-muted whitespace-nowrap">
                            {new Date(c.lastOrderAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        );
      }}
    </TabState>
  );
}

/** A single-value ring: the share of customers who came back. */
function LoyaltyRing({ pct }: { pct: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`${pct.toFixed(0)}% repeat customers`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#000" strokeOpacity={0.06} strokeWidth={9} />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={PALETTE.aqua}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${(Math.min(100, pct) / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-regantify-text tabular-nums">{pct.toFixed(0)}%</span>
        <span className="text-[11px] text-regantify-text-muted">come back</span>
      </div>
    </div>
  );
}
