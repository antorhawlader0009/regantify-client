import { api } from './api';

// Store > Integrations > Google Analytics 4 — mirrors the server's
// GoogleAnalyticsService (server/src/store-settings/google-analytics.service.ts).
// Owner-only routes on VendorController. The Measurement Protocol API
// secret is write-only: the server only ever reports whether one is saved.

export type GaConsentMode = 'BASIC' | 'ADVANCED';
export type GaPurchaseSource = 'BROWSER' | 'SERVER';
export type GaDeferredPurchaseStatus = 'PROCESSING' | 'SHIPPING' | 'COMPLETED';

export interface GoogleAnalyticsSettings {
  measurementId: string | null;
  secondaryMeasurementId: string | null;
  ecommerceEvents: boolean;
  consentMode: GaConsentMode;
  debugMode: boolean;
  mpApiSecretSet: boolean;
  purchaseSource: GaPurchaseSource;
  deferredPurchase: boolean;
  deferredPurchaseStatus: GaDeferredPurchaseStatus;
  sendRefunds: boolean;
  mpLastSuccessAt: string | null;
  mpLastError: string | null;
  warnings: {
    // GA4 only runs on StorePal stores.
    themeNotStorePal: boolean;
    gtagCodeInCustomCode: boolean;
    gdprPromptOff: boolean;
  };
}

export interface UpdateGoogleAnalyticsSettings {
  // The bare G-XXXXXXXXXX or Google's whole gtag.js snippet.
  measurementId?: string;
  secondaryMeasurementId?: string;
  ecommerceEvents?: boolean;
  consentMode?: GaConsentMode;
  debugMode?: boolean;
  // Empty/omitted keeps the saved secret; clearMpApiSecret removes it.
  mpApiSecret?: string;
  clearMpApiSecret?: boolean;
  purchaseSource?: GaPurchaseSource;
  deferredPurchase?: boolean;
  deferredPurchaseStatus?: GaDeferredPurchaseStatus;
  sendRefunds?: boolean;
}

export const googleAnalyticsApi = {
  get: async () => (await api.get<GoogleAnalyticsSettings>('/v1/vendor/google-analytics')).data,
  update: async (body: UpdateGoogleAnalyticsSettings) =>
    (await api.patch<GoogleAnalyticsSettings>('/v1/vendor/google-analytics', body)).data,
  // Sends one debug-mode event through the Measurement Protocol; it shows
  // up in GA4's DebugView when the Measurement ID and API secret are right.
  sendTestEvent: async () => (await api.post<{ ok: true }>('/v1/vendor/google-analytics/test')).data,
};
