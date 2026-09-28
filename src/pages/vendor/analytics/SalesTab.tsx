import { Link } from 'react-router-dom';
import type { SalesAnalytics } from '../../../lib/analyticsApi';
import { BarList, Card, CardLink, EmptyState, KpiCard, KpiStrip, ProductThumb, Share } from '../../../components/analytics/AnalyticsUi';
import { PALETTE, TrendChart } from '../../../components/analytics/TrendChart';
import { formatTaka, COMPARE_LABEL, sharePct } from '../../../components/analytics/format';
import { TabState, useAnalytics, type TabProps } from './useAnalytics';

const PAYMENT_LABELS: Record<string, string> = {
  COD: 'Cash on delivery',
  ONLINE_PAYMENT: 'Online payment',
  SSLCOMMERZ: 'SSLCommerz',
};

function paymentLabel(key: string) {
  return PAYMENT_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function SalesTab({ range }: TabProps) {
  const query = useAnalytics('sales', range);
  const compareLabel = COMPARE_LABEL;

  return (
    <TabState query={query}>
      {(data) => {
        const paymentTotal = data.byPaymentMethod.reduce((sum, r) => sum + r.sales, 0);
        const costsIncomplete = data.breakdown.costCoverage < 99.5;
        return (
          <>
            <KpiStrip cols={4}>
              <KpiCard label="Total sales" value={data.kpis.sales} kind="money" compareLabel={compareLabel} />
              <KpiCard label="Net sales" value={data.kpis.netSales} kind="money" hint="Total sales minus returns and refunds" compareLabel={compareLabel} />
              <KpiCard
                label="Profit"
                value={data.kpis.profit}
                kind="money"
                hint={costsIncomplete ? `Estimate: costs known for ${data.breakdown.costCoverage.toFixed(0)}% of sales` : undefined}
                compareLabel={compareLabel}
              />
              <KpiCard label="Profit margin" value={data.kpis.margin} kind="percent" hint="Profit out of net sales" compareLabel={compareLabel} />
            </KpiStrip>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2" title="Sales and profit" subtitle={data.bucket === 'month' ? 'Per month' : 'Per day'}>
                {data.trend.every((d) => d.sales === 0) ? (
                  <EmptyState text="No sales in this period yet." />
                ) : (
                  <TrendChart
                    data={data.trend}
                    series={[
                      { key: 'sales', label: 'Sales', color: PALETTE.blue },
                      { key: 'profit', label: 'Profit', color: PALETTE.orange },
                    ]}
                    kind="money"
                    bucket={data.bucket}
                    ariaLabel="Sales and profit over time"
                  />
                )}
              </Card>

              <MoneyLedger breakdown={data.breakdown} missingCost={data.missingCost} />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2" title="Profit by product" subtitle="Sales minus product cost, before delivery and fees. Returned orders left out.">
                <ProductProfitTable products={data.products} />
              </Card>

              <Card title="By payment method" subtitle="How shoppers paid">
                <BarList
                  emptyText="No sales in this period."
                  rows={data.byPaymentMethod.map((r) => ({
                    key: r.key,
                    label: (
                      <>
                        {paymentLabel(r.key)}
                        <span className="ml-1.5 text-xs text-regantify-text-muted">
                          {r.orders} order{r.orders === 1 ? '' : 's'}
                        </span>
                      </>
                    ),
                    value: r.sales,
                    display: (
                      <>
                        {formatTaka(r.sales)}
                        <Share pct={sharePct(r.sales, paymentTotal)} />
                      </>
                    ),
                  }))}
                />
              </Card>
            </div>
          </>
        );
      }}
    </TabState>
  );
}

/**
 * "Where your money went", written the way a shop's hisab khata is: net
 * sales at the top, each deduction on its own line with a dotted leader
 * to the amount, a double rule, then what's left. Lines that are zero
 * for this store (no VAT, no returns) are left out, except the two every
 * store has.
 */
function MoneyLedger({ breakdown: b, missingCost }: { breakdown: SalesAnalytics['breakdown']; missingCost: SalesAnalytics['missingCost'] }) {
  const deductions = [
    { label: 'Product cost', amount: b.productCost, always: true },
    { label: 'Courier fees', amount: b.courierFees, always: true },
    { label: 'Platform charges', amount: b.platformCharges },
    { label: 'VAT', amount: b.vat },
    { label: 'Lost on returns', amount: b.returnLoss, note: 'Courier fees for parcels that came back' },
  ].filter((d) => d.always || d.amount > 0);
  const loss = b.profit < 0;

  return (
    <Card title="Where your money went" subtitle="From net sales to profit, this period">
      <dl className="text-sm">
        <LedgerRow label="Net sales" amount={formatTaka(b.netSales)} strong />
        {deductions.map((d) => (
          <LedgerRow key={d.label} label={d.label} title={d.note} amount={`− ${formatTaka(d.amount)}`} />
        ))}
      </dl>
      <div className="mt-3 border-t-[3px] border-double border-regantify-text/70 pt-3 flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold text-regantify-text">{loss ? 'Loss' : 'Profit'}</span>
        <span className={`text-2xl font-semibold tabular-nums tracking-tight ${loss ? 'text-red-700' : 'text-emerald-800'}`}>
          {formatTaka(b.profit)}
        </span>
      </div>

      {(b.costCoverage < 99.5 || b.netSales > 0) && (
        <div className="mt-4 space-y-1.5 text-[12px] leading-relaxed text-regantify-text-muted">
          {b.costCoverage < 99.5 && (
            <p className="text-amber-800">
              {missingCost.length} product{missingCost.length === 1 ? ' has' : 's have'} no cost set, so real profit is lower than this.{' '}
              {missingCost[0] && (
                <Link to={`/vendor/product/edit/${missingCost[0].productId}`} className="font-medium underline underline-offset-2">
                  Add cost to {missingCost[0].name}
                </Link>
              )}
            </p>
          )}
          <p>Courier fees count Pathao, Steadfast and RedX bookings only.</p>
        </div>
      )}
    </Card>
  );
}

function LedgerRow({ label, amount, title, strong }: { label: string; amount: string; title?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5" title={title}>
      <dt className={strong ? 'font-semibold text-regantify-text' : 'text-regantify-text'}>{label}</dt>
      <span className="flex-1 translate-y-[-3px] border-b border-dotted border-black/25" aria-hidden />
      <dd className={`tabular-nums ${strong ? 'font-semibold text-regantify-text' : 'text-regantify-text'}`}>{amount}</dd>
    </div>
  );
}

function ProductProfitTable({ products }: { products: SalesAnalytics['products'] }) {
  if (products.length === 0) return <EmptyState text="No products sold in this period." />;
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="text-left text-[12px] text-regantify-text-muted">
            <th className="px-5 pb-2 font-normal">Product</th>
            <th className="px-3 pb-2 font-normal text-right">Units</th>
            <th className="px-3 pb-2 font-normal text-right">Sales</th>
            <th className="px-3 pb-2 font-normal text-right">Cost</th>
            <th className="px-3 pb-2 font-normal text-right">Profit</th>
            <th className="px-5 pb-2 font-normal text-right">Margin</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.productId ?? p.name} className="border-t border-black/5">
              <td className="px-5 py-2.5 max-w-[280px]">
                <span className="flex items-center gap-3 min-w-0">
                  <ProductThumb src={p.image} alt={p.name} />
                  <span className="truncate font-medium text-regantify-text">{p.name}</span>
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{p.units}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatTaka(p.sales)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {p.cost != null ? (
                  formatTaka(p.cost)
                ) : p.productId ? (
                  <CardLink to={`/vendor/product/edit/${p.productId}`}>Add cost</CardLink>
                ) : (
                  <span className="text-regantify-text-muted">Not set</span>
                )}
              </td>
              <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${p.profit != null && p.profit < 0 ? 'text-red-700' : ''}`}>
                {p.profit == null ? <span className="font-normal text-regantify-text-muted">—</span> : formatTaka(p.profit)}
              </td>
              <td className="px-5 py-2.5 text-right tabular-nums text-regantify-text-muted">{p.margin == null ? '—' : `${p.margin.toFixed(0)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
