import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { ordersApi, vendorOrderTotal, type OrderStatus } from '../../../lib/ordersApi';
import { toast } from '../../../lib/toast';
import { apiErrorMessage } from '../../../lib/api';
import { courierApi, notConnectedProvider, openPathaoLabels, redxCancellable, redxTrackingUrl, type CourierAccountProvider } from '../../../lib/courierApi';
import { ALL_ORDER_STATUSES, OrderStatusBadge, orderStatusLabel } from './orderStatus';
import { CheckHistoryModal } from './CheckHistoryModal';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';
import { PathaoLocationPicker } from '../../../components/courier/PathaoLocationPicker';
import { PathaoBookingModal } from '../../../components/courier/PathaoBookingModal';
import { RedxLocationPicker } from '../../../components/courier/RedxLocationPicker';
import { CourierTimeline } from '../../../components/courier/CourierTimeline';
import { CourierStatusBadge } from '../../../components/courier/courierStatus';
import { SteadfastReturnDialog, steadfastReturnable } from '../../../components/courier/SteadfastReturnDialog';
import { CourierSetupModal } from '../../../components/courier/CourierSetupModal';
import { OrderCallLine } from '../../../components/lms/OrderCallLine';
import { RedxCancelDialog } from '../../../components/courier/RedxCancelDialog';
import { RedxTrackingHistory } from '../../../components/courier/RedxTrackingHistory';
import { Dialog } from '../../../components/ui/Dialog';

