import { api } from './api';
import type { OrderStatus } from './ordersApi';

export type CourierAccountProvider = 'PATHAO' | 'STEADFAST' | 'REDX';

export interface CourierAccount {
  id: string;
  provider: CourierAccountProvider;
  isActive: boolean;
  pathaoStoreId: number | null;
  pathaoStoreName: string | null;
  redxStoreId: number | null;
  redxStoreName: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The prefix CourierBookingService throws as a BadRequestException
 * message when a vendor tries to book/refresh a courier they haven't
 * connected yet (see server/src/courier/courier-booking.service.ts) —
 * matching on this (rather than just showing the raw error) is what lets
 * Orders.tsx open the setup popup instead of a plain error toast, per
 * COURIER-PLAN.md §5.2.
 */
const NOT_CONNECTED_PREFIX = 'COURIER_NOT_CONNECTED:';

/** Extracts the provider from a COURIER_NOT_CONNECTED error, or null if this wasn't that kind of error. */
export function notConnectedProvider(err: unknown): CourierAccountProvider | null {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (typeof message === 'string' && message.startsWith(NOT_CONNECTED_PREFIX)) {
    return message.slice(NOT_CONNECTED_PREFIX.length) as CourierAccountProvider;
  }
  return null;
}

export interface PathaoConnectInput {
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
}

/** GET /v1/courier/pathao/overview — the Pathao page's connection state. */
export type PathaoOverview =
  | { connected: false; planAllowed: boolean }
  | {
      connected: true;
      planAllowed: boolean;
      merchantName: string | null;
      clientIdMasked: string | null;
      /** Connected before per-merchant Client ID/Secret — must reconnect to keep booking. */
      needsReconnect: boolean;
      hasBackupLogin: boolean;
      pickupStore: { id: number; name: string | null } | null;
      lastWebhookAt: string | null;
      connectedAt: string;
      updatedAt: string;
    };

/** GET /v1/courier/pathao/webhook — what the vendor pastes into Pathao's panel. */
export interface PathaoWebhookInfo {
  url: string;
  secret: string;
  lastWebhookAt: string | null;
  /** False when the API isn't on a public HTTPS address yet — Pathao can't reach it. */
  reachable: boolean;
}

export interface PathaoStore {
  id: number;
  name: string;
  address: string | null;
  isActive: boolean;
  isDefault: boolean;
  cityId: number | null;
  zoneId: number | null;
}

export interface CreatePathaoStoreInput {
  name: string;
  contactName: string;
  contactNumber: string;
  secondaryContact?: string;
  otpNumber?: string;
  address: string;
  cityId: number;
  zoneId: number;
  areaId: number;
}

/** What a Pathao status may move an order to — mirrors server PATHAO_STATUS_TARGETS. */
export type PathaoStatusTarget = 'SHIPPING' | 'COMPLETED' | 'ON_HOLD' | 'RETURN' | 'CANCELLED' | 'NO_CHANGE';

/** GET /v1/courier/pathao/statuses — one row of the Auto Status Update table. */
export interface PathaoStatusRow {
  key: string;
  label: string;
  defaultTarget: PathaoStatusTarget;
  cancelsBooking: boolean;
  paid: boolean;
}

/** Settings tab > Automation card — mirrors server PathaoAutoBookSettings (pathao-plan.md Step 14). */
export interface PathaoAutoBookSettings {
  enabled: boolean;
  onStatus: 'PROCESSING';
  assignUnassigned: boolean;
  includeManualOrders: boolean;
  requireLocation: boolean;
}

/** Pathao's Settings tab > Default Values card — mirrors server/src/courier/providers/pathao-settings.ts's PathaoSettings. */
export interface PathaoSettings {
  defaultBookingStatus: 'SHIPPING' | 'NO_CHANGE';
  deliveryType: 48 | 12;
  itemType: 1 | 2;
  defaultWeightKg: number;
  useProductWeight: boolean;
  itemDescriptionTemplate: string;
  specialInstruction: string;
  sendStaffNoteAsInstruction: boolean;
  /** Text the customer their tracking ID after booking (uses the vendor's SMS credits). */
  notifyCustomerOnBooking: boolean;
  autoBook: PathaoAutoBookSettings;
  codRule: 'COD_TOTAL_ONLY_FOR_COD';
  /** Auto Status Update: Pathao status key → order status (always complete). */
  statusMap: Record<string, PathaoStatusTarget>;
}

export interface PathaoLocation {
  id: number;
  name: string;
  /** Areas only — Pathao marks some areas pickup-only (no home delivery). */
  homeDeliveryAvailable?: boolean;
  pickupAvailable?: boolean;
}

/** GET /v1/courier/pathao/locations/suggest — mirrors server LocationSuggestion (pathao-location-match.ts). */
export interface PathaoLocationSuggestion {
  cityId: number;
  cityName: string;
  zoneId: number | null;
  zoneName: string | null;
  areaId: number | null;
  areaName: string | null;
  /** 0-1; at or above PATHAO_SUGGESTION_AUTO_APPLY the pickers pre-select it. */
  confidence: number;
}

/** Mirrors server SUGGESTION_AUTO_APPLY. */
export const PATHAO_SUGGESTION_AUTO_APPLY = 0.6;

/** One Pathao booking in our own field names — mirrors server PathaoBookingDraft. The booking popup pre-fills from it and sends edits back in the same shape. */
export interface PathaoBookingDraft {
  storeId: number | null;
  recipientName: string;
  recipientPhone: string;
  recipientSecondaryPhone: string | null;
  recipientAddress: string;
  /** Null = let Pathao work the location out from the address. */
  cityId: number | null;
  zoneId: number | null;
  areaId: number | null;
  deliveryType: 48 | 12;
  itemType: 1 | 2;
  itemQuantity: number;
  itemWeight: number;
  amountToCollect: number;
  itemDescription: string;
  specialInstruction: string;
}

/** GET /v1/courier/pathao/booking-draft/:orderId */
export interface PathaoBookingDraftResponse {
  order: {
    id: string;
    invoiceNumber: number;
    total: string;
    paymentMethod: string;
    courierBookingStatus: CourierBookingStatus;
    courierBookingError: string | null;
    shippingAddress: string;
    shippingCity: string | null;
    shippingDistrict: string | null;
  };
  pickupStore: { id: number; name: string | null } | null;
  draft: PathaoBookingDraft;
}

export interface PathaoPriceInput {
  storeId?: number;
  itemType: 1 | 2;
  deliveryType: 48 | 12;
  itemWeight: number;
  cityId: number;
  zoneId: number;
}

/** POST /v1/courier/pathao/price — `finalPrice` is the delivery charge; the COD fee is `codPercentage` (a fraction) of the amount collected, on top. */
export interface PathaoPriceResult {
  price: number;
  discount: number;
  promoDiscount: number;
  additionalCharge: number;
  finalPrice: number;
  codEnabled: boolean;
  codPercentage: number;
}

export type CourierBookingStatus = 'NOT_BOOKED' | 'BOOKING' | 'BOOKED' | 'FAILED' | 'CANCELLED';

/** One row on the "Tracking" page — see CourierTrackingController. */
export interface CourierTrackingRow {
  id: string;
  invoiceNumber: number;
  status: OrderStatus;
  courierProvider: CourierAccountProvider;
  courierBookingStatus: CourierBookingStatus;
  courierConsignmentId: string | null;
  courierTrackingCode: string | null;
  courierBookingError: string | null;
  courierLastSyncedAt: string | null;
  courierStatus: string | null;
  customerName: string;
  customerPhone: string;
  total: string;
  createdAt: string;
}

/** The Parcels tab's filter groups — mirrors server PARCEL_GROUPS. */
export type ParcelGroup = 'in_progress' | 'delivered' | 'returned' | 'attention' | 'cancelled';

/** One row of GET /v1/courier/pathao/parcels. Money fields are decimal strings. */
export interface PathaoParcel {
  id: string;
  invoiceNumber: number;
  status: OrderStatus;
  paymentMethod: string;
  total: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  courierBookingStatus: CourierBookingStatus;
  courierBookingError: string | null;
  courierConsignmentId: string | null;
  courierStatus: string | null;
  courierBookedAt: string | null;
  courierCodAmount: string | null;
  courierDeliveryFee: string | null;
  courierCollectedAmount: string | null;
  courierPaidAt: string | null;
  courierInvoiceId: string | null;
  courierLastSyncedAt: string | null;
}

export interface PathaoParcelsQuery {
  group?: ParcelGroup;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

export interface PathaoParcelsResponse {
  items: PathaoParcel[];
  total: number;
  page: number;
  perPage: number;
  counts: Record<ParcelGroup | 'all', number>;
}

export type PathaoStatsRange = '7d' | '30d' | '90d';

/** GET /v1/courier/pathao/stats — the Dashboard tab (pathao-plan.md Step 10). */
export interface PathaoStats {
  range: PathaoStatsRange;
  bookingsToday: number;
  active: number;
  booked: number;
  delivered: number;
  returned: number;
  /** % of finished (delivered + returned) parcels that came back; null when none finished. */
  returnRate: number | null;
  deliveryFees: number;
  codPending: { amount: number; count: number };
  codPaid: { amount: number; count: number };
  failedBookings: number;
  trend: Array<{ day: string; booked: number; delivered: number }>;
  attention: {
    total: number;
    items: Array<{
      id: string;
      invoiceNumber: number;
      status: OrderStatus;
      customerName: string;
      customerPhone: string;
      courierBookingStatus: CourierBookingStatus;
      courierConsignmentId: string | null;
      courierStatus: string | null;
      updatedAt: string;
      reason: string;
      detail: string | null;
    }>;
  };
}

/** POST /v1/courier/pathao/book-bulk — the dry run (confirm dialog) or the real run (pathao-plan.md Step 11). */
export type PathaoBulkResult =
  | {
      dryRun: true;
      pickupStore: { id: number; name: string | null };
      eligible: Array<{ orderId: string; invoiceNumber: number; customerName: string; codAmount: number }>;
      skipped: Array<{ orderId: string; invoiceNumber: number | null; customerName: string | null; reason: string }>;
      totalCod: number;
    }
  | {
      dryRun: false;
      results: Array<
        | { orderId: string; invoiceNumber: number; ok: true; consignmentId: string | null }
        | { orderId: string; invoiceNumber: number; ok: false; error: string }
      >;
      skipped: Array<{ orderId: string; invoiceNumber: number | null; customerName: string | null; reason: string }>;
      summary: { booked: number; failed: number; skipped: number };
    };

/** One printable label — GET /v1/courier/pathao/labels (pathao-plan.md Step 12). */
export interface PathaoLabel {
  orderId: string;
  invoiceNumber: number;
  consignmentId: string;
  bookedAt: string | null;
  recipient: { name: string; phone: string; secondaryPhone: string | null; address: string; area: string | null };
  /** What Pathao collects on delivery; 0 for an already-paid order. */
  codAmount: number;
  items: Array<{ name: string; quantity: number }>;
  itemCount: number;
  note: string | null;
}

export interface PathaoLabelsResponse {
  from: { storeName: string; phone: string | null; logoUrl: string | null; pickupStoreName: string | null };
  labels: PathaoLabel[];
  skipped: Array<{ orderId: string; invoiceNumber: number | null; reason: string }>;
}

/** Opens the labels print page for these orders in a new tab. */
export function openPathaoLabels(orderIds: string[]) {
  window.open(`/vendor/courier/pathao/labels?ids=${orderIds.join(',')}`, '_blank', 'noopener');
}

/** One row of Order Detail's courier timeline — GET /v1/courier/tracking/orders/:orderId/events. */
export interface CourierEvent {
  id: string;
  provider: CourierAccountProvider;
  source: 'BOOKING' | 'POLL' | 'MANUAL' | 'WEBHOOK';
  /** Normalized key, e.g. "pickup_requested", "booked", "booking_failed". */
  event: string;
  rawStatus: string | null;
  /** The order status this event moved the order to, if any. */
  appliedStatus: OrderStatus | null;
  note: string | null;
  createdAt: string;
}

export const courierApi = {
  /** All of the vendor's courier accounts (active or disconnected) — Settings' card states + the setup-popup's "already connected?" check. */
  getAccounts: () => api.get<CourierAccount[]>('/v1/courier/accounts').then((r) => r.data),

  connectSteadfast: (apiKey: string, secretKey: string) =>
    api.post<CourierAccount>('/v1/courier/accounts/steadfast', { apiKey, secretKey }).then((r) => r.data),

  // The vendor's own Pathao merchant Client ID/Secret (+ optional email/
  // password fallback). The server verifies them with Pathao before
  // saving; merchantName is Pathao's name for the account, when known.
  connectPathao: (input: PathaoConnectInput) =>
    api
      .post<CourierAccount & { merchantName: string | null }>('/v1/courier/accounts/pathao', input)
      .then((r) => r.data),

  // Courier Integration > Pathao page (pages/vendor/courier/pathao/).
  getPathaoOverview: () => api.get<PathaoOverview>('/v1/courier/pathao/overview').then((r) => r.data),
  getPathaoStoreList: () => api.get<PathaoStore[]>('/v1/courier/pathao/stores').then((r) => r.data),
  createPathaoStore: (input: CreatePathaoStoreInput) =>
    api.post<{ message: string; storeName: string }>('/v1/courier/pathao/stores', input).then((r) => r.data),
  getPathaoParcels: (query: PathaoParcelsQuery) =>
    api.get<PathaoParcelsResponse>('/v1/courier/pathao/parcels', { params: query }).then((r) => r.data),
  getPathaoLabels: (orderIds: string[]) =>
    api.get<PathaoLabelsResponse>('/v1/courier/pathao/labels', { params: { orderIds: orderIds.join(',') } }).then((r) => r.data),
  bookPathaoBulk: (orderIds: string[], dryRun: boolean) =>
    api.post<PathaoBulkResult>('/v1/courier/pathao/book-bulk', { orderIds, dryRun }).then((r) => r.data),
  getPathaoStats: (range: PathaoStatsRange) =>
    api.get<PathaoStats>('/v1/courier/pathao/stats', { params: { range } }).then((r) => r.data),
  getPathaoStatuses: () => api.get<PathaoStatusRow[]>('/v1/courier/pathao/statuses').then((r) => r.data),
  getPathaoWebhook: () => api.get<PathaoWebhookInfo>('/v1/courier/pathao/webhook').then((r) => r.data),
  regeneratePathaoWebhook: () => api.post<PathaoWebhookInfo>('/v1/courier/pathao/webhook/regenerate').then((r) => r.data),
  getPathaoSettings: () => api.get<PathaoSettings>('/v1/courier/pathao/settings').then((r) => r.data),
  updatePathaoSettings: (patch: Partial<PathaoSettings>) =>
    api.put<PathaoSettings>('/v1/courier/pathao/settings', patch).then((r) => r.data),

  selectPathaoStore: (storeId: number, storeName: string) =>
    api.post<{ pathaoStoreId: number; pathaoStoreName: string }>('/v1/courier/accounts/pathao/store', { storeId, storeName }).then((r) => r.data),

  // RedX's own single access token — no OAuth, no separate app-level
  // credential (unlike Pathao).
  connectRedx: (accessToken: string) => api.post<CourierAccount>('/v1/courier/accounts/redx', { accessToken }).then((r) => r.data),

  /** Settings' RedX store picker — only callable once connected. */
  getRedxStores: () => api.get<PathaoLocation[]>('/v1/courier/accounts/redx/stores').then((r) => r.data),

  selectRedxStore: (storeId: number, storeName: string) =>
    api.post<{ redxStoreId: number; redxStoreName: string }>('/v1/courier/accounts/redx/store', { storeId, storeName }).then((r) => r.data),

  disconnect: (provider: CourierAccountProvider) =>
    api.delete<{ disconnected: true }>(`/v1/courier/accounts/${provider}`).then((r) => r.data),

  // "Book with {Provider}" / "Refresh Status" — see ordersApi.ts's Order
  // type for the courierBookingStatus/courierConsignmentId/etc fields
  // these calls update.
  // `overrides` = the Pathao booking popup's edits (Pathao only); omit
  // for everything else to book with the pre-filled values.
  bookOrder: (orderId: string, overrides?: Partial<PathaoBookingDraft>) =>
    api.post(`/v1/orders/${orderId}/courier/book`, overrides ?? {}).then((r) => r.data),

  // Pathao booking popup (components/courier/PathaoBookingModal.tsx).
  getPathaoBookingDraft: (orderId: string) =>
    api.get<PathaoBookingDraftResponse>(`/v1/courier/pathao/booking-draft/${orderId}`).then((r) => r.data),
  getPathaoPrice: (input: PathaoPriceInput) =>
    api.post<PathaoPriceResult>('/v1/courier/pathao/price', input).then((r) => r.data),

  refreshStatus: (orderId: string) => api.post(`/v1/orders/${orderId}/courier/refresh-status`).then((r) => r.data),

  // PathaoLocationPicker (Add Order / Order Detail) — see
  // COURIER-PLAN.md §3.2/§7 Phase 2. Each level requires the previous
  // one's id.
  getPathaoCities: () => api.get<PathaoLocation[]>('/v1/courier/pathao/locations/cities').then((r) => r.data),
  getPathaoZones: (cityId: number) => api.get<PathaoLocation[]>(`/v1/courier/pathao/locations/cities/${cityId}/zones`).then((r) => r.data),
  getPathaoAreas: (zoneId: number) => api.get<PathaoLocation[]>(`/v1/courier/pathao/locations/zones/${zoneId}/areas`).then((r) => r.data),
  // Address → best City/Zone/Area guess (null when not even a city matched).
  suggestPathaoLocation: (input: { address?: string; city?: string; district?: string }) =>
    api.get<PathaoLocationSuggestion | null>('/v1/courier/pathao/locations/suggest', { params: input }).then((r) => r.data || null),

  updateOrderPathaoLocation: (orderId: string, cityId: number, zoneId: number, areaId: number) =>
    api.patch(`/v1/orders/${orderId}/pathao-location`, { cityId, zoneId, areaId }).then((r) => r.data),

  // RedxLocationPicker (Order Detail) — RedX has only ONE location tier
  // (no city/zone cascade like Pathao), so this is a single flat list.
  getRedxAreas: () => api.get<PathaoLocation[]>('/v1/courier/redx/locations/areas').then((r) => r.data),

  updateOrderRedxLocation: (orderId: string, areaId: number) =>
    api.patch(`/v1/orders/${orderId}/redx-location`, { areaId }).then((r) => r.data),

  /** Courier Integration > Tracking — every order with a real courier booking, across all providers. */
  getTracking: () => api.get<CourierTrackingRow[]>('/v1/courier/tracking').then((r) => r.data),
  getOrderCourierEvents: (orderId: string) =>
    api.get<CourierEvent[]>(`/v1/courier/tracking/orders/${orderId}/events`).then((r) => r.data),
};
