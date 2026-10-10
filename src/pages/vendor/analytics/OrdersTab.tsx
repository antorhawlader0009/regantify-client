import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import type { DeliveryAnalytics, DeliveryCourier, DeliveryOutcome, FailedOrdersAnalytics, TeamWorkAnalytics } from '../../../lib/analyticsApi';
import { BarList, Card, CardLink, EmptyState, KpiCard, KpiStrip, Share, StatCard, MobileRows } from '../../../components/analytics/AnalyticsUi';
import { ColumnChart, PALETTE, TrendChart } from '../../../components/analytics/TrendChart';
import { formatTaka, COMPARE_LABEL, sharePct } from '../../../components/analytics/format';
import { orderStatusLabel } from '../order/orderStatus';
import { TrackingStats } from '../../../components/analytics/TrackingStats';
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
  const failed = useAnalytics('failedOrders', range);
  const teamWork = useAnalytics('teamWork', range);
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

      <TabState query={failed}>{(data) => <FailedOrdersSection data={data} compareLabel={compareLabel} />}</TabState>

      <TabState query={teamWork}>{(data) => <TeamWorkSection data={data} compareLabel={compareLabel} />}</TabState>

      <TrackingStats />
    </div>
  );
}

/**
 * Orders cancelled, returned or failed in the period, by the reason recorded when they were closed, against the
 * period before (TellMe idea 5). A reason that is growing is the one to fix; "No reason recorded" is the share still
 * to be filled in on the orders. Customers who keep costing orders are listed with a link to block them.
 */
