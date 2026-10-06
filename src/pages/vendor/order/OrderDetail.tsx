import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, ChevronLeft, FileText, Link2, MessageCircle, Package, Phone, ReceiptText, Send, Truck } from 'lucide-react';
import { whatsappNumber } from '../../../lib/bdPhone';
import { advancePaid, codDue, orderRef, ordersApi, vendorOrderTotal, type CourierProvider, type Order, type OrderStatus } from '../../../lib/ordersApi';
import { toast } from '../../../lib/toast';
import { useAuthStore } from '../../../store/authStore';
import { useCan } from '../../../lib/useStaffAccess';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { apiErrorMessage } from '../../../lib/api';
import { getVendorPlanUsage } from '../../../lib/plansApi';
import {
  courierApi,
  notConnectedProvider,
  openPathaoLabels,
  redxCancellable,
  redxTrackingUrl,
  type CourierAccountProvider,
} from '../../../lib/courierApi';
import { ALL_ORDER_STATUSES, OrderStatusBadge, orderStatusLabel } from './orderStatus';
import { CheckHistoryModal } from './CheckHistoryModal';
import { InvoiceModal } from './InvoiceModal';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';
import { PathaoLocationPicker } from '../../../components/courier/PathaoLocationPicker';
import { PathaoBookingModal } from '../../../components/courier/PathaoBookingModal';
import { RedxLocationPicker } from '../../../components/courier/RedxLocationPicker';
import { CourierStatusBadge } from '../../../components/courier/courierStatus';
import { SteadfastReturnDialog, steadfastReturnable } from '../../../components/courier/SteadfastReturnDialog';
import { CourierSetupModal } from '../../../components/courier/CourierSetupModal';
import { ManualDeliveryCard } from '../../../components/courier/ManualDeliveryCard';
import { OrderTrackingCard } from '../../../components/order/OrderTrackingCard';
import { OrderAdvanceCard } from '../../../components/order/OrderAdvanceCard';
import { CustomerDeliveryStats } from '../../../components/courier/CustomerDeliveryStats';
import { OrderCallLine } from '../../../components/lms/OrderCallLine';
import { RedxCancelDialog } from '../../../components/courier/RedxCancelDialog';
import { RedxTrackingHistory } from '../../../components/courier/RedxTrackingHistory';
import { OrderTimeline } from '../../../components/order/OrderTimeline';
import { PosReceiptButton, PosSaleReturns } from '../../../components/pos/receipt/PosReceiptButton';
import { Dialog } from '../../../components/ui/Dialog';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { LockedBadge, upgradeToast } from '../../../components/ui/UpgradePrompt';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { productInputClass } from '../../../components/product/ProductFormPieces';

function formatPrice(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' });
}

const COURIER_NAMES: Record<Exclude<CourierProvider, 'NONE'>, string> = { STEADFAST: 'SteadFast', PATHAO: 'Pathao', REDX: 'RedX' };
const BOOKABLE: Exclude<CourierProvider, 'NONE'>[] = ['STEADFAST', 'PATHAO', 'REDX'];

