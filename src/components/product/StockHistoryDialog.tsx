import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Dialog } from '../ui/Dialog';
import { productsApi, type StockMovement } from '../../lib/productsApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';

/** What each reason code means, in the owner's words. */
const REASON: Record<string, string> = {
  ORDER: 'Order',
  ORDER_BACK: 'Order cancelled or returned, put back',
  RETURN_DAMAGED: 'Returned parcel came back damaged',
  RETURN_MISSING: 'Returned parcel never came back',
  ITEMS_EDITED: 'Order items edited',
  POS_SALE: 'Counter sale',
  POS_RETURN: 'Counter return',
  CREATED: 'Starting stock',
  RECEIVED: 'New stock received',
  DAMAGED: 'Damaged, lost or expired',
  COUNT: 'Counted the shelf and corrected',
  EDIT: 'Edited by hand',
  API: 'Set by another app',
};

function Row({ move }: { move: StockMovement }) {
  const up = move.delta > 0;
  return (
    <li className="space-y-0.5 px-3 py-2.5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-neutral-600">{formatDhakaDateTime(move.createdAt)}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">
            {move.stockBefore} → {move.stockAfter}
          </span>
          <span className={`min-w-[3rem] rounded-full px-2 py-0.5 text-center text-[12px] font-semibold ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {up ? '+' : ''}
            {move.delta}
          </span>
        </span>
      </div>
      <p className="text-regantify-text">
        {REASON[move.reason] ?? move.reason}
        {move.variantLabel ? <span className="text-neutral-500"> · {move.variantLabel}</span> : null}
        {move.orderId ? (
          <>
            {' · '}
            <Link to={`/vendor/orders/${move.orderId}`} className="font-medium text-brand hover:underline">
              {move.orderRef ?? 'order'}
            </Link>
          </>
        ) : null}
      </p>
      {(move.actor || move.note) && (
        <p className="text-xs text-neutral-500">
          {move.actor ? `By ${move.actor}` : ''}
          {move.actor && move.note ? ' · ' : ''}
          {move.note ?? ''}
        </p>
      )}
    </li>
  );
}

/**
 * Products > Edit > Stock > "Stock history": every change to this product's stock count, newest first, with
 * how many there were before and after, why, and who. Written by the server in the same step as the change,
 * so the numbers always add up.
 */
export function StockHistoryDialog({ productId, open, onOpenChange }: { productId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stock-history', productId, page],
    queryFn: () => productsApi.stockHistory(productId, page),
    enabled: open,
    placeholderData: (prev) => prev,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Stock history" maxWidth="max-w-xl">
      <div className="space-y-3 px-6 pb-6 pt-3">
        <p className="text-xs text-neutral-500">Every time this product’s stock went up or down, newest first.</p>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-neutral-100" aria-busy />
        ) : isError ? (
          <p className="text-sm text-red-600">Could not load the history. Please try again.</p>
        ) : !data || data.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3.5 py-6 text-center text-sm text-neutral-500">
            Nothing recorded yet. From now on, every change to this product’s stock shows up here.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {data.items.map((move) => (
                <Row key={move.id} move={move} />
              ))}
            </ul>
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="font-medium text-brand hover:underline disabled:opacity-40">
                  Newer
                </button>
                <span>
                  Page {data.page} of {data.totalPages}
                </span>
                <button type="button" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="font-medium text-brand hover:underline disabled:opacity-40">
                  Older
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
