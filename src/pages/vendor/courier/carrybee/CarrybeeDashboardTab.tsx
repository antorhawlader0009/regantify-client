import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { carrybeeApi } from '../../../../lib/carrybeeApi';
import type { PathaoStatsRange } from '../../../../lib/courierApi';
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
 * Courier Integration > CarryBee > Dashboard: the same numbers as RedX's (bookings today, on the way, delivered and
 * returned for the period, fees, COD), a bookings-vs-deliveries trend and orders that need attention. CarryBee has no
 * balance call, so "COD still with CarryBee" is delivered parcels CarryBee hasn't reported paid yet.
 */
export function CarrybeeDashboardTab({ onOpenParcels }: { onOpenParcels: () => void }) {
  const [range, setRange] = useState<PathaoStatsRange>('30d');
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['carrybee-stats', range],
    queryFn: () => carrybeeApi.stats(range),
    placeholderData: keepPreviousData,
  });
  const period = rangeLabel(range);

  return (
    <div className="space-y-4">
      <RangeTabs value={range} onChange={setRange} />
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <DashboardError courier="CarryBee" />
      ) : (
        <>
          <StatGrid dim={isFetching}>
            <StatTile label="Booked today" value={data.bookingsToday.count} hint={`${formatTaka(data.bookingsToday.cod)} COD`} />
            <StatTile label="On the way now" value={data.active.count} hint={`${formatTaka(data.active.cod)} COD to collect`} />
            <StatTile label="Delivered" value={data.delivered} hint={`Of ${data.booked} booked, ${period}`} tone="good" />
            <StatTile label="Returned" value={data.returned} hint={data.returnRate == null ? 'No finished parcels yet' : `${data.returnRate}% came back`} />
            <StatTile label="Delivery fees" value={formatTaka(data.deliveryFees)} hint={`What CarryBee charged, ${period}`} />
            <StatTile label="COD still with CarryBee" value={formatTaka(data.codPending.amount)} hint={`${data.codPending.count} delivered, not paid to you yet`} />
            <StatTile label="COD paid to you" value={formatTaka(data.codPaid.amount)} hint={`${data.codPaid.count} parcels, ${period}`} />
            <StatTile label="Failed bookings" value={data.failedBookings} hint="Not sent to CarryBee yet" tone={data.failedBookings > 0 ? 'danger' : undefined} />
          </StatGrid>
          <TrendCard data={data.trend} courier="CarryBee" period={period} />
          <AttentionCard attention={data.attention} onOpenParcels={onOpenParcels} />
          <p className="text-xs text-neutral-500">
            Statuses arrive from CarryBee’s webhook; without it we check every 20 minutes. A parcel counts as paid to you once CarryBee reports it paid.
          </p>
        </>
      )}
    </div>
  );
}
