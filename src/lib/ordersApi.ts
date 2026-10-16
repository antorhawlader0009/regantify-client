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
  | 'STOCK_OUT'
  | 'READY_FOR_PICKUP';

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
  /** Return check-in finding for this line (vendor only); null until the returned parcel is checked in. */
  returnOutcome?: 'GOOD' | 'DAMAGED' | 'MISSING' | null;
  /** A free gift line from Marketing > Discounts > Free gifts (price 0). */
  isGift?: boolean;
  /** The customer's own text for the product (TellMe idea 75), like a name to print; customFee is the per-piece fee inside the price. */
  customValues?: Array<{ label: string; value: string }> | null;
  customFee?: string | null;
  /** Charged the product's wholesale price (TellMe idea 79). */
  wholesale?: boolean;
  /** Pre-order expected date when it was ordered (YYYY-MM-DD at midnight UTC), TellMe idea 64. */
  preOrderDate?: string | null;
  /** A bundle line (TellMe idea 51): what one set held when the order was placed. Null on other lines. */
  bundleParts?: Array<{ productId: string; name: string; sku: string; quantity: number }> | null;
  // Live product snapshot for the "view on storefront" link — null when
  // the product was since deleted, or DRAFT (no public page to link to).
  // See OrdersService.itemsInclude.
  product?: {
    slug: string;
    visibility: 'PUBLIC' | 'DRAFT';
    /** Warranty and return policy (TellMe idea 54), printed under the item on the invoice; null = the store default. */
    warrantyKind?: string | null;
    warrantyCustom?: string | null;
    returnDays?: number | null;
    returnCondition?: string | null;
  } | null;
}

export interface AssignmentOverview {
  staff: Array<{ id: string; name: string; role: string; active: boolean; handlesOrders: boolean }>;
  autoAssign: boolean;
  /** The caller's own staff id; null for the owner. */
  myStaffId: string | null;
}

export type CourierProvider = 'NONE' | 'PATHAO' | 'STEADFAST' | 'REDX' | 'CARRYBEE';

// Real-booking lifecycle for courierProvider — see COURIER-PLAN.md
// §2.4/§3.4. Distinct from OrderStatus: courierProvider/
// courierBookingStatus track the courier API side, OrderStatus is the
// vendor-facing pipeline stage (which a successful courier sync can also
// update, via applyStatusUpdate on the server).
// CANCELLED = the courier cancelled the pickup on its side; re-bookable.
export type CourierBookingStatus = 'NOT_BOOKED' | 'BOOKING' | 'BOOKED' | 'FAILED' | 'CANCELLED';

/**
 * The payment link on an order the vendor entered (server: orders/payment-link.ts). READY = waiting for the
 * customer, PAID = paid, EXPIRED = ran out unpaid, UNAVAILABLE = the order ended first.
 */
export interface PaymentLinkInfo {
  state: 'READY' | 'PAID' | 'EXPIRED' | 'UNAVAILABLE';
  /** The advance asked for. */
  amount: number;
  /** The platform's fee on it, added on top on the payment page. */
  fee: number;
  /** What the customer pays on the page (amount plus fee). */
  payable: number;
  expiresAt: string | null;
  /** The address to send the customer. */
  url: string | null;
}

/** Reseller system (RESELLER-plan.md Steps 10-11): an order's resale card. */
export interface ResaleOrderInfo {
  /** SUPPLIER = you ship this for a reseller; RESELLER = your shopper's order, shipped by the supplier. */
  role: 'SUPPLIER' | 'RESELLER';
  partner: { storeName: string; subdomain: string | null } | null;
  /** On a supplier's order: what the invoice and parcel sticker print instead of your store (the reseller's name). */
  whiteLabel: { storeName: string; phone: string | null; logoUrl: string | null } | null;
  /** The reseller's earning on this order (before Regantify's share). */
  earning: number;
  /** On a reseller's order: what reaches the wallet when it is delivered. */
  expectedNet?: number;
  settlement: { status: 'AWAITING_SUPPLIER' | 'HELD' | 'PAID' | 'REVERSED'; earning: number; fee: number; net: number; paidAt: string | null; releaseAt: string | null; reversedAt: string | null } | null;
  /** On a supplier's order the shopper paid online (Step 18): the amount the platform holds, and when it reached your wallet. */
  onlineHeld?: { amount: number; releasedAt: string | null } | null;
}

