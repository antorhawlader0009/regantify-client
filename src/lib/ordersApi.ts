import { api } from './api';
import type { CloseReasonCode, OrderCloseReason } from './closeReasons';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'PAYMENT_INITIATED'
  | 'PARTIAL_PAYMENT_PENDING'
  | 'PAYMENT_FAILED'
  | 'CANCELLED'
  | 'RETURN'
  | 'REFUNDED'
  | 'STOCK_OUT';

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  productSku: string;
  productImage?: string | null;
  selectedOptions: Record<string, string>;
  listPrice: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  // Live product snapshot for the "view on storefront" link — null when
  // the product was since deleted, or DRAFT (no public page to link to).
  // See OrdersService.itemsInclude.
  product?: { slug: string; visibility: 'PUBLIC' | 'DRAFT' } | null;
}

export type CourierProvider = 'NONE' | 'PATHAO' | 'STEADFAST' | 'REDX';

// Real-booking lifecycle for courierProvider — see COURIER-PLAN.md
// §2.4/§3.4. Distinct from OrderStatus: courierProvider/
// courierBookingStatus track the courier API side, OrderStatus is the
// vendor-facing pipeline stage (which a successful courier sync can also
// update, via applyStatusUpdate on the server).
// CANCELLED = the courier cancelled the pickup on its side; re-bookable.
export type CourierBookingStatus = 'NOT_BOOKED' | 'BOOKING' | 'BOOKED' | 'FAILED' | 'CANCELLED';

