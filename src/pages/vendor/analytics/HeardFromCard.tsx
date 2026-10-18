import type { DateRange } from '../../../lib/analyticsApi';
import { Card, EmptyState } from '../../../components/analytics/AnalyticsUi';
import { Link } from 'react-router-dom';
import { TabState, useAnalytics } from './useAnalytics';

const CHANNEL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  google: 'Google',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  qr: 'QR code',
  shop: 'Regantify Shop',
  direct: 'Direct (no link)',
  other: 'Other websites',
};

/**
 * Analytics > Marketing > "How customers found you" (TellMe idea 100): the customers' own answer next to what the tracked links say, for the
 * same online orders. The gap is the point: many say "Facebook" while the links say "Direct" means a post is working without tracking.
 */
export function HeardFromCard({ range }: { range: DateRange }) {
  const query = useAnalytics('heardFrom', range);
  return (
    <TabState query={query}>
      {(data) => (
        <Card
          title="How customers found you"
          subtitle={`What customers said (one tap after ordering) against what the tracked links recorded, for ${data.total} online ${data.total === 1 ? 'order' : 'orders'}.`}
        >
          {!data.enabled && data.answered === 0 ? (
            <EmptyState text="The question is off. Turn it on in Store > Order Tracking to see what customers say." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-neutral-500">
                  Customers said ({data.answered} of {data.total} answered)
                </p>
                {data.said.length === 0 ? (
                  <p className="text-sm text-neutral-500">No answers yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {data.said.map((r) => (
                      <li key={r.key} className="flex justify-between gap-3">
                        <span>{r.label}</span>
                        <span className="tabular-nums font-medium">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-neutral-500">Tracked links said</p>
                {data.linked.length === 0 ? (
                  <p className="text-sm text-neutral-500">No tracked orders yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {data.linked.map((r) => (
                      <li key={r.channel} className="flex justify-between gap-3">
                        <span>{CHANNEL_LABELS[r.channel] ?? r.channel}</span>
                        <span className="tabular-nums font-medium">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-neutral-500">
            <Link to="/vendor/store/order-tracking" className="underline">
              Change the question
            </Link>
          </p>
        </Card>
      )}
    </TabState>
  );
}