/** A white card with a 15px title (the page's sections). */
function Card({ title, id, action, children }: { title: string; id?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-regantify-text">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function linkBtn(extra = '') {
  return `text-xs font-medium text-brand underline-offset-2 hover:underline disabled:opacity-60 ${extra}`;
}

/**
 * Delivery for a staff role without orders.courier (rule-plan.md Step 10):
 * where it goes and what the courier says, with nothing to book or change.
 */
function ReadOnlyDelivery({ order }: { order: Order }) {
  const provider = order.courierProvider;
  return (
    <Card title="Delivery" id="delivery">
      <p className="text-sm text-regantify-text">{order.shippingAddress}</p>
      <p className="mt-1 text-xs text-neutral-500">
        {[order.shippingCity && `City: ${order.shippingCity}`, order.shippingDistrict && `District: ${order.shippingDistrict}`, order.shippingZip && `ZIP: ${order.shippingZip}`]
          .filter(Boolean)
          .join(', ')}
      </p>
      <div className="mt-4 border-t border-line pt-4 text-sm">
        {provider === 'NONE' ? (
          <p className="text-neutral-600">Not sent to a courier yet.</p>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-2 text-regantify-text">
              {COURIER_NAMES[provider]}
              {order.courierStatus && <CourierStatusBadge provider={provider} status={order.courierStatus} />}
            </p>
            {(order.courierTrackingCode || order.courierConsignmentId) && (
              <p className="mt-1 text-xs text-neutral-500">Tracking: {order.courierTrackingCode ?? order.courierConsignmentId}</p>
            )}
          </>
        )}
        <p className="mt-3 text-xs text-neutral-500">Your role can’t book or change couriers.</p>
      </div>
    </Card>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [historyPhone, setHistoryPhone] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [bookingPathao, setBookingPathao] = useState(false);
  const [requestingReturn, setRequestingReturn] = useState(false);
  const [cancellingRedx, setCancellingRedx] = useState(false);
  const [showRedxHistory, setShowRedxHistory] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
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

  // What this person's role can do here (rule-plan.md Step 10); the server checks each again.
  const canEdit = useCan('orders.edit');
  const canCancelRefund = useCan('orders.cancel_refund');
  const canCourier = useCan('orders.courier');
  const canContact = useCan('customers.contact');

  // The customer's delivery record (same lookup as the Orders list); by full phone number, so it needs contact.
  const { data: deliveryStats } = useQuery({
    queryKey: ['customer-courier-stats', order ? [order.customerPhone] : []],
    queryFn: () => ordersApi.getCustomerCourierStats([order!.customerPhone]),
    enabled: Boolean(order) && canContact,
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.dataUpdateCount < 3 && Object.values(query.state.data?.byPhone ?? {}).some((s) => s.pathao?.pending || s.steadfast?.pending) ? 4000 : false,
  });

  // For "Send to courier": which couriers are connected, and whether the plan allows the paid ones.
  const { data: courierAccounts } = useQuery({ queryKey: ['courier-accounts'], queryFn: courierApi.getAccounts });
  const connected = new Set((courierAccounts ?? []).filter((a) => a.isActive).map((a) => a.provider));
  const { data: planUsage } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage });
  const paidCouriersAllowed = planUsage ? planUsage.plan.code !== 'FREE' : false;

  // Same query (and cache) as the timeline — used to tell whether a
  // SteadFast return was already requested for this parcel.
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

  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    queryClient.invalidateQueries({ queryKey: ['order-history', id] });
    queryClient.invalidateQueries({ queryKey: ['courier-events', id] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const refreshCourierMutation = useMutation({
    mutationFn: () => courierApi.refreshStatus(id!),
    onSuccess: () => {
      invalidateOrder();
      toast.success('Delivery status refreshed.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not refresh the delivery status. Please try again.')),
  });

  // "Book with SteadFast" / "Book with RedX" — one click, with the
  // vendor's default values (no popup: SteadFast needs no location or
  // weight, RedX takes the area set below or the one matched from the address).
  const bookOneClickMutation = useMutation({
    mutationFn: () => courierApi.bookOrder(id!),
    onSuccess: () => {
      invalidateOrder();
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

  // "Send to courier" for an order with no courier yet: assign it, then
  // book (SteadFast / RedX in one click; Pathao opens its booking popup).
  const sendToCourierMutation = useMutation({
    mutationFn: async (provider: Exclude<CourierProvider, 'NONE'>) => {
      await ordersApi.updateCourier(id!, provider);
      if (provider === 'PATHAO') return provider;
      await courierApi.bookOrder(id!);
      return provider;
    },
    onSuccess: (provider) => {
      invalidateOrder();
      if (provider === 'PATHAO') setBookingPathao(true);
      else toast.success(`Booked with ${COURIER_NAMES[provider]}.`);
    },
    onError: (err, provider) => {
      const notConnected = notConnectedProvider(err);
      if (notConnected) {
        setSetupPending({ provider: notConnected, retry: () => sendToCourierMutation.mutate(provider) });
        return;
      }
      invalidateOrder();
      toast.error(apiErrorMessage(err, 'Could not send this order to the courier. Please try again.'));
    },
  });

  const sendTo = (provider: Exclude<CourierProvider, 'NONE'>) => {
    if (provider !== 'STEADFAST' && !paidCouriersAllowed) {
      upgradeToast(`use ${COURIER_NAMES[provider]}`);
      return;
    }
    if (!connected.has(provider)) {
      setSetupPending({ provider, retry: () => sendToCourierMutation.mutate(provider) });
      return;
    }
    sendToCourierMutation.mutate(provider);
  };

  // RedX's view of this order before booking: area, weight, COD and price.
  const redxUnbooked = order?.courierProvider === 'REDX' && order.courierBookingStatus !== 'BOOKED';
  const { data: redxQuote, isLoading: redxQuoteLoading } = useQuery({
    queryKey: ['redx-quote', id, order?.redxAreaId],
    queryFn: () => courierApi.getRedxQuote(id!),
    enabled: Boolean(id) && redxUnbooked,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(id!, status, statusNote.trim() || undefined),
    onSuccess: (_, status) => {
      invalidateOrder();
      setStatusNote('');
      toast.success(status === 'PROCESSING' ? 'Order confirmed.' : `Status changed to ${orderStatusLabel(status)}.`);
    },
    onError: () => toast.error('Could not update the order status. Please try again.'),
  });

  // A hook, so it stays above the loading early return below (hooks must run in the same order every render).
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);

  if (isLoading || !order) {
    return (
      <div className="mx-auto max-w-6xl space-y-4" aria-busy="true" aria-label="Loading order">
        <div className="h-8 w-56 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-20 animate-pulse rounded-xl border border-line bg-white" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-xl border border-line bg-white lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-xl border border-line bg-white" />
        </div>
      </div>
    );
  }

  const provider = order.courierProvider;
  const booked = order.courierBookingStatus === 'BOOKED';
  const canSendToCourier = order.status === 'PROCESSING' && !booked && order.courierBookingStatus !== 'BOOKING';
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
  // The private link the shopper gets in the shipping SMS; the vendor can paste it into Messenger or WhatsApp.
  const trackingLink = order.trackingToken && subdomain ? `${storefrontStoreUrl(subdomain)}/t/${order.trackingToken}` : null;
  const copyTrackingLink = () =>
    trackingLink &&
    navigator.clipboard
      .writeText(trackingLink)
      .then(() => toast.success('Tracking link copied. Send it to the customer.'))
      .catch(() => toast.error('Could not copy the link.'));
  const copyTracking = (code: string) =>
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success('Tracking ID copied. Share it with the customer.'))
      .catch(() => toast.error('Could not copy. Select the ID and copy it yourself.'));

  const courierMenu = (label: string) => (
    <DropdownMenu
      widthClass="w-60"
      trigger={
        <button type="button" disabled={sendToCourierMutation.isPending} className={primaryBtn}>
          <Send size={15} />
          {sendToCourierMutation.isPending ? 'Sending…' : label}
          <ChevronDown size={14} />
        </button>
      }
    >
      {BOOKABLE.map((p) => (
        <DropdownMenuItem
          key={p}
          onSelect={() => sendTo(p)}
          icon={<Truck />}
          hint={p === 'PATHAO' ? 'Opens the booking window' : 'Books now with your default values'}
        >
          {p !== 'STEADFAST' && !paidCouriersAllowed && <LockedBadge />}
          {COURIER_NAMES[p]}
          {!connected.has(p) && <span className="text-[11px] text-neutral-500">(connect first)</span>}
        </DropdownMenuItem>
      ))}
    </DropdownMenu>
  );

  // The one next step this order is waiting for.
  let nextStep: React.ReactNode = null;
  if (order.status === 'PENDING') {
    nextStep = (
      <button type="button" onClick={() => statusMutation.mutate('PROCESSING')} disabled={statusMutation.isPending} className={primaryBtn}>
        <CheckCircle2 size={15} />
        {statusMutation.isPending ? 'Confirming…' : 'Confirm order'}
      </button>
    );
  } else if (canSendToCourier) {
    nextStep =
      provider === 'NONE' ? (
        courierMenu('Send to courier')
      ) : (
        <button
          type="button"
          onClick={() => (provider === 'PATHAO' ? setBookingPathao(true) : bookOneClickMutation.mutate())}
          disabled={bookOneClickMutation.isPending}
          className={primaryBtn}
        >
          <Send size={15} />
          {bookOneClickMutation.isPending ? 'Booking…' : `Book with ${COURIER_NAMES[provider]}`}
        </button>
      );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/vendor/orders" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
        <ChevronLeft size={16} />
        All orders
      </Link>

      {/* Header + the next step */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-regantify-text">{orderRef(order)}</h1>
            <OrderStatusBadge status={order.status} />
            {order.label && (
              <span className="rounded border border-brand-lime bg-brand-lime/40 px-1.5 py-0.5 text-xs font-medium text-brand">{order.label}</span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-neutral-500">
            Serial #{order.invoiceNumber} · placed {formatDateTime(order.createdAt)} · {order.source === 'STOREFRONT' ? 'from your store' : order.source === 'POS' ? 'sold at the counter' : 'added by hand'}
          </p>
        </div>
        {trackingLink && (
          <button type="button" onClick={copyTrackingLink} className={outlineBtn}>
            <Link2 size={15} />
            Copy tracking link
          </button>
        )}
        <button type="button" onClick={() => setShowInvoice(true)} className={outlineBtn}>
          <FileText size={15} />
          Invoice
        </button>
        {nextStep}
      </div>

      {/* Summary strip */}
      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
        {[
          { label: 'Total', value: formatPrice(vendorOrderTotal(order)), icon: ReceiptText },
          {
            label: 'Payment',
            value:
              order.paymentMethod === 'COD'
                ? advancePaid(order) > 0
                  ? `COD, ${formatPrice(String(codDue(order)))} due`
                  : 'Cash on delivery'
                : order.paymentMethod.replace(/_/g, ' ').toLowerCase(),
            icon: ReceiptText,
          },
          { label: 'Items', value: `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`, icon: Package },
          {
            label: 'Delivery',
            value: provider === 'NONE' ? 'Not sent yet' : booked ? `${COURIER_NAMES[provider]}, booked` : `${COURIER_NAMES[provider]}, not booked`,
            icon: Truck,
          },
        ].map((s) => (
          <div key={s.label} className="min-w-0 bg-white px-4 py-3">
            <p className="text-xs text-neutral-500">{s.label}</p>
            <p className="mt-0.5 truncate text-sm font-semibold capitalize text-regantify-text">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card title="Items">
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0">
                  {item.productImage ? (
                    <img src={item.productImage} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line bg-neutral-100 object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
                      <Package size={16} aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm text-regantify-text">
                      <span className="truncate">{item.productName}</span>
                      {item.product?.visibility === 'PUBLIC' && <ViewProductOnStorefront slug={item.product.slug} />}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {item.productSku}
                      {Object.entries(item.selectedOptions).length > 0 &&
                        ` · ${Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')}`}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums text-regantify-text">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between text-neutral-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-neutral-600">
                <dt>Delivery charge</dt>
                <dd className="tabular-nums">{formatPrice(order.deliveryCharge)}</dd>
              </div>
              {Number(order.vatAmount) > 0 && (
                <div className="flex justify-between text-neutral-600">
                  {/* A POS sale with VAT-inclusive prices: the VAT is inside the subtotal, not added. */}
                  <dt>{order.vatIncluded ? 'Includes VAT' : 'COD charge'}</dt>
                  <dd className="tabular-nums">{formatPrice(order.vatAmount)}</dd>
                </div>
              )}
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <dt>Discount{order.discountLabel ? `: ${order.discountLabel}` : ''}</dt>
                  <dd className="tabular-nums">−{formatPrice(order.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-regantify-text">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatPrice(vendorOrderTotal(order))}</dd>
              </div>
              {advancePaid(order) > 0 && (
                <>
                  <div className="flex justify-between text-neutral-600">
                    <dt>Paid in advance ({order.advanceMethod === 'ONLINE' ? 'online' : 'by hand'})</dt>
                    <dd className="tabular-nums">−{formatPrice(String(advancePaid(order)))}</dd>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-regantify-text">
                    <dt>Collect on delivery</dt>
                    <dd className="tabular-nums">{formatPrice(String(codDue(order)))}</dd>
                  </div>
                </>
              )}
            </dl>
          </Card>

          {/* Cash on Delivery: the delivery charge (or any part) paid before delivery. */}
          {canEdit && order.source !== 'POS' && order.paymentMethod === 'COD' && (
            <Card title="Advance" id="advance">
              <OrderAdvanceCard order={order} onChanged={invalidateOrder} />
            </Card>
          )}

          <Card title="Timeline">
            <OrderTimeline orderId={order.id} history={history} hasCourier={provider !== 'NONE' && order.courierBookingStatus !== 'NOT_BOOKED'} />
          </Card>
        </div>

        {/* Side column */}
        <div className="min-w-0 space-y-4">
          <Card title="Customer">
            <p className="text-sm font-medium text-regantify-text">{order.customerName}</p>
            <p className="text-sm text-neutral-600">{order.customerPhone}</p>
            {order.customerPhoneAlt && <p className="text-sm text-neutral-600">{order.customerPhoneAlt} (other number)</p>}
            {order.customerEmail && <p className="truncate text-sm text-neutral-600">{order.customerEmail}</p>}

            {/* Without customers.contact the number comes masked (rule-plan.md Step 5): nothing to call or look up. */}
            {canContact && (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`tel:${order.customerPhone}`} className={outlineBtn}>
                    <Phone size={14} />
                    Call
                  </a>
                  <a href={`https://wa.me/${whatsappNumber(order.customerPhone)}`} target="_blank" rel="noopener noreferrer" className={outlineBtn}>
                    <MessageCircle size={14} />
                    WhatsApp
                  </a>
                  <button type="button" onClick={() => setHistoryPhone(order.customerPhone)} className={outlineBtn}>
                    Order history
                  </button>
                </div>

                <div className="mt-3">
                  <CustomerDeliveryStats stats={deliveryStats?.byPhone[order.customerPhone]} />
                </div>
              </>
            )}
            <OrderCallLine orderId={order.id} />

            {order.customerNote && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-neutral-500">Note from the customer</p>
                <p className="rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-700">{order.customerNote}</p>
              </div>
            )}
            {order.staffNote && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-neutral-500">Staff note</p>
                <p className="rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-700">{order.staffNote}</p>
              </div>
            )}
          </Card>

          {/* A counter sale was handed over in the shop: no delivery, no courier, no tracking. */}
          {order.source === 'POS' ? (
            <Card title="Sold at the counter">
              <p className="text-sm text-regantify-text">
                {order.posCashierName ? `Rung up by ${order.posCashierName}.` : 'Rung up at the POS.'} Paid and handed over in the shop.
              </p>
              <PosReceiptButton orderId={order.id} className={`${outlineBtn} mt-3 inline-flex items-center gap-1.5`} />
              <PosSaleReturns orderId={order.id} />
            </Card>
          ) : (
          <>
          {!canCourier ? (
            <ReadOnlyDelivery order={order} />
          ) : (
          <Card title="Delivery" id="delivery">
            <p className="text-sm text-regantify-text">{order.shippingAddress}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {[order.shippingCity && `City: ${order.shippingCity}`, order.shippingDistrict && `District: ${order.shippingDistrict}`, order.shippingZip && `ZIP: ${order.shippingZip}`]
                .filter(Boolean)
                .join(' · ')}
            </p>

            {provider === 'NONE' && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-sm text-neutral-600">Not sent to a courier yet.</p>
                {order.status !== 'PROCESSING' && order.status !== 'PENDING' ? null : (
                  <div className="mt-2">{order.status === 'PENDING' ? <p className="text-xs text-neutral-500">Confirm the order first, then send it.</p> : courierMenu('Send to courier')}</div>
                )}
                <ManualDeliveryCard order={order} onChanged={invalidateOrder} />
              </div>
            )}

            {/* Pathao needs numeric city/zone/area, not the free-text address above. */}
            {provider === 'PATHAO' && (
              <div className="mt-4 space-y-4 border-t border-line pt-4">
                {booked ? (
                  <div className="space-y-1.5">
                    <p className="text-sm text-regantify-text">
                      Booked with Pathao
                      {order.courierConsignmentId && <span className="text-neutral-500"> · Consignment {order.courierConsignmentId}</span>}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {order.courierStatus && <CourierStatusBadge provider="PATHAO" status={order.courierStatus} prefix="Pathao" />}
                      <button type="button" onClick={() => refreshCourierMutation.mutate()} disabled={refreshCourierMutation.isPending} className={linkBtn()}>
                        {refreshCourierMutation.isPending ? 'Refreshing…' : 'Refresh status'}
                      </button>
                      {order.courierConsignmentId && (
                        <button type="button" onClick={() => copyTracking(order.courierConsignmentId!)} className={linkBtn()}>
                          Copy tracking ID
                        </button>
                      )}
                      <button type="button" onClick={() => openPathaoLabels([order.id])} className={linkBtn()}>
                        Print label
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {order.courierCodAmount != null && <>COD {formatPrice(order.courierCodAmount)}</>}
                      {order.courierDeliveryFee != null && <> · Delivery fee {formatPrice(order.courierDeliveryFee)}</>}
                      {order.courierCollectedAmount != null && <> · Collected {formatPrice(order.courierCollectedAmount)}</>}
                      {order.courierPaidAt && <> · COD paid out{order.courierInvoiceId ? ` (invoice ${order.courierInvoiceId})` : ''}</>}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setBookingPathao(true)} disabled={order.courierBookingStatus === 'BOOKING'} className={primaryBtn}>
                      {order.courierBookingStatus === 'BOOKING' ? 'Booking…' : 'Book with Pathao'}
                    </button>
                    {order.courierBookingStatus === 'FAILED' && order.courierBookingError && (
                      <p className="text-xs text-red-600">Last attempt failed: {order.courierBookingError}</p>
                    )}
                    {order.courierBookingStatus === 'CANCELLED' && (
                      <p className="text-xs text-red-600">{order.courierBookingError ?? 'Pathao cancelled the pickup. You can book this order again.'}</p>
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

            {provider === 'STEADFAST' && !booked && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => bookOneClickMutation.mutate()}
                  disabled={bookOneClickMutation.isPending || order.courierBookingStatus === 'BOOKING'}
                  className={primaryBtn}
                >
                  {bookOneClickMutation.isPending || order.courierBookingStatus === 'BOOKING' ? 'Booking…' : 'Book with SteadFast'}
                </button>
                {order.courierBookingStatus === 'FAILED' && order.courierBookingError && (
                  <p className="text-xs text-red-600">Last attempt failed: {order.courierBookingError}</p>
                )}
              </div>
            )}

            {/* SteadFast needs no location fields. Once booked: the parcel's state plus "Request return". */}
            {provider === 'STEADFAST' && booked && (
              <div className="mt-4 space-y-1.5 border-t border-line pt-4">
                <p className="text-sm text-regantify-text">
                  Booked with SteadFast
                  {order.courierTrackingCode && <span className="text-neutral-500"> · Tracking {order.courierTrackingCode}</span>}
                </p>
                {order.courierConsignmentId && <p className="text-xs text-neutral-500">Consignment {order.courierConsignmentId}</p>}
                <div className="flex flex-wrap items-center gap-3">
                  {order.courierStatus && <CourierStatusBadge provider="STEADFAST" status={order.courierStatus} prefix="SteadFast" />}
                  <button type="button" onClick={() => refreshCourierMutation.mutate()} disabled={refreshCourierMutation.isPending} className={linkBtn()}>
                    {refreshCourierMutation.isPending ? 'Refreshing…' : 'Refresh status'}
                  </button>
                  {order.courierTrackingCode && (
                    <>
                      <button type="button" onClick={() => copyTracking(order.courierTrackingCode!)} className={linkBtn()}>
                        Copy tracking ID
                      </button>
                      {order.courierTrackingUrl && (
                        <a href={order.courierTrackingUrl} target="_blank" rel="noreferrer" className={linkBtn()}>
                          Tracking page
                        </a>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  {order.courierCodAmount != null && <>COD {formatPrice(order.courierCodAmount)}</>}
                  {order.courierDeliveryFee != null && <> · Delivery fee {formatPrice(order.courierDeliveryFee)}</>}
                  {order.courierCollectedAmount != null && <> · Collected {formatPrice(order.courierCollectedAmount)}</>}
                  {order.courierPaidAt && <> · COD paid out</>}
                </p>
                <div className="pt-1">
                  {returnRequestedAt ? (
                    <p className="text-xs text-amber-700">
                      Return requested on {formatDateTime(returnRequestedAt)}. SteadFast will update the status as it comes back.
                    </p>
                  ) : steadfastReturnable(order.courierStatus) ? (
                    <button
                      type="button"
                      onClick={() => setRequestingReturn(true)}
                      className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Request return
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* RedX needs a numeric delivery area. Before booking: what RedX would get and charge. */}
            {provider === 'REDX' && !booked && (
              <div className="mt-4 space-y-4 border-t border-line pt-4">
                <div className="space-y-2">
                  {redxQuoteLoading ? (
                    <p className="text-xs text-neutral-500">Asking RedX…</p>
                  ) : redxQuote ? (
                    <div className="space-y-1 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
                      <p>
                        Area:{' '}
                        {redxQuote.area ? (
                          <span className="text-regantify-text">
                            {redxQuote.area.name}
                            {redxQuote.area.detected && ' (found from the address)'}
                          </span>
                        ) : (
                          <span className="text-red-600">{redxQuote.areaError ?? 'Not set'}</span>
                        )}
                      </p>
                      <p>
                        Weight{' '}
                        <span className="text-regantify-text">
                          {(redxQuote.weightGrams / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} kg
                        </span>{' '}
                        · COD <span className="text-regantify-text">{formatPrice(String(redxQuote.codAmount))}</span>
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
                        <p className="text-red-600">No pickup store chosen. Set one in Courier Integration › RedX.</p>
                      )}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => bookOneClickMutation.mutate()}
                      disabled={bookOneClickMutation.isPending || order.courierBookingStatus === 'BOOKING'}
                      className={primaryBtn}
                    >
                      {bookOneClickMutation.isPending || order.courierBookingStatus === 'BOOKING'
                        ? 'Booking…'
                        : order.courierBookingStatus === 'CANCELLED'
                          ? 'Book with RedX again'
                          : 'Book with RedX'}
                    </button>
                    {order.courierBookingStatus === 'FAILED' && order.courierBookingError && (
                      <p className="text-xs text-red-600">Last attempt failed: {order.courierBookingError}</p>
                    )}
                    {order.courierBookingStatus === 'CANCELLED' && (
                      <p className="text-xs text-red-600">{order.courierBookingError ?? 'The RedX parcel was cancelled. You can book this order again.'}</p>
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

            {provider === 'REDX' && booked && (
              <div className="mt-4 space-y-1.5 border-t border-line pt-4">
                <p className="text-sm text-regantify-text">
                  Booked with RedX
                  {order.courierConsignmentId && <span className="text-neutral-500"> · Tracking {order.courierConsignmentId}</span>}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {order.courierStatus && <CourierStatusBadge provider="REDX" status={order.courierStatus} prefix="RedX" />}
                  <button type="button" onClick={() => refreshCourierMutation.mutate()} disabled={refreshCourierMutation.isPending} className={linkBtn()}>
                    {refreshCourierMutation.isPending ? 'Refreshing…' : 'Refresh status'}
                  </button>
                  {order.courierConsignmentId && (
                    <>
                      <button type="button" onClick={() => copyTracking(order.courierConsignmentId!)} className={linkBtn()}>
                        Copy tracking ID
                      </button>
                      <a href={redxTrackingUrl(order.courierConsignmentId)} target="_blank" rel="noreferrer" className={linkBtn()}>
                        Tracking page
                      </a>
                      <button type="button" onClick={() => setShowRedxHistory(true)} className={linkBtn()}>
                        RedX history
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  {order.courierCodAmount != null && <>COD {formatPrice(order.courierCodAmount)}</>}
                  {order.courierDeliveryFee != null && <> · Delivery fee {formatPrice(order.courierDeliveryFee)}</>}
                  {order.courierPaidAt && <> · COD paid out</>}
                </p>
                {redxCancellable(order.courierStatus) && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setCancellingRedx(true)}
                      className="inline-flex h-8 items-center rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Cancel parcel
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>
          )}

          {canEdit && (
            <Card title="Customer tracking" id="tracking">
              <OrderTrackingCard orderId={order.id} onLinkChanged={invalidateOrder} />
            </Card>
          )}
          </>
          )}

          {canEdit && (
          <Card title="Change status">
            <select
              value=""
              onChange={(e) => e.target.value && statusMutation.mutate(e.target.value as OrderStatus)}
              disabled={statusMutation.isPending}
              aria-label="Change status"
              className={productInputClass}
            >
              <option value="" disabled>
                Move this order to…
              </option>
              {/* Cancelled / Refunded need their own permission (rule-plan.md 5.3). */}
              {ALL_ORDER_STATUSES.filter((s) => s !== order.status && (canCancelRefund || (s !== 'CANCELLED' && s !== 'REFUNDED'))).map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabel(status)}
                </option>
              ))}
            </select>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Note for the timeline (optional), e.g. Confirmed on the phone"
              rows={2}
              className={`${productInputClass} mt-2 resize-y`}
            />
            <p className="mt-1.5 text-xs text-neutral-500">Write the note first; it’s saved with the next status change.</p>
          </Card>
          )}
        </div>
      </div>

      <InvoiceModal order={showInvoice ? order : null} onOpenChange={(open) => !open && setShowInvoice(false)} />
      <SteadfastReturnDialog order={requestingReturn ? order : null} onClose={() => setRequestingReturn(false)} />
      <RedxCancelDialog order={cancellingRedx ? order : null} onClose={() => setCancellingRedx(false)} />
      <Dialog open={showRedxHistory} onOpenChange={setShowRedxHistory} title={`RedX history · ${orderRef(order)}`} maxWidth="max-w-md">
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
