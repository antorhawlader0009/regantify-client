import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import type { Order } from '../../lib/ordersApi';
import { RETURN_OUTCOME_LABELS, type ReturnOutcome } from '../../lib/returnCheckInApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { outlineBtn } from '../ui/PageKit';

/** Whether this order's returned parcel is worth counting in: a returned (or since refunded) online/manual order whose stock was taken. */
export function showsReturnCheck(order: Pick<Order, 'status' | 'source'>): boolean {
  return (order.status === 'RETURN' || order.status === 'REFUNDED') && order.source !== 'POS';
}

/**
 * Order detail: has the returned parcel been counted in at the shop (Orders > Return check-in)? Shows what was
 * found per product once it has, or a link to check it in.
 */
export function OrderReturnCheckCard({ order, canEdit }: { order: Order; canEdit: boolean }) {
  if (!showsReturnCheck(order)) return null;
  const checked = Boolean(order.returnCheckedAt);
  const found = order.items.filter((i) => i.returnOutcome);

  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardCheck size={15} className="text-neutral-500" aria-hidden />
        <span className="text-sm font-medium text-regantify-text">Returned parcel</span>
        {checked ? (
          <span className="text-sm text-neutral-600">
            checked in{order.returnCheckedBy ? ` by ${order.returnCheckedBy}` : ''}
            {order.returnCheckedAt ? `, ${formatDhakaDateTime(order.returnCheckedAt)}` : ''}
          </span>
        ) : (
          <span className="text-sm text-neutral-600">not checked in yet</span>
        )}
        {!checked && canEdit && (
          <Link to={`/vendor/orders/return-check-in?code=${encodeURIComponent(order.publicCode ?? String(order.invoiceNumber))}`} className={`${outlineBtn} ml-auto`}>
            Check in
          </Link>
        )}
      </div>
      {checked && found.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-sm text-neutral-600">
          {found.map((i) => (
            <li key={i.id}>
              {i.productName}
              {i.quantity > 1 ? ` ×${i.quantity}` : ''}: <span className={i.returnOutcome === 'GOOD' ? 'text-green-700' : 'text-amber-700'}>{RETURN_OUTCOME_LABELS[i.returnOutcome as ReturnOutcome] ?? i.returnOutcome}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
