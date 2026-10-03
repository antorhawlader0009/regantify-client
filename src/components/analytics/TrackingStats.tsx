import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, EmptyState, StatCard } from './AnalyticsUi';

// Analytics > Orders > "Order tracking" (tracking-plan.md Step 9): is the tracking page being used?
// Over orders placed in the last 30 days. The page-open count includes link previews some chat apps
// load, so it can run a little high.

interface TrackingStatsData {
  days: number;
  orders: number;
  ordersOpened: number;
  openedPercent: number | null;
  totalOpens: number;
  texts: { sent: number; skipped: number; failed: number; queued: number };
}

export function TrackingStats() {
  const { data } = useQuery({
    queryKey: ['order-tracking-stats', 30],
    queryFn: () => api.get<TrackingStatsData>('/v1/courier/order-tracking/stats', { params: { days: 30 } }).then((r) => r.data),
  });
  if (!data) return null;

  return (
    <Card title="Order tracking" subtitle="Orders placed in the last 30 days. Customers who can follow their order ask you less where it is.">
      {data.orders === 0 ? (
        <EmptyState text="No orders in the last 30 days yet." />
      ) : (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          <StatCard
            label="Customers who opened tracking"
            value={data.openedPercent == null ? '—' : `${data.openedPercent}%`}
            hint={`${data.ordersOpened} of ${data.orders} orders`}
          />
          <StatCard label="Tracking page opens" value={String(data.totalOpens)} hint="Includes link previews" />
          <StatCard label="Texts sent" value={String(data.texts.sent)} hint={data.texts.queued > 0 ? `${data.texts.queued} waiting for morning` : 'To your customers'} />
          <StatCard
            label="Texts not sent"
            value={String(data.texts.skipped + data.texts.failed)}
            hint={data.texts.skipped + data.texts.failed > 0 ? 'No credits, or a bad number' : 'None'}
          />
        </div>
      )}
    </Card>
  );
}
