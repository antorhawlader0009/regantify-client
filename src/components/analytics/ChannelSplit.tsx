import type { SplitRow } from '../../lib/analyticsApi';
import { BarList, Card, Share } from './AnalyticsUi';
import { formatTaka, sharePct } from './format';

const CHANNEL_LABEL: Record<string, string> = { STOREFRONT: 'Online store', MANUAL: 'Added by hand', POS: 'POS (counter)' };

/**
 * Sales by channel (POS-system-plan.md Step 11): the online store, orders added by hand, and the
 * counter. The three add up to the period's sales. A channel with nothing is left out.
 */
export function ChannelSplitCard({ channels, className }: { channels: SplitRow[]; className?: string }) {
  const total = channels.reduce((s, c) => s + c.sales, 0);
  return (
    <Card className={className} title="By channel" subtitle="Where the sales came from">
      <BarList
        emptyText="No sales in this period."
        rows={channels
          .filter((c) => c.orders > 0)
          .map((c) => ({
            key: c.key,
            label: (
              <>
                {CHANNEL_LABEL[c.key] ?? c.key}
                <span className="ml-1.5 text-xs text-neutral-500">
                  {c.orders} order{c.orders === 1 ? '' : 's'}
                </span>
              </>
            ),
            value: c.sales,
            display: (
              <>
                {formatTaka(c.sales)}
                <Share pct={sharePct(c.sales, total)} />
              </>
            ),
          }))}
      />
    </Card>
  );
}
