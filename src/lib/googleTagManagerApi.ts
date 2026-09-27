import { api } from './api';
import type { GaConsentMode } from './googleAnalyticsApi';

// Store > Integrations > Google Tag Manager — mirrors the server's
// GoogleTagManagerService (server/src/store-settings/google-tag-manager.service.ts).
// Owner-only routes on VendorController.

export interface GoogleTagManagerSettings {
  containerId: string | null;
  ecommerceEvents: boolean;
  customerData: boolean;
  consentMode: GaConsentMode;
  serverContainerUrl: string | null;
  warnings: {
    // GTM only runs on StorePal stores.
    themeNotStorePal: boolean;
    gtmCodeInCustomCode: boolean;
    gdprPromptOff: boolean;
    // Store > Integrations > Google Analytics 4 is also set up.
    googleAnalyticsOn: boolean;
  };
}

export interface UpdateGoogleTagManagerSettings {
  // The bare GTM-XXXXXXX or either of Tag Manager's code snippets.
  containerId?: string;
  ecommerceEvents?: boolean;
  customerData?: boolean;
  consentMode?: GaConsentMode;
  serverContainerUrl?: string;
}

export const googleTagManagerApi = {
  get: async () => (await api.get<GoogleTagManagerSettings>('/v1/vendor/google-tag-manager')).data,
  update: async (body: UpdateGoogleTagManagerSettings) =>
    (await api.patch<GoogleTagManagerSettings>('/v1/vendor/google-tag-manager', body)).data,
};
