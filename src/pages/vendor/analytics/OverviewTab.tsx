import { useState } from 'react';
import type { AnalyticsTab } from '../../../lib/analyticsApi';
import { BarList, Card, CardLink, EmptyState, KpiCard, KpiStrip, ProductThumb, Segmented, Share } from '../../../components/analytics/AnalyticsUi';
import { PALETTE, TrendChart } from '../../../components/analytics/TrendChart';
import { formatTaka, COMPARE_LABEL, sharePct } from '../../../components/analytics/format';
import { orderStatusLabel } from '../order/orderStatus';
import { DonutChart, STATUS_COLOR } from '../../../components/charts/DonutChart';
import { TabState, useAnalytics, type TabProps } from './useAnalytics';
import { ChannelSplitCard } from '../../../components/analytics/ChannelSplit';
import { OrderMapCard } from '../../../components/analytics/OrderMapCard';
import type { DateRange } from '../../../lib/analyticsApi';

/** Loads the order map on its own, so a slow or failed map never holds back the rest of the Overview. */
function OrderMapSection({ range }: { range: DateRange }) {
  const { data } = useAnalytics('orderMap', range);
  if (!data) return <div className="h-64 animate-pulse rounded-xl bg-neutral-100" aria-busy />;
  return <OrderMapCard report={data} />;
}

/** Another Analytics tab, keeping the picked dates (the page's own URL parameters). */
export function tabLink(tab: AnalyticsTab) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', tab);
  return `/vendor/analytics?${params.toString()}`;
}

export function OverviewTab({ range }: TabProps) {
  const query = useAnalytics('overview', range);
  const [metric, setMetric] = useState<'sales' | 'orders'>('sales');
  const compareLabel = COMPARE_LABEL;

  return (
    <TabState query={query}>
      {(data) => {
        const totalStatuses = data.statuses.reduce((sum, s) => sum + s.count, 0);
        return (
          <>
            <KpiStrip cols={5}>
              <KpiCard label="Total sales" value={data.kpis.sales} kind="money" compareLabel={compareLabel} />
              <KpiCard label="Orders" value={data.kpis.orders} kind="count" compareLabel={compareLabel} />
              <KpiCard label="Average order value" value={data.kpis.aov} kind="money" compareLabel={compareLabel} />
              <KpiCard
                label="Delivery success"
                value={data.kpis.deliverySuccessRate}
                kind="percent"
                hint={data.kpis.deliverySuccessRate.current == null ? 'No parcel delivered or returned yet' : 'Delivered out of delivered + returned'}
                compareLabel={compareLabel}
              />
              <KpiCard
                label="Conversion rate"
                value={data.kpis.conversionRate}
                kind="percent"
                hint="Online store orders out of store visits"
                compareLabel={compareLabel}
              />
            </KpiStrip>

            {/* Pictures first, in two independent columns so a tall card (the map) never leaves a gap under a short one:
                the trend and the map on the left, the status ring, the channel ring and best sellers on the right. */}
            <div className="grid items-start gap-4 lg:grid-cols-3">
              <div className="min-w-0 space-y-4 lg:col-span-2">
            <Card
              title={metric === 'sales' ? 'Sales over time' : 'Orders over time'}
              subtitle={
                metric === 'sales'
                  ? `Order totals by the ${data.bucket === 'month' ? 'month' : 'day'} they were placed. Cancelled and unpaid orders left out.`
                  : `Orders placed each ${data.bucket === 'month' ? 'month' : 'day'}. Cancelled and unpaid orders left out.`
              }
              action={
                <Segmented
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { id: 'sales', label: 'Sales' },
                    { id: 'orders', label: 'Orders' },
                  ]}
                />
              }
            >
              {data.trend.every((d) => d.orders === 0) ? (
                <EmptyState text="No orders in this period yet." />
              ) : metric === 'sales' ? (
                <TrendChart data={data.trend} series={[{ key: 'sales', label: 'Sales', color: PALETTE.blue }]} kind="money" bucket={data.bucket} ariaLabel="Sales over time" />
              ) : (
                <TrendChart data={data.trend} series={[{ key: 'orders', label: 'Orders', color: PALETTE.blue }]} kind="count" bucket={data.bucket} ariaLabel="Orders over time" />
              )}
            </Card>
                <OrderMapSection range={range} />
              </div>
              <div className="min-w-0 space-y-4">
              <Card title="Orders by status" subtitle={`${totalStatuses} placed in this period`} action={<CardLink to={tabLink('orders')}>Orders and delivery</CardLink>}>
                <DonutChart
                  emptyText="No orders in this period."
                  centerValue={totalStatuses.toLocaleString()}
                  centerLabel={totalStatuses === 1 ? 'order' : 'orders'}
                  slices={data.statuses.map((st) => ({
                    key: st.status,
                    label: orderStatusLabel(st.status),
                    value: st.count,
                    color: STATUS_COLOR[st.status] ?? '#94a3b8',
                  }))}
                />
              </Card>
              <ChannelSplitCard channels={data.channels} />
              <Card title="Top products" subtitle="By sales in this period" action={<CardLink to={tabLink('products')}>All products</CardLink>}>
                {data.topProducts.length === 0 ? (
                  <EmptyState text="No products sold in this period." />
                ) : (
                  <ol className="divide-y divide-line">
                    {data.topProducts.map((p, i) => (
                      <li key={p.productId ?? p.name} className="flex items-center gap-3 py-2.5">
                        <span className="w-4 text-xs text-neutral-500 tabular-nums">{i + 1}</span>
                        <ProductThumb src={p.image} alt={p.name} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-regantify-text truncate">{p.name}</p>
                          <p className="text-xs text-neutral-500">
                            {p.units} sold in {p.orders} order{p.orders === 1 ? '' : 's'}
                          </p>
                        </div>
                          <span className="text-sm font-semibold text-regantify-text tabular-nums">{formatTaka(p.revenue)}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </div>
            </div>
          </>
        );
      }}
    </TabState>
  );
}
