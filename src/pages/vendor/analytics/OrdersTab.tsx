import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import type { DeliveryAnalytics, DeliveryCourier, DeliveryOutcome } from '../../../lib/analyticsApi';
import { BarList, Card, CardLink, EmptyState, KpiCard, KpiStrip, Share, StatCard, MobileRows } from '../../../components/analytics/AnalyticsUi';
import { ColumnChart, PALETTE, TrendChart } from '../../../components/analytics/TrendChart';
import { formatTaka, COMPARE_LABEL, sharePct } from '../../../components/analytics/format';
import { orderStatusLabel } from '../order/orderStatus';
import { TabState, useAnalytics, type TabProps } from './useAnalytics';

const COURIERS: Record<DeliveryCourier, { label: string; path: string }> = {
  PATHAO: { label: 'Pathao', path: '/vendor/courier/pathao' },
  STEADFAST: { label: 'Steadfast', path: '/vendor/courier/steadfast' },
  REDX: { label: 'RedX', path: '/vendor/courier/redx' },
};

function hourLabel(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
}

function days(value: number | null) {
  return value == null ? '—' : `${value} day${value === 1 ? '' : 's'}`;
}

/**
 * A delivery success rate with a word next to it, so the color is never
 * the only signal. Bangladesh benchmark: 80-85% is normal, 90%+ is good.
 */
function SuccessRate({ value }: { value: number | null }) {
  if (value == null) return <span className="text-neutral-500">—</span>;
  const [label, cls] = value >= 90 ? ['Good', 'bg-emerald-50 text-emerald-700'] : value >= 80 ? ['Normal', 'bg-amber-50 text-amber-700'] : ['Low', 'bg-red-50 text-red-700'];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-semibold tabular-nums text-regantify-text">{value}%</span>
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
    </span>
  );
}

