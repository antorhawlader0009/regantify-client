import type { DateRange } from '../../../lib/analyticsApi';
import { Card, EmptyState } from '../../../components/analytics/AnalyticsUi';
import { useCan } from '../../../lib/useStaffAccess';
import { Link } from 'react-router-dom';
import { TabState, useAnalytics } from './useAnalytics';

/**
 * Analytics > Products > "Return rate" (TellMe idea 96): per product, the orders that held it, how many came back, the share, the return
 * check-in findings, the biggest reason and the worst options (a size, a color). Products with fewer than 5 orders are not rated.
 */
export function ReturnRateCard({ range }: { range: DateRange }) {
  const can = useCan('orders.view');
  if (!can) return null;
  return <Inner range={range} />;
}

function Inner({ range }: { range: DateRange }) {
  const query = useAnalytics('returnRates', range);
  return (
    <TabState query={query}>
      {(data) => (
        <Card title="Return rate" subtitle={`Orders that came back (Return or Refunded) out of the orders that held the product. Products with under ${data.minOrders} orders are not rated.`}>
          {data.products.length === 0 ? (
            <EmptyState text="No product has enough orders in this period to rate." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-500">
                    <th className="pb-2 font-normal">Product</th>
                    <th className="pb-2 text-right font-normal">Orders</th>
                    <th className="pb-2 text-right font-normal">Came back</th>
                    <th className="pb-2 text-right font-normal">Rate</th>
                    <th className="pb-2 font-normal pl-4">Main reason</th>
                    <th className="pb-2 font-normal pl-4">Checked in</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p) => (
                    <tr key={p.productId} className="border-t border-line align-top">
                      <td className="py-2 pr-2">
                        <Link to={`/vendor/product/edit/${p.productId}`} className="font-medium text-regantify-text hover:underline">
                          {p.name}
                        </Link>
                        {p.worstOptions.length > 0 && (
                          <span className="block text-xs text-neutral-500">
                            {p.worstOptions.map((o) => `${o.options}: ${o.returned} of ${o.sold} (${o.rate.toFixed(0)}%)`).join(' · ')}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">{p.sold}</td>
                      <td className="py-2 text-right tabular-nums">{p.returned}</td>
                      <td className={`py-2 text-right tabular-nums font-semibold ${p.rate >= 25 ? 'text-red-700' : p.rate >= 15 ? 'text-amber-700' : ''}`}>{p.rate.toFixed(1)}%</td>
                      <td className="py-2 pl-4 text-neutral-600">{p.topReason ?? '-'}</td>
                      <td className="py-2 pl-4 text-xs text-neutral-500">{p.good + p.damaged + p.missing === 0 ? '-' : `${p.good} good · ${p.damaged} damaged · ${p.missing} missing`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </TabState>
  );
}
