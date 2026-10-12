import type { SplitRow } from '../../lib/analyticsApi';
import { Card } from './AnalyticsUi';
import { DonutChart, CATEGORY_COLORS } from '../charts/DonutChart';
import { formatTaka } from './format';

const CHANNEL_LABEL: Record<string, string> = { STOREFRONT: 'Online store', MANUAL: 'Added by hand', POS: 'POS (counter)' };

/**
 * Sales by channel (POS-system-plan.md Step 11): the online store, orders added by hand, and the
 * counter, as a ring with the sales of each in the legend. The three add up to the period's sales.
 * A channel with nothing is left out.
 */
export function ChannelSplitCard({ channels, className }: { channels: SplitRow[]; className?: string }) {
  const rows = channels.filter((c) => c.orders > 0);
  const total = rows.reduce((s, c) => s + c.sales, 0);
  return (
    <Card className={className} title="By channel" subtitle="Where the sales came from">
      <DonutChart
        emptyText="No sales in this period."
        centerValue={formatTaka(total)}
        centerLabel="sales"
        slices={rows.map((c, i) => ({
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
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          display: formatTaka(c.sales),
        }))}
      />
    </Card>
  );
}