function OutcomeList({ rows, labelOf, emptyText }: { rows: DeliveryOutcome[]; labelOf: (key: string) => string; emptyText: string }) {
  if (rows.length === 0) return <EmptyState text={emptyText} />;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-regantify-text truncate">{labelOf(r.key)}</p>
            <p className="text-xs text-neutral-500 tabular-nums">
              {r.delivered} delivered, {r.returned} returned
            </p>
          </div>
          <SuccessRate value={r.successRate} />
        </li>
      ))}
    </ul>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-lg font-semibold text-regantify-text">{title}</h2>
      {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function OrdersTab({ range }: TabProps) {
  const orders = useAnalytics('orders', range);
  const delivery = useAnalytics('delivery', range);
  const compareLabel = COMPARE_LABEL;

  return (
    <div className="space-y-6">
      <TabState query={orders}>
        {(data) => {
          const totalStatuses = data.statuses.reduce((sum, s) => sum + s.count, 0);
          const busiestHour = data.byHour.reduce((b, h) => (h.orders > b.orders ? h : b), data.byHour[0]);
          const hasOrders = data.kpis.orders.current > 0;

          return (
            <>
              <SectionTitle title="Orders" />
              <KpiStrip cols={4}>
                <KpiCard label="Orders" value={data.kpis.orders} kind="count" compareLabel={compareLabel} />
                <KpiCard
                  label="Cancellation rate"
                  value={data.kpis.cancelRate}
                  kind="percent"
                  lowerIsBetter
                  hint="Cancelled out of all orders placed"
                  compareLabel={compareLabel}
                />
                <KpiCard
                  label="Return rate"
                  value={data.kpis.returnRate}
                  kind="percent"
                  lowerIsBetter
                  hint="Returned out of completed + returned orders"
                  compareLabel={compareLabel}
                />
                <KpiCard
                  label="Abandoned checkouts"
                  value={data.kpis.abandonedCheckouts}
                  kind="count"
                  lowerIsBetter
                  hint={
                    data.kpis.abandonRate.current == null
                      ? 'No one reached checkout yet'
                      : `${data.kpis.abandonRate.current.toFixed(1)}% of shoppers who started checkout left`
                  }
                  compareLabel={compareLabel}
                />
              </KpiStrip>

              <div className="grid lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2" title="Orders over time" subtitle={`Orders placed each ${data.bucket === 'month' ? 'month' : 'day'}. Cancelled and unpaid orders left out.`}>
                  {!hasOrders ? (
                    <EmptyState text="No orders in this period yet." />
                  ) : (
                    <TrendChart
                      data={data.trend}
                      series={[{ key: 'orders', label: 'Orders', color: PALETTE.blue }]}
                      kind="count"
                      bucket={data.bucket}
                      ariaLabel="Orders over time"
                    />
                  )}
                </Card>
                <Card title="Orders by status" subtitle={`${totalStatuses} placed in this period`}>
                  <BarList
                    emptyText="No orders in this period."
                    rows={data.statuses.map((s) => ({
                      key: s.status,
                      label: orderStatusLabel(s.status),
                      value: s.count,
                      display: (
                        <>
                          {s.count}
                          <Share pct={sharePct(s.count, totalStatuses)} />
                        </>
                      ),
                    }))}
                  />
                </Card>
              </div>

              <Card
                title="When shoppers order"
                subtitle={hasOrders ? `Busiest hour: ${hourLabel(busiestHour.hour)} – ${hourLabel((busiestHour.hour + 1) % 24)} (Dhaka time)` : 'Orders per hour of the day'}
              >
                {!hasOrders ? (
                  <EmptyState text="No orders in this period yet." />
                ) : (
                  <ColumnChart
                    label="orders"
                    ariaLabel="Orders per hour of the day"
                    data={data.byHour.map((h) => ({
                      key: String(h.hour),
                      value: h.orders,
                      tick: hourLabel(h.hour).replace(' ', '').toLowerCase(),
                      tooltip: `${hourLabel(h.hour)} – ${hourLabel((h.hour + 1) % 24)}`,
                    }))}
                  />
                )}
              </Card>
            </>
          );
        }}
      </TabState>

      <TabState query={delivery}>{(data) => <DeliverySection data={data} compareLabel={compareLabel} />}</TabState>
    </div>
  );
}

/**
 * Courier parcels booked in the period: how many reached the customer,
 * per courier, area and payment method, plus the COD money the couriers
 * still hold (analytics-plan.md Step 1).
 */
function DeliverySection({ data, compareLabel }: { data: DeliveryAnalytics; compareLabel: string }) {
  const { kpis, total } = data;
  const title = <SectionTitle title="Delivery" subtitle="Courier parcels booked in this period. In Bangladesh, 80–85% delivery success is normal and 90%+ is good." />;

  if (data.couriers.length === 0) {
    return (
      <>
        {title}
        <Card>
          <div className="flex flex-col items-center text-center py-6">
            <Truck size={22} strokeWidth={1.6} className="text-neutral-500" aria-hidden />
            <p className="mt-3 text-sm font-medium text-regantify-text">No courier parcels booked in this period</p>
            <p className="mt-1 mb-3 text-[13px] text-neutral-500 max-w-sm">
              Book orders with Pathao, Steadfast or RedX to see your delivery success rate, returns and COD money here.
            </p>
            <CardLink to="/vendor/courier">Set up a courier</CardLink>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      {title}
      <KpiStrip cols={4}>
        <KpiCard
          label="Delivery success"
          value={kpis.successRate}
          kind="percent"
          hint={kpis.successRate.current == null ? 'No parcel delivered or returned yet' : `${total.delivered} delivered of ${total.delivered + total.returned} finished`}
          compareLabel={compareLabel}
        />
        <KpiCard
          label="Returned parcels"
          value={kpis.returned}
          kind="count"
          lowerIsBetter
          hint={`${total.inProgress} still on the way`}
          compareLabel={compareLabel}
        />
        <StatCard label="Average delivery time" value={days(kpis.avgDaysToDeliver)} hint="From booking to delivered" />
        <StatCard
          label="COD with couriers now"
          value={formatTaka(kpis.codWithCouriers.amount)}
          hint={`From ${kpis.codWithCouriers.count} delivered parcel${kpis.codWithCouriers.count === 1 ? '' : 's'}; ${formatTaka(data.codPaid.amount)} paid out this period`}
        />
      </KpiStrip>

      <Card title="By courier" subtitle="Which courier delivers best for you">
        <MobileRows
          rows={data.couriers.map((c) => ({
            key: c.courier,
            title: COURIERS[c.courier].label,
            value: c.successRate == null ? '—' : `${c.successRate.toFixed(0)}%`,
            detail: `${c.booked} booked · ${c.delivered} delivered · ${c.returned} returned · ${c.inProgress} on the way · fees ${formatTaka(c.deliveryFees)}`,
            to: COURIERS[c.courier].path,
          }))}
        />
        <div className="-mx-5 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[12px] text-neutral-500">
                <th className="px-5 pb-2 font-normal">Courier</th>
                <th className="px-3 pb-2 font-normal text-right">Booked</th>
                <th className="px-3 pb-2 font-normal text-right">Delivered</th>
                <th className="px-3 pb-2 font-normal text-right">Returned</th>
                <th className="px-3 pb-2 font-normal text-right">On the way</th>
                <th className="px-3 pb-2 font-normal">Success</th>
                <th className="px-3 pb-2 font-normal text-right">Avg. time</th>
                <th className="px-5 pb-2 font-normal text-right">Delivery fees</th>
              </tr>
            </thead>
            <tbody>
              {data.couriers.map((c) => (
                <tr key={c.courier} className="border-t border-line hover:bg-neutral-50/70">
                  <td className="px-5 py-3">
                    <Link to={COURIERS[c.courier].path} className="font-medium text-regantify-text hover:underline">
                      {COURIERS[c.courier].label}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.booked}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.delivered}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.returned}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.inProgress}</td>
                  <td className="px-3 py-3">
                    <SuccessRate value={c.successRate} />
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{days(c.avgDaysToDeliver)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatTaka(c.deliveryFees)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="By area" subtitle="Areas with the most returns first">
          <OutcomeList rows={data.byArea} labelOf={(k) => k} emptyText="No parcel delivered or returned yet." />
        </Card>
        <Card title="Cash on delivery vs prepaid" subtitle="Prepaid (bKash, card) orders are rarely returned">
          <OutcomeList
            rows={data.byPayment}
            labelOf={(k) => (k === 'COD' ? 'Cash on delivery' : 'Prepaid (online payment)')}
            emptyText="No parcel delivered or returned yet."
          />
        </Card>
      </div>
    </>
  );
}
