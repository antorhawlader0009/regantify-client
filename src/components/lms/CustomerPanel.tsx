import { useQuery } from '@tanstack/react-query';
import { apiErrorMessage } from '../../lib/api';
import { lmsApi } from '../../lib/lmsApi';
import { DashboardLink } from './LmsLayout';
import { formatDateTime, formatMoney } from './format';

const ORDER_STATUS_WORDS: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipping',
  COMPLETED: 'Delivered',
  ON_HOLD: 'On hold',
  PAYMENT_INITIATED: 'Awaiting payment',
  PARTIAL_PAYMENT_PENDING: 'Awaiting payment',
  PAYMENT_FAILED: 'Payment failed',
  CANCELLED: 'Cancelled',
  RETURN: 'Returned',
  REFUNDED: 'Refunded',
  STOCK_OUT: 'Stock out',
};

export function orderStatusWord(status: string): string {
  return ORDER_STATUS_WORDS[status] ?? status;
}

/**
 * "This customer": their orders at this store (with numbers, the old
 * LMS's previous order), how often their parcels get delivered across all
 * stores and couriers, the blacklist, and notes from their other leads.
 * Stored data only: opening it never calls a courier.
 */
export function CustomerPanel({ leadId }: { leadId: string }) {
  const panel = useQuery({ queryKey: ['lms', 'customer', leadId], queryFn: () => lmsApi.customer(leadId), staleTime: 60_000 });

  if (panel.isPending) return <p className="text-sm text-lms-muted">Loading…</p>;
  if (panel.isError) return <p className="text-sm">{apiErrorMessage(panel.error, "This customer's history couldn't load.")}</p>;
  const { orders, delivery, blacklisted, notes } = panel.data;

  return (
    <div className="space-y-4 text-sm">
      {blacklisted && (
        <p className="rounded-md border border-lms-alert px-3 py-2 font-medium text-lms-alert">This number is on your Customers blacklist.</p>
      )}

      <div>
        {orders.total === 0 ? (
          <p>No orders from this number yet.</p>
        ) : (
          <p className="tabular-nums">
            <span className="font-medium">
              {orders.total} order{orders.total === 1 ? '' : 's'} here
            </span>
            {`, ${orders.delivered} delivered`}
            {orders.returned ? `, ${orders.returned} returned` : ''}
            {orders.cancelled ? `, ${orders.cancelled} cancelled` : ''}
          </p>
        )}
        <p className="mt-1 text-lms-muted tabular-nums">
          {delivery.rate === null
            ? 'Not enough parcels yet to show a delivery rate.'
            : `Delivery success ${delivery.rate}% (${delivery.delivered} of ${delivery.finished} parcels, all stores and couriers)`}
        </p>
      </div>

      {orders.recent.length > 0 && (
        <ul className="divide-y divide-lms-line border-y border-lms-line">
          {orders.recent.map((o) => (
            <li key={o.id} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0">
                <DashboardLink to={`/vendor/orders/${o.id}`} className="font-medium underline-offset-2 hover:underline">
                  #{o.invoiceNumber}
                </DashboardLink>
                <span className="ml-2 text-lms-muted">{orderStatusWord(o.status)}</span>
              </span>
              <span className="shrink-0 tabular-nums text-lms-muted">{formatMoney(o.total)}</span>
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <div>
          <p className="mb-1.5 text-[13px] font-medium">Notes from earlier leads</p>
          <ul className="space-y-2">
            {notes.map((n, i) => (
              <li key={i}>
                <p className="whitespace-pre-wrap">{n.text}</p>
                <p className="text-xs text-lms-muted">
                  {n.actorName ? `${n.actorName}, ` : ''}
                  {formatDateTime(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
