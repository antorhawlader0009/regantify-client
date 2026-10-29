import { useState } from 'react';
import type { DateRange } from '../../../lib/analyticsApi';
import { Card, EmptyState, ProductThumb } from '../../../components/analytics/AnalyticsUi';
import { formatTaka } from '../../../components/analytics/format';
import { useCan } from '../../../lib/useStaffAccess';
import { TabState, useAnalytics } from './useAnalytics';

type Sort = 'profit' | 'margin' | 'sales' | 'units';

/**
 * Analytics > Products > "Profit by product" (TellMe idea 94): every product that sold, sorted by profit, margin, sales or pieces.
 * Profit here is (price − product cost) × pieces only; delivery, courier and platform charges belong to the whole order and are not
 * shared out (Analytics > Sales has the order-level profit). A product with a piece that has no cost shows no profit. Needs analytics.profit.
 */
export function ProfitByProductCard({ range }: { range: DateRange }) {
  const canProfit = useCan('analytics.profit');
  if (!canProfit) return null;
  return <Inner range={range} />;
}

function Inner({ range }: { range: DateRange }) {
  const query = useAnalytics('profitByProduct', range);
  const [sort, setSort] = useState<Sort>('profit');
  return (
    <TabState query={query}>
      {(data) => {
        const rows = [...data.products].sort((a, b) => {
          const key = (r: typeof a) => (sort === 'profit' ? r.profit : sort === 'margin' ? r.margin : sort === 'sales' ? r.sales : r.units);
          return (key(b) ?? -Infinity) - (key(a) ?? -Infinity);
        });
        return (
          <Card
            title="Profit by product"
            subtitle="Price minus product cost, times pieces. Delivery, courier and platform charges are for the whole order and are not shared out."
            action={
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm" aria-label="Sort by">
                <option value="profit">Most profit</option>
                <option value="margin">Best margin</option>
                <option value="sales">Most sales</option>
                <option value="units">Most pieces</option>
              </select>
            }
          >
            {rows.length === 0 ? (
              <EmptyState text="No products sold in this period." />
            ) : (
              <>
                {data.withoutCost > 0 && (
                  <p className="mb-3 text-xs text-amber-700">
                    {data.withoutCost} {data.withoutCost === 1 ? 'product has' : 'products have'} no cost set, so no profit is shown for {data.withoutCost === 1 ? 'it' : 'them'}. Add the cost on the product page.
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-neutral-500">
                        <th className="pb-2 font-normal">Product</th>
                        <th className="pb-2 text-right font-normal">Pieces</th>
                        <th className="pb-2 text-right font-normal">Sales</th>
                        <th className="pb-2 text-right font-normal">Cost</th>
                        <th className="pb-2 text-right font-normal">Profit</th>
                        <th className="pb-2 text-right font-normal">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.productId ?? r.name} className="border-t border-line">
                          <td className="max-w-[260px] py-2">
                            <span className="flex min-w-0 items-center gap-3">
                              <ProductThumb src={r.image} alt={r.name} />
                              <span className="truncate font-medium text-regantify-text">{r.name}</span>
                            </span>
                          </td>
                          <td className="py-2 text-right tabular-nums">{r.units}</td>
                          <td className="py-2 text-right tabular-nums">{formatTaka(r.sales)}</td>
                          <td className="py-2 text-right tabular-nums">{r.cost == null ? <span className="text-neutral-500">No cost</span> : formatTaka(r.cost)}</td>
                          <td className={`py-2 text-right tabular-nums font-semibold ${r.profit != null && r.profit < 0 ? 'text-red-700' : ''}`}>{r.profit == null ? '-' : formatTaka(r.profit)}</td>
                          <td className="py-2 text-right tabular-nums text-neutral-500">{r.margin == null ? '-' : `${r.margin.toFixed(0)}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        );
      }}
    </TabState>
  );
}
