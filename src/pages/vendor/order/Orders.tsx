import { useFeature } from '../../../lib/features';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrdersAutoRefresh } from '../../../lib/useOrdersAutoRefresh';
import { AddressCheckMark, OrderRiskBadge } from '../../../components/order/OrderRiskBadge';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Copy,
  CalendarClock,
  Download,
  HandCoins,
  ShieldAlert,
  ExternalLink,
  FileText,
  History,
  MoreVertical,
  ListChecks,
  Package,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Send,
  Settings2,
  Tag,
  Trash2,
  TrendingDown,
  Truck,
  Upload,
  Undo2,
  User,
  Wallet,
  X,
  XCircle,
  CalendarDays,
} from 'lucide-react';
import { orderRef, ordersApi, paymentMethodLabel, vendorOrderTotal, type Order, type OrderStatus, type CourierProvider, type ListOrdersParams, type OrderViewFilters } from '../../../lib/ordersApi';
import { lmsApi } from '../../../lib/lmsApi';
import { useCan } from '../../../lib/useStaffAccess';
import { getVendorPlanUsage } from '../../../lib/plansApi';
import {
  courierApi,
  notConnectedProvider,
  openPathaoLabels,
  redxCancellable,
  redxTrackingUrl,
  type BulkCourierProvider,
  type CourierAccountProvider,
} from '../../../lib/courierApi';
import { apiErrorMessage } from '../../../lib/api';
import { LockedBadge, UsageLine, upgradeToast } from '../../../components/ui/UpgradePrompt';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub } from '../../../components/ui/DropdownMenu';
import { Dialog } from '../../../components/ui/Dialog';
import { AdvancedToggle } from '../../../components/ui/AdvancedToggle';
import { CourierTimeline } from '../../../components/courier/CourierTimeline';
import { SteadfastReturnDialog, steadfastReturnable } from '../../../components/courier/SteadfastReturnDialog';
import { RedxCancelDialog } from '../../../components/courier/RedxCancelDialog';
import { CarrybeeCancelDialog } from '../../../components/courier/CarrybeeCancelDialog';
import { CarrybeePlaceDialog } from '../../../components/courier/CarrybeePlaceDialog';
import { CARRYBEE_PLACE_NOT_FOUND, carrybeeCancellable } from '../../../lib/carrybeeApi';
import { CourierSetupModal } from '../../../components/courier/CourierSetupModal';
import { PathaoBookingModal } from '../../../components/courier/PathaoBookingModal';
import { PathaoBulkBookDialog } from '../../../components/courier/PathaoBulkBookDialog';
import { CustomerDeliveryStats } from '../../../components/courier/CustomerDeliveryStats';
import type { PhoneCourierStats } from '../../../lib/ordersApi';
import { toast } from '../../../lib/toast';
import { ALL_ORDER_STATUSES, DEFAULT_TABS, OrderStatusBadge, canMoveOrderStatus, orderStatusLabel, preferredDayLabel } from './orderStatus';
import { CustomizeTabsModal } from './CustomizeTabsModal';
import { useStatusChangeDialogs, type StatusChangeRequest } from './StatusChangeDialogs';
import AbandonedCart from './AbandonedCart';
import { CheckHistoryModal } from './CheckHistoryModal';
import { ChangeLabelModal } from './ChangeLabelModal';
import { InvoiceModal } from './InvoiceModal';
import { DateRangeFilter } from './DateRangeFilter';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';
import { SavedViewsBar } from '../../../components/order/SavedViewsBar';
import { SearchBox, TableFooter, outlineBtn, td, th } from '../../../components/ui/PageKit';
import { NeedsAttention } from '../../../components/order/NeedsAttention';
import { BulkStatusMenu } from '../../../components/order/BulkStatusMenu';
import { BulkInvoicePrint } from '../../../components/order/BulkInvoicePrint';
import { PackingListPrint } from '../../../components/order/PackingListPrint';
import { ParcelLabelPrint } from '../../../components/order/ParcelLabelPrint';
import { OrderLabelsDialog, LabelChip } from '../../../components/order/OrderLabelsDialog';
import { AssigneeChip, AssignSettingsDialog, BulkAssignDialog, useAssignment } from '../../../components/order/OrderAssign';
import { orderProfitApi, type OrderProfit } from '../../../lib/orderProfitApi';
import { downloadCsv, toCsv } from '../../../lib/csv';
import { CartLinkDialog } from '../../../components/order/CartLinkDialog';
import { CourierStatusBadge } from '../../../components/courier/courierStatus';
import { imageThumb } from '../../../lib/imageThumb';

// Table + toolbar pieces come from PageKit; the bulk bar's smaller buttons are Orders' own.
const toolbarBtn = outlineBtn;
const bulkBtn =
  'inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text transition-colors hover:border-neutral-300';

/** Columns of the Orders "Export" CSV. */
const ORDER_EXPORT_HEADERS = [
  'Order', 'Serial', 'Date', 'Status', 'Source', 'Customer', 'Phone', 'Second phone', 'Address', 'City', 'District',
  'Items', 'Quantity', 'Subtotal', 'Delivery charge', 'Discount', 'Total', 'Advance paid', 'Payment', 'Courier', 'Tracking ID', 'Customer note', 'Label',
];

function toOrderExportRow(o: Order): string[] {
  const items = o.items.map((i) => {
    const options = Object.values(i.selectedOptions ?? {}).join('/');
    return `${i.productName}${options ? ` (${options})` : ''} x${i.quantity}`;
  });
  return [
    orderRef(o),
    String(o.invoiceNumber),
    new Date(o.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' }),
    orderStatusLabel(o.status),
    o.source,
    o.customerName,
    // ="01712..." keeps Excel from reading the phone as a number and dropping the leading 0.
    o.customerPhone ? `="${o.customerPhone}"` : '',
    o.customerPhoneAlt ? `="${o.customerPhoneAlt}"` : '',
    o.shippingAddress,
    o.shippingCity ?? '',
    o.shippingDistrict ?? '',
    items.join('; '),
    String(o.items.reduce((n, i) => n + i.quantity, 0)),
    Number(o.subtotal).toFixed(2),
    Number(o.deliveryCharge).toFixed(2),
    Number(o.discountAmount).toFixed(2),
    Number(vendorOrderTotal(o)).toFixed(2),
    Number(o.advanceAmount ?? 0).toFixed(2),
    paymentMethodLabel(o.paymentMethod),
    o.courierProvider !== 'NONE' ? o.courierProvider : (o.manualCourierName ?? ''),
    o.courierTrackingCode ?? o.courierConsignmentId ?? o.manualTrackingId ?? '',
    o.customerNote ?? '',
    o.label ?? '',
  ];
}

function formatPrice(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const COURIER_LABELS: Record<CourierProvider, string> = {
  NONE: 'None',
  PATHAO: 'Pathao Courier',
  STEADFAST: 'SteadFast Courier',
  REDX: 'RedX Courier',
  CARRYBEE: 'CarryBee Courier',
};

type BookableCourier = Exclude<CourierProvider, 'NONE'>;

// Order in the "Send to courier" menu: the free one first.
const BOOKABLE_COURIERS: BookableCourier[] = ['STEADFAST', 'PATHAO', 'REDX', 'CARRYBEE'];

const COURIER_SHORT: Record<BookableCourier, string> = {
  PATHAO: 'Pathao',
  STEADFAST: 'SteadFast',
  REDX: 'RedX',
  CARRYBEE: 'CarryBee',
};

const COURIER_SEND_HINT: Record<BookableCourier, string> = {
  STEADFAST: 'One click, with your SteadFast defaults',
  PATHAO: 'Opens the booking window',
  REDX: 'One click, with your RedX defaults',
  CARRYBEE: 'One click, with your CarryBee defaults',
};

async function copyTrackingId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    toast.success('Tracking ID copied — share it with the customer.');
  } catch {
    toast.error('Could not copy. Open the order and copy the ID yourself.');
  }
}

async function copyPhone(phone: string) {
  try {
    await navigator.clipboard.writeText(phone);
    toast.success('Phone number copied.');
  } catch {
    toast.error('Could not copy the phone number.');
  }
}

const BOOKING_STATUS_LABELS: Record<Order['courierBookingStatus'], string> = {
  NOT_BOOKED: '',
  BOOKING: 'Booking…',
  BOOKED: 'Booked',
  FAILED: 'Booking failed',
  CANCELLED: 'Pickup cancelled',
};

