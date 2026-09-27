import { api } from './api';

// Store > Integrations > Webhooks — mirrors the server's WebhooksService
// (server/src/webhooks/webhooks.service.ts), through the owner-only
// routes on VendorIntegrationsController.

export interface WebhookEventInfo {
  event: string;
  label: string;
  description: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string | null;
  url: string;
  events: string[];
  isActive: boolean;
  consecutiveFailures: number;
  // Set when the server turned the webhook off after repeated failures.
  disabledReason: string | null;
  lastDeliveryAt: string | null;
  lastResponseStatus: number | null;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  event: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  attempts: number;
  nextAttemptAt: string | null;
  responseStatus: number | null;
  responseBody: string | null;
  error: string | null;
  durationMs: number | null;
  payload: unknown;
  createdAt: string;
  deliveredAt: string | null;
}

export interface WebhookSendResult {
  ok: boolean;
  status: number | null;
  error: string | null;
  durationMs: number;
}

export interface SaveWebhookInput {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
}

export const webhooksApi = {
  events: async () => (await api.get<WebhookEventInfo[]>('/v1/vendor/webhooks/events')).data,
  list: async () => (await api.get<WebhookEndpoint[]>('/v1/vendor/webhooks')).data,
  // The secret comes back only here (and from revealSecret / rotateSecret).
  create: async (body: Required<Pick<SaveWebhookInput, 'url' | 'events'>> & { name?: string }) =>
    (await api.post<WebhookEndpoint & { secret: string }>('/v1/vendor/webhooks', body)).data,
  update: async (id: string, body: SaveWebhookInput) =>
    (await api.patch<WebhookEndpoint>(`/v1/vendor/webhooks/${id}`, body)).data,
  remove: async (id: string) => (await api.delete(`/v1/vendor/webhooks/${id}`)).data,
  revealSecret: async (id: string) => (await api.get<{ secret: string }>(`/v1/vendor/webhooks/${id}/secret`)).data,
  rotateSecret: async (id: string) => (await api.post<{ secret: string }>(`/v1/vendor/webhooks/${id}/rotate-secret`)).data,
  deliveries: async (id: string) => (await api.get<WebhookDelivery[]>(`/v1/vendor/webhooks/${id}/deliveries`)).data,
  sendTest: async (id: string) => (await api.post<WebhookSendResult>(`/v1/vendor/webhooks/${id}/test`)).data,
  resend: async (id: string, deliveryId: string) =>
    (await api.post<WebhookSendResult>(`/v1/vendor/webhooks/${id}/deliveries/${deliveryId}/resend`)).data,
};
