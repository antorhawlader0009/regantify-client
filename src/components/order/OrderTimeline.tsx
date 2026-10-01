import { useQuery } from '@tanstack/react-query';
import { Clock, Truck } from 'lucide-react';
import { courierApi } from '../../lib/courierApi';
import type { OrderStatusHistoryEntry } from '../../lib/ordersApi';
import { orderStatusLabel } from '../../pages/vendor/order/orderStatus';
import { SOURCE_LABELS, eventTitle } from '../courier/CourierTimeline';

const COURIER_NAMES: Record<string, string> = { PATHAO: 'Pathao', STEADFAST: 'SteadFast', REDX: 'RedX' };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' });
}

interface Item {
  id: string;
  at: string;
  kind: 'status' | 'courier' | 'failed';
  title: string;
  note?: string | null;
  meta: string;
}

/**
 * Order Detail's one timeline (theme-update-plan.md Step 3): the order's
 * own status changes and the courier's updates, newest first, so the
 * vendor reads the parcel's whole story in one place.
 */
export function OrderTimeline({ orderId, history, hasCourier }: { orderId: string; history: OrderStatusHistoryEntry[]; hasCourier: boolean }) {
  const { data: events = [] } = useQuery({
    queryKey: ['courier-events', orderId],
    queryFn: () => courierApi.getOrderCourierEvents(orderId),
    enabled: hasCourier,
  });

  const items: Item[] = [
    ...history.map((h) => ({
      id: `s-${h.id}`,
      at: h.createdAt,
      kind: 'status' as const,
      title: h.fromStatus ? `${orderStatusLabel(h.fromStatus)} to ${orderStatusLabel(h.toStatus)}` : `Order placed: ${orderStatusLabel(h.toStatus)}`,
      note: h.note,
      meta: h.changedBy ? `by ${h.changedBy}` : 'Order status',
    })),
    ...events.map((e) => ({
      id: `c-${e.id}`,
      at: e.createdAt,
      kind: e.event === 'booking_failed' ? ('failed' as const) : ('courier' as const),
      title: `${COURIER_NAMES[e.provider] ?? e.provider}: ${eventTitle(e)}${e.appliedStatus ? ` (order moved to ${orderStatusLabel(e.appliedStatus)})` : ''}`,
      note: e.note,
      meta: SOURCE_LABELS[e.source],
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (items.length === 0) return <p className="text-sm text-neutral-500">Nothing has happened to this order yet.</p>;

  return (
    <ol className="space-y-0">
      {items.map((item, i) => {
        const Icon = item.kind === 'status' ? Clock : Truck;
        const tone =
          item.kind === 'failed'
            ? 'bg-red-50 text-red-600'
            : item.kind === 'courier'
              ? 'bg-sky-50 text-sky-700'
              : i === 0
                ? 'bg-brand-lime text-brand'
                : 'bg-neutral-100 text-neutral-500';
        return (
          <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < items.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-1.5rem)] w-px bg-line" aria-hidden />}
            <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Icon size={13} aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-sm ${item.kind === 'failed' ? 'text-red-700' : 'text-regantify-text'}`}>{item.title}</p>
              {item.note && <p className={`mt-0.5 text-xs ${item.kind === 'failed' ? 'text-red-600' : 'text-neutral-600'}`}>{item.note}</p>}
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {formatDateTime(item.at)} · {item.meta}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
