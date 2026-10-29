import { useAnalytics, TabState } from './useAnalytics';
import type { DateRange } from '../../../lib/analyticsApi';
import { Card, EmptyState } from '../../../components/analytics/AnalyticsUi';
import { formatTaka } from '../../../components/analytics/format';

/**
 * Analytics > Marketing > "Orders you entered by hand, by channel" (TellMe idea 121): the orders typed in through Add Order, grouped by the channel the store
 * chose (Facebook, WhatsApp, a phone call...), with the sales and how many came back. Counted like Analytics > Sales. The tracked sources above are for online orders.
 */
export function ManualChannelsCard({ range }: { range: DateRange }) {
  const query = useAnalytics('manualChannels', range);
  return (
    <TabState query={query}>
      {(data) => (
        <Card title="Hand-made orders by channel" subtitle="Orders you typed in with Add Order, by the channel you picked. Online store orders are tracked in the sources above.">
          {data.channels.length === 0 ? (
            <EmptyState text="No order was entered by hand in this period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-500">
                    <th className="pb-2 font-normal">Channel</th>
                    <th className="pb-2 text-right font-normal">Orders</th>
                    <th className="pb-2 text-right font-normal">Sales</th>
                    <th className="pb-2 text-right font-normal">Average order</th>
                    <th className="pb-2 text-right font-normal">Returned</th>
                    <th className="pb-2 text-right font-normal">Return rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.channels.map((c) => (
                    <tr key={c.channel ?? '-'} className="border-t border-line">
                      <td className="py-2 font-medium">{c.channel ?? <span className="text-neutral-500">Not set</span>}</td>
                      <td className="py-2 text-right tabular-nums">{c.orders}</td>
                      <td className="py-2 text-right tabular-nums">{formatTaka(c.sales)}</td>
                      <td className="py-2 text-right tabular-nums">{c.averageOrder == null ? '-' : formatTaka(c.averageOrder)}</td>
                      <td className="py-2 text-right tabular-nums">{c.returned}</td>
                      <td className="py-2 text-right tabular-nums">{c.returnRate == null ? '-' : `${c.returnRate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </TabState>
  );
}
