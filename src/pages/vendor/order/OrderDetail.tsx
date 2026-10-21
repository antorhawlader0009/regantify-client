import { useState } from 'react';
import { useDashboardView } from '../../../lib/useDashboardView';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CreateOrderFromIncompleteState } from './AddOrder';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrdersAutoRefresh } from '../../../lib/useOrdersAutoRefresh';
import { CalendarClock, CalendarDays, CheckCircle2, ChevronDown, Copy, FileText, Link2, MessageCircle, Package, Phone, ReceiptText, Send, StickyNote, Truck } from 'lucide-react';
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
import { ALL_ORDER_STATUSES, OrderStatusBadge, canMoveOrderStatus, orderStatusLabel, preferredDayLabel } from './orderStatus';
import { useStatusChangeDialogs, type StatusChangeRequest } from './StatusChangeDialogs';
import { CheckHistoryModal } from './CheckHistoryModal';
import { InvoiceModal } from './InvoiceModal';
import { ResaleCard, ResaleOrderView } from './ResaleOrderView';
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
import { OrderRefundNote } from '../../../components/order/OrderRefundNote';
import { ManualPaymentCard } from '../../../components/order/ManualPaymentCard';
import { OrderRiskCard, orderAddressProblem } from '../../../components/order/OrderRiskBadge';
import { ADDRESS_PROBLEM_TEXT } from '../../../lib/addressCheck';
import { EditOrderItemsDialog, canEditOrderItems } from '../../../components/order/EditOrderItemsDialog';
import { MergeOrdersDialog, canMergeOrder } from '../../../components/order/MergeOrdersDialog';
import { MakeRegularDialog, canMakeRegular } from '../../../components/order/MakeRegularDialog';
import { SplitOrderDialog, canSplitOrder } from '../../../components/order/SplitOrderDialog';
import { AssignCard } from '../../../components/order/OrderAssign';
import { SendSmsDialog } from '../../../components/sms/SendSmsDialog';
import { OrderMessageDialog } from '../../../components/order/OrderMessageDialog';
import { CustomerDeliveryStats } from '../../../components/courier/CustomerDeliveryStats';
import { OrderCallLine } from '../../../components/lms/OrderCallLine';
import { CustomerGroupChip, CustomerTagChips } from '../customer/CustomerNoteCard';
import { OrderCloseReasonCard } from '../../../components/order/OrderCloseReasonCard';
import { OrderReturnCheckCard } from '../../../components/order/OrderReturnCheckCard';
import { OrderProfitCard } from '../../../components/order/OrderProfitCard';
import { RedxCancelDialog } from '../../../components/courier/RedxCancelDialog';
import { CarrybeeCancelDialog } from '../../../components/courier/CarrybeeCancelDialog';
import { CarrybeePlaceDialog } from '../../../components/courier/CarrybeePlaceDialog';
import { CARRYBEE_PLACE_NOT_FOUND, carrybeeCancellable } from '../../../lib/carrybeeApi';
import { RedxTrackingHistory } from '../../../components/courier/RedxTrackingHistory';
import { OrderTimeline } from '../../../components/order/OrderTimeline';
import { PosReceiptButton, PosSaleReturns } from '../../../components/pos/receipt/PosReceiptButton';
import { Dialog } from '../../../components/ui/Dialog';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { LockedBadge, upgradeToast } from '../../../components/ui/UpgradePrompt';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { OrderComments } from '../../../components/order/OrderComments';
import { AdvancedToggle } from '../../../components/ui/AdvancedToggle';
import { productInputClass } from '../../../components/product/ProductFormPieces';
import { imageThumb } from '../../../lib/imageThumb';
import { BackLink } from '../../../components/ui/BackLink';

function formatPrice(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' });
}

