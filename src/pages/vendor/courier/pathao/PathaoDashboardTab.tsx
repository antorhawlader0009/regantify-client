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
 * Courier Integration > Pathao > Dashboard (pathao-plan.md Step 10):
 * headline numbers, a bookings-vs-deliveries trend and the orders that
 * need the vendor's attention. The period applies to everything marked
 * with it; the rest is how things stand right now.
 */
export function PathaoDashboardTab({ onOpenParcels }: { onOpenParcels: () => void }) {
  const [range, setRange] = useState<PathaoStatsRange>('30d');
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['pathao-stats', range],
    queryFn: () => courierApi.getPathaoStats(range),
    placeholderData: keepPreviousData,
  });
  const period = rangeLabel(range);

  return (
    <div className="space-y-4">
      <RangeTabs value={range} onChange={setRange} />
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <DashboardError courier="Pathao" />
      ) : (
        <>
          <StatGrid dim={isFetching}>
            <StatTile label="Booked today" value={data.bookingsToday} />
            <StatTile label="On the way now" value={data.active} hint="Booked, not delivered or returned yet" />
            <StatTile label="Delivered" value={data.delivered} hint={`Of ${data.booked} booked, ${period}`} tone="good" />
            <StatTile label="Returned" value={data.returned} hint={data.returnRate == null ? 'No finished parcels yet' : `${data.returnRate}% came back`} />
            <StatTile label="Delivery fees" value={formatTaka(data.deliveryFees)} hint={`What Pathao charged, ${period}`} />
            <StatTile label="COD still with Pathao" value={formatTaka(data.codPending.amount)} hint={`${data.codPending.count} delivered, not paid to you yet`} />
            <StatTile label="COD paid to you" value={formatTaka(data.codPaid.amount)} hint={`${data.codPaid.count} parcels, ${period}`} />
            <StatTile
              label="Failed bookings"
              value={data.failedBookings}
              hint="Not sent to Pathao yet"
              tone={data.failedBookings > 0 ? 'danger' : undefined}
            />
          </StatGrid>
          <TrendCard data={data.trend} courier="Pathao" period={period} />
          <AttentionCard attention={data.attention} onOpenParcels={onOpenParcels} />
        </>
      )}
    </div>
  );
}
