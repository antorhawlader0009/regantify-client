import { api } from './api';
import type { PathaoBulkResult, PathaoParcel, PathaoStatsRange, SteadfastStats } from './courierApi';

// Mirrors server/src/courier/carrybee.controller.ts (Add-ons > CarryBee Courier).

export interface CarrybeeOverview {
  connected: boolean;
  planAllowed: boolean;
  clientIdMasked?: string | null;
  sandbox?: boolean;
  pickupStore?: { id: string; name: string | null } | null;
  lastWebhookAt?: string | null;
  connectedAt?: string;
}

export interface CarrybeeStore {
  id: string;
  name: string;
  address: string | null;
  approved: boolean;
}

export interface CarrybeeAutoBook {
  enabled: boolean;
  assignUnassigned: boolean;
  includeManualOrders: boolean;
}

export interface CarrybeeSettings {
  deliveryType: 1 | 2;
  productType: 1 | 2 | 3;
  defaultWeightGrams: number;
  autoBook: CarrybeeAutoBook;
}

export type CarrybeeSettingsPatch = Partial<Omit<CarrybeeSettings, 'autoBook'>> & { autoBook?: Partial<CarrybeeAutoBook> };

/** A CarryBee city, zone or area. */
export interface CarrybeePlace {
  id: number;
  name: string;
}

export type CarrybeeParcelGroup = 'in_progress' | 'delivered' | 'returned' | 'attention' | 'cancelled';

/** One row of GET /v1/courier/carrybee/parcels; `statusLabel` is CarryBee's status in words (null when unknown). */
export type CarrybeeParcel = PathaoParcel & { statusLabel: string | null };

export interface CarrybeeParcelsResponse {
  items: CarrybeeParcel[];
  total: number;
  page: number;
  perPage: number;
  counts: Record<CarrybeeParcelGroup | 'all', number>;
}

/**
 * Start of the booking error when CarryBee found no city/zone for the address
 * (server CARRYBEE_PLACE_NOT_FOUND); the Orders page opens the place picker on it.
 */
export function carrybeeStatusKey(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^order\./, '')
    .replace(/[\s_.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Whether "Cancel parcel" is offered: not once the parcel was delivered, returned, paid out or already cancelled.
 * CarryBee's own rule for parcels on the way isn't in the plugin, so those are offered and CarryBee answers.
 */
export function carrybeeCancellable(raw: string | null | undefined): boolean {
  return !['delivered', 'returned-to-merchant', 'paid', 'cancelled'].includes(carrybeeStatusKey(raw));
}

export const CARRYBEE_PLACE_NOT_FOUND = 'CarryBee could not find the city and area for this address.';

export interface CarrybeeWebhook {
  url: string;
  secret: string;
  lastWebhookAt: string | null;
  reachable: boolean;
}

export const carrybeeApi = {
  overview: () => api.get<CarrybeeOverview>('/v1/courier/carrybee/overview').then((r) => r.data),
  connect: (body: { clientId: string; clientSecret: string; clientContext: string; sandbox: boolean }) =>
    api.post<CarrybeeOverview>('/v1/courier/carrybee/connect', body).then((r) => r.data),
  disconnect: () => api.delete('/v1/courier/carrybee').then((r) => r.data),
  stores: () => api.get<CarrybeeStore[]>('/v1/courier/carrybee/stores').then((r) => r.data),
  selectStore: (storeId: string, storeName: string) => api.post('/v1/courier/carrybee/store', { storeId, storeName }).then((r) => r.data),
  settings: () => api.get<CarrybeeSettings>('/v1/courier/carrybee/settings').then((r) => r.data),
  saveSettings: (body: CarrybeeSettingsPatch) => api.put<CarrybeeSettings>('/v1/courier/carrybee/settings', body).then((r) => r.data),
  cities: () => api.get<CarrybeePlace[]>('/v1/courier/carrybee/cities').then((r) => r.data),
  zones: (cityId: number) => api.get<CarrybeePlace[]>('/v1/courier/carrybee/zones', { params: { cityId } }).then((r) => r.data),
  areas: (cityId: number, zoneId: number) => api.get<CarrybeePlace[]>('/v1/courier/carrybee/areas', { params: { cityId, zoneId } }).then((r) => r.data),
  parcels: (query: { group?: CarrybeeParcelGroup; q?: string; from?: string; to?: string; page?: number; perPage?: number }) =>
    api.get<CarrybeeParcelsResponse>('/v1/courier/carrybee/parcels', { params: query }).then((r) => r.data),
  stats: (range: PathaoStatsRange) => api.get<SteadfastStats>('/v1/courier/carrybee/stats', { params: { range } }).then((r) => r.data),
  bookBulk: (orderIds: string[], dryRun: boolean) => api.post<PathaoBulkResult>('/v1/courier/carrybee/book-bulk', { orderIds, dryRun }).then((r) => r.data),
  /** Book one order with a city / zone (and optional area) picked by hand, through the shared order booking route. */
  bookWithPlace: (orderId: string, place: { cityId: number; zoneId: number; areaId?: number | null }) =>
    api
      .post(`/v1/orders/${orderId}/courier/book`, { cityId: place.cityId, zoneId: place.zoneId, ...(place.areaId ? { areaId: place.areaId } : {}) })
      .then((r) => r.data),
  webhook: () => api.get<CarrybeeWebhook>('/v1/courier/carrybee/webhook').then((r) => r.data),
  regenerateWebhook: () => api.post<CarrybeeWebhook>('/v1/courier/carrybee/webhook/regenerate').then((r) => r.data),
  cancel: (orderId: string, reason: string) => api.post(`/v1/courier/carrybee/orders/${orderId}/cancel`, { reason }).then((r) => r.data),
};