function formatPrice(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [historyPhone, setHistoryPhone] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [bookingPathao, setBookingPathao] = useState(false);
  const [requestingReturn, setRequestingReturn] = useState(false);
  const [cancellingRedx, setCancellingRedx] = useState(false);
  const [showRedxHistory, setShowRedxHistory] = useState(false);
  // "Not connected → setup popup" (COURIER-PLAN.md §5.2): the provider to
  // connect, and the booking to retry once it is. null closes the popup.
  const [setupPending, setSetupPending] = useState<{ provider: CourierAccountProvider; retry: () => void } | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.findOne(id!),
    enabled: Boolean(id),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['order-history', id],
    queryFn: () => ordersApi.getHistory(id!),
    enabled: Boolean(id),
  });

  // Same query (and cache) as the Courier Timeline below — used to tell
  // whether a SteadFast return was already requested for this parcel.
  const steadfastBooked = order?.courierProvider === 'STEADFAST' && order.courierBookingStatus === 'BOOKED';
  const { data: courierEvents } = useQuery({
    queryKey: ['courier-events', id],
    queryFn: () => courierApi.getOrderCourierEvents(id!),
    enabled: Boolean(id) && steadfastBooked,
  });
  const returnRequestedAt = steadfastBooked
    ? courierEvents?.find(
        (e) =>
          e.provider === 'STEADFAST' &&
          e.event === 'return_requested' &&
          (!order?.courierBookedAt || new Date(e.createdAt) >= new Date(order.courierBookedAt)),
      )?.createdAt
    : undefined;

  const refreshCourierMutation = useMutation({
    mutationFn: () => courierApi.refreshStatus(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['order-history', id] });
      queryClient.invalidateQueries({ queryKey: ['courier-events', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Delivery status refreshed.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not refresh the delivery status. Please try again.')),
  });

  // "Book with SteadFast" / "Book with RedX" — one click, with the
  // vendor's Default Values (no booking popup: SteadFast needs no
  // location or weight, RedX takes the area set below or the one matched
  // from the address).
  const bookOneClickMutation = useMutation({
    mutationFn: () => courierApi.bookOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['order-history', id] });
      queryClient.invalidateQueries({ queryKey: ['courier-events', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['steadfast-parcels'] });
      queryClient.invalidateQueries({ queryKey: ['redx-parcels'] });
      toast.success(order?.courierProvider === 'REDX' ? 'Booked with RedX.' : 'Booked with SteadFast.');
    },
    onError: (err) => {
      const provider = notConnectedProvider(err);
      if (provider) {
        setSetupPending({ provider, retry: () => bookOneClickMutation.mutate() });
        return;
      }
      // Refresh so the FAILED state + its reason show under the button.
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['courier-events', id] });
      toast.error(apiErrorMessage(err, 'Could not book this order with the courier. Please try again.'));
    },
  });

  // RedX's view of this order before booking: the delivery area it would
  // go to, weight, COD and RedX's own price for it.
  const redxUnbooked = order?.courierProvider === 'REDX' && order.courierBookingStatus !== 'BOOKED';
  const { data: redxQuote, isLoading: redxQuoteLoading } = useQuery({
    queryKey: ['redx-quote', id, order?.redxAreaId],
    queryFn: () => courierApi.getRedxQuote(id!),
    enabled: Boolean(id) && redxUnbooked,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(id!, status, statusNote.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['order-history', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setStatusNote('');
      toast.success('Order status updated.');
    },
    onError: () => toast.error('Could not update the order status. Please try again.'),
  });

  if (isLoading || !order) {
    return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  }

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => navigate('/vendor/orders')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Orders
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">ORDER-{order.invoiceNumber}</h1>
        <OrderStatusBadge status={order.status} />
        <span className="text-sm text-regantify-text-muted">{formatDateTime(order.createdAt)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="text-base font-semibold text-regantify-text mb-4">Items</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 pb-3 border-b border-black/5 last:border-0 last:pb-0">
                  {item.productImage ? (
                    <img src={item.productImage} alt="" className="w-12 h-12 rounded-lg object-cover bg-regantify-content" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-regantify-content" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-regantify-text flex items-center gap-1.5">
                      {item.productName}
                      {item.product?.visibility === 'PUBLIC' && <ViewProductOnStorefront slug={item.product.slug} />}
                    </p>
                    <p className="text-xs text-regantify-text-muted">
                      {item.productSku}
                      {Object.entries(item.selectedOptions).length > 0 &&
                        ` · ${Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')}`}
                    </p>
                    <p className="text-xs text-regantify-text-muted">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-regantify-text">{formatPrice(item.lineTotal)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-black/5 space-y-1.5 text-sm">
              <div className="flex justify-between text-regantify-text-muted">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-regantify-text-muted">
                <span>Delivery charge</span>
                <span>{formatPrice(order.deliveryCharge)}</span>
              </div>
              {Number(order.vatAmount) > 0 && (
                <div className="flex justify-between text-regantify-text-muted">
                  <span>COD Charge</span>
                  <span>{formatPrice(order.vatAmount)}</span>
                </div>
              )}
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-regantify-text-muted">
                  <span>Discount{order.discountLabel ? ` — ${order.discountLabel}` : ''}</span>
                  <span>−{formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-regantify-text pt-1.5 border-t border-black/5">
                <span>Total</span>
                <span>{formatPrice(vendorOrderTotal(order))}</span>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="text-base font-semibold text-regantify-text mb-4">Status History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-regantify-text-muted">No history yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-regantify-cta mt-1.5 shrink-0" />
                    <div>
                      <p className="text-regantify-text">
                        {entry.fromStatus ? `${orderStatusLabel(entry.fromStatus)} → ` : ''}
                        {orderStatusLabel(entry.toStatus)}
                        {entry.changedBy ? ` · ${entry.changedBy}` : ''}
                      </p>
                      {entry.note && <p className="text-regantify-text-muted text-xs mt-0.5">{entry.note}</p>}
                      <p className="text-regantify-text-muted text-xs mt-0.5">{formatDateTime(entry.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="text-base font-semibold text-regantify-text mb-4">Customer</h2>
            <p className="text-sm text-regantify-text">{order.customerName}</p>
            <p className="text-sm text-regantify-text-muted">{order.customerPhone}</p>
            {order.customerPhoneAlt && <p className="text-sm text-regantify-text-muted">{order.customerPhoneAlt}</p>}
            {order.customerEmail && <p className="text-sm text-regantify-text-muted">{order.customerEmail}</p>}
            <button
              onClick={() => setHistoryPhone(order.customerPhone)}
              className="mt-2 text-xs px-2.5 py-1 rounded-lg border border-black/10 text-regantify-text-muted hover:bg-regantify-content"
            >
              Check History
            </button>
            <OrderCallLine orderId={order.id} />
            {order.customerNote && (
              <p className="mt-3 text-xs text-regantify-text-muted bg-regantify-content rounded-lg p-2.5">
                {order.customerNote}
              </p>
            )}
            {order.staffNote && (
              <div className="mt-3">
                <p className="text-xs font-medium text-regantify-text-muted mb-1">Staff Note</p>
                <p className="text-xs text-regantify-text-muted bg-regantify-content rounded-lg p-2.5">{order.staffNote}</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="text-base font-semibold text-regantify-text mb-4">Shipping</h2>
            <p className="text-sm text-regantify-text">{order.shippingAddress}</p>
            {order.shippingCity && <p className="text-xs text-regantify-text-muted mt-1">City: {order.shippingCity}</p>}
            {order.shippingDistrict && (
              <p className="text-xs text-regantify-text-muted">District: {order.shippingDistrict}</p>
            )}
            {order.shippingZip && <p className="text-xs text-regantify-text-muted">ZIP: {order.shippingZip}</p>}

            {/* Pathao's order API needs numeric city/zone/area, not the
                free-text fields above — only relevant once this order is
                assigned to Pathao (see COURIER-PLAN.md §3.2/§7 Phase 2). */}
            {order.courierProvider === 'PATHAO' && (
              <div className="mt-4 pt-4 border-t border-black/5 space-y-4">
                {/* Booking state + "Book with Pathao" (opens the booking
                    popup — pathao-plan.md Step 4). Hidden once booked. */}
                {order.courierBookingStatus === 'BOOKED' ? (
                  <div className="space-y-1.5">
                    <p className="text-sm text-regantify-text">
                      Booked with Pathao
                      {order.courierConsignmentId && (
                        <span className="text-regantify-text-muted"> · Consignment {order.courierConsignmentId}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {order.courierStatus && <CourierStatusBadge provider="PATHAO" status={order.courierStatus} prefix="Pathao" />}
                      <button
                        type="button"
                        onClick={() => refreshCourierMutation.mutate()}
                        disabled={refreshCourierMutation.isPending}
                        className="text-xs underline text-regantify-text-muted hover:text-regantify-text disabled:opacity-60"
                      >
                        {refreshCourierMutation.isPending ? 'Refreshing…' : 'Refresh status'}
                      </button>
                      {order.courierConsignmentId && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(order.courierConsignmentId!)
                              .then(() => toast.success('Tracking ID copied — share it with the customer.'))
                              .catch(() => toast.error('Could not copy. Select the ID and copy it yourself.'));
                          }}
                          className="text-xs underline text-regantify-text-muted hover:text-regantify-text"
                        >
                          Copy tracking ID
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openPathaoLabels([order.id])}
                        className="text-xs underline text-regantify-text-muted hover:text-regantify-text"
                      >
                        Print label
                      </button>
                    </div>
                    <p className="text-xs text-regantify-text-muted">
                      {order.courierCodAmount != null && <>COD {formatPrice(order.courierCodAmount)}</>}
                      {order.courierDeliveryFee != null && <> · Delivery fee {formatPrice(order.courierDeliveryFee)}</>}
                      {order.courierCollectedAmount != null && <> · Collected {formatPrice(order.courierCollectedAmount)}</>}
                      {order.courierPaidAt && <> · COD paid out{order.courierInvoiceId ? ` (invoice ${order.courierInvoiceId})` : ''}</>}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBookingPathao(true)}
                      disabled={order.courierBookingStatus === 'BOOKING'}
                      className="px-3 py-1.5 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-xs font-medium disabled:opacity-60"
                    >
                      {order.courierBookingStatus === 'BOOKING' ? 'Booking…' : 'Book with Pathao'}
                    </button>
                    {order.courierBookingStatus === 'FAILED' && order.courierBookingError && (
                      <p className="text-xs text-red-500">Last attempt failed: {order.courierBookingError}</p>
                    )}
                    {order.courierBookingStatus === 'CANCELLED' && (
                      <p className="text-xs text-red-500">
                        {order.courierBookingError ?? 'Pathao cancelled the pickup. You can book this order again.'}
                      </p>
                    )}
                  </div>
                )}
                <PathaoLocationPicker
                  orderId={order.id}
                  currentCityId={order.pathaoCityId}
                  currentZoneId={order.pathaoZoneId}
                  currentAreaId={order.pathaoAreaId}
                  shippingAddress={order.shippingAddress}
                  shippingCity={order.shippingCity}
                  shippingDistrict={order.shippingDistrict}
                />
              </div>
            )}

            {order.courierProvider === 'STEADFAST' && order.courierBookingStatus !== 'BOOKED' && (
              <div className="mt-4 pt-4 border-t border-black/5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => bookOneClickMutation.mutate()}
                  disabled={bookOneClickMutation.isPending || order.courierBookingStatus === 'BOOKING'}
                  className="px-3 py-1.5 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-xs font-medium disabled:opacity-60"
                >
                  {bookOneClickMutation.isPending || order.courierBookingStatus === 'BOOKING' ? 'Booking…' : 'Book with SteadFast'}
                </button>
                {order.courierBookingStatus === 'FAILED' && order.courierBookingError && (
                  <p className="text-xs text-red-500">Last attempt failed: {order.courierBookingError}</p>
                )}
              </div>
            )}

            {/* SteadFast needs no location fields — once booked, this is
                the parcel's state plus "Request return" (bring it back
                before it's delivered). */}
            {order.courierProvider === 'STEADFAST' && order.courierBookingStatus === 'BOOKED' && (
              <div className="mt-4 pt-4 border-t border-black/5 space-y-1.5">
                <p className="text-sm text-regantify-text">
                  Booked with SteadFast
                  {order.courierTrackingCode && <span className="text-regantify-text-muted"> · Tracking {order.courierTrackingCode}</span>}
                </p>
                {order.courierConsignmentId && (
                  <p className="text-xs text-regantify-text-muted">Consignment {order.courierConsignmentId}</p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {order.courierStatus && <CourierStatusBadge provider="STEADFAST" status={order.courierStatus} prefix="SteadFast" />}
                  <button
                    type="button"
                    onClick={() => refreshCourierMutation.mutate()}
                    disabled={refreshCourierMutation.isPending}
                    className="text-xs underline text-regantify-text-muted hover:text-regantify-text disabled:opacity-60"
                  >
                    {refreshCourierMutation.isPending ? 'Refreshing…' : 'Refresh status'}
                  </button>
                  {order.courierTrackingCode && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(order.courierTrackingCode!)
                            .then(() => toast.success('Tracking ID copied — share it with the customer.'))
                            .catch(() => toast.error('Could not copy. Select the ID and copy it yourself.'));
                        }}
                        className="text-xs underline text-regantify-text-muted hover:text-regantify-text"
                      >
                        Copy tracking ID
                      </button>
                      {order.courierTrackingUrl && (
                        <a
                          href={order.courierTrackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline text-regantify-text-muted hover:text-regantify-text"
                        >
                          Tracking page
                        </a>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-regantify-text-muted">
                  {order.courierCodAmount != null && <>COD {formatPrice(order.courierCodAmount)}</>}
                  {order.courierDeliveryFee != null && <> · Delivery fee {formatPrice(order.courierDeliveryFee)}</>}
                  {order.courierCollectedAmount != null && <> · Collected {formatPrice(order.courierCollectedAmount)}</>}
                  {order.courierPaidAt && <> · COD paid out</>}
                </p>
                <div className="pt-1">
                  {returnRequestedAt ? (
                    <p className="text-xs text-amber-700">
                      Return requested on {formatDateTime(returnRequestedAt)} — SteadFast will update the status as it comes back.
                    </p>
                  ) : steadfastReturnable(order.courierStatus) ? (
                    <button
                      type="button"
                      onClick={() => setRequestingReturn(true)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-medium"
                    >
                      Request return
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* RedX needs a numeric delivery area — a single tier, unlike
                Pathao's city/zone/area cascade. Before booking: what RedX
                would get and charge, "Book with RedX" and the area picker. */}
            {order.courierProvider === 'REDX' && order.courierBookingStatus !== 'BOOKED' && (
              <div className="mt-4 pt-4 border-t border-black/5 space-y-4">
                <div className="space-y-2">
                  {redxQuoteLoading ? (
                    <p className="text-xs text-regantify-text-muted">Asking RedX…</p>
                  ) : redxQuote ? (
                    <div className="rounded-xl bg-regantify-content p-3 text-xs text-regantify-text-muted space-y-1">
                      <p>
                        Area:{' '}
                        {redxQuote.area ? (
                          <span className="text-regantify-text">
                            {redxQuote.area.name}
                            {redxQuote.area.detected && ' (found from the address)'}
                          </span>
                        ) : (
                          <span className="text-red-500">{redxQuote.areaError ?? 'Not set'}</span>
                        )}
                      </p>
                      <p>
                        Weight <span className="text-regantify-text">{(redxQuote.weightGrams / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} kg</span> · COD{' '}
                        <span className="text-regantify-text">{formatPrice(String(redxQuote.codAmount))}</span>
                      </p>
                      {redxQuote.charge ? (
                        <p>
                          RedX charge <span className="text-regantify-text">{formatPrice(String(redxQuote.charge.deliveryCharge))}</span>
                          {redxQuote.charge.codCharge > 0 && <> + COD fee {formatPrice(String(redxQuote.charge.codCharge))}</>}
                        </p>
                      ) : (
                        redxQuote.chargeError && <p>{redxQuote.chargeError}</p>
                      )}
                      {redxQuote.pickupStore ? (
                        <p>Pickup from {redxQuote.pickupStore.name ?? `store ${redxQuote.pickupStore.id}`}</p>
                      ) : (
                        <p className="text-red-500">No pickup store chosen — set one in Courier Integration › RedX.</p>
                      )}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => bookOneClickMutation.mutate()}
                      disabled={bookOneClickMutation.isPending || order.courierBookingStatus === 'BOOKING'}
                      className="px-3 py-1.5 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-xs font-medium disabled:opacity-60"
                    >
                      {bookOneClickMutation.isPending || order.courierBookingStatus === 'BOOKING'
                        ? 'Booking…'
                        : order.courierBookingStatus === 'CANCELLED'
                          ? 'Book with RedX again'
                          : 'Book with RedX'}
                    </button>
                    {order.courierBookingStatus === 'FAILED' && order.courierBookingError && (
                      <p className="text-xs text-red-500">Last attempt failed: {order.courierBookingError}</p>
                    )}
                    {order.courierBookingStatus === 'CANCELLED' && (
                      <p className="text-xs text-red-500">{order.courierBookingError ?? 'The RedX parcel was cancelled. You can book this order again.'}</p>
                    )}
                  </div>
                </div>
                <RedxLocationPicker
                  orderId={order.id}
                  currentAreaId={order.redxAreaId}
                  shippingAddress={order.shippingAddress}
                  shippingCity={order.shippingCity}
                  shippingDistrict={order.shippingDistrict}
                  shippingZip={order.shippingZip}
                />
              </div>
            )}

            {order.courierProvider === 'REDX' && order.courierBookingStatus === 'BOOKED' && (
              <div className="mt-4 pt-4 border-t border-black/5 space-y-1.5">
                <p className="text-sm text-regantify-text">
                  Booked with RedX
                  {order.courierConsignmentId && <span className="text-regantify-text-muted"> · Tracking {order.courierConsignmentId}</span>}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {order.courierStatus && <CourierStatusBadge provider="REDX" status={order.courierStatus} prefix="RedX" />}
                  <button
                    type="button"
                    onClick={() => refreshCourierMutation.mutate()}
                    disabled={refreshCourierMutation.isPending}
                    className="text-xs underline text-regantify-text-muted hover:text-regantify-text disabled:opacity-60"
                  >
                    {refreshCourierMutation.isPending ? 'Refreshing…' : 'Refresh status'}
                  </button>
                  {order.courierConsignmentId && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(order.courierConsignmentId!)
                            .then(() => toast.success('Tracking ID copied — share it with the customer.'))
                            .catch(() => toast.error('Could not copy. Select the ID and copy it yourself.'));
                        }}
                        className="text-xs underline text-regantify-text-muted hover:text-regantify-text"
                      >
                        Copy tracking ID
                      </button>
                      <a
                        href={redxTrackingUrl(order.courierConsignmentId)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-regantify-text-muted hover:text-regantify-text"
                      >
                        Tracking page
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowRedxHistory(true)}
                        className="text-xs underline text-regantify-text-muted hover:text-regantify-text"
                      >
                        RedX history
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-regantify-text-muted">
                  {order.courierCodAmount != null && <>COD {formatPrice(order.courierCodAmount)}</>}
                  {order.courierDeliveryFee != null && <> · Delivery fee {formatPrice(order.courierDeliveryFee)}</>}
                  {order.courierPaidAt && <> · COD paid out</>}
                </p>
                {redxCancellable(order.courierStatus) && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setCancellingRedx(true)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-medium"
                    >
                      Cancel parcel
                    </button>
                  </div>
                )}
              </div>
            )}

            {order.courierProvider !== 'NONE' && order.courierBookingStatus !== 'NOT_BOOKED' && (
              <div className="mt-4 pt-4 border-t border-black/5">
                <CourierTimeline orderId={order.id} />
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="text-base font-semibold text-regantify-text mb-3">Update Status</h2>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Optional note (e.g. Confirmed by Bayazid)"
              rows={2}
              className="w-full mb-3 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm resize-y focus:outline-none"
            />
            <select
              value=""
              onChange={(e) => e.target.value && statusMutation.mutate(e.target.value as OrderStatus)}
              disabled={statusMutation.isPending}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
            >
              <option value="" disabled>
                Change status to…
              </option>
              {ALL_ORDER_STATUSES.filter((s) => s !== order.status).map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabel(status)}
                </option>
              ))}
            </select>
          </section>
        </div>
      </div>

      <SteadfastReturnDialog order={requestingReturn ? order : null} onClose={() => setRequestingReturn(false)} />
      <RedxCancelDialog order={cancellingRedx ? order : null} onClose={() => setCancellingRedx(false)} />
      <Dialog open={showRedxHistory} onOpenChange={setShowRedxHistory} title={`RedX history · ORDER-${order.invoiceNumber}`} maxWidth="max-w-md">
        <div className="p-6 pt-4">{showRedxHistory && <RedxTrackingHistory orderId={order.id} />}</div>
      </Dialog>
      <CourierSetupModal
        provider={setupPending?.provider ?? null}
        onOpenChange={(open) => !open && setSetupPending(null)}
        onConnected={() => {
          const retry = setupPending?.retry;
          setSetupPending(null);
          retry?.();
        }}
      />
      <PathaoBookingModal orderId={bookingPathao ? order.id : null} onOpenChange={(open) => !open && setBookingPathao(false)} />
      <CheckHistoryModal phone={historyPhone} onOpenChange={(open) => !open && setHistoryPhone(null)} />
    </div>
  );
}
