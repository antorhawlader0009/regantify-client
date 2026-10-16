import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../../lib/analyticsApi';
import { downloadCsv, toCsv } from '../../../lib/csv';
import type { SalesAnalytics } from '../../../lib/analyticsApi';
import { BarList, Card, CardLink, EmptyState, KpiCard, KpiStrip, ProductThumb, Share } from '../../../components/analytics/AnalyticsUi';
import { PALETTE, TrendChart } from '../../../components/analytics/TrendChart';
import { formatTaka, COMPARE_LABEL, sharePct } from '../../../components/analytics/format';
import { TabState, useAnalytics, type TabProps } from './useAnalytics';
import { ChannelSplitCard } from '../../../components/analytics/ChannelSplit';
import { paymentMethodLabel } from '../../../lib/ordersApi';
import { useCan } from '../../../lib/useStaffAccess';
import { AdvancedPanel } from '../../../components/ui/AdvancedToggle';

const PAYMENT_LABELS: Record<string, string> = {
  COD: 'Cash on delivery',
  ONLINE_PAYMENT: 'Online payment',
  SSLCOMMERZ: 'SSLCommerz',
};

function paymentLabel(key: string) {
  // Counter sales: "bKash (counter)", "Split payment (counter)".
  if (key.startsWith('POS_')) return paymentMethodLabel(key);
  return PAYMENT_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function SalesTab({ range }: TabProps) {
  const query = useAnalytics('sales', range);
  const compareLabel = COMPARE_LABEL;
  // Staff roles without analytics.profit get no cost or profit from the server (rule-plan.md Step 5): sales only.
  const canProfit = useCan('analytics.profit');

  return (
    <TabState query={query}>
      {(data) => {
        const paymentTotal = data.byPaymentMethod.reduce((sum, r) => sum + r.sales, 0);
        const costsIncomplete = data.breakdown.costCoverage < 99.5;
        const per = data.bucket === 'month' ? 'month' : 'day';
        return (
          <>
            {canProfit ? (
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
            ) : (
              <KpiStrip cols={2}>
                <KpiCard label="Total sales" value={data.kpis.sales} kind="money" compareLabel={compareLabel} />
                <KpiCard label="Net sales" value={data.kpis.netSales} kind="money" hint="Total sales minus returns and refunds" compareLabel={compareLabel} />
              </KpiStrip>
            )}

            <div className="grid items-start lg:grid-cols-3 gap-4">
              <Card
                className={canProfit ? 'lg:col-span-2' : 'lg:col-span-3'}
                title={canProfit ? 'Sales and profit' : 'Sales'}
                subtitle={
                  canProfit
                    ? `Each ${per}: order totals, and what’s left after product cost, delivery, platform charge and VAT.`
                    : `Order totals each ${per}.`
                }
              >
                {data.trend.every((d) => d.sales === 0) ? (
                  <EmptyState text="No sales in this period yet." />
                ) : (
                  <TrendChart
                    data={data.trend}
                    series={[
                      { key: 'sales', label: 'Sales', color: PALETTE.blue },
                      ...(canProfit ? [{ key: 'profit' as const, label: 'Profit', color: PALETTE.orange }] : []),
                    ]}
                    kind="money"
                    bucket={data.bucket}
                    ariaLabel={canProfit ? 'Sales and profit over time' : 'Sales over time'}
                  />
                )}
              </Card>

              {canProfit && <MoneyLedger breakdown={data.breakdown} missingCost={data.missingCost} />}
            </div>

            <div className="grid items-start lg:grid-cols-3 gap-4">
              <Card
                className="lg:col-span-2"
                title={canProfit ? 'Profit by product' : 'Best sellers'}
                subtitle={canProfit ? 'Sales minus product cost, before delivery and fees. Returned orders left out.' : 'Units and sales per product. Returned orders left out.'}
              >
                <ProductProfitTable products={data.products} showProfit={canProfit} />
              </Card>

              <div className="space-y-4">
                <Card title="By payment method" subtitle="How shoppers paid">
                  <BarList
                    emptyText="No sales in this period."
                    rows={data.byPaymentMethod.map((r) => ({
                      key: r.key,
                      label: (
                        <>
                          {paymentLabel(r.key)}
                          <span className="ml-1.5 text-xs text-neutral-500">
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
                <ChannelSplitCard channels={data.channels} />
              </div>
            </div>

            {canProfit && (<AdvancedPanel id="analytics-sales" title="More reports" what="VAT report for a month" spaced><VatReportCard /></AdvancedPanel>)}
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
    { label: 'Resellers’ earnings', amount: b.resellerEarnings ?? 0, note: 'What resellers earned on the orders they sold for you' },
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
      {/* Finance > Expenses (ads, rent, salaries...) for the same days. */}
      <dl className="mt-2 text-sm">
        {(b.resellingEarnings ?? 0) > 0 && (
          <LedgerRow label="Earnings from reselling" title="What you earned selling other stores’ products, after Regantify’s share" amount={`+ ${formatTaka(b.resellingEarnings ?? 0)}`} />
        )}
        <LedgerRow label="Expenses" title="Ads, packaging, rent and other costs from Finance > Expenses" amount={`− ${formatTaka(b.expenses)}`} />
      </dl>
      <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-line pt-2">
        <span className="text-sm font-semibold text-regantify-text">Profit after expenses</span>
        <span className={`text-lg font-semibold tabular-nums ${b.profitAfterExpenses < 0 ? 'text-red-700' : 'text-emerald-800'}`}>{formatTaka(b.profitAfterExpenses)}</span>
      </div>
      {b.expenses === 0 && (
        <p className="mt-1 text-[12px] text-neutral-500">
          No expenses recorded for these days.{' '}
          <Link to="/vendor/finance/expenses" className="font-medium underline underline-offset-2">
            Add expenses
          </Link>
        </p>
      )}

      {(b.costCoverage < 99.5 || b.netSales > 0) && (
        <div className="mt-4 space-y-1.5 text-[12px] leading-relaxed text-neutral-500">
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
      <span className="flex-1 translate-y-[-3px] border-b border-dotted border-neutral-300" aria-hidden />
      <dd className={`tabular-nums ${strong ? 'font-semibold text-regantify-text' : 'text-regantify-text'}`}>{amount}</dd>
    </div>
  );
}

function ProductProfitTable({ products, showProfit }: { products: SalesAnalytics['products']; showProfit: boolean }) {
  if (products.length === 0) return <EmptyState text="No products sold in this period." />;
  return (
    <div className="overflow-x-auto -mx-5">
      <table className={`w-full text-sm ${showProfit ? 'min-w-[620px]' : 'min-w-[360px]'}`}>
        <thead>
          <tr className="text-left text-[12px] text-neutral-500">
            <th className="px-5 pb-2 font-normal">Product</th>
            <th className="px-3 pb-2 font-normal text-right">Units</th>
            <th className={`${showProfit ? 'px-3' : 'px-5'} pb-2 font-normal text-right`}>Sales</th>
            {showProfit && (
              <>
                <th className="px-3 pb-2 font-normal text-right">Cost</th>
                <th className="px-3 pb-2 font-normal text-right">Profit</th>
                <th className="px-5 pb-2 font-normal text-right">Margin</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.productId ?? p.name} className="border-t border-line">
              <td className="px-5 py-2.5 max-w-[280px]">
                <span className="flex items-center gap-3 min-w-0">
                  <ProductThumb src={p.image} alt={p.name} />
                  <span className="truncate font-medium text-regantify-text">{p.name}</span>
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{p.units}</td>
              <td className={`${showProfit ? 'px-3' : 'px-5'} py-2.5 text-right tabular-nums`}>{formatTaka(p.sales)}</td>
              {showProfit && (
                <>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {p.cost != null ? (
                      formatTaka(p.cost)
                    ) : p.productId ? (
                      <CardLink to={`/vendor/product/edit/${p.productId}`}>Add cost</CardLink>
                    ) : (
                      <span className="text-neutral-500">Not set</span>
                    )}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${p.profit != null && p.profit < 0 ? 'text-red-700' : ''}`}>
                    {p.profit == null ? <span className="font-normal text-neutral-500">—</span> : formatTaka(p.profit)}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-neutral-500">{p.margin == null ? '—' : `${p.margin.toFixed(0)}%`}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The month's VAT collected (TellMe idea 78), counted with the same rules as the profit figures. */
function VatReportCard() {
  const nowMonth = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 7);
  const [month, setMonth] = useState(nowMonth);
  const query = useQuery({ queryKey: ['analytics', 'vat', month], queryFn: () => analyticsApi.vat(month), enabled: /^\d{4}-\d{2}$/.test(month) });
  const data = query.data;

  const download = () => {
    if (!data) return;
    const rows = data.lines.map((l) => [`ORDER-${l.invoiceNumber}`, l.day, String(l.salesExVat), String(l.vat)]);
    rows.push(['Total', '', String(data.salesExVat), String(data.vat)]);
    downloadCsv(`vat-report-${month}.csv`, toCsv(['Order', 'Date', 'Sales without VAT', 'VAT'], rows));
  };

  return (
    <Card
      className="mt-4"
      title="VAT report"
      subtitle="VAT collected in a month. Cancelled, unpaid, returned and refunded orders are left out, the same as the profit figures."
      action={
        <div className="flex items-center gap-2">
          <input type="month" value={month} max={nowMonth} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm" />
          <button type="button" onClick={download} disabled={!data || data.lines.length === 0} className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
            Download CSV
          </button>
        </div>
      }
    >
      {!data ? (
        <div className="h-16 animate-pulse rounded-lg bg-neutral-100" aria-busy />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><p className="text-xs text-neutral-500">Sales without VAT</p><p className="text-lg font-semibold tabular-nums">{formatTaka(data.salesExVat)}</p></div>
            <div><p className="text-xs text-neutral-500">VAT collected</p><p className="text-lg font-semibold tabular-nums">{formatTaka(data.vat)}</p></div>
            <div><p className="text-xs text-neutral-500">Orders with VAT</p><p className="text-lg font-semibold tabular-nums">{data.vatOrders} of {data.orders}</p></div>
          </div>
          {data.days.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-500">
                    <th className="pb-2 font-normal">Day</th>
                    <th className="pb-2 text-right font-normal">Orders</th>
                    <th className="pb-2 text-right font-normal">Sales without VAT</th>
                    <th className="pb-2 text-right font-normal">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((d) => (
                    <tr key={d.day} className="border-t border-line">
                      <td className="py-2">{d.day}</td>
                      <td className="py-2 text-right tabular-nums">{d.orders}</td>
                      <td className="py-2 text-right tabular-nums">{formatTaka(d.salesExVat)}</td>
                      <td className="py-2 text-right tabular-nums">{formatTaka(d.vat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-neutral-500">This is a calculation from your orders, not tax advice. Delivery charges are inside the sales figure. Check the amounts with your accountant before filing a return.</p>
        </>
      )}
    </Card>
  );
}
