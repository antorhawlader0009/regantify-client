import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  History,
  MoreVertical,
  ListChecks,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Send,
  Settings2,
  Tag,
  Trash2,
  Truck,
  Undo2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { orderRef, ordersApi, paymentMethodLabel, vendorOrderTotal, type Order, type OrderStatus, type CourierProvider, type ListOrdersParams } from '../../../lib/ordersApi';
import { lmsApi } from '../../../lib/lmsApi';
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
import { CourierTimeline } from '../../../components/courier/CourierTimeline';
import { SteadfastReturnDialog, steadfastReturnable } from '../../../components/courier/SteadfastReturnDialog';
import { RedxCancelDialog } from '../../../components/courier/RedxCancelDialog';
import { CourierSetupModal } from '../../../components/courier/CourierSetupModal';
import { PathaoBookingModal } from '../../../components/courier/PathaoBookingModal';
import { PathaoBulkBookDialog } from '../../../components/courier/PathaoBulkBookDialog';
import { CustomerDeliveryStats } from '../../../components/courier/CustomerDeliveryStats';
import type { PhoneCourierStats } from '../../../lib/ordersApi';
import { toast } from '../../../lib/toast';
import { ALL_ORDER_STATUSES, DEFAULT_TABS, OrderStatusBadge, orderStatusLabel } from './orderStatus';
import { CustomizeTabsModal } from './CustomizeTabsModal';
import AbandonedCart from './AbandonedCart';
import { CheckHistoryModal } from './CheckHistoryModal';
import { ChangeLabelModal } from './ChangeLabelModal';
import { InvoiceModal } from './InvoiceModal';
import { DateRangeFilter } from './DateRangeFilter';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';
import { SearchBox, TableFooter, outlineBtn, td, th } from '../../../components/ui/PageKit';
import { NeedsAttention } from '../../../components/order/NeedsAttention';
import { CourierStatusBadge } from '../../../components/courier/courierStatus';

// Table + toolbar pieces come from PageKit; the bulk bar's smaller buttons are Orders' own.
const toolbarBtn = outlineBtn;
const bulkBtn =
  'inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text transition-colors hover:border-neutral-300';

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
};

type BookableCourier = Exclude<CourierProvider, 'NONE'>;

// Order in the "Send to courier" menu: the free one first.
const BOOKABLE_COURIERS: BookableCourier[] = ['STEADFAST', 'PATHAO', 'REDX'];

const COURIER_SHORT: Record<BookableCourier, string> = {
  PATHAO: 'Pathao',
  STEADFAST: 'SteadFast',
  REDX: 'RedX',
};

const COURIER_SEND_HINT: Record<BookableCourier, string> = {
  STEADFAST: 'One click, with your SteadFast defaults',
  PATHAO: 'Opens the booking window',
  REDX: 'One click, with your RedX defaults',
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
  // Row checkbox for bulk "Send to Pathao" (pathao-plan.md Step 11).
  // Undefined in the trash view, which has no bulk actions.
  selected?: boolean;
  onToggleSelect?: (orderId: string) => void;
  // The customer's delivery record lines (pathao-plan.md Step 15); loaded once per page.
  deliveryStats?: PhoneCourierStats;
}

