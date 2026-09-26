import { useQuery } from '@tanstack/react-query';
import { courierApi, type CourierEvent } from '../../lib/courierApi';
import type { CourierProvider } from '../../lib/ordersApi';
import { orderStatusLabel } from '../../pages/vendor/order/orderStatus';
import { courierStatusInfo } from './courierStatus';

const SOURCE_LABELS: Record<CourierEvent['source'], string> = {
  BOOKING: 'Booking',
  POLL: 'Auto check',
  MANUAL: 'Refreshed',
  WEBHOOK: 'Courier update',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function eventTitle(event: CourierEvent): string {
  if (event.event === 'booked') return 'Booked';
  if (event.event === 'booking_failed') return 'Booking failed';
  if (event.event === 'customer_sms') return 'Customer texted';
  if (event.event === 'customer_sms_failed') return 'Customer SMS not sent';
  if (event.event === 'updated') return 'Details updated';
  return courierStatusInfo(event.provider as CourierProvider, event.event).label;
}

/**
 * Order Detail's courier timeline (pathao-plan.md Step 6): every booking
 * attempt and every change in the courier's status, newest first. Rows
 * only exist for real changes — the server skips re-polls of the same
 * status — so this reads as the parcel's journey, not a polling log.
 */
export function CourierTimeline({ orderId, showEmpty }: { orderId: string; /** Say so when there are no events, instead of rendering nothing. */ showEmpty?: boolean }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['courier-events', orderId],
    queryFn: () => courierApi.getOrderCourierEvents(orderId),
  });

  if (isLoading) return <p className="text-xs text-regantify-text-muted">Loading courier timeline…</p>;
  if (!events || events.length === 0) {
    return showEmpty ? <p className="text-sm text-regantify-text-muted">No courier updates yet.</p> : null;
  }

  return (
    <div>
      <p className="text-xs font-medium text-regantify-text-muted uppercase tracking-wide mb-2">Courier Timeline</p>
      <ol className="relative border-l border-black/10 ml-1.5 space-y-3">
        {events.map((event, i) => (
          <li key={event.id} className="pl-4 relative">
            <span
              className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${
                event.event === 'booking_failed' ? 'bg-red-500' : i === 0 ? 'bg-regantify-cta' : 'bg-black/20'
              }`}
            />
            <p className="text-sm text-regantify-text">
              {eventTitle(event)}
              {event.appliedStatus && (
                <span className="text-xs text-regantify-text-muted"> · order moved to {orderStatusLabel(event.appliedStatus)}</span>
              )}
            </p>
            {event.note && (
              <p className={`text-xs mt-0.5 ${event.event === 'booking_failed' ? 'text-red-500' : 'text-regantify-text-muted'}`}>{event.note}</p>
            )}
            <p className="text-[11px] text-regantify-text-muted mt-0.5">
              {formatDateTime(event.createdAt)} · {SOURCE_LABELS[event.source]}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