export interface Order {
  id: string;
  vendorId: string;
  invoiceNumber: number;
  /** Public order number ("FAS-261003-7K3M9QD"): what shoppers and couriers see. invoiceNumber is the store's own serial. Null on an order the backfill has not reached. */
  publicCode?: string | null;
  /** POS = sold over the counter (POS-system-plan.md). */
  source: 'STOREFRONT' | 'MANUAL' | 'POS';
  /** POS sales only: who rang it up (snapshot). */
  posCashierName?: string | null;
  status: OrderStatus;
  label?: string | null;
  courierProvider: CourierProvider;
  courierConsignmentId?: string | null;
  courierTrackingCode?: string | null;
  /** Private tracking link token: the shopper opens /t/{token} on the store without typing a phone. Null on orders older than the link until the backfill has run. */
  trackingToken?: string | null;
  /** Own delivery or a courier with no integration (tracking-plan.md Step 6); used only while courierProvider is NONE. */
  manualCourierName?: string | null;
  manualTrackingId?: string | null;
  manualTrackingUrl?: string | null;
  manualRiderName?: string | null;
  manualRiderPhone?: string | null;
  /** shipped | out_for_delivery | failed | delivered: where the vendor last said the parcel is. */
  manualStage?: string | null;
  /** SteadFast only: the tracking page link SteadFast gave at booking. Null for parcels booked before it was saved. */
  courierTrackingUrl?: string | null;
  courierBookingStatus: CourierBookingStatus;
  courierBookingError?: string | null;
  courierLastSyncedAt?: string | null;
  // Live courier tracking (pathao-plan.md Step 6): the courier's own raw
  // status ("Pickup_Requested") and the money it reports.
  courierStatus?: string | null;
  courierBookedAt?: string | null;
  courierCodAmount?: string | null;
  courierDeliveryFee?: string | null;
  courierCollectedAmount?: string | null;
  courierInvoiceId?: string | null;
  courierPaidAt?: string | null;
  deletedAt?: string | null;
  customerName: string;
  customerPhone: string;
  customerPhoneAlt?: string | null;
  customerEmail?: string | null;
  customerNote?: string | null;
  staffNote?: string | null;
  shippingAddress: string;
  shippingZip?: string | null;
  shippingCity?: string | null;
  shippingDistrict?: string | null;
  // Pathao-specific numeric location IDs, set via PathaoLocationPicker —
  // see COURIER-PLAN.md §3.2/§7 Phase 2. Independent of the free-text
  // shippingCity/shippingDistrict above.
  pathaoCityId?: number | null;
  pathaoZoneId?: number | null;
  pathaoAreaId?: number | null;
  // RedX's single delivery-area id, set via RedxLocationPicker — RedX
  // has only one location tier, unlike Pathao's city/zone/area cascade.
  redxAreaId?: number | null;
  deliveryZone: 'DHAKA' | 'OUTSIDE_DHAKA' | 'AROUND_DHAKA';
  subtotal: string;
  deliveryCharge: string;
  // Flat VAT fee, shown to shoppers as "VAT" (StorePal) — applied to
  // every order regardless of paymentMethod. See Vendor.vatChargeBdt /
  // Order.vatAmount in schema.prisma.
  vatAmount: string;
  /** True on a POS sale whose prices already include VAT: vatAmount is part of the subtotal, shown as "includes VAT", never added. */
  vatIncluded?: boolean;
  // Store > Payment Gateway's per-gateway Platform Charge — independent
  // of vatAmount above. See VendorPaymentGateway.platformChargeBdt /
  // Order.platformChargeAmount in schema.prisma. Always the real amount
  // charged, regardless of who actually paid it (see platformChargePayer)
  // or platformChargeHidden below (a storefront-display-only flag, only
  // meaningful when platformChargePayer is CUSTOMER).
  platformChargeAmount: string;
  // "Fee From" — CUSTOMER (included in `total`, the shopper's own
  // charge) or VENDOR (never shown to the shopper anywhere, comes out of
  // this vendor's own payout instead at completion — see
  // Order.platformChargePayer's own schema comment). For ONLINE_PAYMENT
  // the fee is hidden from the vendor entirely — see vendorOrderTotal.
  platformChargePayer: 'CUSTOMER' | 'VENDOR';
  platformChargeHidden: boolean;
  discountAmount: string;
  discountLabel?: string | null;
  total: string;
  paymentMethod: string;
  /**
   * Delivery charge (or any part of the total) paid before delivery on a COD order: the courier
   * collects only total - advanceAmount (see codDue). ONLINE = paid through the store's PayStation,
   * MANUAL = taken by the vendor outside the platform. advancePaidAt null with an ONLINE advance means
   * the shopper hasn't paid it yet (the order waits as "Incomplete Payment").
   */
  advanceAmount?: string;
  advanceMethod?: 'ONLINE' | 'MANUAL' | null;
  advancePaidAt?: string | null;
  advanceNote?: string | null;
  /** Order detail only: Customers > "Note & tags" on this phone; null when there are none. */
  vendorCustomerNote?: { note: string | null; tags: string[] } | null;
  /** What an online advance is for (DELIVERY = delivery charge, PREORDER = pre-order products); null = no advance. */
  advanceFor?: 'DELIVERY' | 'PREORDER' | null;
  /** The earlier order this one may be a copy of (same phone and product within 24 hours); null = not flagged. */
  possibleDuplicateOfId?: string | null;
  /** Order detail only: that earlier order's summary, for the warning box. */
  possibleDuplicateOf?: { id: string; invoiceNumber: number; publicCode?: string | null; status: OrderStatus; createdAt: string } | null;
  /** Order detail only: why it was cancelled / returned / failed; null while it is in none of those states. */
  closeReason?: OrderCloseReason | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * order.total as the vendor dashboard shows it. The ONLINE_PAYMENT fee
 * (Payment Gateway Fee) is hidden from the vendor everywhere, so when the
 * customer paid it (it's inside `total`) it's taken back out. A
 * vendor-paid fee was never in `total`. Other gateways are unchanged.
 */
export function vendorOrderTotal(
  order: Pick<Order, 'total' | 'paymentMethod' | 'platformChargeAmount' | 'platformChargePayer'>,
): string {
  if (order.paymentMethod !== 'ONLINE_PAYMENT' || order.platformChargePayer !== 'CUSTOMER') return order.total;
  return String(Math.round((Number(order.total) - Number(order.platformChargeAmount)) * 100) / 100);
}

/** What has really been paid in advance (a still-pending online advance counts as nothing). */
export function advancePaid(order: Pick<Order, 'advanceAmount' | 'advancePaidAt'>): number {
  return order.advancePaidAt ? Number(order.advanceAmount ?? 0) : 0;
}

/** The cash still to collect on delivery for a COD order, as the courier is told it; 0 for any other payment method. */
export function codDue(order: Pick<Order, 'total' | 'paymentMethod' | 'advanceAmount' | 'advancePaidAt'>): number {
  if (order.paymentMethod !== 'COD') return 0;
  return Math.max(0, Math.round(Number(order.total)) - Math.round(advancePaid(order)));
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface CustomerHistoryOrder {
  id: string;
  invoiceNumber: number;
  status: OrderStatus;
  total: string;
  createdAt: string;
  storeName: string;
}

export interface CustomerHistory {
  phone: string;
  totalResolved: number;
  successRate: number | null;
  orders: CustomerHistoryOrder[];
}

/** One source's delivery record for a phone (pathao-plan.md Step 15). */
export interface CourierStatLine {
  successful: number;
  returned: number;
  total: number;
}

/** One courier's network-wide record for a phone (Pathao / SteadFast). */
export type CourierCheckLine = CourierStatLine & {
  fetchedAt: string | null;
  pending: boolean;
  error: string | null;
  /** SteadFast only: merchants who reported this number as fraud. */
  fraudReports: number;
  /** SteadFast only (null for Pathao). SteadFast gives percents, not counts, so its successful/returned/total are always 0. */
  steadfastScore: SteadfastScore | null;
};

export interface SteadfastScore {
  /** Whole % of the number's finished parcels delivered; null = nothing has finished (unknown, not a clean record). */
  deliveryRatio: number | null;
  cancellationRatio: number | null;
  /** none / low (1-5) / medium (6-20) / high (21-200) / very_high (200+) finished parcels. */
  volumeBand: string | null;
  /** Report code → times reported, worst first. */
  fraudCategories: Record<string, number>;
}

export interface PhoneCourierStats {
  storepal: CourierStatLine;
  /** null = this vendor has no Pathao account connected. */
  pathao: CourierCheckLine | null;
  /** null = this vendor has no SteadFast account connected. */
  steadfast: CourierCheckLine | null;
}

/** POST /v1/orders/customer-courier-stats */
export interface CustomerCourierStats {
  pathaoConnected: boolean;
  steadfastConnected: boolean;
  /** Connected, but no backup email/password saved — Pathao's lookup may refuse the API token. */
  pathaoNeedsLogin: boolean;
  loginErrorCode: string;
  byPhone: Record<string, PhoneCourierStats>;
}

export interface ListOrdersParams {
  search?: string;
  status?: OrderStatus;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  trashOnly?: boolean;
  /** LMS confirmation call (LMS-plan.md Step 14). */
  callStatus?: 'WAITING' | 'CONFIRMED' | 'CANCELLED' | 'NONE';
  /** Not sent to a courier yet, or a failed booking still to fix (finished orders left out). */
  courierBooking?: 'NOT_BOOKED' | 'FAILED';
  /** Where it came from: the online store, added by hand, or sold at the counter (POS). */
  source?: 'STOREFRONT' | 'MANUAL' | 'POS';
  /** Only orders marked as a possible duplicate of an earlier one. */
  possibleDuplicate?: boolean;
  page?: number;
  perPage?: number;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  perPage: number;
}

export interface OrderItemInput {
  productId?: string;
  variantId?: string;
  productName: string;
  productSku?: string;
  productImage?: string;
  selectedOptions?: Record<string, string>;
  listPrice: number;
  unitPrice: number;
  quantity: number;
}

/** What the Orders list can set on many orders at once (BULK_ORDER_STATUSES on the server). */
export type BulkOrderStatus = 'PROCESSING' | 'ON_HOLD' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED' | 'STOCK_OUT';

export interface BulkStatusResult {
  updated: number;
  skipped: { id: string; ref: string; reason: string }[];
}

/** One line after "Edit items" (UpdateOrderItemsDto on the server). */
export interface EditOrderItemInput {
  productId?: string;
  variantId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface UpdateOrderItemsPayload {
  items: EditOrderItemInput[];
  deliveryCharge?: number;
}

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerPhoneAlt?: string;
  customerEmail?: string;
  customerNote?: string;
  staffNote?: string;
  shippingAddress: string;
  shippingZip?: string;
  shippingCity?: string;
  shippingDistrict?: string;
  deliveryZone?: 'DHAKA' | 'OUTSIDE_DHAKA' | 'AROUND_DHAKA';
  // Optional Pathao location (Add Order) — City → Zone → Area, may stop early.
  pathaoCityId?: number;
  pathaoZoneId?: number;
  pathaoAreaId?: number;
  items: OrderItemInput[];
  deliveryCharge?: number;
  discountAmount?: number;
  discountLabel?: string;
  /** Order detail "Exchange": this order replaces items from that earlier one (noted on its history). */
  exchangeForOrderId?: string;
  /** Part of the total already received outside the platform (e.g. the delivery charge on your own bKash). */
  advanceAmount?: number;
  advanceNote?: string;
}

export const ordersApi = {
  list: (params: ListOrdersParams = {}) =>
    api.get<OrderListResponse>('/v1/orders', { params }).then((r) => r.data),

  findOne: (id: string) => api.get<Order>(`/v1/orders/${id}`).then((r) => r.data),

  /** A marker that changes when any order of the store does; polled by useOrdersAutoRefresh. */
  pulse: () => api.get<{ marker: string }>('/v1/orders/pulse').then((r) => r.data),

  create: (payload: CreateOrderPayload) =>
    api.post<Order>('/v1/orders', payload).then((r) => r.data),

  /** `correction`: the owner's "Correct a mistake", outside the forward-only flow (needs a `note`). */
  updateStatus: (id: string, status: OrderStatus, note?: string, correction?: boolean, reasonCode?: CloseReasonCode) =>
    api.patch<Order>(`/v1/orders/${id}/status`, { status, note, ...(correction && { correction: true }), ...(reasonCode && { reasonCode }) }).then((r) => r.data),

  /** "Add the reason" on an order that was cancelled / returned / failed without one (or to change it). */
  setCloseReason: (id: string, reasonCode: CloseReasonCode) =>
    api.patch<OrderCloseReason>(`/v1/orders/${id}/close-reason`, { reasonCode }).then((r) => r.data),

  /** "Edit items": replaces the whole item list of a COD order not yet booked with a courier; the server works out the total and stock again. */
  updateItems: (id: string, payload: UpdateOrderItemsPayload) =>
    api.patch<Order>(`/v1/orders/${id}/items`, payload).then((r) => r.data),

  /** Orders list "Change status" for many orders; ones that can't move are skipped with a reason. */
  bulkUpdateStatus: (ids: string[], status: BulkOrderStatus, note?: string, reasonCode?: CloseReasonCode) =>
    api.post<BulkStatusResult>('/v1/orders/bulk-status', { ids, status, note, ...(reasonCode && { reasonCode }) }).then((r) => r.data),

  /** "Advance received": amount 0 clears it. */
  updateAdvance: (id: string, amount: number, note?: string) =>
    api.patch<Order>(`/v1/orders/${id}/advance`, { amount, note }).then((r) => r.data),

  /** Order detail's "Not a duplicate": clears the possible-duplicate mark. */
  dismissDuplicate: (id: string) =>
    api.post<{ id: string; possibleDuplicateOfId: null }>(`/v1/orders/${id}/not-duplicate`).then((r) => r.data),

  updateLabel: (id: string, label: string | null) =>
    api.patch<Order>(`/v1/orders/${id}/label`, { label }).then((r) => r.data),

  updateCourier: (id: string, courierProvider: CourierProvider) =>
    api.patch<Order>(`/v1/orders/${id}/courier`, { courierProvider }).then((r) => r.data),

  trash: (id: string) => api.post<Order>(`/v1/orders/${id}/trash`).then((r) => r.data),

  restore: (id: string) => api.post<Order>(`/v1/orders/${id}/restore`).then((r) => r.data),

  getHistory: (id: string) =>
    api.get<OrderStatusHistoryEntry[]>(`/v1/orders/${id}/history`).then((r) => r.data),

  // Customize Order Status Tabs — the four defaults come back even for a
  // vendor who's never customized anything (server-side fallback).
  getStatusTabs: () =>
    api.get<{ statuses: OrderStatus[] }>('/v1/orders/status-tabs').then((r) => r.data.statuses),

  updateStatusTabs: (statuses: OrderStatus[]) =>
    api
      .patch<{ statuses: OrderStatus[] }>('/v1/orders/status-tabs', { statuses })
      .then((r) => r.data.statuses),

  // Courier delivery-history / success-rate lookup by phone number,
  // platform-wide — powers the small "94% (105)" badges and "Check
  // History" on the Orders list.
  getCustomerHistory: (phone: string) =>
    api.get<CustomerHistory>(`/v1/orders/customer-history/${encodeURIComponent(phone)}`).then((r) => r.data),

  getCustomerCourierStats: (phones: string[]) =>
    api.post<CustomerCourierStats>('/v1/orders/customer-courier-stats', { phones }).then((r) => r.data),
};

/** The order number to show: the public code, or ORDER-n for an order that has none. */
export function orderRef(order: { publicCode?: string | null; invoiceNumber: number }): string {
  return order.publicCode ?? `ORDER-${order.invoiceNumber}`;
}

const POS_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  BANGLA_QR: 'Bangla QR',
  BANK: 'Bank',
  GIFT_CARD: 'Gift card',
  DUE: 'Due',
  OTHER: 'Other',
  MIXED: 'Split payment',
};

/** Order.paymentMethod in words: "Cash on delivery", "Paid online", "bKash (counter)"... */
export function paymentMethodLabel(method: string): string {
  if (method === 'COD') return 'Cash on delivery';
  if (method === 'ONLINE_PAYMENT') return 'Paid online';
  if (method.startsWith('POS_')) return `${POS_METHOD_LABELS[method.slice(4)] ?? method.slice(4)} (counter)`;
  return method.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}