function OrderRow({
  order,
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
  selected,
  onToggleSelect,
  deliveryStats,
}: OrderRowProps) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(order.id, status),
    onSuccess: () => {
      invalidate();
      toast.success('Order status updated.');
    },
    onError: () => toast.error('Could not update the order status. Please try again.'),
  });

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
        <p className="mt-0.5 text-xs text-neutral-500">
          #{order.invoiceNumber} · {formatDateTime(order.createdAt)}
        </p>
        {order.label && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded border border-brand-lime bg-brand-lime/40 px-1.5 py-0.5 text-[11px] font-medium text-brand">
            <Tag size={10} />
            {order.label}
          </span>
        )}
      </td>
      <td className={td}>
        <OrderStatusBadge status={order.status} />
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
          <button
            type="button"
            onClick={() => copyPhone(order.customerPhone)}
            aria-label="Copy phone number"
            title="Copy phone number"
            className="text-neutral-400 transition hover:text-neutral-700"
          >
            <Copy size={11} />
          </button>
        </p>
        <CustomerDeliveryStats stats={deliveryStats} compact />
        <button
          onClick={() => onCheckHistory(order.customerPhone)}
          className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
        >
          Check History
        </button>
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
            <img src={firstItem.productImage} alt="" className="h-10 w-10 shrink-0 rounded border border-line bg-neutral-100 object-cover" />
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
            <DropdownMenuItem icon={<RotateCcw />} onSelect={() => trashMutation.mutate()}>
              Restore
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem icon={<FileText />} hint="View, print or download" onSelect={() => onShowInvoice(order)}>
                Invoice
              </DropdownMenuItem>
              <DropdownMenuSub icon={<ListChecks />} label="Change status" value={orderStatusLabel(order.status)}>
                {ALL_ORDER_STATUSES.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    disabled={status === order.status || statusMutation.isPending}
                    icon={status === order.status ? <Check /> : <span className="block w-4" />}
                    onSelect={() => statusMutation.mutate(status)}
                  >
                    {orderStatusLabel(status)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSub>
              <DropdownMenuItem icon={<Tag />} onSelect={() => onChangeLabel(order)}>
                Change label
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>
                Courier{assigned ? ` · ${COURIER_SHORT[order.courierProvider as BookableCourier]}` : ''}
              </DropdownMenuLabel>

              {booked ? (
                <>
                  <DropdownMenuItem icon={<RefreshCw />} disabled={refreshStatusMutation.isPending} onSelect={() => refreshStatusMutation.mutate()}>
                    {refreshStatusMutation.isPending ? 'Refreshing…' : 'Refresh delivery status'}
                  </DropdownMenuItem>
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
                  {order.courierProvider === 'PATHAO' && (
                    <DropdownMenuItem icon={<Printer />} onSelect={() => openPathaoLabels([order.id])}>
                      Print shipping label
                    </DropdownMenuItem>
                  )}
                  {order.courierProvider === 'STEADFAST' && steadfastReturnable(order.courierStatus) && (
                    <DropdownMenuItem icon={<Undo2 />} onSelect={() => onRequestReturn(order)}>
                      Request return
                    </DropdownMenuItem>
                  )}
                  {order.courierProvider === 'REDX' && redxCancellable(order.courierStatus) && (
                    <DropdownMenuItem icon={<XCircle />} hint="Only before RedX picks it up" onSelect={() => onCancelRedx(order)}>
                      Cancel parcel
                    </DropdownMenuItem>
                  )}
                </>
              ) : bookingNow ? (
                <DropdownMenuItem icon={<Truck />} disabled onSelect={() => undefined}>
                  Booking…
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

              <DropdownMenuSeparator />
              <DropdownMenuItem danger icon={<Trash2 className="text-red-500" />} onSelect={() => trashMutation.mutate()}>
                Send to Trash
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const [source, setSource] = useState<ListOrdersParams['source'] | ''>('');
  const lmsMe = useQuery({ queryKey: ['lms', 'me'], queryFn: lmsApi.me, retry: false, staleTime: 5 * 60_000 });
  const lmsOn = !!lmsMe.data?.enabled;
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [historyPhone, setHistoryPhone] = useState<string | null>(null);
  const [labelOrder, setLabelOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [pathaoBookingOrderId, setPathaoBookingOrderId] = useState<string | null>(null);
  const [timelineOrder, setTimelineOrder] = useState<Order | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [cancelRedxOrder, setCancelRedxOrder] = useState<Order | null>(null);
  // COURIER-PLAN.md §5.2 — the "not connected → setup popup" flow.
  // setupPending holds the action (courier selection or booking) that
  // triggered the popup, so it can run automatically once the vendor
  // connects instead of making them re-click. null closes the modal.
  const [setupPending, setSetupPending] = useState<{ provider: CourierAccountProvider; retry: () => void } | null>(null);

  useEffect(() => setPage(1), [search, activeTab, perPage, dateFrom, dateTo, trashView, callStatus, courierBooking, source]);

  // Bulk "Send to Pathao" (pathao-plan.md Step 11). The selection is
  // per page: changing page or filters clears it, so a vendor never
  // books orders they can no longer see.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
    queryKey: ['orders', { search, activeTab, page, perPage, dateFrom, dateTo, trashView, callStatus: lmsOn ? callStatus : '', courierBooking, source }],
    queryFn: () =>
      ordersApi.list({
        search: search.trim() || undefined,
        status: activeTab === 'ALL' || activeTab === 'ABANDONED' ? undefined : activeTab,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        trashOnly: trashView,
        callStatus: (lmsOn && callStatus) || undefined,
        courierBooking,
        source: source || undefined,
        page,
        perPage,
      }),
    enabled: activeTab !== 'ABANDONED',
  });

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const allOnPageSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));

  // Customer delivery records for this page's phones (Step 15). A number
  // seen for the first time is looked up in the background (`pending`),
  // so the list asks again a couple of times until those arrive.
  const pagePhones = [...new Set(orders.map((o) => o.customerPhone))].sort();
  const { data: deliveryStats } = useQuery({
    queryKey: ['customer-courier-stats', pagePhones],
    queryFn: () => ordersApi.getCustomerCourierStats(pagePhones),
    enabled: pagePhones.length > 0 && !trashView,
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

  // SteadFast is free on every plan, so no upgrade check here.
  function sendSelectedToSteadfast() {
    const ids = [...selectedIds];
    if (!connectedProviders?.has('STEADFAST')) {
      setSetupPending({ provider: 'STEADFAST', retry: () => setBulkBooking({ provider: 'STEADFAST', ids }) });
      return;
    }
    setBulkBooking({ provider: 'STEADFAST', ids });
  }

  return (
    <div>
      {!trashView && activeTab !== 'ABANDONED' && <NeedsAttention />}
      <section className="rounded-xl border border-line bg-white p-3.5">
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
                  onChange={(e) => setSource(e.target.value as ListOrdersParams['source'] | '')}
                  className={`${toolbarBtn} appearance-none pr-8`}
                >
                  <option value="">All sources</option>
                  <option value="STOREFRONT">Online store</option>
                  <option value="MANUAL">Added by hand</option>
                  <option value="POS">POS (counter)</option>
                </select>
                <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-3" />
              </div>
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
              <button
                onClick={() => setTrashView((v) => !v)}
                className={`${toolbarBtn} ${trashView ? 'border-neutral-300 bg-neutral-50' : ''}`}
              >
                {trashView ? <ArrowLeft size={15} /> : <Trash2 size={15} />}
                {trashView ? 'Back to Orders' : 'Trash'}
              </button>
            </>
          )}

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
        </div>

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
            <button
              onClick={() => setCustomizeOpen(true)}
              title="Customize tabs"
              aria-label="Customize tabs"
              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text"
            >
              <Settings2 size={15} />
            </button>
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
                <button type="button" onClick={() => openPathaoLabels([...selectedIds])} className={bulkBtn}>
                  <Printer size={13} />
                  Print Pathao labels
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
                        {!trashView && (search || dateFrom || dateTo || callStatus || courierBooking || source) && (
                          <p className="mt-1 text-xs text-neutral-500">Try changing your search or filters.</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
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
                        selected={selectedIds.has(order.id)}
                        deliveryStats={deliveryStats?.byPhone[order.customerPhone]}
                        onToggleSelect={trashView ? undefined : toggleSelected}
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
