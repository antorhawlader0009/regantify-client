import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { courierApi, type PathaoStatsRange } from '../../../../lib/courierApi';
import {
  AttentionCard,
  DashboardError,
  DashboardSkeleton,
  RangeTabs,
  StatGrid,
  StatTile,
  TrendCard,
  formatTaka,
  rangeLabel,
} from '../../../../components/courier/CourierKit';

/**
 * Courier Integration > RedX > Dashboard: headline numbers (bookings
 * today and active bookings with their COD, delivered/returned/fees/COD
 * for the period), a bookings-vs-deliveries trend and orders that need
 * attention. RedX's API has no balance or payout list, so the COD
 * numbers come from our own parcels: delivered but not yet reported
 * "paid" by RedX is still with RedX.
 */
export function RedxDashboardTab({ onOpenParcels }: { onOpenParcels: () => void }) {
  const [range, setRange] = useState<PathaoStatsRange>('30d');
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['redx-stats', range],
    queryFn: () => courierApi.getRedxStats(range),
    placeholderData: keepPreviousData,
  });
  const period = rangeLabel(range);

  return (
    <div className="space-y-4">
      <RangeTabs value={range} onChange={setRange} />
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <DashboardError courier="RedX" />
      ) : (
        <>
          <StatGrid dim={isFetching}>
            <StatTile label="Booked today" value={data.bookingsToday.count} hint={`${formatTaka(data.bookingsToday.cod)} COD`} />
            <StatTile label="On the way now" value={data.active.count} hint={`${formatTaka(data.active.cod)} COD to collect`} />
            <StatTile label="Delivered" value={data.delivered} hint={`Of ${data.booked} booked, ${period}`} tone="good" />
            <StatTile label="Returned" value={data.returned} hint={data.returnRate == null ? 'No finished parcels yet' : `${data.returnRate}% came back`} />
            <StatTile label="Delivery fees" value={formatTaka(data.deliveryFees)} hint={`What RedX charged, ${period}`} />
            <StatTile label="COD still with RedX" value={formatTaka(data.codPending.amount)} hint={`${data.codPending.count} delivered, not paid to you yet`} />
            <StatTile label="COD paid to you" value={formatTaka(data.codPaid.amount)} hint={`${data.codPaid.count} parcels, ${period}`} />
            <StatTile
              label="Failed bookings"
              value={data.failedBookings}
              hint="Not sent to RedX yet"
              tone={data.failedBookings > 0 ? 'danger' : undefined}
            />
          </StatGrid>
          <TrendCard data={data.trend} courier="RedX" period={period} />
          <AttentionCard attention={data.attention} onOpenParcels={onOpenParcels} />
          <p className="text-xs text-neutral-500">A parcel counts as paid to you once RedX reports it “paid”. We check every 20 minutes.</p>
        </>
      )}
    </div>
  );
}
