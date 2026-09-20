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

export interface PathaoLocation {
  id: number;
  name: string;
}

export type CourierBookingStatus = 'NOT_BOOKED' | 'BOOKING' | 'BOOKED' | 'FAILED';

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
  customerName: string;
  customerPhone: string;
  total: string;
  createdAt: string;
}

export const courierApi = {
  /** All of the vendor's courier accounts (active or disconnected) — Settings' card states + the setup-popup's "already connected?" check. */
  getAccounts: () => api.get<CourierAccount[]>('/v1/courier/accounts').then((r) => r.data),

  connectSteadfast: (apiKey: string, secretKey: string) =>
    api.post<CourierAccount>('/v1/courier/accounts/steadfast', { apiKey, secretKey }).then((r) => r.data),

  // Vendor's own Pathao email/password — NOT Regantify's app-level
  // client_id/client_secret, which live server-side only (see
  // COURIER-PLAN.md §2.2).
  connectPathao: (username: string, password: string) =>
    api.post<CourierAccount>('/v1/courier/accounts/pathao', { username, password }).then((r) => r.data),

  /** Settings' Pathao store picker — only callable once connected. */
  getPathaoStores: () => api.get<PathaoLocation[]>('/v1/courier/accounts/pathao/stores').then((r) => r.data),

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
  bookOrder: (orderId: string) => api.post(`/v1/orders/${orderId}/courier/book`).then((r) => r.data),

  refreshStatus: (orderId: string) => api.post(`/v1/orders/${orderId}/courier/refresh-status`).then((r) => r.data),

  // PathaoLocationPicker (Add Order / Order Detail) — see
  // COURIER-PLAN.md §3.2/§7 Phase 2. Each level requires the previous
  // one's id.
  getPathaoCities: () => api.get<PathaoLocation[]>('/v1/courier/pathao/locations/cities').then((r) => r.data),
  getPathaoZones: (cityId: number) => api.get<PathaoLocation[]>(`/v1/courier/pathao/locations/cities/${cityId}/zones`).then((r) => r.data),
  getPathaoAreas: (zoneId: number) => api.get<PathaoLocation[]>(`/v1/courier/pathao/locations/zones/${zoneId}/areas`).then((r) => r.data),

  updateOrderPathaoLocation: (orderId: string, cityId: number, zoneId: number, areaId: number) =>
    api.patch(`/v1/orders/${orderId}/pathao-location`, { cityId, zoneId, areaId }).then((r) => r.data),

  // RedxLocationPicker (Order Detail) — RedX has only ONE location tier
  // (no city/zone cascade like Pathao), so this is a single flat list.
  getRedxAreas: () => api.get<PathaoLocation[]>('/v1/courier/redx/locations/areas').then((r) => r.data),

  updateOrderRedxLocation: (orderId: string, areaId: number) =>
    api.patch(`/v1/orders/${orderId}/redx-location`, { areaId }).then((r) => r.data),

  /** Courier Integration > Tracking — every order with a real courier booking, across all providers. */
  getTracking: () => api.get<CourierTrackingRow[]>('/v1/courier/tracking').then((r) => r.data),
};
