import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courierApi, type CourierAccountProvider, type CourierTrackingRow } from '../../../lib/courierApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { OrderStatusBadge, orderStatusLabel } from '../order/orderStatus';
import { CourierStatusBadge } from '../../../components/courier/courierStatus';

function formatPrice(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const PROVIDER_LABELS: Record<CourierAccountProvider, string> = {
  PATHAO: 'Pathao',
  STEADFAST: 'SteadFast',
  REDX: 'RedX',
};

const BOOKING_STATUS_LABELS: Record<CourierTrackingRow['courierBookingStatus'], string> = {
  NOT_BOOKED: 'Not booked',
  BOOKING: 'Booking…',
  BOOKED: 'Booked',
  FAILED: 'Failed',
  CANCELLED: 'Pickup cancelled',
};

function BookingStatusBadge({ status }: { status: CourierTrackingRow['courierBookingStatus'] }) {
  const styles: Record<CourierTrackingRow['courierBookingStatus'], string> = {
    NOT_BOOKED: 'bg-regantify-content text-regantify-text-muted',
    BOOKING: 'bg-amber-100 text-amber-700',
    BOOKED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-600',
    CANCELLED: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

function TrackingRow({ row }: { row: CourierTrackingRow }) {
  const queryClient = useQueryClient();

  const refreshMutation = useMutation({
    mutationFn: () => courierApi.refreshStatus(row.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-tracking'] });
      toast.success('Delivery status refreshed.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not refresh the delivery status. Please try again.')),
  });

  return (
    <tr className="border-b border-black/5">
      <td className="p-4">
        <Link to={`/vendor/orders/${row.id}`} className="text-sm font-semibold text-regantify-cta hover:underline">
          ORDER-{row.invoiceNumber}
        </Link>
        <p className="text-xs text-regantify-text-muted mt-0.5">{formatDateTime(row.createdAt)}</p>
      </td>
      <td className="p-4">
        <p className="text-sm text-regantify-text">{row.customerName}</p>
        <p className="text-xs text-regantify-text-muted">{row.customerPhone}</p>
      </td>
      <td className="p-4">
        <p className="text-sm font-medium text-regantify-text">{PROVIDER_LABELS[row.courierProvider]}</p>
        <BookingStatusBadge status={row.courierBookingStatus} />
        {row.courierBookingStatus === 'BOOKED' && row.courierStatus && (
          <div className="mt-1">
            <CourierStatusBadge provider={row.courierProvider} status={row.courierStatus} />
          </div>
        )}
      </td>
      <td className="p-4">
        {row.courierTrackingCode || row.courierConsignmentId ? (
          <p className="text-sm text-regantify-text">{row.courierTrackingCode ?? row.courierConsignmentId}</p>
        ) : (
          <p className="text-sm text-regantify-text-muted">—</p>
        )}
        {(row.courierBookingStatus === 'FAILED' || row.courierBookingStatus === 'CANCELLED') && row.courierBookingError && (
          <p className="text-xs text-red-500 mt-0.5">{row.courierBookingError}</p>
        )}
      </td>
      <td className="p-4">
        <OrderStatusBadge status={row.status} />
      </td>
      <td className="p-4">
        <p className="text-sm text-regantify-text">{formatPrice(row.total)}</p>
      </td>
      <td className="p-4">
        <p className="text-xs text-regantify-text-muted">{formatDateTime(row.courierLastSyncedAt)}</p>
      </td>
      <td className="p-4">
        {row.courierBookingStatus === 'BOOKED' ? (
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="text-xs px-2.5 py-1 rounded-lg border border-black/10 text-regantify-text-muted hover:bg-regantify-content disabled:opacity-60"
          >
            {refreshMutation.isPending ? 'Refreshing…' : 'Refresh'}
          </button>
        ) : (
          <Link
            to={`/vendor/orders/${row.id}`}
            className="text-xs px-2.5 py-1 rounded-lg border border-black/10 text-regantify-text-muted hover:bg-regantify-content"
          >
            View Order
          </Link>
        )}
      </td>
    </tr>
  );
}

/**
 * Courier Integration > Tracking — a dedicated view of every order that
 * has a real courier booking, across Pathao/SteadFast/RedX, sorted so
 * anything needing attention (not yet booked, or failed) surfaces first.
 * See CourierTrackingController for the query this reads. Distinct from
 * the main Orders page: that's for day-to-day order management, this is
 * purely "what's out for delivery and what's its status."
 */
export default function Tracking() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ['courier-tracking'],
    queryFn: courierApi.getTracking,
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-regantify-text">Tracking</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Every order that has been assigned to a courier — booking status and delivery progress.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4">Invoice</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Courier</th>
                <th className="p-4">Tracking Code</th>
                <th className="p-4">Order Status</th>
                <th className="p-4">Total</th>
                <th className="p-4">Last Synced</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : !rows || rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-regantify-text-muted">
                    No orders have been assigned to a courier yet. Select a courier for an order from the Orders
                    page's Actions menu to see it here.
                  </td>
                </tr>
              ) : (
                rows.map((row) => <TrackingRow key={row.id} row={row} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