export interface Order {
  id: string;
  vendorId: string;
  invoiceNumber: number;
  /** Public order number ("FAS-261003-7K3M9QD"): what shoppers and couriers see. invoiceNumber is the store's own serial. Null on an order the backfill has not reached. */
  publicCode?: string | null;
  /** POS = sold over the counter (POS-system-plan.md). RESELLER = a supplier's order for a shopper's order in a reseller's store (RESELLER-plan.md Step 6). */
  source: 'STOREFRONT' | 'MANUAL' | 'POS' | 'RESELLER';
  /** Reseller system: set on this store's order of a product it resells; the supplier ships it and its status follows theirs (read-only here). */
  resaleSupplierVendorId?: string | null;
  /** Reseller system: on a supplier's order (source RESELLER), the reseller's order it is for. */
  resaleParentId?: string | null;
  /** Reseller system (list rows): the other store, the reseller that sold it or the supplier that ships it. */
  resalePartner?: string | null;
  /** Reseller system (Order detail only): the resale card and, on a supplier's order, the reseller's name to print. */
  resale?: ResaleOrderInfo | null;
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
  deliveryZone: 'DHAKA' | 'OUTSIDE_DHAKA' | 'AROUND_DHAKA' | 'PICKUP';
  /** Express delivery (TellMe idea 132): the extra the shopper paid is already inside deliveryCharge. */
  deliverySpeed?: 'STANDARD' | 'EXPRESS';
  expressCharge?: string;
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
  /** Vendor only: when and by whom a returned parcel was counted in at the shop (Orders > Return check-in); null = not yet. */
  returnCheckedAt?: string | null;
  returnCheckedBy?: string | null;
  /** Order detail only: this phone's automatic customer group with its real orders and spend; null = none yet. */
  customerGroup?: { group: 'NEW' | 'RETURNING' | 'VIP' | 'SLEEPING'; orders: number; spent: number } | null;
  /** What an online advance is for (DELIVERY = delivery charge, PREORDER = pre-order products, LINK = a payment link the vendor sent); null = no advance. */
  advanceFor?: 'DELIVERY' | 'PREORDER' | 'LINK' | null;
  /** Order detail only: the payment link on an order the vendor entered (see PaymentLinkInfo); null = none. */
  paymentLink?: PaymentLinkInfo | null;
  /** The earlier order this one may be a copy of (same phone and product within 24 hours); null = not flagged. */
  possibleDuplicateOfId?: string | null;
  /** Order risk badge (TellMe idea 143): LOW / MEDIUM / HIGH, null = not scored; the reasons are plain sentences. */
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  riskReasons?: string[] | null;
  /** The day the shopper asked to have it delivered (an ISO date at midnight UTC = that calendar day); null when none. */
  preferredDeliveryDate?: string | null;
  /** The delivery time slot the customer preferred (TellMe idea 90), as it read then. */
  preferredSlot?: string | null;
  /** The customer's rating of the delivery (TellMe idea 89). */
  deliveryRating?: number | null;
  deliveryComment?: string | null;
  /** The store's own colored labels on this order (TellMe idea 91). */
  labels?: string[];
  /** Where a hand-made order came from (TellMe idea 121); vendor only. */
  manualChannel?: string | null;
  /** Manual Mobile Payment (Add-ons): the wallet, sender number and TrxID the shopper typed, and what the store found. */
  manualPaymentWallet?: string | null;
  manualPaymentSender?: string | null;
  manualPaymentTrxId?: string | null;
  manualPaymentStatus?: 'PENDING_CHECK' | 'RECEIVED' | 'NOT_RECEIVED' | null;
  manualPaymentCheckedAt?: string | null;
  manualPaymentCheckedBy?: string | null;
  /** Gift (TellMe idea 57): wrapped, with a message, optionally with the prices hidden on the invoice. giftWrapCharge is part of total. */
  isGift?: boolean;
  giftMessage?: string | null;
  hidePricesOnInvoice?: boolean;
  giftWrapCharge?: string;
  /** Split order (TellMe idea 59): the order this one was split off from. */
  splitFromOrderId?: string | null;
  /** Who handles it (TellMe idea 60): a staff member id; null = nobody. */
  assignedStaffId?: string | null;
  assignedAt?: string | null;
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
  /** Reseller system: supplied = orders resellers sold for you; resold = your orders of products you resell. */
  resale?: 'supplied' | 'resold';
  /** Only orders marked as a possible duplicate of an earlier one. */
  possibleDuplicate?: boolean;
  /** Manual Mobile Payment: orders whose TrxID the store hasn't checked yet, or found not received. */
  manualPayment?: 'PENDING_CHECK' | 'NOT_RECEIVED';
  /** Order risk badge: HIGH = high only, MEDIUM_UP = medium and high. */
  risk?: 'HIGH' | 'MEDIUM_UP';
  /** Only orders whose shopper asked for this delivery day (YYYY-MM-DD). */
  preferredDate?: string;
  /** Pre-orders (TellMe idea 64): a date (YYYY-MM-DD) or 'any'. */
  preOrder?: string;
  /** Only orders carrying this label (TellMe idea 91). */
  label?: string;
  /** Traffic channel of the order (TellMe idea 71): facebook, google, direct, ... or 'untracked'. */
  channel?: string;
  /** Who handles it: 'me', 'none' (nobody) or a staff member id (TellMe idea 60). */
  assignee?: string;
  /** Only orders that lost money (needs analytics.profit). */
  lossOnly?: boolean;
  /** Only express orders (TellMe idea 132). */
  speed?: 'EXPRESS';
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
  /** Add Order: where the order came from (TellMe idea 121). */
  manualChannel?: string;
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

/** One of a customer's other open orders in the merge dialog. */
export interface MergeCandidate {
  id: string;
  ref: string;
  status: string;
  total: number;
  deliveryCharge: number;
  createdAt: string;
  address: string;
  items: string[];
  /** Why it can't be merged; null = it can. */
  blocker: string | null;
}

export interface MergeCandidates {
  orderRef: string;
  orders: MergeCandidate[];
}

export interface BlockedCheckoutSummary {
  days: number;
  total: number;
  /** HONEYPOT | TOO_FAST | PHONE_LIMIT | IP_LIMIT -> how many were refused. */
  byReason: Record<string, number>;
  byDay: Array<{ day: string; count: number }>;
}

export const ordersApi = {
  list: (params: ListOrdersParams = {}) =>
    api.get<OrderListResponse>('/v1/orders', { params }).then((r) => r.data),

  findOne: (id: string) => api.get<Order>(`/v1/orders/${id}`).then((r) => r.data),

  /** Split order (TellMe idea 59): moves these lines (or pieces of them) into a new order. */
  split: (id: string, lines: Array<{ itemId: string; quantity: number }>) =>
    api.post<{ order: Order; newOrder: { id: string; ref: string } }>(`/v1/orders/${id}/split`, { lines }).then((r) => r.data),

  /** Assign orders to staff (TellMe idea 60). */
  assignmentOverview: () => api.get<AssignmentOverview>('/v1/orders/assignment').then((r) => r.data),
  updateAssignmentSettings: (body: { autoAssignOrders?: boolean; handlerIds?: string[] }) =>
    api.patch<AssignmentOverview>('/v1/orders/assignment-settings', body).then((r) => r.data),
  assign: (ids: string[], staffId: string | null) => api.post<{ updated: number }>('/v1/orders/assign', { ids, staffId }).then((r) => r.data),

  /** A marker that changes when any order of the store does; polled by useOrdersAutoRefresh. */
  pulse: () => api.get<{ marker: string }>('/v1/orders/pulse').then((r) => r.data),
  /** Checkouts the bot guard refused in the last 7 days (TellMe idea 152): counts only. */
  blockedCheckouts: () => api.get<BlockedCheckoutSummary>('/v1/orders/blocked-checkouts').then((r) => r.data),

  create: (payload: CreateOrderPayload) =>
    api.post<Order>('/v1/orders', payload).then((r) => r.data),

  /** `correction`: the owner's "Correct a mistake", outside the forward-only flow (needs a `note`). */
  updateStatus: (id: string, status: OrderStatus, note?: string, correction?: boolean, reasonCode?: CloseReasonCode) =>
    api.patch<Order>(`/v1/orders/${id}/status`, { status, note, ...(correction && { correction: true }), ...(reasonCode && { reasonCode }) }).then((r) => r.data),

  /** "Add the reason" on an order that was cancelled / returned / failed without one (or to change it). */
  setCloseReason: (id: string, reasonCode: CloseReasonCode) =>
    api.patch<OrderCloseReason>(`/v1/orders/${id}/close-reason`, { reasonCode }).then((r) => r.data),

  /** "Merge with another order": this customer's other open orders, each with why it can't be merged (null = it can). */
  mergeCandidates: (id: string) => api.get<MergeCandidates>(`/v1/orders/${id}/merge-candidates`).then((r) => r.data),

  /** Moves the other order's items onto this one and cancels the other as merged; answers with this order. */
  mergeOrders: (id: string, otherOrderId: string) => api.post<Order>(`/v1/orders/${id}/merge`, { otherOrderId }).then((r) => r.data),

  /** "Edit items": replaces the whole item list of a COD order not yet booked with a courier; the server works out the total and stock again. */
  updateItems: (id: string, payload: UpdateOrderItemsPayload) =>
    api.patch<Order>(`/v1/orders/${id}/items`, payload).then((r) => r.data),

  /** Orders list "Change status" for many orders; ones that can't move are skipped with a reason. */
  bulkUpdateStatus: (ids: string[], status: BulkOrderStatus, note?: string, reasonCode?: CloseReasonCode) =>
    api.post<BulkStatusResult>('/v1/orders/bulk-status', { ids, status, note, ...(reasonCode && { reasonCode }) }).then((r) => r.data),

  /** "Advance received": amount 0 clears it. */
  updateAdvance: (id: string, amount: number, note?: string) =>
    api.patch<Order>(`/v1/orders/${id}/advance`, { amount, note }).then((r) => r.data),

  /** Make (or replace) a payment link asking for an advance of `amount`, working for `hours` (default 24). */
  createPaymentLink: (id: string, amount: number, hours?: number) =>
    api.post<{ ref: string; link: PaymentLinkInfo | null }>(`/v1/orders/${id}/payment-link`, { amount, hours }).then((r) => r.data),

  /** The words of a message filled in for this order (TellMe idea 107). Nothing is sent. */
  fillMessage: (id: string, message: string) => api.post<{ text: string }>(`/v1/orders/${id}/message`, { message }).then((r) => r.data),

  /** Take an unpaid payment link back. */
  cancelPaymentLink: (id: string) => api.delete<{ cancelled: boolean }>(`/v1/orders/${id}/payment-link`).then((r) => r.data),

  /** Manual Mobile Payment: the store checked its wallet. With NOT_RECEIVED, `switchToCod` makes it cash on delivery. */
  checkManualPayment: (id: string, result: 'RECEIVED' | 'NOT_RECEIVED', switchToCod = false) =>
    api
      .post<{ id: string; manualPaymentStatus: string; paymentMethod: string }>(`/v1/orders/${id}/manual-payment`, { result, switchToCod })
      .then((r) => r.data),

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

  /** Saved order views (TellMe idea 127): your own and the team's, with how many orders each matches now. */
  listViews: () => api.get<SavedOrderView[]>('/v1/orders/views').then((r) => r.data),
  createView: (name: string, filters: OrderViewFilters, shared: boolean) => api.post<{ id: string }>('/v1/orders/views', { name, filters, shared }).then((r) => r.data),
  deleteView: (id: string) => api.delete(`/v1/orders/views/${id}`).then((r) => r.data),

  /** The channels a hand-made order can come from (TellMe idea 121): six built-in names and the store's own (the owner changes those). */
  channelCatalog: () => api.get<{ builtIn: string[]; custom: string[] }>('/v1/orders/channels').then((r) => r.data),
  saveChannelCatalog: (custom: string[]) => api.patch<{ builtIn: string[]; custom: string[] }>('/v1/orders/channels', { custom }).then((r) => r.data),

  labelCatalog: () => api.get<OrderLabelDef[]>('/v1/orders/labels').then((r) => r.data),
  saveLabelCatalog: (labels: OrderLabelDef[]) => api.patch<OrderLabelDef[]>('/v1/orders/labels', { labels }).then((r) => r.data),
  applyLabels: (ids: string[], add: string[], remove: string[]) => api.post<{ updated: number }>('/v1/orders/labels/apply', { ids, add, remove }).then((r) => r.data),

  listComments: (id: string) =>
    api
      .get<{ legacyNote: string | null; comments: Array<{ id: string; authorName: string; authorRole: string; body: string; createdAt: string; canDelete: boolean }> }>(`/v1/orders/${id}/comments`)
      .then((r) => r.data),
  addComment: (id: string, body: string) => api.post<{ id: string }>(`/v1/orders/${id}/comments`, { body }).then((r) => r.data),
  deleteComment: (id: string, commentId: string) => api.delete(`/v1/orders/${id}/comments/${commentId}`).then((r) => r.data),

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

/** One of the store's order labels (TellMe idea 91). */
export interface OrderLabelDef {
  name: string;
  color: string;
}

/** The Orders list's filters kept in a saved view (TellMe idea 127), mirrors the server's OrderViewFilters. */
export interface OrderViewFilters {
  status?: string;
  search?: string;
  /** TODAY / YESTERDAY / LAST_7 (Dhaka) instead of fixed dates, so the view keeps meaning "today". */
  dateRange?: 'TODAY' | 'YESTERDAY' | 'LAST_7';
  dateFrom?: string;
  dateTo?: string;
  callStatus?: string;
  courierBooking?: string;
  source?: string;
  possibleDuplicate?: boolean;
  risk?: 'HIGH' | 'MEDIUM_UP';
  preferredDate?: string;
  lossOnly?: boolean;
  speed?: 'EXPRESS';
  assignee?: string;
  preOrder?: string;
  channel?: string;
  label?: string;
}

export interface SavedOrderView {
  id: string;
  name: string;
  shared: boolean;
  mine: boolean;
  filters: OrderViewFilters;
  /** Orders matching now; null when it can't be shown (a loss-making view without the profit permission). */
  count: number | null;
}
