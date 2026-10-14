import { api } from './api';

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

export interface CarrybeeSettings {
  deliveryType: 1 | 2;
  productType: 1 | 2 | 3;
  defaultWeightGrams: number;
}

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
  saveSettings: (body: Partial<CarrybeeSettings>) => api.put<CarrybeeSettings>('/v1/courier/carrybee/settings', body).then((r) => r.data),
  webhook: () => api.get<CarrybeeWebhook>('/v1/courier/carrybee/webhook').then((r) => r.data),
  regenerateWebhook: () => api.post<CarrybeeWebhook>('/v1/courier/carrybee/webhook/regenerate').then((r) => r.data),
  cancel: (orderId: string, reason: string) => api.post(`/v1/courier/carrybee/orders/${orderId}/cancel`, { reason }).then((r) => r.data),
};
