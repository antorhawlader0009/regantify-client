import { Link } from 'react-router-dom';
import type { ProductsAnalytics } from '../../../lib/analyticsApi';
import { Card, CardLink, EmptyState, KpiCard, KpiStrip, ProductThumb, SERIES_1, StatCard } from '../../../components/analytics/AnalyticsUi';
import { formatTaka, COMPARE_LABEL, sharePct } from '../../../components/analytics/format';
import { TabState, useAnalytics, type TabProps } from './useAnalytics';

export function ProductsTab({ range }: TabProps) {
  const query = useAnalytics('products', range);
  const compareLabel = COMPARE_LABEL;

  return (
    <TabState query={query}>
      {(data) => {
        const totalRevenue = data.topProducts.reduce((sum, p) => sum + p.revenue, 0);
        const maxRevenue = Math.max(1, ...data.topProducts.map((p) => p.revenue));
        // Product views are only recorded from analytics-plan.md Step 4 on.
        const showViews = data.viewsTrackedSince != null;
        return (
          <>
            <KpiStrip cols={3}>
              <KpiCard label="Units sold" value={data.kpis.unitsSold} kind="count" compareLabel={compareLabel} />
              <KpiCard label="Products that sold" value={data.kpis.productsSold} kind="count" compareLabel={compareLabel} />
              <StatCard label="Not selling" value={data.notSellingCount} hint="No sale at all in this period" />
            </KpiStrip>

            <Card title="Best-selling products" subtitle="Ranked by sales in this period">
              {data.topProducts.length === 0 ? (
                <EmptyState text="No products sold in this period." />
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="text-left text-[12px] text-regantify-text-muted">
                        <th className="px-5 pb-2 font-normal">Product</th>
                        {showViews && <th className="px-3 pb-2 font-normal text-right">Views</th>}
                        <th className="px-3 pb-2 font-normal text-right">Units</th>
                        <th className="px-3 pb-2 font-normal text-right">Orders</th>
                        <th className="px-3 pb-2 font-normal text-right">Sales</th>
                        <th className="px-5 pb-2 font-normal w-[22%]">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p, i) => {
                        const name = (
                          <span className="flex items-center gap-3 min-w-0">
                            <span className="w-4 text-xs text-regantify-text-muted tabular-nums">{i + 1}</span>
                            <ProductThumb src={p.image} alt={p.name} />
                            <span className="truncate font-medium text-regantify-text">{p.name}</span>
                          </span>
                        );
                        return (
                          <tr key={p.productId ?? p.name} className="border-t border-black/5 hover:bg-black/[0.015]">
                            <td className="px-5 py-2.5 max-w-[320px]">
                              {p.productId ? (
                                <Link to={`/vendor/product/edit/${p.productId}`} className="hover:underline">
                                  {name}
                                </Link>
                              ) : (
                                name
                              )}
                            </td>
                            {showViews && <td className="px-3 py-2.5 text-right tabular-nums text-regantify-text-muted">{p.views}</td>}
                            <td className="px-3 py-2.5 text-right tabular-nums">{p.units}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{p.orders}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatTaka(p.revenue)}</td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 rounded-full bg-black/[0.05]">
                                  <div className="h-1.5 rounded-full" style={{ width: `${(p.revenue / maxRevenue) * 100}%`, background: SERIES_1 }} />
                                </div>
                                <span className="w-9 text-right text-xs tabular-nums text-regantify-text-muted">{sharePct(p.revenue, totalRevenue).toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="grid lg:grid-cols-2 gap-4">
              <MostViewed rows={data.mostViewed} trackedSince={data.viewsTrackedSince} />
              <SellingOutSoon rows={data.sellingOutSoon} />
            </div>

            <Card
              title="Products not selling"
              subtitle="No sales in this period, most stock first. Try a discount, a campaign or better photos."
              action={<CardLink to="/vendor/marketing/campaigns">Create a campaign</CardLink>}
            >
              {data.notSelling.length === 0 ? (
                <EmptyState text="Every product sold at least once in this period." />
              ) : (
                <ul className="grid sm:grid-cols-2 gap-x-8">
                  {data.notSelling.map((p) => (
                    <li key={p.id} className="border-t border-black/5">
                      <Link to={`/vendor/product/edit/${p.id}`} className="flex items-center gap-3 py-2.5 group">
                        <ProductThumb src={p.image} alt={p.name} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-regantify-text group-hover:underline">{p.name}</span>
                        <span className="text-xs text-regantify-text-muted tabular-nums whitespace-nowrap">
                          {p.stock == null ? 'Stock not tracked' : `${p.stock} in stock`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        );
      }}
    </TabState>
  );
}

/**
 * Most viewed products with how many shoppers added them to cart and how
 * many sold. Many views with no sale is named on the row: that's usually
 * the price, the photos or the description.
 */
function MostViewed({ rows, trackedSince }: { rows: ProductsAnalytics['mostViewed']; trackedSince: string | null }) {
  return (
    <Card title="Most viewed" subtitle="Product page views by shoppers, with add to cart and sales">
      {rows.length === 0 ? (
        <EmptyState text={trackedSince ? 'No product views in this period.' : 'Starts counting with your next store visitors.'} />
      ) : (
        <ul className="divide-y divide-black/5">
          {rows.map((p) => {
            const stuck = p.views >= 10 && p.units === 0;
            return (
              <li key={p.productId}>
                <Link to={`/vendor/product/edit/${p.productId}`} className="flex items-center gap-3 py-2.5 group">
                  <ProductThumb src={p.image} alt={p.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-regantify-text group-hover:underline">{p.name}</span>
                    <span className={`block text-xs ${stuck ? 'text-amber-800' : 'text-regantify-text-muted'}`}>
                      {stuck ? 'Viewed a lot but not sold: check the price and photos' : `${p.carts} added to cart, ${p.units} sold`}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-regantify-text whitespace-nowrap">
                    {p.views} view{p.views === 1 ? '' : 's'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Products that run out within two weeks at the last 30 days' pace, soonest first. */
function SellingOutSoon({ rows }: { rows: ProductsAnalytics['sellingOutSoon'] }) {
  return (
    <Card title="Selling out soon" subtitle="At the pace of the last 30 days" action={<CardLink to="/vendor/product/low-stock">Low stock</CardLink>}>
      {rows.length === 0 ? (
        <EmptyState text="Nothing is about to run out." />
      ) : (
        <ul className="divide-y divide-black/5">
          {rows.map((p) => (
            <li key={p.productId}>
              <Link to={`/vendor/product/edit/${p.productId}`} className="flex items-center gap-3 py-2.5 group">
                <ProductThumb src={p.image} alt={p.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-regantify-text group-hover:underline">{p.name}</span>
                  <span className="block text-xs text-regantify-text-muted tabular-nums">
                    {p.stock} left, about {p.perDay < 1 ? p.perDay.toFixed(1) : Math.round(p.perDay)} sold a day
                  </span>
                </span>
                <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${p.daysLeft <= 3 ? 'text-red-700' : 'text-amber-800'}`}>
                  {p.stock === 0 ? 'Out of stock' : p.daysLeft === 0 ? 'Today' : `${p.daysLeft} day${p.daysLeft === 1 ? '' : 's'} left`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
