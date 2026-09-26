import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { ordersApi, type OrderStatus } from '../../../lib/ordersApi';
import { toast } from '../../../lib/toast';
import { apiErrorMessage } from '../../../lib/api';
import { courierApi, openPathaoLabels } from '../../../lib/courierApi';
import { ALL_ORDER_STATUSES, OrderStatusBadge, orderStatusLabel } from './orderStatus';
import { CheckHistoryModal } from './CheckHistoryModal';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';
import { PathaoLocationPicker } from '../../../components/courier/PathaoLocationPicker';
import { PathaoBookingModal } from '../../../components/courier/PathaoBookingModal';
import { RedxLocationPicker } from '../../../components/courier/RedxLocationPicker';
import { CourierTimeline } from '../../../components/courier/CourierTimeline';
import { CourierStatusBadge } from '../../../components/courier/courierStatus';

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
                <span>{formatPrice(order.total)}</span>
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

            {/* RedX's order API needs a numeric delivery area id — a
                single tier, unlike Pathao's city/zone/area cascade. */}
            {order.courierProvider === 'REDX' && (
              <div className="mt-4 pt-4 border-t border-black/5">
                <RedxLocationPicker orderId={order.id} currentAreaId={order.redxAreaId} />
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

      <PathaoBookingModal orderId={bookingPathao ? order.id : null} onOpenChange={(open) => !open && setBookingPathao(false)} />
      <CheckHistoryModal phone={historyPhone} onOpenChange={(open) => !open && setHistoryPhone(null)} />
    </div>
  );
}