const COURIER_NAMES: Record<Exclude<CourierProvider, 'NONE'>, string> = { STEADFAST: 'SteadFast', PATHAO: 'Pathao', REDX: 'RedX', CARRYBEE: 'CarryBee' };
const BOOKABLE: Exclude<CourierProvider, 'NONE'>[] = ['STEADFAST', 'PATHAO', 'REDX', 'CARRYBEE'];

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
  useOrdersAutoRefresh();
  const [historyPhone, setHistoryPhone] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [bookingPathao, setBookingPathao] = useState(false);
  const [requestingReturn, setRequestingReturn] = useState(false);
  const [cancellingRedx, setCancellingRedx] = useState(false);
  const [cancellingCarrybee, setCancellingCarrybee] = useState(false);
  const [pickingCarrybeePlace, setPickingCarrybeePlace] = useState(false);
  const [showRedxHistory, setShowRedxHistory] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  // Rarely-used actions (merge, split, repeat order, team comments) stay behind "More tools".
  const [moreToolsOpen, setMoreTools] = useState(false);
  // Simple mode never shows "More tools" (SIMPLE-VIEW-plan.md Step 4).
  const { isSimple } = useDashboardView();
  const moreTools = !isSimple && moreToolsOpen;
  const [merging, setMerging] = useState(false);
  const [makingRegular, setMakingRegular] = useState(false);
  const [splitting, setSplitting] = useState(false);
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
  const canSms = useCan('sms.manage');
  const canCreate = useCan('orders.create');
  const navigate = useNavigate();
  // "Exchange": a new order for the same customer with these lines (change the size or product there),
  // noted on this order's history once it's saved (OrdersService.linkExchange).
  const startExchange = () => {
    if (!order) return;
    const state: CreateOrderFromIncompleteState = {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerPhoneAlt: order.customerPhoneAlt,
      customerEmail: order.customerEmail,
      shippingAddress: order.shippingAddress,
      shippingDistrict: order.shippingDistrict,
      shippingCity: order.shippingCity,
      staffNote: `Exchange for ${orderRef(order)}`,
      items: order.items.map((i) => ({
        productId: i.productId ?? undefined,
        variantId: i.variantId ?? undefined,
        productName: i.productName,
        productSku: i.productSku,
        productImage: i.productImage ?? undefined,
        selectedOptions: i.selectedOptions,
        listPrice: Number(i.listPrice),
        unitPrice: Number(i.unitPrice),
        quantity: i.quantity,
      })),
      exchangeForOrderId: order.id,
    };
    navigate('/vendor/orders/add', { state });
  };
  const [smsOpen, setSmsOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

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

  // "Not a duplicate" on the possible-duplicate warning.
  const notDuplicate = useMutation({
    mutationFn: () => ordersApi.dismissDuplicate(id!),
    onSuccess: () => {
      invalidateOrder();
      toast.success('Marked as not a duplicate.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update the order. Please try again.')),
  });

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
      toast.success(`Booked with ${COURIER_NAMES[(order?.courierProvider ?? 'STEADFAST') as Exclude<CourierProvider, 'NONE'>] ?? 'the courier'}.`);
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
      if (order?.courierProvider === 'CARRYBEE' && apiErrorMessage(err, '').startsWith(CARRYBEE_PLACE_NOT_FOUND)) {
        setPickingCarrybeePlace(true);
        return;
      }
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
      if (provider === 'CARRYBEE' && apiErrorMessage(err, '').startsWith(CARRYBEE_PLACE_NOT_FOUND)) {
        setPickingCarrybeePlace(true);
        return;
      }
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
    // A correction carries its own reason; any other move takes the timeline note typed below the menu.
    mutationFn: ({ status, note, correction, reasonCode }: StatusChangeRequest) =>
      ordersApi.updateStatus(id!, status, correction ? note : statusNote.trim() || undefined, correction, reasonCode),
    onSuccess: (_, { status, correction }) => {
      invalidateOrder();
      if (!correction) setStatusNote('');
      toast.success(
        correction ? `Status corrected to ${orderStatusLabel(status)}.` : status === 'PROCESSING' ? 'Order confirmed.' : `Status changed to ${orderStatusLabel(status)}.`,
      );
    },
    // The server's own reason when the flow refuses the move ("already reached Processing…").
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update the order status. Please try again.')),
  });
  // Asks before a closing step (Completed, Cancelled…); the owner's "Correct a mistake" form.
  const isOwner = useCan('owner');
  const statusDialogs = useStatusChangeDialogs({
    order: order ?? { status: 'PENDING', invoiceNumber: 0 },
    onChange: (req) => statusMutation.mutate(req),
    busy: statusMutation.isPending,
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

  // Reseller system (RESELLER-plan.md Step 11): this store's order of a product it resells is read only (the supplier ships it).
  if (order.resaleSupplierVendorId) return <ResaleOrderView order={order} history={history} />;

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
      <button type="button" onClick={() => statusMutation.mutate({ status: 'PROCESSING' })} disabled={statusMutation.isPending} className={primaryBtn}>
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
      <BackLink to="/vendor/orders" label="All orders" />

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
            Serial #{order.invoiceNumber} · placed {formatDateTime(order.createdAt)} ·{' '}
            {order.resaleSupplierVendorId
              ? 'a product you resell'
              : order.source === 'RESELLER'
                ? 'sold by a reseller'
                : order.source === 'STOREFRONT'
                  ? 'from your store'
                  : order.source === 'POS'
                    ? 'sold at the counter'
                    : 'added by hand'}
          </p>
          {order.resaleSupplierVendorId && (
            <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              The supplier ships this order with their courier, and its status follows their order. You can’t change it here; the shopper can still cancel or fix the address from their tracking page while it hasn’t left.
            </p>
          )}
          {order.source === 'RESELLER' && (
            <p className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
              A reseller sold this. Book it with your connected courier: Delivered and Returned then come from the courier by themselves. A cancel needs a reason, and the reseller is told.
            </p>
          )}
        </div>
        <AdvancedToggle open={moreTools} onToggle={() => setMoreTools((v) => !v)} label="More tools" />
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

      {/* The notes and cards between the summary strip and the columns, kept apart by one even gap. */}
      <div className="mb-4 space-y-3 empty:hidden">
      {moreTools && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line bg-neutral-50/60 px-4 py-3">
          <span className="mr-2 text-sm text-neutral-500">More tools:</span>
          {canCreate && canMakeRegular(order) && (<button type="button" onClick={() => setMakingRegular(true)} className={outlineBtn} title="Repeat this order for this customer every week or month"> <CalendarClock size={14} /> Make it regular </button>)}
          {canEdit && canEditOrderItems(order) && canCancelRefund && canMergeOrder(order) && (<button type="button" onClick={() => setMerging(true)} className={outlineBtn} title="Fold this customer's other open order into this one"> Merge order </button>)}
          {canEdit && canEditOrderItems(order) && canSplitOrder(order) && (<button type="button" onClick={() => setSplitting(true)} className={outlineBtn} title="Send what is in stock first: move some items into a new order"> Split order </button>)}
        </div>
      )}

      {/* Reseller system (Step 10): the reseller that sold this, its earning and how it was settled. */}
      {order.resale && <ResaleCard info={order.resale} />}

      {/* Why a cancelled / returned / failed order ended (Analytics > Orders groups by it). */}
      <OrderCloseReasonCard order={order} canEdit={canEdit} onChanged={invalidateOrder} />
      <OrderReturnCheckCard order={order} canEdit={canEdit} />
      {!isSimple && <OrderProfitCard orderId={order.id} />}

      {/* Medium or high risk (TellMe idea 143, OrderRiskService). */}
      <OrderRefundNote orderId={order.id} status={order.status} />
      <ManualPaymentCard order={order} canEdit={canEdit} />
      <OrderRiskCard order={order} />
      {orderAddressProblem(order) && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900">
          <span className="font-medium">Address incomplete?</span> {ADDRESS_PROBLEM_TEXT[orderAddressProblem(order)!]} Call the customer and fix it with Edit contact before you book a courier.
        </p>
      )}
      {/* Same phone and product as an earlier open order within 24 hours (OrdersService.findPossibleDuplicate). */}
      {order.possibleDuplicateOfId && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <Copy size={16} className="shrink-0 text-red-700" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-red-900">
            <span className="font-medium">Possible duplicate.</span> This customer ordered the same product again within 24 hours
            {order.possibleDuplicateOf ? (
              <>
                {' '}
                (earlier order{' '}
                <Link to={`/vendor/orders/${order.possibleDuplicateOf.id}`} className="font-medium underline underline-offset-2">
                  {orderRef(order.possibleDuplicateOf)}
                </Link>
                , {orderStatusLabel(order.possibleDuplicateOf.status)})
              </>
            ) : null}
            . Check with the customer before you ship both.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={() => notDuplicate.mutate()}
              disabled={notDuplicate.isPending}
              className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-100 disabled:opacity-60"
            >
              Not a duplicate
            </button>
          )}
        </div>
      )}

      {/* Customers > "Note & tags" on this phone plus its automatic group ("VIP · 7 orders"), so whoever calls sees it first. */}
      {(order.vendorCustomerNote || order.customerGroup) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <StickyNote size={15} className="text-red-700" aria-hidden />
            <span className="text-sm font-medium text-red-900">About this customer</span>
            <CustomerGroupChip
              group={order.customerGroup?.group}
              suffix={order.customerGroup ? `${order.customerGroup.orders} ${order.customerGroup.orders === 1 ? 'order' : 'orders'}, ৳${Math.round(order.customerGroup.spent).toLocaleString('en-US')}` : undefined}
            />
            <CustomerTagChips tags={order.vendorCustomerNote?.tags ?? []} />
          </div>
          {order.vendorCustomerNote?.note && <p className="mt-1.5 whitespace-pre-line text-sm text-regantify-text">{order.vendorCustomerNote.note}</p>}
        </div>
      )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          {order.isGift && (
            <div className="rounded-xl border-2 border-pink-300 bg-pink-50 px-4 py-3 text-sm text-pink-900">
              <p className="font-semibold">Gift: wrap it nicely</p>
              {order.giftMessage && <p className="mt-1">Message for the card: “{order.giftMessage}”</p>}
              {order.hidePricesOnInvoice && <p className="mt-1">Print the invoice without prices.</p>}
            </div>
          )}
          {order.splitFromOrderId && (
            <p className="rounded-lg border border-line bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
              This order was split from{' '}
              <Link to={`/vendor/orders/${order.splitFromOrderId}`} className="font-medium text-brand hover:underline">
                another order
              </Link>
              . The delivery charge is on that one.
            </p>
          )}
          <Card
            title="Items"
            action={
              canEdit && canEditOrderItems(order) ? (
                <span className="flex items-center gap-3">
                  <button type="button" onClick={() => setEditingItems(true)} className="text-sm font-medium text-brand hover:underline">
                    Edit items
                  </button>
                </span>
              ) : !isSimple && canCreate && order.source !== 'POS' && (order.status === 'COMPLETED' || order.status === 'RETURN') ? (
                // A size or product swap after delivery: Add Order with this customer and these lines, linked back here.
                <button type="button" onClick={startExchange} className="text-sm font-medium text-brand hover:underline">
                  Exchange
                </button>
              ) : undefined
            }
          >
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0">
                  {item.productImage ? (
                    <img src={imageThumb(item.productImage, 96)} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line bg-neutral-100 object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
                      <Package size={16} aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm text-regantify-text">
                      <span className="truncate">{item.productName}</span>
                      {item.isGift && <span className="ml-1.5 shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">Free gift</span>}
                      {item.wholesale && <span className="ml-1.5 shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">Wholesale price</span>}
                      {item.product?.visibility === 'PUBLIC' && <ViewProductOnStorefront slug={item.product.slug} />}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {item.productSku}
                      {Object.entries(item.selectedOptions).length > 0 &&
                        ` · ${Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')}`}
                    </p>
                    {item.customValues && item.customValues.length > 0 && (
                      <ul className="mt-0.5 space-y-0.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                        {item.customValues.map((v, i) => (
                          <li key={i}>
                            <span className="font-medium">{v.label}:</span> {v.value}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.preOrderDate && (
                      <p className="text-xs font-medium text-sky-800">
                        Pre-order, expected {new Date(item.preOrderDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                      </p>
                    )}
                    {/* A bundle (TellMe idea 51): what each set holds; stock was taken from these. */}
                    {item.bundleParts && item.bundleParts.length > 0 && (
                      <p className="text-xs text-neutral-600">Contains: {item.bundleParts.map((part) => `${part.quantity} × ${part.name}`).join(', ')}</p>
                    )}
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
              {Number(order.giftWrapCharge ?? 0) > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <dt>Gift wrap</dt>
                  <dd className="tabular-nums">{formatPrice(order.giftWrapCharge ?? '0')}</dd>
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

          {/* Full mode: behind "More tools" as before. Simple mode: shown only when the order already has comments. */}
          {(moreTools || (isSimple && (order.commentCount ?? 0) > 0)) && (
            <Card title="Comments">
              <OrderComments orderId={order.id} />
            </Card>
          )}
        </div>

        {/* Side column */}
        <div className="min-w-0 space-y-4">
          <AssignCard order={order} onChanged={invalidateOrder} />
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
                  <button type="button" onClick={() => setMessageOpen(true)} className={outlineBtn}>
                    <MessageCircle size={14} />
                    Message
                  </button>
                  {canSms && (
                    <button type="button" onClick={() => setSmsOpen(true)} className={outlineBtn}>
                      <Send size={14} />
                      SMS
                    </button>
                  )}
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
            {order.preferredDeliveryDate && (
              <p className="mb-2 inline-flex items-center gap-1.5 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">
                <CalendarDays size={12} aria-hidden />
                Customer wants it on {preferredDayLabel(order.preferredDeliveryDate)}
                {order.preferredSlot ? `, ${order.preferredSlot}` : ''} (a courier cannot always keep to it)
              </p>
            )}
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

            {/* CarryBee: one click with the page's defaults; when it can't place the address, the city/zone picker. */}
            {provider === 'CARRYBEE' && !booked && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => bookOneClickMutation.mutate()}
                  disabled={bookOneClickMutation.isPending || order.courierBookingStatus === 'BOOKING'}
                  className={primaryBtn}
                >
                  {bookOneClickMutation.isPending || order.courierBookingStatus === 'BOOKING'
                    ? 'Booking…'
                    : order.courierBookingStatus === 'CANCELLED'
                      ? 'Book with CarryBee again'
                      : 'Book with CarryBee'}
                </button>
                <button type="button" onClick={() => setPickingCarrybeePlace(true)} className={linkBtn()}>
                  Pick city and zone
                </button>
                {order.courierBookingStatus === 'FAILED' && order.courierBookingError && (
                  <p className="w-full text-xs text-red-600">Last attempt failed: {order.courierBookingError}</p>
                )}
                {order.courierBookingStatus === 'CANCELLED' && (
                  <p className="w-full text-xs text-red-600">{order.courierBookingError ?? 'The CarryBee parcel was cancelled. You can book this order again.'}</p>
                )}
              </div>
            )}

            {provider === 'CARRYBEE' && booked && (
              <div className="mt-4 space-y-1.5 border-t border-line pt-4">
                <p className="text-sm text-regantify-text">
                  Booked with CarryBee
                  {order.courierConsignmentId && <span className="text-neutral-500"> · Consignment {order.courierConsignmentId}</span>}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {order.courierStatus && <CourierStatusBadge provider="CARRYBEE" status={order.courierStatus} prefix="CarryBee" />}
                  <button type="button" onClick={() => refreshCourierMutation.mutate()} disabled={refreshCourierMutation.isPending} className={linkBtn()}>
                    {refreshCourierMutation.isPending ? 'Refreshing…' : 'Refresh status'}
                  </button>
                  {order.courierConsignmentId && (
                    <button type="button" onClick={() => copyTracking(order.courierConsignmentId!)} className={linkBtn()}>
                      Copy consignment ID
                    </button>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  {order.courierCodAmount != null && <>COD {formatPrice(order.courierCodAmount)}</>}
                  {order.courierDeliveryFee != null && <> · Delivery fee {formatPrice(order.courierDeliveryFee)}</>}
                  {order.courierCollectedAmount != null && <> · Collected {formatPrice(order.courierCollectedAmount)}</>}
                  {order.courierPaidAt && <> · COD paid out</>}
                </p>
                {carrybeeCancellable(order.courierStatus) && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setCancellingCarrybee(true)}
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
              onChange={(e) => e.target.value && statusDialogs.request(e.target.value as OrderStatus)}
              disabled={statusMutation.isPending}
              aria-label="Change status"
              className={productInputClass}
            >
              <option value="" disabled>
                Move this order to…
              </option>
              {/* Forward only (canMoveOrderStatus). Cancelled / Refunded need their own permission (rule-plan.md 5.3). */}
              {ALL_ORDER_STATUSES.filter((s) => canMoveOrderStatus(order.status, s, order.deliveryZone) && (canCancelRefund || (s !== 'CANCELLED' && s !== 'REFUNDED'))).map((status) => (
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
            {isOwner && order.source !== 'POS' && (
              <button type="button" onClick={statusDialogs.openCorrection} className="mt-2 text-xs font-medium text-brand hover:underline">
                Set by mistake? Correct the status
              </button>
            )}
            {statusDialogs.dialogs}
          </Card>
          )}
        </div>
      </div>

      <InvoiceModal order={showInvoice ? order : null} onOpenChange={(open) => !open && setShowInvoice(false)} />
      <EditOrderItemsDialog order={order} open={editingItems} onOpenChange={setEditingItems} />
      {merging && <MergeOrdersDialog order={order} open onOpenChange={setMerging} />}
      {makingRegular && <MakeRegularDialog order={order} open onOpenChange={setMakingRegular} />}
      {splitting && <SplitOrderDialog order={order} open onOpenChange={setSplitting} />}
      {canContact && <OrderMessageDialog order={order} open={messageOpen} onOpenChange={setMessageOpen} canSms={canSms} />}
      {canSms && <SendSmsDialog phone={order.customerPhone} open={smsOpen} onOpenChange={setSmsOpen} orderId={order.id} />}
      <SteadfastReturnDialog order={requestingReturn ? order : null} onClose={() => setRequestingReturn(false)} />
      <RedxCancelDialog order={cancellingRedx ? order : null} onClose={() => setCancellingRedx(false)} />
      <CarrybeeCancelDialog order={cancellingCarrybee ? order : null} onClose={() => setCancellingCarrybee(false)} />
      <CarrybeePlaceDialog order={pickingCarrybeePlace ? order : null} onClose={() => setPickingCarrybeePlace(false)} />
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
