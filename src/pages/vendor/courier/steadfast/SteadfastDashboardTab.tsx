import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Wallet } from 'lucide-react';
import { courierApi, type PathaoStatsRange } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { formatDhakaDate } from '../../../../lib/dhakaDate';
import { outlineBtn } from '../../../../components/ui/PageKit';
import {
  AttentionCard,
  CourierCard,
  DashboardError,
  DashboardSkeleton,
  RangeTabs,
  StatGrid,
  StatTile,
  TrendCard,
  formatTaka,
  rangeLabel,
} from '../../../../components/courier/CourierKit';

/** Recent payouts, live from SteadFast, with "Check payouts" to mark the parcels they settled as paid. */
function PayoutsCard() {
  const queryClient = useQueryClient();
  const { data: payouts, isLoading, isError } = useQuery({
    queryKey: ['steadfast-payouts'],
    queryFn: () => courierApi.getSteadfastPayouts(1),
    staleTime: 5 * 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: courierApi.syncSteadfastPayouts,
    onSuccess: ({ markedPaid }) => {
      queryClient.invalidateQueries({ queryKey: ['steadfast-stats'] });
      queryClient.invalidateQueries({ queryKey: ['steadfast-parcels'] });
      queryClient.invalidateQueries({ queryKey: ['steadfast-payouts'] });
      toast.success(markedPaid > 0 ? `${markedPaid} parcel${markedPaid === 1 ? '' : 's'} marked as paid to you` : 'Payouts are up to date');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t check your payouts. Try again in a minute.')),
  });

  return (
    <CourierCard
      title="Payouts from SteadFast"
      description="We also check by ourselves every few hours."
      action={
        <button type="button" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} className={outlineBtn}>
          <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} aria-hidden />
          Check payouts
        </button>
      }
    >
      {isLoading ? (
        <div className="space-y-2" aria-busy>
          <div className="h-12 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-12 animate-pulse rounded-lg bg-neutral-100" />
        </div>
      ) : isError || !payouts ? (
        <p className="text-sm text-red-600">SteadFast didn’t send your payouts just now. Try again in a minute.</p>
      ) : payouts.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <Wallet size={15} aria-hidden /> No payouts yet. They show up here once SteadFast pays you.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {payouts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="text-regantify-text">Payout #{p.id}</p>
                <p className="truncate text-xs text-neutral-500">
                  {p.createdAt ? formatDhakaDate(p.createdAt.replace(' ', 'T')) : '—'}
                  {p.method && <> · {p.method}</>}
                  {p.status && <> · {p.status}</>}
                </p>
              </div>
              <span className="font-medium tabular-nums text-regantify-text">{formatTaka(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </CourierCard>
  );
}

/**
 * Courier Integration > SteadFast > Dashboard: headline numbers (the
 * "Bookings Today" / "Active Bookings" pair with their COD, plus
 * delivered/returned/COD for the period), what SteadFast owes you right
 * now (live), a bookings-vs-deliveries trend, orders that need
 * attention and recent payouts.
 */
export function SteadfastDashboardTab({ onOpenParcels }: { onOpenParcels: () => void }) {
  const [range, setRange] = useState<PathaoStatsRange>('30d');
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['steadfast-stats', range],
    queryFn: () => courierApi.getSteadfastStats(range),
    placeholderData: keepPreviousData,
  });
  const { data: balance } = useQuery({
    queryKey: ['steadfast-balance'],
    queryFn: courierApi.getSteadfastBalance,
    staleTime: 60_000,
  });
  const period = rangeLabel(range);

  return (
    <div className="space-y-4">
      <RangeTabs value={range} onChange={setRange} />
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <DashboardError courier="SteadFast" />
      ) : (
        <>
          <StatGrid dim={isFetching}>
            <StatTile label="Booked today" value={data.bookingsToday.count} hint={`${formatTaka(data.bookingsToday.cod)} COD`} />
            <StatTile label="On the way now" value={data.active.count} hint={`${formatTaka(data.active.cod)} COD to collect`} />
            <StatTile label="Delivered" value={data.delivered} hint={`Of ${data.booked} booked, ${period}`} tone="good" />
            <StatTile label="Returned" value={data.returned} hint={data.returnRate == null ? 'No finished parcels yet' : `${data.returnRate}% came back`} />
            <StatTile
              label="SteadFast balance"
              value={balance?.balance == null ? '—' : formatTaka(balance.balance)}
              hint={balance?.balance == null ? 'SteadFast didn’t answer just now' : 'What SteadFast owes you right now'}
            />
            <StatTile label="COD still with SteadFast" value={formatTaka(data.codPending.amount)} hint={`${data.codPending.count} delivered, not paid to you yet`} />
            <StatTile label="COD paid to you" value={formatTaka(data.codPaid.amount)} hint={`${data.codPaid.count} parcels, ${period}`} />
            <StatTile
              label="Failed bookings"
              value={data.failedBookings}
              hint="Not sent to SteadFast yet"
              tone={data.failedBookings > 0 ? 'danger' : undefined}
            />
          </StatGrid>
          <TrendCard data={data.trend} courier="SteadFast" period={period} />
          <AttentionCard attention={data.attention} onOpenParcels={onOpenParcels} />
          <PayoutsCard />
        </>
      )}
    </div>
  );
}
