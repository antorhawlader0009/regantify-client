import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { DashboardSummary } from '../../lib/dashboardApi';
import { Segmented } from '../analytics/AnalyticsUi';
import { TrendChart } from '../analytics/TrendChart';
import { formatValue } from '../analytics/format';
import { orderStatusLabel } from '../../pages/vendor/order/orderStatus';
import { DonutChart, STATUS_COLOR } from '../charts/DonutChart';

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
export function SalesOverview({ data, layout }: { data: DashboardSummary; layout: (trend: ReactNode, status: ReactNode) => ReactNode }) {
  const [range, setRange] = useState<Range>('7');
  const [metric, setMetric] = useState<Metric>('sales');

  const days = Number(range);
  const trend = data.trend.slice(-days);
  const totalSales = trend.reduce((sum, d) => sum + d.sales, 0);
  const totalOrders = trend.reduce((sum, d) => sum + d.orders, 0);
  const statuses = range === '7' ? data.statuses.last7 : data.statuses.last30;
  const placed = statuses.reduce((sum, s) => sum + s.count, 0);
  const analyticsLink = `/vendor/analytics?tab=overview&preset=${range === '7' ? 'last7' : 'last30'}`;

  const trendCard = (
      <section className="min-w-0 rounded-xl border border-line bg-white p-4" aria-labelledby="trend-title">
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
            height={270}
            ariaLabel={`Sales per day, last ${days} days`}
          />
          </div>
        ) : (
          <TrendChart
            data={trend}
            series={[{ key: 'orders', label: 'Orders', color: BRAND }]}
            kind="count"
            bucket="day"
            height={270}
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
  );

  const statusCard = (
      <section className="min-w-0 rounded-xl border border-line bg-white p-4" aria-labelledby="status-title">
        <h2 id="status-title" className="text-[15px] font-semibold text-regantify-text">
          Orders by status
        </h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          {placed.toLocaleString()} {placed === 1 ? 'order' : 'orders'} placed in the last {days} days, every status
        </p>

        <div className="mt-3">
          <DonutChart
            emptyText={`No orders in the last ${days} days.`}
            centerValue={placed.toLocaleString()}
            centerLabel={placed === 1 ? 'order' : 'orders'}
            slices={statuses.map((s) => ({
              key: s.status,
              label: orderStatusLabel(s.status),
              value: s.count,
              color: STATUS_COLOR[s.status] ?? '#94a3b8',
              to: `/vendor/orders?status=${s.status}`,
            }))}
          />
        </div>
      </section>
  );

  // The page decides where the two cards sit (they go in different columns, so neither stretches to the other).
  return <>{layout(trendCard, statusCard)}</>;
}
