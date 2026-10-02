import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, RefreshCw, Truck } from 'lucide-react';
import { courierApi, type CourierAccountProvider, type CourierTrackingRow } from '../../../lib/courierApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { toLatinDigits } from '../../../lib/bdPhone';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { OrderStatusBadge } from '../order/orderStatus';
import { CourierStatusBadge } from '../../../components/courier/courierStatus';
import { CopyId, formatAgo, formatTaka } from '../../../components/courier/CourierKit';
import {
  EmptyState,
  PageHeader,
  PageSection,
  PillTabs,
  SearchBox,
  StackedList,
  TableFooter,
  TableFrame,
  TableSkeleton,
  outlineBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';

const PROVIDER_LABELS: Record<CourierAccountProvider, string> = {
  PATHAO: 'Pathao',
  STEADFAST: 'SteadFast',
  REDX: 'RedX',
};

const BOOKING_STATUS: Record<CourierTrackingRow['courierBookingStatus'], { label: string; className: string }> = {
  NOT_BOOKED: { label: 'Not sent yet', className: 'border-line bg-neutral-50 text-neutral-600' },
  BOOKING: { label: 'Sending…', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  BOOKED: { label: 'Sent', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  FAILED: { label: 'Failed', className: 'border-red-200 bg-red-50 text-red-700' },
  CANCELLED: { label: 'Pickup cancelled', className: 'border-red-200 bg-red-50 text-red-700' },
};

function BookingStatusBadge({ status }: { status: CourierTrackingRow['courierBookingStatus'] }) {
  const s = BOOKING_STATUS[status];
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium ${s.className}`}>{s.label}</span>;
}

function useRefresh(row: CourierTrackingRow) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => courierApi.refreshStatus(row.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-tracking'] });
      toast.success('Status refreshed');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t refresh the status. Try again in a minute.')),
  });
}

function TrackingRow({ row }: { row: CourierTrackingRow }) {
  const refresh = useRefresh(row);
  const failed = row.courierBookingStatus === 'FAILED' || row.courierBookingStatus === 'CANCELLED';

  return (
    <tr className={trClass()}>
      <td className={`${td} whitespace-nowrap`}>
        <Link to={`/vendor/orders/${row.id}`} className="font-medium text-brand hover:underline">
          ORDER-{row.invoiceNumber}
        </Link>
        <p className="mt-0.5 text-xs text-neutral-500">{formatDhakaDateTime(row.createdAt)}</p>
      </td>
      <td className={`${td} min-w-[150px]`}>
        <p>{row.customerName}</p>
        <p className="text-xs text-neutral-500">{row.customerPhone}</p>
      </td>
      <td className={td}>
        <p className="font-medium">{PROVIDER_LABELS[row.courierProvider]}</p>
        <div className="mt-1 flex flex-col items-start gap-1">
          <BookingStatusBadge status={row.courierBookingStatus} />
          {row.courierBookingStatus === 'BOOKED' && row.courierStatus && <CourierStatusBadge provider={row.courierProvider} status={row.courierStatus} />}
        </div>
      </td>
      <td className={`${td} min-w-[150px]`}>
        <CopyId value={row.courierTrackingCode ?? row.courierConsignmentId} what="Tracking code" />
        {failed && row.courierBookingError && <p className="mt-0.5 text-xs text-red-600">{row.courierBookingError}</p>}
      </td>
      <td className={td}>
        <OrderStatusBadge status={row.status} />
      </td>
      <td className={`${td} whitespace-nowrap tabular-nums`}>{formatTaka(row.total)}</td>
      <td className={`${td} whitespace-nowrap text-xs text-neutral-500`}>{formatAgo(row.courierLastSyncedAt)}</td>
      <td className={td}>
        {row.courierBookingStatus === 'BOOKED' ? (
          <button type="button" onClick={() => refresh.mutate()} disabled={refresh.isPending} className={outlineBtn} title="Ask the courier for the latest status">
            <RefreshCw size={14} className={refresh.isPending ? 'animate-spin' : ''} aria-hidden />
            Refresh
          </button>
        ) : (
          <Link to={`/vendor/orders/${row.id}`} className={outlineBtn}>
            Open order
          </Link>
        )}
      </td>
    </tr>
  );
}

function TrackingItem({ row }: { row: CourierTrackingRow }) {
  const failed = row.courierBookingStatus === 'FAILED' || row.courierBookingStatus === 'CANCELLED';
  return (
    <li>
      <Link to={`/vendor/orders/${row.id}`} className="flex items-start gap-3 px-3 py-3 active:bg-neutral-50">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-brand">ORDER-{row.invoiceNumber}</span>
            <span className="text-xs text-neutral-500">{PROVIDER_LABELS[row.courierProvider]}</span>
            {row.courierBookingStatus === 'BOOKED' && row.courierStatus ? (
              <CourierStatusBadge provider={row.courierProvider} status={row.courierStatus} />
            ) : (
              <BookingStatusBadge status={row.courierBookingStatus} />
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-neutral-600">
            {row.customerName} · {row.customerPhone} · <span className="tabular-nums">{formatTaka(row.total)}</span>
          </p>
          {failed && row.courierBookingError && <p className="mt-0.5 text-xs text-red-600">{row.courierBookingError}</p>}
        </div>
        <ChevronRight size={16} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden />
      </Link>
    </li>
  );
}

type CourierFilter = 'ALL' | CourierAccountProvider;
const PER_PAGE = 20;

/**
 * Shipping > Tracking — every order that has a courier, across Pathao /
 * SteadFast / RedX, sorted so anything needing attention (not sent yet,
 * or failed) comes first. See CourierTrackingController for the query.
 * Distinct from the Orders page: that's for running orders day to day,
 * this is only "what's out for delivery and where is it". The list
 * comes whole from the server, so the courier tabs and search filter it
 * here.
 */
export default function Tracking() {
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ['courier-tracking'],
    queryFn: courierApi.getTracking,
  });
  const [courier, setCourier] = useState<CourierFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c: Record<CourierFilter, number> = { ALL: rows?.length ?? 0, STEADFAST: 0, PATHAO: 0, REDX: 0 };
    rows?.forEach((r) => (c[r.courierProvider] += 1));
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = toLatinDigits(search.trim().toLowerCase());
    return (rows ?? []).filter(
      (r) =>
        (courier === 'ALL' || r.courierProvider === courier) &&
        (!term ||
          String(r.invoiceNumber).includes(term.replace(/^order-/, '')) ||
          r.customerName.toLowerCase().includes(term) ||
          r.customerPhone.includes(term) ||
          (r.courierTrackingCode ?? '').toLowerCase().includes(term) ||
          (r.courierConsignmentId ?? '').toLowerCase().includes(term)),
    );
  }, [rows, courier, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const shown = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const nothingYet = !isLoading && (rows?.length ?? 0) === 0;
  const COLS = 8;

  const empty = nothingYet
    ? {
        title: 'No orders with a courier yet',
        hint: 'Send an order to SteadFast, Pathao or RedX from the Orders page and you can follow it here.',
        action: (
          <Link to="/vendor/orders" className={outlineBtn}>
            Go to orders
          </Link>
        ),
      }
    : { title: 'No orders match', hint: 'Try another courier tab or a different search.', action: undefined };

  return (
    <PageSection>
      <PageHeader title="Tracking" description="Every order sent to a courier: whether it was sent, and where the parcel is now." />

      <PillTabs
        value={courier}
        onChange={(v) => {
          setCourier(v);
          setPage(1);
        }}
        tabs={[
          { id: 'ALL', label: 'All', count: rows ? counts.ALL : undefined },
          { id: 'STEADFAST', label: 'SteadFast', count: rows ? counts.STEADFAST : undefined },
          { id: 'PATHAO', label: 'Pathao', count: rows ? counts.PATHAO : undefined },
          { id: 'REDX', label: 'RedX', count: rows ? counts.REDX : undefined },
        ]}
      />
      <div className="mb-3">
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Invoice, name, phone or tracking code"
          className="sm:w-[320px]"
        />
      </div>

      {isError ? (
        <div className="rounded-lg border border-line">
          <EmptyState icon={Truck} title="Couldn’t load tracking" hint="Refresh the page to try again." />
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <TableFrame minWidth="min-w-[1000px]">
              <thead>
                <tr className={theadRow}>
                  <th className={th}>Order</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Courier</th>
                  <th className={th}>Tracking code</th>
                  <th className={th}>Order status</th>
                  <th className={th}>Total</th>
                  <th className={th}>Last checked</th>
                  <th className={th}>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton rows={6} colSpan={COLS} height="h-10" />
                ) : shown.length === 0 ? (
                  <EmptyState as="row" colSpan={COLS} icon={Truck} title={empty.title} hint={empty.hint} action={empty.action} />
                ) : (
                  shown.map((row) => <TrackingRow key={row.id} row={row} />)
                )}
              </tbody>
            </TableFrame>
          </div>

          <div className="md:hidden">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
                ))}
              </div>
            ) : shown.length === 0 ? (
              <div className="rounded-lg border border-line">
                <EmptyState icon={Truck} title={empty.title} hint={empty.hint} action={empty.action} />
              </div>
            ) : (
              <StackedList>
                {shown.map((row) => (
                  <TrackingItem key={row.id} row={row} />
                ))}
              </StackedList>
            )}
          </div>

          {filtered.length > 0 && <TableFooter page={safePage} perPage={PER_PAGE} total={filtered.length} onPageChange={setPage} />}
        </>
      )}
    </PageSection>
  );
}