interface OrderRowProps {
  order: Order;
  /** Profit on this order (for people with analytics.profit, when the list shows it); undefined = not loaded or not a sale. */
  profit?: OrderProfit;
  trashView: boolean;
  onCheckHistory: (phone: string) => void;
  onChangeLabel: (order: Order) => void;
  onShowInvoice: (order: Order) => void;
  // PLAN.md Step 11 — Free: Steadfast only, paid tiers: also Pathao.
  // Undefined while the vendor's plan hasn't loaded yet, treated the
  // same as false (locked) so the picker never briefly shows Pathao as
  // selectable before the real plan is known.
  otherCouriersAllowed: boolean | undefined;
  // COURIER-PLAN.md §5.2 — which providers this vendor already has an
  // active account for. Undefined while still loading, treated the same
  // as "not connected" so a click never sneaks past the setup popup
  // before the real connection state is known.
  connectedProviders: Set<CourierAccountProvider> | undefined;
  // Called instead of proceeding when the vendor picks/books a provider
  // they haven't connected yet — the parent owns the actual modal since
  // it's shared across every row (see COURIER-PLAN.md §5.2).
  onRequestSetup: (provider: CourierAccountProvider, retry: () => void) => void;
  // "Book with Pathao" opens the shared booking popup (pathao-plan.md
  // Step 4) instead of booking blind; the parent owns it, like the
  // setup popup above.
  onBookPathao: (order: Order) => void;
  // Courier timeline / SteadFast return / RedX cancel popups — parent-owned, shared by every row.
  onShowTimeline: (order: Order) => void;
  onRequestReturn: (order: Order) => void;
  onCancelRedx: (order: Order) => void;
  // CarryBee: cancel a parcel, and pick the city/zone when CarryBee can't find them in the address.
  onCancelCarrybee: (order: Order) => void;
  onPickCarrybeePlace: (order: Order) => void;
  // Row checkbox for bulk "Send to Pathao" (pathao-plan.md Step 11).
  // Undefined in the trash view, which has no bulk actions.
  selected?: boolean;
  onToggleSelect?: (orderId: string) => void;
  // The customer's delivery record lines (pathao-plan.md Step 15); loaded once per page.
  deliveryStats?: PhoneCourierStats;
}

