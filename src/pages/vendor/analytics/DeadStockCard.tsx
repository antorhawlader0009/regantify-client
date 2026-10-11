import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '../../../lib/analyticsApi';
import { productsApi } from '../../../lib/productsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Card, EmptyState, ProductThumb } from '../../../components/analytics/AnalyticsUi';
import { formatTaka } from '../../../components/analytics/format';

const ago = (iso: string | null) => {
  if (!iso) return 'Never sold';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? 'Sold today' : `Last sold ${d} ${d === 1 ? 'day' : 'days'} ago`;
};

/**
 * Analytics > Products > "Not selling" (TellMe idea 84): in-stock products with no sale in the last 30/60/90 days and the money sitting in
 * their stock. Newer products (under 30 days) are left out. The money is hidden without the cost permission. Per row: put on sale (the
 * product's own page), a badge, or hide it (Draft).
 */
export function DeadStockCard() {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(60);
  const key = ['analytics', 'dead-stock', days];
  const { data } = useQuery({ queryKey: key, queryFn: () => analyticsApi.deadStock(days) });
  const hide = useMutation({
    mutationFn: (id: string) => productsApi.updateVisibility(id, 'DRAFT'),
    onSuccess: () => {
      toast.success('The product is hidden (Draft).');
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'dead-stock'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not hide the product.')),
  });
  const badge = useMutation({
    mutationFn: (id: string) => productsApi.update(id, { badgeText: 'Sale' }),
    onSuccess: () => toast.success('Badge “Sale” added. Change it on the product page.'),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not add the badge.')),
  });

  return (
    <Card
      title="Not selling"
      subtitle="In stock, but no sale in this time. Products added in the last 30 days are left out."
      action={
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 rounded-lg border border-line bg-white px-2 text-sm" aria-label="Days without a sale">
          {[30, 60, 90].map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      }
    >
      {!data ? (
        <div className="h-16 animate-pulse rounded-lg bg-neutral-100" aria-busy />
      ) : data.products.length === 0 ? (
        <EmptyState text="Nothing is stuck. Every product in stock sold in this time." />
      ) : (
        <>
          <p className="mb-3 text-sm text-regantify-text">
            {data.count} {data.count === 1 ? 'product' : 'products'}
            {data.stuckTotal != null && (
              <>
                {' '}
                with <span className="font-semibold">{formatTaka(data.stuckTotal)}</span> tied up in stock
              </>
            )}
          </p>
          <ul className="divide-y divide-line">
            {data.products.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <ProductThumb src={p.image} alt={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-regantify-text">{p.name}</p>
                  <p className="text-xs text-neutral-500">
                    {p.stock} in stock · {ago(p.lastSoldAt)}
                    {p.stuck != null && ` · ${formatTaka(p.stuck)}${p.estimated ? ' (estimate, no cost set)' : ''}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5 text-xs">
                  <Link to={`/vendor/product/edit/${p.id}`} className="rounded-lg border border-line px-2.5 py-1.5 text-neutral-700 hover:bg-neutral-50">
                    Put on sale
                  </Link>
                  <button type="button" onClick={() => badge.mutate(p.id)} className="rounded-lg border border-line px-2.5 py-1.5 text-neutral-700 hover:bg-neutral-50">
                    Badge
                  </button>
                  <button type="button" onClick={() => hide.mutate(p.id)} className="rounded-lg border border-line px-2.5 py-1.5 text-neutral-700 hover:bg-neutral-50">
                    Hide
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
