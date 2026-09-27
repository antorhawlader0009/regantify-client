import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { courierApi, type PathaoStatsRange } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { BookingsTrendChart } from '../../../../components/courier/BookingsTrendChart';

const RANGES: { id: PathaoStatsRange; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

function formatTaka(value: number) {
  return `৳${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function StatTile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'danger' }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-4">
      <p className="text-xs text-regantify-text-muted">{label}</p>
      <p className={`text-2xl font-semibold mt-1 tabular-nums ${tone === 'danger' ? 'text-red-600' : 'text-regantify-text'}`}>{value}</p>
      {hint && <p className="text-xs text-regantify-text-muted mt-0.5">{hint}</p>}
    </div>
  );
}

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
      toast.success(markedPaid > 0 ? `${markedPaid} parcel${markedPaid === 1 ? '' : 's'} marked as paid out.` : 'Everything is up to date.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not check your payouts. Please try again.')),
  });

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-semibold text-regantify-text">Payouts from SteadFast</h2>
        <button
          type="button"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 text-xs font-medium text-regantify-text hover:bg-regantify-content disabled:opacity-60"
        >
          <RefreshCw size={13} className={syncMutation.isPending ? 'animate-spin' : ''} /> Check payouts
        </button>
      </div>
      {isLoading ? (
        <p className="text-sm text-regantify-text-muted">Loading…</p>
      ) : isError || !payouts ? (
        <p className="text-sm text-red-500">Could not load your payouts from SteadFast right now.</p>
      ) : payouts.length === 0 ? (
        <p className="text-sm text-regantify-text-muted">No payouts yet.</p>
      ) : (
        <ul className="divide-y divide-black/5">
          {payouts.map((p) => (
            <li key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="text-regantify-text">Payout #{p.id}</p>
                <p className="text-xs text-regantify-text-muted">
                  {p.createdAt ? new Date(p.createdAt.replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  {p.method && <> · {p.method}</>}
                  {p.status && <> · {p.status}</>}
                </p>
              </div>
              <span className="font-medium tabular-nums text-regantify-text">{p.amount == null ? '—' : formatTaka(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-regantify-text-muted mt-3">Parcels are also marked as paid out automatically every few hours.</p>
    </section>
  );
}

/**
 * Courier Integration > SteadFast > Dashboard: headline numbers (the
 * "Bookings Today" / "Active Bookings" pair with their COD, like the
 * reference add-on, plus delivered/returned/fees/COD for the period),
 * what SteadFast owes you right now (live), a bookings-vs-deliveries
 * trend, orders that need attention and recent payouts.
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

  const period = RANGES.find((r) => r.id === range)!.label.toLowerCase();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              range === r.id ? 'bg-regantify-black text-white border-regantify-black' : 'border-black/10 text-regantify-text hover:bg-regantify-content'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-regantify-text-muted">Loading…</p>
      ) : isError || !data ? (
        <p className="text-sm text-red-500">Could not load your SteadFast numbers. Please refresh the page.</p>
      ) : (
        <div className={`space-y-4 ${isFetching ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Bookings today" value={data.bookingsToday.count} hint={`${formatTaka(data.bookingsToday.cod)} COD`} />
            <StatTile label="Active bookings" value={data.active.count} hint={`${formatTaka(data.active.cod)} COD on the way`} />
            <StatTile label="Delivered" value={data.delivered} hint={`Of ${data.booked} booked, ${period}`} />
            <StatTile
              label="Returned"
              value={data.returned}
              hint={data.returnRate == null ? 'No finished parcels yet' : `${data.returnRate}% return rate`}
            />
            <StatTile
              label="SteadFast balance"
              value={balance?.balance == null ? '—' : formatTaka(balance.balance)}
              hint={balance?.balance == null ? 'SteadFast didn’t answer just now' : 'What SteadFast owes you right now'}
            />
            <StatTile
              label="COD still with SteadFast"
              value={formatTaka(data.codPending.amount)}
              hint={`${data.codPending.count} delivered, not paid out yet`}
            />
            <StatTile label="COD paid out" value={formatTaka(data.codPaid.amount)} hint={`${data.codPaid.count} parcels, ${period}`} />
            <StatTile
              label="Failed bookings"
              value={data.failedBookings}
              hint="Not sent to SteadFast yet"
              tone={data.failedBookings > 0 ? 'danger' : undefined}
            />
          </div>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <h2 className="text-base font-semibold text-regantify-text mb-3">Bookings and deliveries per day</h2>
            {data.trend.every((d) => d.booked === 0 && d.delivered === 0) ? (
              <p className="text-sm text-regantify-text-muted py-8 text-center">No SteadFast bookings or deliveries {period}.</p>
            ) : (
              <BookingsTrendChart data={data.trend} />
            )}
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-semibold text-regantify-text">
                Needs attention{data.attention.total > 0 && <span className="text-regantify-text-muted font-normal"> · {data.attention.total}</span>}
              </h2>
              {data.attention.total > 0 && (
                <button type="button" onClick={onOpenParcels} className="text-xs underline text-regantify-text-muted hover:text-regantify-text">
                  Open parcels
                </button>
              )}
            </div>
            {data.attention.items.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 size={15} /> Nothing needs your attention.
              </p>
            ) : (
              <ul className="divide-y divide-black/5">
                {data.attention.items.map((item) => (
                  <li key={item.id} className="py-2.5 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-medium text-regantify-text">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        {item.reason}
                      </p>
                      {item.detail && <p className="text-xs text-red-500 mt-0.5">{item.detail}</p>}
                      <p className="text-xs text-regantify-text-muted mt-0.5">
                        {item.customerName} · {item.customerPhone}
                        {item.courierConsignmentId && <> · {item.courierConsignmentId}</>}
                      </p>
                    </div>
                    <Link to={`/vendor/orders/${item.id}`} className="text-xs text-regantify-cta hover:underline whitespace-nowrap">
                      ORDER-{item.invoiceNumber} →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <PayoutsCard />
        </div>
      )}
    </div>
  );
}