function FailedOrdersSection({ data, compareLabel }: { data: FailedOrdersAnalytics; compareLabel: string }) {
  const { total } = data;
  const title = (
    <SectionTitle
      title="Why orders didn’t go through"
      subtitle="Orders cancelled, returned or failed in this period, by the reason you picked when you closed them."
    />
  );

  if (total.current.orders === 0 && total.previous.orders === 0) {
    return (
      <>
        {title}
        <Card>
          <EmptyState text="No cancelled, returned or failed orders in this period." />
        </Card>
      </>
    );
  }

  const known = data.reasons.filter((r) => r.orders > 0);
  const missing = data.noReason;

  return (
    <>
      {title}
      <KpiStrip cols={4}>
        <KpiCard label="Orders that failed" value={{ current: total.current.orders, previous: total.previous.orders }} kind="count" lowerIsBetter compareLabel={compareLabel} />
        <KpiCard label="Sales lost" value={{ current: total.current.value, previous: total.previous.value }} kind="money" lowerIsBetter compareLabel={compareLabel} />
        <StatCard label="Cancelled / returned" value={`${data.cancelled} / ${data.returned}`} hint={data.paymentFailed > 0 ? `and ${data.paymentFailed} with a failed payment` : undefined} />
        <StatCard
          label="Reason recorded"
          value={`${Math.round(sharePct(total.current.orders - missing, total.current.orders))}%`}
          hint={missing > 0 ? `${missing} still without one: open the order and add it` : 'every one has a reason'}
        />
      </KpiStrip>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="By reason" subtitle="Most orders first. The arrow is the change from the previous period.">
          <BarList
            labelHeader="Reason"
            valueHeader="Orders"
            emptyText="No reasons yet."
            rows={known.map((r) => {
              const change = r.orders - r.previousOrders;
              return {
                key: r.code ?? 'none',
                label: r.label,
                value: r.orders,
                display: (
                  <span className="inline-flex items-center gap-2">
                    <span>
                      {r.orders} <span className="font-normal text-neutral-500">({formatTaka(r.value)})</span>
                    </span>
                    {r.previousOrders > 0 || r.orders > 0 ? (
                      <span
                        className={`w-9 text-right text-xs ${change > 0 ? 'text-red-600' : change < 0 ? 'text-emerald-600' : 'text-neutral-400'}`}
                        title={`${r.previousOrders} in the previous period`}
                      >
                        {change > 0 ? `▲${change}` : change < 0 ? `▼${-change}` : '–'}
                      </span>
                    ) : null}
                  </span>
                ),
              };
            })}
          />
        </Card>

        <Card title="Customers who keep failing" subtitle="Two or more cancelled or returned orders in this period.">
          {data.repeaters.length === 0 ? (
            <EmptyState text="No customer has more than one failed order in this period." />
          ) : (
            <ul className="divide-y divide-line">
              {data.repeaters.map((c) => (
                <li key={c.phone} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-regantify-text">
                      {c.name} <span className="font-normal text-neutral-500">{c.phone}</span>
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {c.orders} orders, {formatTaka(c.value)}
                      {c.reasons.length > 0 ? ` · ${c.reasons.map((r) => r.label).join(', ')}` : ''}
                    </p>
                  </div>
                  {c.blacklisted ? (
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">Blocked</span>
                  ) : (
                    <Link to={`/vendor/customers/${encodeURIComponent(c.phone)}`} className="shrink-0 text-xs font-medium text-brand hover:underline">
                      Review &amp; block
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
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

/** "12 min", "3.5 h", "2 days"; a dash when there is nothing to average. */
function minutesText(value: number | null) {
  if (value == null) return '—';
  if (value < 60) return `${value} min`;
  if (value < 24 * 60) return `${Math.round((value / 60) * 10) / 10} h`;
  return `${Math.round((value / (24 * 60)) * 10) / 10} days`;
}

/**
 * Who confirmed, completed and cancelled how many orders in the period, and how long confirming takes (TellMe idea 20).
 * Read from the order history, so it needs nothing set up. The people are the team; the platform's own steps and the
 * shopper's are listed apart, without a time, so they don't pass for a person. The "waiting" card is about right now.
 */
function TeamWorkSection({ data, compareLabel }: { data: TeamWorkAnalytics; compareLabel: string }) {
  const { confirm, waiting } = data;
  const title = (
    <SectionTitle title="Team work" subtitle="Who confirmed, completed and cancelled orders in this period, and how long confirming takes." />
  );
  const hasWork = data.people.length > 0 || data.others.length > 0;

  return (
    <>
      {title}
      <KpiStrip cols={4}>
        <KpiCard label="Orders confirmed by the team" value={{ current: confirm.count, previous: confirm.previousCount }} kind="count" compareLabel={compareLabel} />
        <StatCard
          label="Average time to confirm"
          value={minutesText(confirm.averageMinutes)}
          hint={
            confirm.count === 0
              ? 'No order was confirmed by a person in this period.'
              : `Typical (median) ${minutesText(confirm.medianMinutes)}${confirm.previousAverageMinutes != null ? ` · ${minutesText(confirm.previousAverageMinutes)} in the previous period` : ''}`
          }
        />
        <StatCard
          label={`Pending for over ${waiting.afterHours} hours`}
          value={waiting.count}
          hint={
            waiting.count > 0 ? (
              <>
                Oldest has waited {minutesText(waiting.oldestHours == null ? null : Math.round(waiting.oldestHours * 60))}.{' '}
                <Link to="/vendor/orders?status=PENDING" className="font-medium text-brand hover:underline">
                  Open them
                </Link>
              </>
            ) : (
              'Nothing is waiting too long right now.'
            )
          }
        />
        <StatCard label="People who handled orders" value={data.people.length} hint="Owner and staff who moved an order in this period." />
      </KpiStrip>

      <Card
        title="By person"
        subtitle="Confirmed means moved to Processing. The time is from the order being placed to that step, nights included."
      >
        {!hasWork ? (
          <EmptyState text="No order was confirmed, completed or cancelled in this period." />
        ) : data.people.length === 0 ? (
          <EmptyState text="No person confirmed, completed or cancelled an order in this period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500">
                  <th className="py-2 pr-3 font-medium">Person</th>
                  <th className="py-2 px-3 text-right font-medium">Confirmed</th>
                  <th className="py-2 px-3 text-right font-medium">Completed</th>
                  <th className="py-2 px-3 text-right font-medium">Cancelled</th>
                  <th className="py-2 px-3 text-right font-medium">Average time</th>
                  <th className="py-2 pl-3 text-right font-medium">Typical time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.people.map((p) => (
                  <tr key={p.key}>
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-regantify-text">
                        {p.name}
                        {p.role && <span className="ml-1.5 text-xs font-normal text-neutral-500">{p.role}</span>}
                      </p>
                      {p.viaTelegram > 0 && <p className="text-xs text-neutral-500">{p.viaTelegram} confirmed in Telegram</p>}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{p.confirmed}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{p.completed}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{p.cancelled}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{minutesText(p.avgConfirmMinutes)}</td>
                    <td className="py-2.5 pl-3 text-right tabular-nums">{minutesText(p.medianConfirmMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data.others.length > 0 && (
        <Card title="Done by the system, couriers or customers" subtitle="Counted apart so they don’t look like a person. Couriers and payments usually complete orders on their own.">
          <ul className="divide-y divide-line">
            {data.others.map((o) => (
              <li key={o.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="font-medium text-regantify-text">{o.name}</span>
                <span className="text-neutral-600">
                  {o.confirmed} confirmed · {o.completed} completed · {o.cancelled} cancelled
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
