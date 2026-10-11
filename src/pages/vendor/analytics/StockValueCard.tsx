import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type StockValueRow } from '../../../lib/analyticsApi';
import { downloadCsv, toCsv } from '../../../lib/csv';
import { Card, EmptyState } from '../../../components/analytics/AnalyticsUi';
import { formatTaka } from '../../../components/analytics/format';

const money = (n: number | null) => (n === null ? '–' : formatTaka(n));

function Table({ title, rows }: { title: string; rows: StockValueRow[] }) {
  if (rows.length === 0) return null;
  const showMoney = rows[0].cost !== null;
  return (
    <div className="mt-5">
      <h4 className="mb-1.5 text-sm font-semibold text-regantify-text">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-neutral-500">
              <th className="py-1.5 pr-3 font-medium">Name</th>
              <th className="py-1.5 pr-3 text-right font-medium">Products</th>
              <th className="py-1.5 pr-3 text-right font-medium">Pieces</th>
              {showMoney && <th className="py-1.5 pr-3 text-right font-medium">At cost</th>}
              {showMoney && <th className="py-1.5 pr-3 text-right font-medium">At selling price</th>}
              {showMoney && <th className="py-1.5 text-right font-medium">Profit</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-line/60 last:border-0">
                <td className="py-1.5 pr-3">
                  {r.name}
                  {r.noCostProducts > 0 && <span className="ml-1.5 text-xs text-amber-700">({r.noCostProducts} with no cost)</span>}
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{r.products}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{r.pieces.toLocaleString('en-US')}</td>
                {showMoney && <td className="py-1.5 pr-3 text-right tabular-nums">{money(r.cost)}</td>}
                {showMoney && <td className="py-1.5 pr-3 text-right tabular-nums">{money(r.sell)}</td>}
                {showMoney && <td className="py-1.5 text-right tabular-nums">{money(r.profit)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Analytics > Products > "Stock value" (TellMe idea 133): the worth of everything on the shelf today, at cost and at selling price, the
 * profit that would make, split by category and brand, with a CSV. Pieces with no cost are counted apart and left out of the cost value and
 * the profit (never guessed), bundles and unlimited-stock products are left out, drafts are optional. Without the cost permission only the
 * counts show. Compare "pieces" with a stock count (Products > Stock count).
 */
export function StockValueCard() {
  const [drafts, setDrafts] = useState(false);
  const { data } = useQuery({ queryKey: ['analytics', 'stock-value', drafts], queryFn: () => analyticsApi.stockValue(drafts) });

  const exportCsv = () => {
    if (!data) return;
    const withMoney = data.costValue !== null;
    const header = ['Group', 'Name', 'Products', 'Pieces', ...(withMoney ? ['At cost', 'At selling price', 'Profit'] : []), 'Products with no cost'];
    const line = (group: string, r: StockValueRow) => [group, r.name, String(r.products), String(r.pieces), ...(withMoney ? [String(r.cost ?? ''), String(r.sell ?? ''), String(r.profit ?? '')] : []), String(r.noCostProducts)];
    downloadCsv(`stock-value-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(header, [...data.byCategory.map((r) => line('Category', r)), ...data.byBrand.map((r) => line('Brand', r))]));
  };

  return (
    <Card
      title="Stock value"
      subtitle="What is on your shelf today. Products with no stock count, and bundles, are left out."
      action={
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5 text-neutral-600">
            <input type="checkbox" checked={drafts} onChange={(e) => setDrafts(e.target.checked)} /> Include drafts
          </label>
          <button type="button" onClick={exportCsv} disabled={!data} className="h-9 rounded-lg border border-line bg-white px-3 text-sm hover:bg-neutral-50 disabled:opacity-50">
            Download CSV
          </button>
        </div>
      }
    >
      {!data ? (
        <div className="h-16 animate-pulse rounded-lg bg-neutral-100" aria-busy />
      ) : data.products === 0 ? (
        <EmptyState text="No products with a stock count yet." />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['Products', data.products.toLocaleString('en-US')],
              ['Pieces', data.pieces.toLocaleString('en-US')],
              ...(data.costValue !== null ? [['At cost', money(data.costValue)], ['At selling price', money(data.sellValue)], ['Possible profit', money(data.potentialProfit)]] : []),
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line px-3 py-2">
                <dt className="text-xs text-neutral-500">{label}</dt>
                <dd className="m-0 text-base font-semibold tabular-nums text-regantify-text">{value}</dd>
              </div>
            ))}
          </dl>
          {data.noCostProducts > 0 && data.costValue !== null && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {data.noCostProducts} {data.noCostProducts === 1 ? 'product has' : 'products have'} no cost ({data.noCostPieces.toLocaleString('en-US')} pieces), so the values above are lower than the real worth. Add their cost to count them.
            </p>
          )}
          {data.costValue === null && <p className="mt-3 text-xs text-neutral-500">Values need the product cost permission, so only the counts are shown.</p>}
          <Table title="By category" rows={data.byCategory} />
          <Table title="By brand" rows={data.byBrand} />
        </>
      )}
    </Card>
  );
}
