import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, Package } from 'lucide-react';
import { productsApi } from '../../../lib/productsApi';
import { PageHeader, PageSection, StackedList, TableFrame, TableSkeleton, outlineBtn, td, th, theadRow, trClass } from '../../../components/ui/PageKit';

function StockBadge({ stock }: { stock: number }) {
  return stock <= 0 ? (
    <span className="inline-block whitespace-nowrap rounded border border-red-200 bg-red-50 px-2 py-0.5 text-sm text-red-700">Out of stock</span>
  ) : (
    <span className="inline-block whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-sm text-amber-700">{stock} left</span>
  );
}

function Thumb({ src }: { src?: string }) {
  return src ? (
    <img src={src} alt="" className="h-9 w-9 shrink-0 rounded border border-line bg-neutral-100 object-cover" loading="lazy" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-neutral-100 text-neutral-400">
      <Package size={15} aria-hidden />
    </span>
  );
}

/**
 * Products about to run out, lowest stock first, so the vendor knows what to restock. Each product
 * is checked against its own low stock limit (Edit Product, else Stock Settings) — the same rule
 * as the bell's low stock alert — unless "Show stock under" sets one number for all.
 */
export default function LowStock() {
  const [thresholdInput, setThresholdInput] = useState('');
  const [threshold, setThreshold] = useState<number | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['products-low-stock', threshold ?? 'own'],
    queryFn: () => productsApi.lowStock(threshold),
  });

  const products = data?.products ?? [];

  const applyThreshold = () => {
    const n = Number(thresholdInput);
    setThreshold(n > 0 ? n : undefined);
    if (!(n > 0)) setThresholdInput('');
  };

  const limitWords = threshold ? `${threshold} or more left` : 'stock at or above its low stock limit';

  const empty = (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={20} aria-hidden />
      </div>
      <p className="mt-2 text-sm font-medium text-regantify-text">Nothing is running low</p>
      <p className="mt-1 max-w-sm text-xs text-neutral-500">Every product with stock tracking has {limitWords}. Products with unlimited stock aren’t listed.</p>
    </div>
  );

  return (
    <PageSection>
      <PageHeader
        title="Low stock"
        description={
          isLoading
            ? 'Checking stock…'
            : `${(data?.total ?? 0).toLocaleString()} ${(data?.total ?? 0) === 1 ? 'product' : 'products'} ${
                data?.threshold ? `under ${data.threshold} in stock` : `under their low stock limit (store default ${data?.storeThreshold ?? 5})`
              }`
        }
        actions={
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyThreshold();
            }}
          >
            <label htmlFor="threshold" className="text-sm text-neutral-600">
              Show stock under
            </label>
            <input
              id="threshold"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Own limit"
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              className="h-9 w-28 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text outline-none focus:border-brand"
            />
            <button type="submit" className={outlineBtn}>
              Apply
            </button>
            {threshold && (
              <button
                type="button"
                className={outlineBtn}
                onClick={() => {
                  setThresholdInput('');
                  setThreshold(undefined);
                }}
              >
                Clear
              </button>
            )}
          </form>
        }
      />

      <TableFrame minWidth="min-w-[720px]" className="hidden md:block">
        <thead>
          <tr className={theadRow}>
            <th className={th}>Product</th>
            <th className={th}>Category</th>
            <th className={th}>SKU</th>
            <th className={`${th} w-28`}>Alert under</th>
            <th className={`${th} w-36`}>Stock</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton rows={4} colSpan={5} />
          ) : products.length === 0 ? (
            <tr className="border-t border-line">
              <td colSpan={5}>{empty}</td>
            </tr>
          ) : (
            products.map((p) => (
              <tr key={p.id} className={trClass()}>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <Thumb src={p.photoUrls[0]} />
                    <Link to={`/vendor/product/edit/${p.id}#stock`} className="line-clamp-2 max-w-xs font-medium text-brand hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className={td}>{p.category ?? '—'}</td>
                <td className={td}>{p.sku}</td>
                <td className={td}>{p.lowStockLimit}</td>
                <td className={td}>
                  <StockBadge stock={p.stock ?? 0} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableFrame>

      <div className="md:hidden">
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-neutral-100" />
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-line">{empty}</div>
        ) : (
          <StackedList>
            {products.map((p) => (
              <li key={p.id}>
                <Link to={`/vendor/product/edit/${p.id}#stock`} className="flex items-center gap-3 px-3 py-3 active:bg-neutral-50">
                  <Thumb src={p.photoUrls[0]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-brand">{p.name}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {p.sku} · alert under {p.lowStockLimit}
                    </p>
                  </div>
                  <StockBadge stock={p.stock ?? 0} />
                  <ChevronRight size={16} className="shrink-0 text-neutral-400" aria-hidden />
                </Link>
              </li>
            ))}
          </StackedList>
        )}
      </div>
    </PageSection>
  );
}
