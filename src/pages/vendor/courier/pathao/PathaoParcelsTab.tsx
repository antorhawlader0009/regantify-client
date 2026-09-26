import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Copy, Search } from 'lucide-react';
import { courierApi, openPathaoLabels, type ParcelGroup, type PathaoParcel } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { Dialog } from '../../../../components/ui/Dialog';
import { DropdownMenu, DropdownMenuItem } from '../../../../components/ui/DropdownMenu';
import { CourierTimeline } from '../../../../components/courier/CourierTimeline';
import { CourierStatusBadge } from '../../../../components/courier/courierStatus';
import { DateRangeFilter } from '../../order/DateRangeFilter';
import { OrderStatusBadge } from '../../order/orderStatus';

const GROUPS: { id: ParcelGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'returned', label: 'Returned' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'cancelled', label: 'Cancelled' },
];

const PER_PAGE = 20;
const PATHAO_PANEL_URL = 'https://merchant.pathao.com';

function formatTaka(value: string | null) {
  if (value == null) return '—';
  return `৳${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

/** "5 min ago" / "3 h ago" / a date — how fresh the courier status is. */
function formatAgo(iso: string | null) {
  if (!iso) return 'Never';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return formatDate(iso);
}

async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied.`);
  } catch {
    toast.error('Could not copy — select the text and copy it yourself.');
  }
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function ParcelRow({ parcel, onTimeline }: { parcel: PathaoParcel; onTimeline: (parcel: PathaoParcel) => void }) {
  const queryClient = useQueryClient();
  const refreshMutation = useMutation({
    mutationFn: () => courierApi.refreshStatus(parcel.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pathao-parcels'] });
      queryClient.invalidateQueries({ queryKey: ['courier-events', parcel.id] });
      toast.success('Status refreshed.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not refresh the status. Please try again.')),
  });

  const consignment = parcel.courierConsignmentId ?? '';
  const collectedDiffers =
    parcel.courierCollectedAmount != null && parcel.courierCodAmount != null && Number(parcel.courierCollectedAmount) !== Number(parcel.courierCodAmount);

  return (
    <tr className="border-t border-black/5 align-top">
      <td className="p-4 whitespace-nowrap">
        <p className="text-sm text-regantify-text">{formatDate(parcel.courierBookedAt ?? parcel.createdAt)}</p>
        <Link to={`/vendor/orders/${parcel.id}`} className="text-xs text-regantify-cta hover:underline">
          ORDER-{parcel.invoiceNumber}
        </Link>
      </td>
      <td className="p-4">
        {parcel.courierBookingStatus === 'CANCELLED' ? (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600">Pickup cancelled</span>
        ) : parcel.courierStatus ? (
          <CourierStatusBadge provider="PATHAO" status={parcel.courierStatus} />
        ) : (
          <span className="text-xs text-regantify-text-muted">Not checked yet</span>
        )}
        <div className="mt-1">
          <OrderStatusBadge status={parcel.status} />
        </div>
      </td>
      <td className="p-4 min-w-[150px]">
        <p className="text-sm text-regantify-text">{parcel.customerName}</p>
        <p className="text-xs text-regantify-text-muted">{parcel.customerPhone}</p>
      </td>
      <td className="p-4 whitespace-nowrap">
        {consignment ? (
          <button
            type="button"
            onClick={() => copyText(consignment, 'Consignment ID')}
            title="Copy"
            className="inline-flex items-center gap-1.5 text-sm font-mono text-regantify-text hover:text-regantify-cta"
          >
            {consignment}
            <Copy size={12} className="text-regantify-text-muted" />
          </button>
        ) : (
          '—'
        )}
      </td>
      <td className="p-4 whitespace-nowrap text-sm text-regantify-text">
        {formatTaka(parcel.courierCodAmount)}
        {collectedDiffers && <p className="text-xs text-amber-700">Collected {formatTaka(parcel.courierCollectedAmount)}</p>}
        {parcel.courierPaidAt && <p className="text-xs text-green-700">Paid out</p>}
      </td>
      <td className="p-4 whitespace-nowrap text-sm text-regantify-text">{formatTaka(parcel.courierDeliveryFee)}</td>
      <td className="p-4 whitespace-nowrap text-xs text-regantify-text-muted">{formatAgo(parcel.courierLastSyncedAt)}</td>
      <td className="p-4 text-right">
        <DropdownMenu
          trigger={
            <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
              Actions
              <ChevronDown size={14} />
            </button>
          }
        >
          <DropdownMenuItem onSelect={() => onTimeline(parcel)}>View timeline</DropdownMenuItem>
          {parcel.courierBookingStatus === 'BOOKED' && (
            <DropdownMenuItem onSelect={() => refreshMutation.mutate()}>
              {refreshMutation.isPending ? 'Refreshing…' : 'Refresh status'}
            </DropdownMenuItem>
          )}
          {parcel.courierBookingStatus === 'BOOKED' && <DropdownMenuItem onSelect={() => openPathaoLabels([parcel.id])}>Print label</DropdownMenuItem>}
          {consignment && <DropdownMenuItem onSelect={() => copyText(consignment, 'Consignment ID')}>Copy consignment ID</DropdownMenuItem>}
          {consignment && (
            <DropdownMenuItem
              onSelect={() => {
                // Pathao's panel has no stable deep link to one order, so
                // copy the ID for its search box and open the panel.
                void copyText(consignment, 'Consignment ID');
                window.open(PATHAO_PANEL_URL, '_blank', 'noopener');
              }}
            >
              Open in Pathao panel
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      </td>
    </tr>
  );
}

/**
 * Courier Integration > Pathao > Parcels (pathao-plan.md Step 9): every
 * order booked with Pathao, filterable by where the parcel is, searchable
 * by invoice / phone / name / consignment ID, paginated on the server.
 */
export function PathaoParcelsTab() {
  const [group, setGroup] = useState<ParcelGroup | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [timelineFor, setTimelineFor] = useState<PathaoParcel | null>(null);

  const q = useDebounced(search.trim(), 300);
  useEffect(() => setPage(1), [group, q, dateFrom, dateTo]);

  const query = {
    group: group === 'all' ? undefined : group,
    q: q || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    page,
    perPage: PER_PAGE,
  };
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['pathao-parcels', query],
    queryFn: () => courierApi.getPathaoParcels(query),
    placeholderData: keepPreviousData,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PER_PAGE)) : 1;
  const firstShown = data && data.total > 0 ? (page - 1) * PER_PAGE + 1 : 0;
  const lastShown = data ? Math.min(page * PER_PAGE, data.total) : 0;

  return (
    <div className="bg-white rounded-2xl border border-black/5">
      <div className="p-4 sm:p-5 space-y-3 border-b border-black/5">
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                group === g.id
                  ? 'bg-regantify-black text-white border-regantify-black'
                  : 'border-black/10 text-regantify-text hover:bg-regantify-content'
              }`}
            >
              {g.label}
              {data && <span className={group === g.id ? 'text-white/70' : 'text-regantify-text-muted'}> {data.counts[g.id]}</span>}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-regantify-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, phone, name or consignment ID"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        </div>
      </div>

      <div className={`overflow-x-auto ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-regantify-text-muted">
              <th className="p-4 font-medium">Booked</th>
              <th className="p-4 font-medium">Pathao status</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Consignment ID</th>
              <th className="p-4 font-medium">COD</th>
              <th className="p-4 font-medium">Delivery fee</th>
              <th className="p-4 font-medium">Last update</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-regantify-text-muted">
                  Loading parcels…
                </td>
              </tr>
            ) : isError || !data ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-red-500">
                  Could not load your parcels. Please refresh the page.
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-regantify-text-muted">
                  {data.counts.all === 0 && !q && !dateFrom && !dateTo
                    ? 'No Pathao parcels yet. Book an order with Pathao from the Orders page and it will show up here.'
                    : 'No parcels match these filters.'}
                </td>
              </tr>
            ) : (
              data.items.map((parcel) => <ParcelRow key={parcel.id} parcel={parcel} onTimeline={setTimelineFor} />)
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">
            {firstShown}–{lastShown} of {data.total}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-40"
              >
                ‹ Prev
              </button>
              <span className="px-2 text-xs text-regantify-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-40"
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={timelineFor != null}
        onOpenChange={(open) => !open && setTimelineFor(null)}
        title={timelineFor ? `ORDER-${timelineFor.invoiceNumber} · ${timelineFor.courierConsignmentId ?? ''}` : undefined}
        maxWidth="max-w-md"
      >
        <div className="p-6 pt-4">{timelineFor && <CourierTimeline orderId={timelineFor.id} showEmpty />}</div>
      </Dialog>
    </div>
  );
}
