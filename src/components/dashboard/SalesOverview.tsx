import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { DashboardSummary } from '../../lib/dashboardApi';
import { Segmented } from '../analytics/AnalyticsUi';
import { TrendChart } from '../analytics/TrendChart';
import { formatValue } from '../analytics/format';
import { OrderStatusBadge } from '../../pages/vendor/order/orderStatus';

type Range = '7' | '30';
type Metric = 'sales' | 'orders';

/** The theme's brand green (tailwind `brand`); TrendChart takes a plain color. */
const BRAND = '#4F46E5';

const RANGES: { id: Range; label: string }[] = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
];

const METRICS: { id: Metric; label: string }[] = [
  { id: 'sales', label: 'Sales' },
  { id: 'orders', label: 'Orders' },
];

/**
 * Dashboard > sales trend + orders by status (dashboard-plan.md Step 6).
 * One 7 / 30 day switch drives both cards, so they always cover the same
 * days. The chart is the Analytics TrendChart in the brand colour; the
 * deeper view is a click away on Analytics.
 */
export function SalesOverview({ data }: { data: DashboardSummary }) {
  const [range, setRange] = useState<Range>('7');
  const [metric, setMetric] = useState<Metric>('sales');

  const days = Number(range);
  const trend = data.trend.slice(-days);
  const totalSales = trend.reduce((sum, d) => sum + d.sales, 0);
  const totalOrders = trend.reduce((sum, d) => sum + d.orders, 0);
  const statuses = range === '7' ? data.statuses.last7 : data.statuses.last30;
  const placed = statuses.reduce((sum, s) => sum + s.count, 0);
  const maxStatus = Math.max(1, ...statuses.map((s) => s.count));
  const analyticsLink = `/vendor/analytics?tab=overview&preset=${range === '7' ? 'last7' : 'last30'}`;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Trend */}
      <section className="min-w-0 rounded-xl border border-line bg-white p-4 lg:col-span-2" aria-labelledby="trend-title">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="trend-title" className="text-[15px] font-semibold text-regantify-text">
              {metric === 'sales' ? 'Sales' : 'Orders'}, last {days} days
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              <span className="dash-money font-semibold text-regantify-text tabular-nums">{formatValue(totalSales, 'money')}</span> from{' '}
              <span className="font-semibold text-regantify-text tabular-nums">{totalOrders.toLocaleString()}</span>{' '}
              {totalOrders === 1 ? 'order' : 'orders'}, today included
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">Cancelled orders and unpaid online orders aren’t counted as sales.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented options={METRICS} value={metric} onChange={setMetric} />
            <Segmented options={RANGES} value={range} onChange={setRange} />
          </div>
        </div>

        {metric === 'sales' ? (
          <div className="dash-money">
          <TrendChart
            data={trend}
            series={[{ key: 'sales', label: 'Sales', color: BRAND }]}
            kind="money"
            bucket="day"
            height={220}
            ariaLabel={`Sales per day, last ${days} days`}
          />
          </div>
        ) : (
          <TrendChart
            data={trend}
            series={[{ key: 'orders', label: 'Orders', color: BRAND }]}
            kind="count"
            bucket="day"
            height={220}
            ariaLabel={`Orders per day, last ${days} days`}
          />
        )}

        <div className="mt-3 flex justify-end">
          <Link to={analyticsLink} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            View in Analytics
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </section>

      {/* Orders by status, same days */}
      <section className="min-w-0 rounded-xl border border-line bg-white p-4" aria-labelledby="status-title">
        <h2 id="status-title" className="text-[15px] font-semibold text-regantify-text">
          Orders by status
        </h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          {placed.toLocaleString()} {placed === 1 ? 'order' : 'orders'} placed in the last {days} days, every status
        </p>

        {statuses.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">No orders in the last {days} days.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {statuses.map((s) => (
              <li key={s.status}>
                <Link
                  to={`/vendor/orders?status=${s.status}`}
                  className="relative flex items-center justify-between gap-3 overflow-hidden rounded-lg px-2.5 py-2 transition-colors hover:bg-neutral-50"
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-lg bg-brand-lime/40"
                    style={{ width: `${Math.max(3, (s.count / maxStatus) * 100)}%` }}
                    aria-hidden
                  />
                  <span className="relative">
                    <OrderStatusBadge status={s.status} />
                  </span>
                  <span className="relative text-sm font-semibold tabular-nums text-regantify-text">{s.count.toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
