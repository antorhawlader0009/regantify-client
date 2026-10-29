import { useAnalytics, TabState } from './useAnalytics';
import type { DateRange } from '../../../lib/analyticsApi';
import { Card, EmptyState } from '../../../components/analytics/AnalyticsUi';
import { formatTaka } from '../../../components/analytics/format';

/**
 * Analytics > Marketing > "Coupon results" (TellMe idea 93): per coupon code, the orders, sales, discount given, new customers, returns,
 * cancellations and (with the profit permission) the profit, counted like Analytics > Sales so the figures agree.
 */
export function CouponResultsCard({ range }: { range: DateRange }) {
  const query = useAnalytics('couponPerformance', range);
  return (
    <TabState query={query}>
      {(data) => (
        <Card
          title="Coupon results"
          subtitle="What each coupon code brought in and cost in this period. Automatic discounts and sales are not here."
        >
          {data.coupons.length === 0 ? (
            <EmptyState text="No coupon was used in this period." />
          ) : (
            <>
              {data.best && (
                <p className="mb-3 text-sm text-regantify-text">
                  Best: <span className="font-semibold">{data.best}</span>
                  {data.worst && (
                    <>
                      {' '}
                      · Weakest: <span className="font-semibold">{data.worst}</span>
                    </>
                  )}
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-neutral-500">
                      <th className="pb-2 font-normal">Coupon</th>
                      <th className="pb-2 text-right font-normal">Orders</th>
                      <th className="pb-2 text-right font-normal">Sales</th>
                      <th className="pb-2 text-right font-normal">Discount given</th>
                      <th className="pb-2 text-right font-normal">Average order</th>
                      <th className="pb-2 text-right font-normal">New customers</th>
                      <th className="pb-2 text-right font-normal">Returned</th>
                      <th className="pb-2 text-right font-normal">Cancelled</th>
                      {data.coupons[0].profit !== null && <th className="pb-2 text-right font-normal">Profit</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.coupons.map((c) => (
                      <tr key={c.couponId} className="border-t border-line">
                        <td className="py-2 font-medium">{c.code}</td>
                        <td className="py-2 text-right tabular-nums">{c.orders}</td>
                        <td className="py-2 text-right tabular-nums">{formatTaka(c.sales)}</td>
                        <td className="py-2 text-right tabular-nums">{formatTaka(c.discount)}</td>
                        <td className="py-2 text-right tabular-nums">{c.averageOrder == null ? '-' : formatTaka(c.averageOrder)}</td>
                        <td className="py-2 text-right tabular-nums">{c.newCustomers}</td>
                        <td className="py-2 text-right tabular-nums">{c.returned}</td>
                        <td className="py-2 text-right tabular-nums">{c.cancelled}</td>
                        {c.profit !== null && <td className={`py-2 text-right tabular-nums font-semibold ${c.profit < 0 ? 'text-red-700' : ''}`}>{formatTaka(c.profit)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}
    </TabState>
  );
}
