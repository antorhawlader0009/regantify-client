import { api } from './api';
import type { DeferredPurchaseStatus } from './metaPixelApi';

// Store > Integrations > TikTok Pixel — mirrors the server's
// TiktokPixelService (server/src/store-settings/tiktok-pixel.service.ts).
// Owner-only routes on VendorController. The Events API access token is
// write-only: the server only ever reports whether one is saved.

export interface TiktokPixelSettings {
  pixelId: string | null;
  ecommerceEvents: boolean;
  advancedMatching: boolean;
  eventsApiTokenSet: boolean;
  eventsApiTokenInvalid: boolean;
  testEventCode: string | null;
  eventsApiLastSuccessAt: string | null;
  eventsApiLastError: string | null;
  deferredPurchase: boolean;
  deferredPurchaseStatus: DeferredPurchaseStatus;
  warnings: {
    // The pixel only runs on StorePal stores.
    themeNotStorePal: boolean;
    pixelCodeInCustomCode: boolean;
    gdprPromptOff: boolean;
  };
}

export interface UpdateTiktokPixelSettings {
  // The bare pixel ID or TikTok's whole base code.
  pixelId?: string;
  ecommerceEvents?: boolean;
  advancedMatching?: boolean;
  // Empty/omitted keeps the saved token; clearEventsApiToken removes it.
  eventsApiToken?: string;
  clearEventsApiToken?: boolean;
  testEventCode?: string;
  deferredPurchase?: boolean;
  deferredPurchaseStatus?: DeferredPurchaseStatus;
}

export const tiktokPixelApi = {
  get: async () => (await api.get<TiktokPixelSettings>('/v1/vendor/tiktok-pixel')).data,
  update: async (body: UpdateTiktokPixelSettings) =>
    (await api.patch<TiktokPixelSettings>('/v1/vendor/tiktok-pixel', body)).data,
  // Sends one test event with the saved Test Event Code; rejects with
  // TikTok's own error message when TikTok refuses it.
  sendTestEvent: async () => (await api.post<{ ok: true }>('/v1/vendor/tiktok-pixel/test')).data,
};
