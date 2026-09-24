import { api } from './api';

// Store > Integrations > Facebook Pixel (Meta) — mirrors the server's
// MetaPixelService (server/src/store-settings/meta-pixel.service.ts).
// Owner-only routes on VendorController. The Conversions API token is
// write-only: the server only ever reports whether one is saved.

export type MetaPixelEventMode = 'AUTOMATIC' | 'STOREPAL_DEFINED';
export type DeferredPurchaseStatus = 'PROCESSING' | 'SHIPPING' | 'COMPLETED';

export interface MetaPixelSettings {
  pixelId: string | null;
  secondaryPixelId: string | null;
  eventMode: MetaPixelEventMode;
  imgTagTracking: boolean;
  domainVerificationCode: string | null;
  capiTokenSet: boolean;
  capiTokenInvalid: boolean;
  testEventCode: string | null;
  capiLastSuccessAt: string | null;
  capiLastError: string | null;
  deferredPurchase: boolean;
  deferredPurchaseStatus: DeferredPurchaseStatus;
  warnings: {
    // The pixel only runs on StorePal stores.
    themeNotStorePal: boolean;
    pixelCodeInCustomCode: boolean;
    gdprPromptOff: boolean;
  };
}

export interface UpdateMetaPixelSettings {
  pixelId?: string;
  secondaryPixelId?: string;
  eventMode?: MetaPixelEventMode;
  imgTagTracking?: boolean;
  domainVerificationCode?: string;
  // Empty/omitted keeps the saved token; clearCapiToken removes it.
  capiAccessToken?: string;
  clearCapiToken?: boolean;
  testEventCode?: string;
  deferredPurchase?: boolean;
  deferredPurchaseStatus?: DeferredPurchaseStatus;
}

export const metaPixelApi = {
  get: async () => (await api.get<MetaPixelSettings>('/v1/vendor/meta-pixel')).data,
  update: async (body: UpdateMetaPixelSettings) =>
    (await api.patch<MetaPixelSettings>('/v1/vendor/meta-pixel', body)).data,
  // Sends one test event with the saved Test Event Code; rejects with
  // Meta's own error message when Meta refuses it.
  sendTestEvent: async () =>
    (await api.post<{ eventsReceived: number }>('/v1/vendor/meta-pixel/test')).data,
};