function OrderRow({
  order,
  profit,
  trashView,
  onCheckHistory,
  onChangeLabel,
  onShowInvoice,
  otherCouriersAllowed,
  connectedProviders,
  onRequestSetup,
  onBookPathao,
  onShowTimeline,
  onRequestReturn,
  onCancelRedx,
  onCancelCarrybee,
  onPickCarrybeePlace,
  selected,
  onToggleSelect,
  deliveryStats,
}: OrderRowProps) {
  const queryClient = useQueryClient();
  // The store's label list (TellMe idea 91); the same cached answer the list's filter uses.
  const { data: labelCatalog } = useQuery({ queryKey: ['order-labels'], queryFn: ordersApi.labelCatalog, staleTime: 60_000 });
  // What this person's role can do to an order (rule-plan.md Step 10); the server checks each again.
  const canEdit = useCan('orders.edit');
  const canCancelRefund = useCan('orders.cancel_refund');
  const canCourier = useCan('orders.courier');
  const canTrash = useCan('orders.delete');
  const canContact = useCan('customers.contact');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ status, note, correction, reasonCode }: StatusChangeRequest) => ordersApi.updateStatus(order.id, status, note, correction, reasonCode),
    onSuccess: () => {
      invalidate();
      toast.success('Order status updated.');
    },
    // The server's own reason when the flow refuses the move ("already reached Processing…").
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update the order status. Please try again.')),
  });
  // Asks before a closing step (Completed, Cancelled…); the owner's "Correct a mistake" form.
  const isOwner = useCan('owner');
  const statusDialogs = useStatusChangeDialogs({ order, onChange: (req) => statusMutation.mutate(req), busy: statusMutation.isPending });

  const courierMutation = useMutation({
    mutationFn: (courierProvider: CourierProvider) => ordersApi.updateCourier(order.id, courierProvider),
    onSuccess: (_, courierProvider) => {
      invalidate();
      toast.success(
        courierProvider === 'NONE' ? 'Courier assignment cleared.' : `Marked as sent to ${COURIER_LABELS[courierProvider]}.`,
      );
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update the courier. Please try again.')),
  });

  // Paid-plan couriers (PLAN.md Step 11): SteadFast is free on every plan.
  function courierLocked(provider: BookableCourier): boolean {
    return provider !== 'STEADFAST' && !otherCouriersAllowed;
  }

  // "Only mark as sent to {Provider}" — the plain label (for vendors who
  // book in the courier's own panel), still gated behind the "connected?"
  // check (COURIER-PLAN.md §5.2) so it can be booked from here later.
  function selectCourier(provider: BookableCourier) {
    if (courierLocked(provider)) {
      upgradeToast(`use ${COURIER_LABELS[provider]}`);
      return;
    }
    if (!connectedProviders?.has(provider)) {
      onRequestSetup(provider, () => courierMutation.mutate(provider));
      return;
    }
    courierMutation.mutate(provider);
  }

  // "Send to SteadFast / RedX" — assign (when needed) and book in one go,
  // the real API call. A FAILED order can be sent again (retry); a
  // BOOKED one can't.
  const sendMutation = useMutation({
    mutationFn: async (provider: Exclude<BookableCourier, 'PATHAO'>) => {
      if (order.courierProvider !== provider) await ordersApi.updateCourier(order.id, provider);
      return courierApi.bookOrder(order.id);
    },
    onSuccess: (_, provider) => {
      invalidate();
      toast.success(`Booked with ${COURIER_LABELS[provider]}.`);
    },
    onError: (err, provider) => {
      const notConnected = notConnectedProvider(err);
      if (notConnected) {
        onRequestSetup(notConnected, () => sendMutation.mutate(provider));
        return;
      }
      invalidate(); // refresh so the row picks up courierBookingStatus: FAILED + courierBookingError
      // CarryBee couldn't place the address: let the vendor pick the city and zone instead of a dead-end error.
      if (provider === 'CARRYBEE' && apiErrorMessage(err, '').startsWith(CARRYBEE_PLACE_NOT_FOUND)) {
        onPickCarrybeePlace(order);
        return;
      }
      toast.error(apiErrorMessage(err, 'Could not book this order with the courier. Please try again.'));
    },
  });

  // Pathao books through its popup (edit + price preview first), so
  // "Send" only assigns the order to Pathao and opens it.
  async function openPathaoBooking() {
    if (order.courierProvider !== 'PATHAO') {
      try {
        await ordersApi.updateCourier(order.id, 'PATHAO');
        invalidate();
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Could not assign this order to Pathao. Please try again.'));
        return;
      }
    }
    onBookPathao(order);
  }

  function sendTo(provider: BookableCourier) {
    if (courierLocked(provider)) {
      upgradeToast(`use ${COURIER_LABELS[provider]}`);
      return;
    }
    const go = () => (provider === 'PATHAO' ? void openPathaoBooking() : sendMutation.mutate(provider));
    if (!connectedProviders?.has(provider)) {
      onRequestSetup(provider, go);
      return;
    }
    go();
  }

  const refreshStatusMutation = useMutation({
    mutationFn: () => courierApi.refreshStatus(order.id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['courier-events', order.id] });
      toast.success('Delivery status refreshed.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not refresh the delivery status. Please try again.')),
  });

  const trashMutation = useMutation({
    mutationFn: () => (trashView ? ordersApi.restore(order.id) : ordersApi.trash(order.id)),
    onSuccess: () => {
      invalidate();
      toast.success(trashView ? 'Order restored.' : 'Order sent to trash.');
    },
    onError: () => toast.error('Could not update the order. Please try again.'),
  });

  const firstItem = order.items[0];
  const extraCount = order.items.length - 1;
  const assigned = order.courierProvider !== 'NONE';
  const booked = assigned && order.courierBookingStatus === 'BOOKED';
  const bookingNow = assigned && order.courierBookingStatus === 'BOOKING';
  // SteadFast's tracking code is what its tracking page takes; Pathao's consignment id doubles as its tracking id.
  const trackingId = order.courierTrackingCode ?? order.courierConsignmentId;

  return (
    <tr className={`border-t border-line align-top text-regantify-text transition-colors ${selected ? 'bg-brand-lime/20' : 'hover:bg-neutral-50/70'}`}>
      {onToggleSelect && (
        <td className={`${td} w-10`}>
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={() => onToggleSelect(order.id)}
            aria-label={`Select ${orderRef(order)}`}
            className="h-4 w-4 cursor-pointer accent-brand"
          />
        </td>
      )}
      <td className={`${td} whitespace-nowrap`}>
        <Link to={`/vendor/orders/${order.id}`} className="font-medium text-brand hover:underline">
          {orderRef(order)}
        </Link>
        {order.source === 'POS' && (
          <span className="ml-1.5 rounded border border-line bg-neutral-50 px-1 py-0.5 align-middle text-[10px] font-semibold text-neutral-600" title="Sold at the counter">
            POS
          </span>
        )}
        {order.resaleSupplierVendorId && (
          <span className="ml-1.5 rounded border border-sky-200 bg-sky-50 px-1 py-0.5 align-middle text-[10px] font-semibold text-sky-700" title="A product you resell: the supplier ships it and its status follows theirs">
            Sold for {order.resalePartner ?? 'a supplier'}
          </span>
        )}
        {order.source === 'RESELLER' && (
          <span className="ml-1.5 rounded border border-violet-200 bg-violet-50 px-1 py-0.5 align-middle text-[10px] font-semibold text-violet-700" title="Sold by a reseller: ship it with your connected courier, under their name">
            Reseller: {order.resalePartner ?? 'a store'}
          </span>
        )}
        <p className="mt-0.5 text-xs text-neutral-500">
          #{order.invoiceNumber} · {formatDateTime(order.createdAt)}
        </p>
        {order.manualChannel && (
          <span className="mt-1.5 inline-flex items-center rounded border border-line bg-neutral-50 px-1.5 py-0.5 text-[11px] font-medium text-neutral-700" title="Where this order came from">
            {order.manualChannel}
          </span>
        )}
        {(order.labels ?? []).length > 0 && (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {(order.labels ?? []).map((name) => (
              <LabelChip key={name} name={name} catalog={labelCatalog} />
            ))}
          </span>
        )}
        {order.label && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded border border-brand-lime bg-brand-lime/40 px-1.5 py-0.5 text-[11px] font-medium text-brand">
            <Tag size={10} />
            {order.label}
          </span>
        )}
      </td>
      <td className={td}>
        <OrderStatusBadge status={order.status} />
        <AssigneeChip order={order} />
        {order.isGift && (
          <p className="mt-1 inline-flex items-center gap-1 rounded border border-pink-200 bg-pink-50 px-1.5 py-0.5 text-[11px] font-medium text-pink-800" title="Gift: wrap it and add the message">
            Gift
          </p>
        )}
        {order.deliverySpeed === 'EXPRESS' && (
          <p
            className="mt-1 inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700"
            title="The customer paid for express delivery. Send it with your own rider; it is not booked with a courier automatically."
          >
            Express
          </p>
        )}
        <OrderRiskBadge order={order} />
        <AddressCheckMark order={order} />
        {order.manualPaymentStatus === 'PENDING_CHECK' && (
          <p
            className="mt-1 inline-flex items-center gap-1 rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-900"
            title={`${order.manualPaymentWallet ?? 'Mobile'} payment from ${order.manualPaymentSender ?? ''}, TrxID ${order.manualPaymentTrxId ?? ''}. Check your wallet, then mark it on the order.`}
          >
            <Wallet size={10} aria-hidden />
            Check {order.manualPaymentWallet ?? 'mobile'} payment
          </p>
        )}
        {order.manualPaymentStatus === 'NOT_RECEIVED' && order.paymentMethod !== 'COD' && (
          <p className="mt-1 inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-800">
            <Wallet size={10} aria-hidden />
            Payment not received
          </p>
        )}
        {order.possibleDuplicateOfId && (
          <p
            className="mt-1 inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-800"
            title="Same phone and product as an earlier open order within 24 hours. Open the order to check."
          >
            <Copy size={10} aria-hidden />
            Possible duplicate
          </p>
        )}
        {order.preferredDeliveryDate && (
          <p
            className="mt-1 inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-800"
            title="The day the customer asked to have it delivered. A courier cannot always keep to it."
          >
            <CalendarDays size={10} aria-hidden />
            Wants {preferredDayLabel(order.preferredDeliveryDate)}
            {order.preferredSlot ? ` · ${order.preferredSlot}` : ''}
          </p>
        )}
        {order.courierProvider !== 'NONE' && (
          <>
            <p className="mt-1.5 text-xs text-neutral-500">{COURIER_LABELS[order.courierProvider]}</p>
            {/* Real booking state — COURIER-PLAN.md §5.3. NOT_BOOKED shows
                nothing extra here (the provider label above already says
                which courier is chosen; "Book with..." lives in Actions). */}
            {order.courierBookingStatus === 'BOOKED' && (
              <p className="text-[11px] text-green-600 mt-0.5">
                {BOOKING_STATUS_LABELS.BOOKED} · {order.courierTrackingCode ?? order.courierConsignmentId}
              </p>
            )}
            {/* The courier's own live status (pathao-plan.md Step 6). */}
            {order.courierBookingStatus === 'BOOKED' && order.courierStatus && (
              <div className="mt-1">
                <CourierStatusBadge provider={order.courierProvider} status={order.courierStatus} />
              </div>
            )}
            {order.courierBookingStatus === 'CANCELLED' && (
              <p className="text-[11px] text-red-500 mt-0.5" title={order.courierBookingError ?? undefined}>
                {BOOKING_STATUS_LABELS.CANCELLED}
              </p>
            )}
            {order.courierBookingStatus === 'FAILED' && (
              <p className="text-[11px] text-red-500 mt-0.5" title={order.courierBookingError ?? undefined}>
                {BOOKING_STATUS_LABELS.FAILED}
              </p>
            )}
            {order.courierBookingStatus === 'BOOKING' && (
              <p className="text-[11px] text-regantify-text-muted mt-0.5">{BOOKING_STATUS_LABELS.BOOKING}</p>
            )}
          </>
        )}
      </td>
      <td className={`${td} min-w-[180px]`}>
        <p className="flex items-center gap-1.5 font-medium">
          <User size={14} className="shrink-0 text-neutral-500" />
          {order.customerName}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
          <Phone size={12} className="shrink-0 text-neutral-500" />
          {order.customerPhone}
          {/* Without customers.contact the number comes masked (rule-plan.md Step 5): nothing to copy or look up. */}
          {canContact && (
            <button
              type="button"
              onClick={() => copyPhone(order.customerPhone)}
              aria-label="Copy phone number"
              title="Copy phone number"
              className="text-neutral-400 transition hover:text-neutral-700"
            >
              <Copy size={11} />
            </button>
          )}
        </p>
        <CustomerDeliveryStats stats={deliveryStats} compact />
        {canContact && (
          <button
            onClick={() => onCheckHistory(order.customerPhone)}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
          >
            Check History
          </button>
        )}
      </td>
      <td className={`${td} min-w-[200px]`}>
        <p>{order.shippingAddress}</p>
        {order.shippingCity && (
          <p className="mt-0.5 text-xs text-neutral-500">City: {order.shippingCity}</p>
        )}
        {order.shippingDistrict && (
          <p className="text-xs text-neutral-500">District: {order.shippingDistrict}</p>
        )}
      </td>
      <td className={`${td} min-w-[200px]`}>
        <div className="flex items-center gap-3">
          {firstItem?.productImage ? (
            <img src={imageThumb(firstItem.productImage, 80)} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded border border-line bg-neutral-100 object-cover" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-neutral-100" />
          )}
          <div>
            <p className="flex items-center gap-1.5 leading-tight">
              {firstItem?.productName}
              {firstItem?.product?.visibility === 'PUBLIC' && <ViewProductOnStorefront slug={firstItem.product.slug} />}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {firstItem?.productSku} · x{firstItem?.quantity}
            </p>
          </div>
        </div>
        {extraCount > 0 && <p className="mt-1.5 text-xs text-neutral-500">+{extraCount} more item(s)</p>}
      </td>
      <td className={`${td} whitespace-nowrap`}>
        <p className="font-medium">{formatPrice(vendorOrderTotal(order))}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{order.source === 'POS' ? paymentMethodLabel(order.paymentMethod) : order.paymentMethod}</p>
        {profit && (
          <p className={`mt-0.5 text-xs font-medium ${profit.profit < 0 ? 'text-red-700' : 'text-green-700'}`} title={profit.costKnown ? 'Profit on this order' : 'Some products have no cost set, so the real profit is lower'}>
            {profit.returned ? 'Loss' : 'Profit'} {profit.profit < 0 ? '-' : ''}৳{Math.abs(profit.profit).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            {!profit.costKnown && !profit.returned ? '*' : ''}
          </p>
        )}
      </td>
      <td className={td}>
        <DropdownMenu
          widthClass="w-64"
          trigger={
            <button
              aria-label="Actions"
              title="Actions"
              className="rounded-md border border-line bg-white p-1.5 text-regantify-text transition-colors hover:bg-neutral-50 data-[state=open]:bg-neutral-50"
            >
              <MoreVertical size={14} />
            </button>
          }
        >
          {trashView ? (
            canTrash ? (
              <DropdownMenuItem icon={<RotateCcw />} onSelect={() => trashMutation.mutate()}>
                Restore
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem icon={<RotateCcw />} disabled hint="Your role can’t restore orders" onSelect={() => undefined}>
                Restore
              </DropdownMenuItem>
            )
          ) : (
            <>
              <DropdownMenuItem icon={<FileText />} hint="View, print or download" onSelect={() => onShowInvoice(order)}>
                Invoice
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuSub icon={<ListChecks />} label="Change status" value={orderStatusLabel(order.status)}>
                    {/* Forward only: the current status (ticked) plus the moves the flow allows. */}
                    {ALL_ORDER_STATUSES.filter((s) => s === order.status || canMoveOrderStatus(order.status, s, order.deliveryZone)).map((status) => {
                      const moneyBack = status === 'CANCELLED' || status === 'REFUNDED';
                      return (
                        <DropdownMenuItem
                          key={status}
                          disabled={status === order.status || statusMutation.isPending || (moneyBack && !canCancelRefund)}
                          hint={moneyBack && !canCancelRefund && status !== order.status ? 'Your role can’t cancel or refund' : undefined}
                          icon={status === order.status ? <Check /> : <span className="block w-4" />}
                          onSelect={() => statusDialogs.request(status)}
                        >
                          {orderStatusLabel(status)}
                        </DropdownMenuItem>
                      );
                    })}
                    {isOwner && order.source !== 'POS' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem icon={<RotateCcw />} hint="Owner only, with a reason" onSelect={statusDialogs.openCorrection}>
                          Correct a mistake…
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuSub>
                  <DropdownMenuItem icon={<Tag />} onSelect={() => onChangeLabel(order)}>
                    Change label
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>
                Courier{assigned ? ` · ${COURIER_SHORT[order.courierProvider as BookableCourier]}` : ''}
              </DropdownMenuLabel>

              {booked ? (
                <>
                  {canCourier && (
                    <DropdownMenuItem icon={<RefreshCw />} disabled={refreshStatusMutation.isPending} onSelect={() => refreshStatusMutation.mutate()}>
                      {refreshStatusMutation.isPending ? 'Refreshing…' : 'Refresh delivery status'}
                    </DropdownMenuItem>
                  )}
                  {trackingId && (
                    <DropdownMenuItem icon={<Copy />} hint={trackingId} onSelect={() => copyTrackingId(trackingId)}>
                      Copy tracking ID
                    </DropdownMenuItem>
                  )}
                  {order.courierProvider === 'STEADFAST' && order.courierTrackingUrl && (
                    <DropdownMenuItem
                      icon={<ExternalLink />}
                      onSelect={() => window.open(order.courierTrackingUrl!, '_blank', 'noopener')}
                    >
                      Track parcel
                    </DropdownMenuItem>
                  )}
                  {order.courierProvider === 'REDX' && order.courierConsignmentId && (
                    <DropdownMenuItem
                      icon={<ExternalLink />}
                      onSelect={() => window.open(redxTrackingUrl(order.courierConsignmentId!), '_blank', 'noopener')}
                    >
                      Track parcel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem icon={<History />} onSelect={() => onShowTimeline(order)}>
                    Courier timeline
                  </DropdownMenuItem>
                  {canCourier && order.courierProvider === 'PATHAO' && (
                    <DropdownMenuItem icon={<Printer />} onSelect={() => openPathaoLabels([order.id])}>
                      Print shipping label
                    </DropdownMenuItem>
                  )}
                  {canCourier && order.courierProvider === 'STEADFAST' && steadfastReturnable(order.courierStatus) && (
                    <DropdownMenuItem icon={<Undo2 />} onSelect={() => onRequestReturn(order)}>
                      Request return
                    </DropdownMenuItem>
                  )}
                  {canCourier && order.courierProvider === 'REDX' && redxCancellable(order.courierStatus) && (
                    <DropdownMenuItem icon={<XCircle />} hint="Only before RedX picks it up" onSelect={() => onCancelRedx(order)}>
                      Cancel parcel
                    </DropdownMenuItem>
                  )}
                  {canCourier && order.courierProvider === 'CARRYBEE' && carrybeeCancellable(order.courierStatus) && (
                    <DropdownMenuItem icon={<XCircle />} hint="CarryBee may refuse once it’s on the way" onSelect={() => onCancelCarrybee(order)}>
                      Cancel parcel
                    </DropdownMenuItem>
                  )}
                </>
              ) : bookingNow ? (
                <DropdownMenuItem icon={<Truck />} disabled onSelect={() => undefined}>
                  Booking…
                </DropdownMenuItem>
              ) : !canCourier ? (
                <DropdownMenuItem icon={<Truck />} disabled hint="Your role can’t book couriers" onSelect={() => undefined}>
                  {assigned ? `Not booked with ${COURIER_SHORT[order.courierProvider as BookableCourier]} yet` : 'Not sent to a courier yet'}
                </DropdownMenuItem>
              ) : (
                <>
                  {assigned && (
                    <DropdownMenuItem
                      icon={<Send />}
                      disabled={sendMutation.isPending}
                      hint={order.courierBookingStatus === 'FAILED' ? (order.courierBookingError ?? 'Last attempt failed') : undefined}
                      title={order.courierBookingError ?? undefined}
                      onSelect={() => sendTo(order.courierProvider as BookableCourier)}
                    >
                      {sendMutation.isPending
                        ? 'Booking…'
                        : `${order.courierBookingStatus === 'FAILED' ? 'Retry booking' : order.courierBookingStatus === 'CANCELLED' ? 'Book again' : 'Book'} with ${COURIER_SHORT[order.courierProvider as BookableCourier]}`}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSub icon={<Truck />} label={assigned ? 'Send to another courier' : 'Send to courier'} widthClass="w-64">
                    <DropdownMenuLabel>Book now</DropdownMenuLabel>
                    {BOOKABLE_COURIERS.map((provider) => (
                      <DropdownMenuItem
                        key={provider}
                        icon={<Send />}
                        hint={COURIER_SEND_HINT[provider]}
                        disabled={sendMutation.isPending}
                        onSelect={() => sendTo(provider)}
                      >
                        {courierLocked(provider) && <LockedBadge />}
                        {COURIER_SHORT[provider]}
                        {!connectedProviders?.has(provider) && <span className="text-[10px] text-neutral-500">(connect)</span>}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Mark only (no booking)</DropdownMenuLabel>
                    {BOOKABLE_COURIERS.map((provider) => (
                      <DropdownMenuItem
                        key={provider}
                        icon={order.courierProvider === provider ? <Check /> : <span className="block w-4" />}
                        disabled={order.courierProvider === provider}
                        onSelect={() => selectCourier(provider)}
                      >
                        {courierLocked(provider) && <LockedBadge />}
                        {COURIER_SHORT[provider]}
                      </DropdownMenuItem>
                    ))}
                    {assigned && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem icon={<X />} onSelect={() => courierMutation.mutate('NONE')}>
                          Clear courier
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuSub>
                  {assigned && order.courierBookingStatus !== 'NOT_BOOKED' && (
                    <DropdownMenuItem icon={<History />} onSelect={() => onShowTimeline(order)}>
                      Courier timeline
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {canTrash && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem danger icon={<Trash2 className="text-red-500" />} onSelect={() => trashMutation.mutate()}>
                    Send to Trash
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenu>
        {statusDialogs.dialogs}
      </td>
    </tr>
  );
}

/** The list filter's source choice as query params: the reseller choices go as `resale`, the rest as `source`. */
function sourceParams(source: string | undefined): Pick<ListOrdersParams, 'source' | 'resale'> {
  if (source === 'RESALE_SUPPLIED') return { resale: 'supplied' };
  if (source === 'RESALE_RESOLD') return { resale: 'resold' };
  return { source: (source || undefined) as ListOrdersParams['source'] };
}

export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useOrdersAutoRefresh();

  const [search, setSearch] = useState('');
  // 'ABANDONED' is the fixed "Abandoned Cart" tab (IncompleteOrder rows,
  // not an order status), reachable directly via ?tab=abandoned-cart.
  // ?status=PENDING (any order status) opens that status, and
  // ?courierBooking=NOT_BOOKED|FAILED adds the courier filter: the
  // Dashboard's "Needs your attention" links (dashboard-plan.md Step 5).
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL' | 'ABANDONED'>(() => {
    if (searchParams.get('tab') === 'abandoned-cart') return 'ABANDONED';
    const status = searchParams.get('status') as OrderStatus | null;
    return status && ALL_ORDER_STATUSES.includes(status) ? status : 'ALL';
  });
  const [courierBooking, setCourierBooking] = useState<ListOrdersParams['courierBooking']>(() => {
    const value = searchParams.get('courierBooking');
    return value === 'NOT_BOOKED' || value === 'FAILED' ? value : undefined;
  });
  const clearCourierBooking = () => {
    setCourierBooking(undefined);
    const next = new URLSearchParams(searchParams);
    next.delete('courierBooking');
    setSearchParams(next, { replace: true });
  };
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [trashView, setTrashView] = useState(false);
  // LMS "Call status" filter (LMS-plan.md Step 14), only offered when the store uses the LMS.
  const [callStatus, setCallStatus] = useState<ListOrdersParams['callStatus'] | ''>('');
  // POS-system-plan.md D9: online / added by hand / sold at the counter.
  const resaleSupplyOn = useFeature('RESALE_SUPPLY');
  const resaleSellOn = useFeature('RESALE_SELL');
  // Also the reseller filters (RESELLER-plan.md Steps 10-11): RESALE_SUPPLIED / RESALE_RESOLD are sent as `resale`, not `source`.
  const [source, setSource] = useState<ListOrdersParams['source'] | 'RESALE_SUPPLIED' | 'RESALE_RESOLD' | ''>('');
  // "Possible duplicates": storefront orders that look like a second copy of an open one (same phone and product
  // within 24 hours). Also reachable from the bell notice via ?possibleDuplicate=true.
  const [advancedPick, setAdvancedPick] = useState<boolean | null>(null);
  const [duplicatesOnly, setDuplicatesOnly] = useState(() => searchParams.get('possibleDuplicate') === 'true');
  // Manual Mobile Payment (Add-ons): orders whose TrxID nobody has checked yet. Also ?manualPayment=PENDING_CHECK.
  const [mobileToCheck, setMobileToCheck] = useState(() => searchParams.get('manualPayment') === 'PENDING_CHECK');
  // "Risky" (TellMe idea 143): medium and high risk orders; a saved view can also hold high only.
  const [risk, setRisk] = useState<'HIGH' | 'MEDIUM_UP' | ''>(() => {
    const q = searchParams.get('risk');
    return q === 'HIGH' || q === 'MEDIUM_UP' ? q : '';
  });
  // "Delivery day" (TellMe idea 50): only orders whose shopper asked for this day.
  const [preferredDate, setPreferredDate] = useState('');
  // Profit (TellMe idea 27), for people with analytics.profit: orders that lost money, and a profit line under each total.
  const canProfit = useCan('analytics.profit');
  const [lossOnly, setLossOnly] = useState(false);
  // Express orders only (TellMe idea 132).
  const [expressOnly, setExpressOnly] = useState(false);
  const [showProfit, setShowProfit] = useState(() => localStorage.getItem('regantify-orders-show-profit') === '1');
  const toggleShowProfit = () => {
    const next = !showProfit;
    setShowProfit(next);
    localStorage.setItem('regantify-orders-show-profit', next ? '1' : '0');
  };
  const lmsMe = useQuery({ queryKey: ['lms', 'me'], queryFn: lmsApi.me, retry: false, staleTime: 5 * 60_000 });
  // What this person's role can do on this page (rule-plan.md Step 10); the server checks each again.
  const canCreate = useCan('orders.create');
  const canEdit = useCan('orders.edit');
  const canCancelRefund = useCan('orders.cancel_refund');
  const canCourier = useCan('orders.courier');
  const canTrash = useCan('orders.delete');
  const canContact = useCan('customers.contact');
  const lmsOn = !!lmsMe.data?.enabled;
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [historyPhone, setHistoryPhone] = useState<string | null>(null);
  const [labelOrder, setLabelOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [pathaoBookingOrderId, setPathaoBookingOrderId] = useState<string | null>(null);
  const [timelineOrder, setTimelineOrder] = useState<Order | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [cancelRedxOrder, setCancelRedxOrder] = useState<Order | null>(null);
  const [cancelCarrybeeOrder, setCancelCarrybeeOrder] = useState<Order | null>(null);
  const [carrybeePlaceOrder, setCarrybeePlaceOrder] = useState<Order | null>(null);
  // COURIER-PLAN.md §5.2 — the "not connected → setup popup" flow.
  // setupPending holds the action (courier selection or booking) that
  // triggered the popup, so it can run automatically once the vendor
  // connects instead of making them re-click. null closes the modal.
  const [setupPending, setSetupPending] = useState<{ provider: CourierAccountProvider; retry: () => void } | null>(null);


  // Bulk "Send to Pathao" (pathao-plan.md Step 11). The selection is
  // per page: changing page or filters clears it, so a vendor never
  // books orders they can no longer see.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // "Print invoices" in the bulk bar: the orders being printed, null when closed.
  const [printingInvoices, setPrintingInvoices] = useState<string[] | null>(null);
  const [printingPacking, setPrintingPacking] = useState<string[] | null>(null);
  const [printingStickers, setPrintingStickers] = useState<string[] | null>(null);
  const [labelIds, setLabelIds] = useState<string[] | null>(null);
  const [labelFilter, setLabelFilter] = useState(() => searchParams.get('label') ?? '');
  const { data: labelCatalog } = useQuery({ queryKey: ['order-labels'], queryFn: ordersApi.labelCatalog, staleTime: 60_000 });
  // Channels of hand-made orders (TellMe idea 121), for the "Came from" filter.
  const { data: channelCatalog } = useQuery({ queryKey: ['order-channels'], queryFn: ordersApi.channelCatalog, staleTime: 60_000 });
  // Assign orders to staff (TellMe idea 60): the filter, the bulk box and the owner's sharing-out settings.
  const [assignee, setAssignee] = useState('');
  // Pre-orders (TellMe idea 64): 'any' or the expected date.
  const [preOrder, setPreOrder] = useState(() => searchParams.get('preOrder') ?? '');
  const [channel, setChannel] = useState(() => searchParams.get('channel') ?? '');
  useEffect(() => setPage(1), [search, activeTab, perPage, dateFrom, dateTo, trashView, callStatus, courierBooking, source, duplicatesOnly, mobileToCheck, risk, preferredDate, lossOnly, expressOnly, assignee, preOrder, channel, labelFilter]);
  const [assigningIds, setAssigningIds] = useState<string[] | null>(null);
  const [assignSettingsOpen, setAssignSettingsOpen] = useState(false);
  const [cartLinkOpen, setCartLinkOpen] = useState(false);
  const isOwner = useCan('owner');
  const assignment = useAssignment();
  // Bulk "Send to Pathao / SteadFast / RedX" — which courier and which orders; null = dialog closed.
  const [bulkBooking, setBulkBooking] = useState<{ provider: BulkCourierProvider; ids: string[] } | null>(null);
  useEffect(() => setSelectedIds(new Set()), [search, activeTab, perPage, dateFrom, dateTo, trashView, page, courierBooking]);
  function toggleSelected(orderId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  const { data: tabs = DEFAULT_TABS } = useQuery({
    queryKey: ['order-status-tabs'],
    queryFn: () => ordersApi.getStatusTabs(),
  });

  // Which providers this vendor has already connected — every OrderRow's
  // courier picker/booking action checks this before proceeding (see
  // COURIER-PLAN.md §5.2). One shared query for the whole list rather
  // than each row fetching its own copy.
  const { data: courierAccounts } = useQuery({
    queryKey: ['courier-accounts'],
    queryFn: courierApi.getAccounts,
  });
  const connectedProviders = courierAccounts
    ? new Set(courierAccounts.filter((a) => a.isActive).map((a) => a.provider))
    : undefined;

  // PLAN.md Step 11 — Free: Steadfast only, paid tiers: also Pathao. No
  // dedicated Plan column for this (the source-of-truth table shows the
  // same ✓ for every paid tier, undifferentiated) — plan.code !== 'FREE'
  // is the exact match for "paid tier unlocks more courier options".
  const { data: planUsage } = useQuery({
    queryKey: ['vendor-plan-usage'],
    queryFn: getVendorPlanUsage,
  });
  const otherCouriersAllowed = planUsage ? planUsage.plan.code !== 'FREE' : undefined;

  // PLAN.md Step 4 — Free: 5 orders/day, others: unlimited. Server
  // already hard-blocks both STOREFRONT and MANUAL orders at the cap
  // (OrdersService.create) — this is purely so a Free vendor at the cap
  // doesn't click through to the Add Order form only to fail on submit,
  // same "surface value before the vendor hits the wall" precedent as
  // Staff.tsx's Add New button (Step 10) and AllProducts.tsx's Add New
  // button (Step 3 retrofit).
  const ordersUsage = planUsage?.usage.ordersToday;
  const atOrderLimit = ordersUsage != null && ordersUsage.limit !== null && ordersUsage.used >= ordersUsage.limit;

  const tabsMutation = useMutation({
    mutationFn: (statuses: OrderStatus[]) => ordersApi.updateStatusTabs(statuses),
    onSuccess: (statuses) => {
      queryClient.setQueryData(['order-status-tabs'], statuses);
      setCustomizeOpen(false);
      toast.success('Tabs updated.');
      // If the currently-active tab was just removed, fall back to All
      // rather than silently showing a filter that's no longer visible.
      if (activeTab !== 'ALL' && activeTab !== 'ABANDONED' && !statuses.includes(activeTab)) setActiveTab('ALL');
    },
    onError: () => toast.error('Could not save tabs. Please try again.'),
  });

  const labelMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string | null }) => ordersApi.updateLabel(id, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setLabelOrder(null);
      toast.success('Label updated.');
    },
    onError: () => toast.error('Could not save the label. Please try again.'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { search, activeTab, page, perPage, dateFrom, dateTo, trashView, callStatus: lmsOn ? callStatus : '', courierBooking, source, duplicatesOnly, risk, preferredDate, lossOnly, expressOnly, assignee, preOrder, channel, labelFilter }],
    queryFn: () =>
      ordersApi.list({
        search: search.trim() || undefined,
        status: activeTab === 'ALL' || activeTab === 'ABANDONED' ? undefined : activeTab,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        trashOnly: trashView,
        callStatus: (lmsOn && callStatus) || undefined,
        courierBooking,
        ...sourceParams(source),
        possibleDuplicate: duplicatesOnly || undefined,
        manualPayment: mobileToCheck ? 'PENDING_CHECK' : undefined,
        risk: risk || undefined,
        preferredDate: preferredDate || undefined,
        assignee: assignee || undefined,
        preOrder: preOrder || undefined,
        channel: channel || undefined,
        label: labelFilter || undefined,
        lossOnly: (canProfit && lossOnly) || undefined,
        speed: expressOnly ? 'EXPRESS' : undefined,
        page,
        perPage,
      }),
    enabled: activeTab !== 'ABANDONED',
  });

  const orders = data?.orders ?? [];
  // Profit for the orders on this page (one request), only when asked for.
  const profitIds = orders.map((o) => o.id);
  const { data: profits } = useQuery({
    queryKey: ['order-profits', profitIds],
    queryFn: () => orderProfitApi.get(profitIds),
    enabled: canProfit && (showProfit || lossOnly) && profitIds.length > 0,
    retry: false,
  });
  const profitById = new Map((profits ?? []).map((p) => [p.orderId, p]));
  const total = data?.total ?? 0;

  // "Export": the selected orders, or with nothing selected every order matching the current
  // tab, search, dates and filters (all pages), as a CSV that opens in Excel.
  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    setExporting(true);
    try {
      const rows =
        selectedIds.size > 0
          ? orders.filter((o) => selectedIds.has(o.id))
          : (
              await ordersApi.list({
                search: search.trim() || undefined,
                status: activeTab === 'ALL' || activeTab === 'ABANDONED' ? undefined : activeTab,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                callStatus: (lmsOn && callStatus) || undefined,
                courierBooking,
                ...sourceParams(source),
                possibleDuplicate: duplicatesOnly || undefined,
                manualPayment: mobileToCheck ? 'PENDING_CHECK' : undefined,
                risk: risk || undefined,
                preferredDate: preferredDate || undefined,
                lossOnly: (canProfit && lossOnly) || undefined,
                speed: expressOnly ? 'EXPRESS' : undefined,
                page: 1,
                perPage: 10000,
              })
            ).orders;
      if (rows.length === 0) {
        toast.error('No orders to export.');
        return;
      }
      downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(ORDER_EXPORT_HEADERS, rows.map(toOrderExportRow)));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not export the orders. Please try again.'));
    } finally {
      setExporting(false);
    }
  }
  const allOnPageSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

  // Customer delivery records for this page's phones (Step 15). A number
  // seen for the first time is looked up in the background (`pending`),
  // so the list asks again a couple of times until those arrive.
  const pagePhones = [...new Set(orders.map((o) => o.customerPhone))].sort();
  const { data: deliveryStats } = useQuery({
    queryKey: ['customer-courier-stats', pagePhones],
    queryFn: () => ordersApi.getCustomerCourierStats(pagePhones),
    // Looked up by full phone number, so only with customers.contact (rule-plan.md Step 5).
    enabled: pagePhones.length > 0 && !trashView && canContact,
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.dataUpdateCount < 3 && Object.values(query.state.data?.byPhone ?? {}).some((s) => s.pathao?.pending || s.steadfast?.pending) ? 4000 : false,
  });
  const columnCount = trashView ? 7 : 8;

  function sendSelectedToPathao() {
    if (!otherCouriersAllowed) {
      upgradeToast('use Pathao Courier');
      return;
    }
    const ids = [...selectedIds];
    if (!connectedProviders?.has('PATHAO')) {
      setSetupPending({ provider: 'PATHAO', retry: () => setBulkBooking({ provider: 'PATHAO', ids }) });
      return;
    }
    setBulkBooking({ provider: 'PATHAO', ids });
  }

  function sendSelectedToRedx() {
    if (!otherCouriersAllowed) {
      upgradeToast('use RedX Courier');
      return;
    }
    const ids = [...selectedIds];
    if (!connectedProviders?.has('REDX')) {
      setSetupPending({ provider: 'REDX', retry: () => setBulkBooking({ provider: 'REDX', ids }) });
      return;
    }
    setBulkBooking({ provider: 'REDX', ids });
  }

  function sendSelectedToCarrybee() {
    if (!otherCouriersAllowed) {
      upgradeToast('use CarryBee Courier');
      return;
    }
    const ids = [...selectedIds];
    if (!connectedProviders?.has('CARRYBEE')) {
      setSetupPending({ provider: 'CARRYBEE', retry: () => setBulkBooking({ provider: 'CARRYBEE', ids }) });
      return;
    }
    setBulkBooking({ provider: 'CARRYBEE', ids });
  }

  // SteadFast is free on every plan, so no upgrade check here.
  function sendSelectedToSteadfast() {
    const ids = [...selectedIds];
    if (!connectedProviders?.has('STEADFAST')) {
      setSetupPending({ provider: 'STEADFAST', retry: () => setBulkBooking({ provider: 'STEADFAST', ids }) });
      return;
    }
    setBulkBooking({ provider: 'STEADFAST', ids });
  }

  // Saved views (TellMe idea 127): the filters now set, and putting a saved set back. A date that means today is kept as the word.
  const dhakaOn = (offset: number) => new Date(Date.now() + 6 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);
  const currentViewFilters: OrderViewFilters = {};
  if (activeTab !== 'ALL' && activeTab !== 'ABANDONED') currentViewFilters.status = activeTab;
  if (search.trim()) currentViewFilters.search = search.trim();
  if (dateFrom || dateTo) {
    if (dateFrom === dhakaOn(0) && dateTo === dhakaOn(0)) currentViewFilters.dateRange = 'TODAY';
    else if (dateFrom === dhakaOn(-1) && dateTo === dhakaOn(-1)) currentViewFilters.dateRange = 'YESTERDAY';
    else if (dateFrom === dhakaOn(-6) && dateTo === dhakaOn(0)) currentViewFilters.dateRange = 'LAST_7';
    else {
      if (dateFrom) currentViewFilters.dateFrom = dateFrom;
      if (dateTo) currentViewFilters.dateTo = dateTo;
    }
  }
  if (callStatus) currentViewFilters.callStatus = callStatus;
  if (courierBooking) currentViewFilters.courierBooking = courierBooking;
  if (source) currentViewFilters.source = source;
  if (duplicatesOnly) currentViewFilters.possibleDuplicate = true;
  if (risk) currentViewFilters.risk = risk;
  if (preferredDate) currentViewFilters.preferredDate = preferredDate;
  if (lossOnly) currentViewFilters.lossOnly = true;
  if (expressOnly) currentViewFilters.speed = 'EXPRESS';
  if (assignee) currentViewFilters.assignee = assignee;
  if (preOrder) currentViewFilters.preOrder = preOrder;
  if (channel) currentViewFilters.channel = channel;
  if (labelFilter) currentViewFilters.label = labelFilter;

  function applyView(f: OrderViewFilters) {
    setActiveTab((f.status && ALL_ORDER_STATUSES.includes(f.status as OrderStatus) ? f.status : 'ALL') as OrderStatus | 'ALL');
    setSearch(f.search ?? '');
    const range = f.dateRange === 'TODAY' ? [dhakaOn(0), dhakaOn(0)] : f.dateRange === 'YESTERDAY' ? [dhakaOn(-1), dhakaOn(-1)] : f.dateRange === 'LAST_7' ? [dhakaOn(-6), dhakaOn(0)] : [f.dateFrom ?? '', f.dateTo ?? ''];
    setDateFrom(range[0]);
    setDateTo(range[1]);
    setCallStatus((f.callStatus ?? '') as ListOrdersParams['callStatus'] | '');
    setCourierBooking(f.courierBooking === 'NOT_BOOKED' || f.courierBooking === 'FAILED' ? f.courierBooking : undefined);
    setSource((f.source ?? '') as ListOrdersParams['source'] | ''); // saved views keep the plain sources only
    setDuplicatesOnly(!!f.possibleDuplicate);
    setRisk(f.risk ?? '');
    setPreferredDate(f.preferredDate ?? '');
    setLossOnly(!!f.lossOnly && canProfit);
    setExpressOnly(f.speed === 'EXPRESS');
    setAssignee(f.assignee ?? '');
    setPreOrder(f.preOrder ?? '');
    setChannel(f.channel ?? '');
    setLabelFilter(f.label ?? '');
    setTrashView(false);
  }

  // The less-used filters and tools sit behind "More filters and tools"; it opens by itself while one of them is in use.
  const advancedInUse = [preOrder !== '', labelFilter !== '', channel !== '', preferredDate !== '', expressOnly, duplicatesOnly, mobileToCheck, risk !== '', lossOnly, showProfit].filter(Boolean).length;
  if (advancedPick === null && advancedInUse > 0) setAdvancedPick(true);
  const adv = advancedPick ?? false;
  const toggleAdvanced = () => setAdvancedPick(!adv);

  return (
    <div>
      {!trashView && activeTab !== 'ABANDONED' && <NeedsAttention />}
      <section className="rounded-xl border border-line bg-white p-3.5">
        {!trashView && activeTab !== 'ABANDONED' && <SavedViewsBar current={currentViewFilters} onApply={applyView} />}
        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h1 className="text-[15px] font-semibold text-regantify-text">{trashView ? 'Orders · Trash' : 'Orders'}</h1>
            {ordersUsage && (
              <div className="mt-0.5 [&_p]:text-xs">
                <UsageLine label="orders today" used={ordersUsage.used} limit={ordersUsage.limit} />
              </div>
            )}
          </div>

          {activeTab !== 'ABANDONED' && (
            <>
              <SearchBox value={search} onChange={setSearch} placeholder="Search order no., customer" />
              <DateRangeFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                }}
              />
              <div className="relative">
                <select
                  aria-label="Source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as typeof source)}
                  className={`${toolbarBtn} appearance-none pr-8`}
                >
                  <option value="">All sources</option>
                  <option value="STOREFRONT">Online store</option>
                  <option value="MANUAL">Added by hand</option>
                  <option value="POS">POS (counter)</option>
                  {resaleSupplyOn && <option value="RESALE_SUPPLIED">Reseller orders (you ship)</option>}
                  {resaleSellOn && <option value="RESALE_RESOLD">Resold (the supplier ships)</option>}
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-3" />
              </div>
              {(assignment.data?.staff.length ?? 0) > 0 && (
                <select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Handled by" className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-regantify-text">
                  <option value="">All orders</option>
                  {assignment.data?.myStaffId && <option value="me">My orders</option>}
                  <option value="none">Nobody handles</option>
                  {assignment.data?.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {lmsOn && (
                <div className="relative">
                  <select
                    aria-label="Call status"
                    value={callStatus}
                    onChange={(e) => setCallStatus(e.target.value as ListOrdersParams['callStatus'] | '')}
                    className={`${toolbarBtn} appearance-none pr-8`}
                  >
                    <option value="">Any call status</option>
                    <option value="WAITING">Call: waiting</option>
                    <option value="CONFIRMED">Call: confirmed</option>
                    <option value="CANCELLED">Call: cancelled</option>
                    <option value="NONE">No call in the LMS</option>
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-3" />
                </div>
              )}
              {canTrash && (
                <button
                  onClick={() => setTrashView((v) => !v)}
                  className={`${toolbarBtn} ${trashView ? 'border-neutral-300 bg-neutral-50' : ''}`}
                >
                  {trashView ? <ArrowLeft size={15} /> : <Trash2 size={15} />}
                  {trashView ? 'Back to Orders' : 'Trash'}
                </button>
              )}
            </>
          )}

          {activeTab !== 'ABANDONED' && !trashView && (<AdvancedToggle open={adv} onToggle={toggleAdvanced} inUse={advancedInUse} label="More filters and tools" />)}

          {activeTab !== 'ABANDONED' && !trashView && (
            <button type="button" onClick={handleExport} disabled={exporting} className={toolbarBtn} title="Download as a CSV file (opens in Excel)">
              <Download size={15} />
              {exporting ? 'Exporting…' : selectedIds.size > 0 ? `Export ${selectedIds.size}` : 'Export'}
            </button>
          )}

          {canCreate && activeTab !== 'ABANDONED' && !trashView && (
            <button type="button" onClick={() => navigate('/vendor/orders/import')} className={toolbarBtn} title="Bring orders in from an Excel or CSV file">
              <Upload size={15} />
              Import
            </button>
          )}

          {canCourier && activeTab !== 'ABANDONED' && !trashView && (
            <button type="button" onClick={() => navigate('/vendor/orders/handover')} className={toolbarBtn} title="Hand parcels to a courier with a signed sheet">
              <Truck size={15} />
              Courier handover
            </button>
          )}


          {canCreate && (
          <button
            onClick={() => (atOrderLimit ? upgradeToast('add more orders today') : navigate('/vendor/orders/add'))}
            disabled={atOrderLimit}
            title={atOrderLimit ? 'Upgrade your plan to add more orders today.' : undefined}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
              atOrderLimit ? 'cursor-not-allowed bg-neutral-100 text-regantify-text-muted' : 'bg-brand text-white hover:bg-brand-dark'
            }`}
          >
            {atOrderLimit ? <LockedBadge size={14} /> : <Plus size={15} />}
            Add Order
          </button>
          )}
        </div>

        {adv && activeTab !== 'ABANDONED' && !trashView && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line bg-neutral-50/60 p-2.5">
              <label className="flex items-center gap-1.5 text-xs text-neutral-500" title="Orders with a pre-order item, by the date it was expected">
                Pre-order
                <select
                  value={preOrder === 'any' || preOrder === '' ? preOrder : 'date'}
                  onChange={(e) => setPreOrder(e.target.value === 'date' ? new Date().toISOString().slice(0, 10) : e.target.value)}
                  className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-regantify-text"
                >
                  <option value="">Any</option>
                  <option value="any">All pre-orders</option>
                  <option value="date">By expected date…</option>
                </select>
                {preOrder && preOrder !== 'any' && (
                  <input type="date" value={preOrder} onChange={(e) => setPreOrder(e.target.value || 'any')} className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-regantify-text" />
                )}
              </label>
              {(labelCatalog ?? []).length > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-neutral-500" title="Orders with one of your labels">
                  Label
                  <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-regantify-text">
                    <option value="">Any</option>
                    {(labelCatalog ?? []).map((l) => (
                      <option key={l.name} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex items-center gap-1.5 text-xs text-neutral-500" title="Online store orders by where the shopper came from">
                Came from
                <select value={channel} onChange={(e) => setChannel(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-regantify-text">
                  <option value="">Any</option>
                  <option value="direct">Direct</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="qr">QR code</option>
                  <option value="shop">Regantify Shop</option>
                  <option value="other">Other websites</option>
                  <option value="untracked">Not tracked</option>
                  <optgroup label="Orders you entered">
                    {[...(channelCatalog?.builtIn ?? []), ...(channelCatalog?.custom ?? [])].map((c) => (
                      <option key={c} value={`manual:${c}`}>
                        {c}
                      </option>
                    ))}
                    <option value="manual:none">No channel chosen</option>
                  </optgroup>
                </select>
              </label>
              <button type="button" onClick={() => setCartLinkOpen(true)} className="h-9 rounded-lg border border-line bg-white px-2.5 text-xs text-neutral-600 hover:bg-neutral-50" title="Make a link that fills a customer's cart">
                Cart link
              </button>
              {isOwner && (
                <button type="button" onClick={() => setAssignSettingsOpen(true)} className="h-9 rounded-lg border border-line bg-white px-2.5 text-xs text-neutral-600 hover:bg-neutral-50" title="Give new orders to staff in turn">
                  Share out orders
                </button>
              )}
              <label className="flex items-center gap-1.5 text-xs text-neutral-500" title="Orders whose customer asked for this delivery day">
                Delivery day
                <input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm text-regantify-text" />
              </label>
              <button
                type="button"
                aria-pressed={expressOnly}
                onClick={() => setExpressOnly((v) => !v)}
                title="Orders the customer paid extra to get faster"
                className={`${toolbarBtn} ${expressOnly ? 'border-red-300 bg-red-50 text-red-800' : ''}`}
              >
                Express
              </button>
              <button
                type="button"
                aria-pressed={duplicatesOnly}
                onClick={() => setDuplicatesOnly((v) => !v)}
                title="Orders that look like a second copy of an open one (same phone and product within 24 hours)"
                className={`${toolbarBtn} ${duplicatesOnly ? 'border-red-300 bg-red-50 text-red-800' : ''}`}
              >
                <Copy size={15} />
                Possible duplicates
              </button>
              <button
                type="button"
                aria-pressed={mobileToCheck}
                onClick={() => setMobileToCheck((v) => !v)}
                title="Orders paid by bKash / Nagad to your own number whose transaction ID you haven't checked yet"
                className={`${toolbarBtn} ${mobileToCheck ? 'border-sky-300 bg-sky-50 text-sky-900' : ''}`}
              >
                <Wallet size={15} />
                Mobile payments to check
              </button>
              <button
                type="button"
                aria-pressed={risk !== ''}
                onClick={() => setRisk((v) => (v ? '' : 'MEDIUM_UP'))}
                title="Orders marked medium or high risk (earlier returns, a poor courier record, a big first order...)"
                className={`${toolbarBtn} ${risk ? 'border-red-300 bg-red-50 text-red-800' : ''}`}
              >
                <ShieldAlert size={15} />
                Risky orders
              </button>
              {canProfit && (
                <>
                  <button
                    type="button"
                    aria-pressed={lossOnly}
                    onClick={() => setLossOnly((v) => !v)}
                    title="Orders that lost money: profit under zero (newest 2,000)"
                    className={`${toolbarBtn} ${lossOnly ? 'border-red-300 bg-red-50 text-red-800' : ''}`}
                  >
                    <TrendingDown size={15} />
                    Loss-making
                  </button>
                  <button
                    type="button"
                    aria-pressed={showProfit}
                    onClick={toggleShowProfit}
                    title="Show the profit under each order's total"
                    className={`${toolbarBtn} ${showProfit ? 'border-green-300 bg-green-50 text-green-800' : ''}`}
                  >
                    Show profit
                  </button>
                </>
              )}
          {canCourier && (
            <button type="button" onClick={() => navigate('/vendor/orders/rider-cash')} className={toolbarBtn} title="Cash your own delivery riders collected and handed in">
              <Wallet size={15} />
              Rider cash
            </button>
          )}

          {(
            <button type="button" onClick={() => navigate('/vendor/orders/standing')} className={toolbarBtn} title="Regular customers whose same order is made again for you every week or month">
              <CalendarClock size={15} />
              Standing orders
            </button>
          )}

          {(
            <button type="button" onClick={() => navigate('/vendor/orders/refunds')} className={toolbarBtn} title="Customers who paid online for a cancelled or returned order and are still owed their money">
              <HandCoins size={15} />
              Refunds to pay
            </button>
          )}

          {canEdit && (
            <button type="button" onClick={() => navigate('/vendor/orders/return-check-in')} className={toolbarBtn} title="Count returned parcels back in and sort the stock">
              <ClipboardCheck size={15} />
              Return check-in
            </button>
          )}

          {canEdit && (
            <button type="button" onClick={() => navigate('/vendor/orders/tracking-bulk')} className={toolbarBtn} title="Paste your courier’s list of tracking IDs and mark them delivered or returned">
              <ListChecks size={15} />
              Bulk by tracking ID
            </button>
          )}
          </div>
        )}

        {/* Status tabs */}
        {!trashView && (
          <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-lg border border-line p-1">
            {/* A status opened from a link but not among the vendor's tabs still shows, as the active one. */}
            {(['ALL', ...tabs, ...(activeTab !== 'ALL' && activeTab !== 'ABANDONED' && !tabs.includes(activeTab) ? [activeTab] : []), 'ABANDONED'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`h-8 shrink-0 whitespace-nowrap rounded-md px-3 text-sm transition-colors ${
                  activeTab === t ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {t === 'ALL' ? 'All' : t === 'ABANDONED' ? 'Abandoned Cart' : orderStatusLabel(t)}
              </button>
            ))}
            {canEdit && (
              <button
                onClick={() => setCustomizeOpen(true)}
                title="Customize tabs"
                aria-label="Customize tabs"
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text"
              >
                <Settings2 size={15} />
              </button>
            )}
          </div>
        )}

        {activeTab === 'ABANDONED' ? (
          <AbandonedCart />
        ) : (
          <>
            {courierBooking && !trashView && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-neutral-50 px-3 py-2 text-sm">
                <Truck size={15} className="text-neutral-500" aria-hidden />
                <span className="text-neutral-600">Showing only</span>
                <span className="font-medium text-regantify-text">
                  {courierBooking === 'NOT_BOOKED' ? 'orders not sent to a courier yet' : 'orders whose courier booking failed'}
                </span>
                <button
                  type="button"
                  onClick={clearCourierBooking}
                  className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-neutral-600 hover:bg-white hover:text-regantify-text"
                >
                  <X size={13} />
                  Clear filter
                </button>
              </div>
            )}
            {/* Bulk action bar */}
            {!trashView && selectedIds.size > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand-lime bg-brand-lime/30 px-3 py-2">
                <span className="mr-1 text-sm font-medium text-regantify-text">{selectedIds.size} selected</span>
                {canEdit && (
                  <BulkStatusMenu ids={[...selectedIds]} canCancel={canCancelRefund} className={bulkBtn} onDone={() => setSelectedIds(new Set())} />
                )}
                <button type="button" onClick={sendSelectedToPathao} className={bulkBtn}>
                  {!otherCouriersAllowed ? <LockedBadge /> : <Send size={13} />}
                  Send to Pathao
                </button>
                <button type="button" onClick={sendSelectedToSteadfast} className={bulkBtn}>
                  <Send size={13} />
                  Send to SteadFast
                </button>
                <button type="button" onClick={sendSelectedToRedx} className={bulkBtn}>
                  {!otherCouriersAllowed ? <LockedBadge /> : <Send size={13} />}
                  Send to RedX
                </button>
                <button type="button" onClick={sendSelectedToCarrybee} className={bulkBtn}>
                  {!otherCouriersAllowed ? <LockedBadge /> : <Send size={13} />}
                  Send to CarryBee
                </button>
                <button type="button" onClick={() => setPrintingInvoices([...selectedIds])} className={bulkBtn}>
                  <Printer size={13} />
                  Print invoices
                </button>
                <button type="button" onClick={() => openPathaoLabels([...selectedIds])} className={bulkBtn}>
                  <Printer size={13} />
                  Print Pathao labels
                </button>
                {adv && (
                  <>
                {(assignment.data?.staff.length ?? 0) > 0 && (
                  <button type="button" onClick={() => setAssigningIds([...selectedIds])} className={bulkBtn} title="Who handles these orders">
                    Assign
                  </button>
                )}
                <button type="button" onClick={() => setPrintingPacking([...selectedIds])} className={bulkBtn} title="Pick list and packing slips for whoever packs">
                  <Package size={13} />
                  Packing list
                </button>
                <button type="button" onClick={() => setLabelIds([...selectedIds])} className={bulkBtn} title="Put your own colored labels on these orders">
                  <Tag size={13} />
                  Labels
                </button>
                <button type="button" onClick={() => setPrintingStickers([...selectedIds])} className={bulkBtn} title="A sticker for the parcel: address, phone, cash to collect, barcode">
                  <Printer size={13} />
                  Parcel stickers
                </button>
                {canCourier && (
                  <button type="button" onClick={() => navigate('/vendor/orders/handover', { state: { orderIds: [...selectedIds] } })} className={bulkBtn}>
                    <Truck size={13} />
                    Handover sheet
                  </button>
                )}
                  </>
                )}
                <button type="button" onClick={toggleAdvanced} className={bulkBtn}>
                  {adv ? 'Fewer options' : 'More options'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-neutral-600 hover:bg-white"
                >
                  <X size={13} />
                  Clear
                </button>
              </div>
            )}

            {!trashView && deliveryStats && (!deliveryStats.pathaoConnected || deliveryStats.pathaoNeedsLogin) && (
              <div className="mb-3 rounded-lg border border-line bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                {!deliveryStats.pathaoConnected ? (
                  <>
                    <Link to="/vendor/courier/pathao" className="font-medium text-brand underline">
                      Connect Pathao
                    </Link>{' '}
                    to see each customer’s delivery history with Pathao — free on every plan.
                  </>
                ) : (
                  <>
                    Add your Pathao email and password in{' '}
                    <Link to="/vendor/courier/pathao" className="font-medium text-brand underline">
                      Courier Integration › Pathao
                    </Link>{' '}
                    so the Pathao delivery history can load.
                  </>
                )}
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[1000px] border-collapse text-[14px]">
                <thead>
                  <tr className="bg-neutral-50 text-neutral-600">
                    {!trashView && (
                      <th className="w-10 border-r border-line p-3">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          disabled={orders.length === 0}
                          onChange={() => setSelectedIds(allOnPageSelected ? new Set() : new Set(orders.map((o) => o.id)))}
                          aria-label="Select all orders on this page"
                          className="h-4 w-4 cursor-pointer accent-brand"
                        />
                      </th>
                    )}
                    <th className={th}>Invoice</th>
                    <th className={th}>Status</th>
                    <th className={th}>Customer</th>
                    <th className={th}>Address</th>
                    <th className={th}>Items</th>
                    <th className={th}>Total</th>
                    <th className={`${th} w-16`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: Math.min(perPage, 5) }).map((_, i) => (
                      <tr key={`sk-${i}`} className="border-t border-line">
                        <td colSpan={columnCount} className="p-3">
                          <div className="h-10 w-full animate-pulse rounded-md bg-neutral-100" />
                        </td>
                      </tr>
                    ))
                  ) : orders.length === 0 ? (
                    <tr className="border-t border-line">
                      <td colSpan={columnCount} className="px-3 py-16 text-center">
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                          {trashView ? <Trash2 size={20} /> : <ClipboardList size={20} />}
                        </div>
                        <p className="mt-2 text-sm font-medium text-regantify-text">
                          {trashView ? 'Trash is empty.' : 'No orders found.'}
                        </p>
                        {!trashView && (search || dateFrom || dateTo || callStatus || courierBooking || source || duplicatesOnly || risk || preferredDate || lossOnly || expressOnly || assignee || preOrder || channel || labelFilter) && (
                          <p className="mt-1 text-xs text-neutral-500">Try changing your search or filters.</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        profit={profitById.get(order.id)}
                        trashView={trashView}
                        onCheckHistory={setHistoryPhone}
                        onChangeLabel={setLabelOrder}
                        onShowInvoice={setInvoiceOrder}
                        otherCouriersAllowed={otherCouriersAllowed}
                        connectedProviders={connectedProviders}
                        onRequestSetup={(provider, retry) => setSetupPending({ provider, retry })}
                        onBookPathao={(o) => setPathaoBookingOrderId(o.id)}
                        onShowTimeline={setTimelineOrder}
                        onRequestReturn={setReturnOrder}
                        onCancelRedx={setCancelRedxOrder}
                        onCancelCarrybee={setCancelCarrybeeOrder}
                        onPickCarrybeePlace={setCarrybeePlaceOrder}
                        selected={selectedIds.has(order.id)}
                        deliveryStats={deliveryStats?.byPhone[order.customerPhone]}
                        onToggleSelect={trashView || !canCourier ? undefined : toggleSelected}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TableFooter page={page} perPage={perPage} total={total} onPageChange={setPage} onPerPageChange={setPerPage} />
          </>
        )}
      </section>

      <CustomizeTabsModal
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        currentTabs={tabs}
        onSave={(statuses) => tabsMutation.mutate(statuses)}
        saving={tabsMutation.isPending}
      />
      <CheckHistoryModal phone={historyPhone} onOpenChange={(open) => !open && setHistoryPhone(null)} />
      <ChangeLabelModal
        open={Boolean(labelOrder)}
        onOpenChange={(open) => !open && setLabelOrder(null)}
        currentLabel={labelOrder?.label}
        onSave={(label) => labelOrder && labelMutation.mutate({ id: labelOrder.id, label })}
        saving={labelMutation.isPending}
      />
      <InvoiceModal order={invoiceOrder} onOpenChange={(open) => !open && setInvoiceOrder(null)} />
      <BulkInvoicePrint ids={printingInvoices ?? []} open={printingInvoices !== null} onOpenChange={(open) => !open && setPrintingInvoices(null)} />
      <OrderLabelsDialog ids={labelIds ?? []} open={labelIds !== null} onOpenChange={(open) => !open && setLabelIds(null)} onDone={() => setSelectedIds(new Set())} />
      <ParcelLabelPrint ids={printingStickers ?? []} open={printingStickers !== null} onOpenChange={(open) => !open && setPrintingStickers(null)} />
      <PackingListPrint ids={printingPacking ?? []} open={printingPacking !== null} onOpenChange={(open) => !open && setPrintingPacking(null)} />
      <BulkAssignDialog ids={assigningIds ?? []} open={assigningIds !== null} onOpenChange={(open) => !open && setAssigningIds(null)} onDone={() => setSelectedIds(new Set())} />
      <AssignSettingsDialog open={assignSettingsOpen} onOpenChange={setAssignSettingsOpen} />
      <CartLinkDialog open={cartLinkOpen} onOpenChange={setCartLinkOpen} />
      <Dialog
        open={timelineOrder != null}
        onOpenChange={(open) => !open && setTimelineOrder(null)}
        title={timelineOrder ? `${orderRef(timelineOrder)} · Courier timeline` : undefined}
        maxWidth="max-w-md"
      >
        <div className="p-6 pt-4">{timelineOrder && <CourierTimeline orderId={timelineOrder.id} showEmpty />}</div>
      </Dialog>
      <SteadfastReturnDialog order={returnOrder} onClose={() => setReturnOrder(null)} />
      <RedxCancelDialog order={cancelRedxOrder} onClose={() => setCancelRedxOrder(null)} />
      <CarrybeeCancelDialog order={cancelCarrybeeOrder} onClose={() => setCancelCarrybeeOrder(null)} />
      <CarrybeePlaceDialog order={carrybeePlaceOrder} onClose={() => setCarrybeePlaceOrder(null)} />
      <PathaoBookingModal orderId={pathaoBookingOrderId} onOpenChange={(open) => !open && setPathaoBookingOrderId(null)} />
      <PathaoBulkBookDialog
        provider={bulkBooking?.provider}
        orderIds={bulkBooking?.ids ?? null}
        onClose={() => setBulkBooking(null)}
        onDone={() => setSelectedIds(new Set())}
      />
      <CourierSetupModal
        provider={setupPending?.provider ?? null}
        onOpenChange={(open) => !open && setSetupPending(null)}
        onConnected={() => {
          // Re-run whatever action (courier selection or booking)
          // triggered the popup — the vendor shouldn't have to re-click
          // after connecting (COURIER-PLAN.md §5.2).
          setupPending?.retry();
          setSetupPending(null);
        }}
      />
    </div>
  );
}
