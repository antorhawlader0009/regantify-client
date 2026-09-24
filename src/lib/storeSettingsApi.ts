import { api } from './api';

// Store > Stock Settings / GDPR Prompt / COD Guard — mirrors the server's
// StoreSettingsService (server/src/store-settings/). All three are owner-
// only routes on VendorController.

export interface StockSettings {
  showOutOfStockProducts: boolean;
  showOutOfStockBadge: boolean;
  allowBackorder: boolean;
  backorderPopupMessage: string | null;
  backorderShortMessage: string | null;
  reduceStockOnCodCheckout: boolean;
}

export type GdprPromptPosition = 'BOTTOM' | 'TOP' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';

export interface GdprSettings {
  enabled: boolean;
  message: string | null;
  position: GdprPromptPosition;
  backgroundColor: string;
  textColor: string;
}

export type CodVerificationType = 'NONE' | 'CALL' | 'SMS';
export type CodVerificationCondition = 'ALL_COD_ORDERS' | 'NEW_CUSTOMERS';
export type CodVerificationTrigger = 'BEFORE_CHECKOUT' | 'AFTER_CHECKOUT';

export interface CodGuardSettings {
  autoBlockEnabled: boolean;
  verificationType: CodVerificationType;
  verificationCondition: CodVerificationCondition | null;
  verificationTrigger: CodVerificationTrigger | null;
}

export const storeSettingsApi = {
  getStock: async () => (await api.get<StockSettings>('/v1/vendor/stock-settings')).data,
  updateStock: async (body: Partial<Omit<StockSettings, 'backorderPopupMessage' | 'backorderShortMessage'>> & {
    backorderPopupMessage?: string;
    backorderShortMessage?: string;
  }) => (await api.patch<StockSettings>('/v1/vendor/stock-settings', body)).data,

  getGdpr: async () => (await api.get<GdprSettings>('/v1/vendor/gdpr-settings')).data,
  updateGdpr: async (body: Partial<Omit<GdprSettings, 'message'>> & { message?: string }) =>
    (await api.patch<GdprSettings>('/v1/vendor/gdpr-settings', body)).data,

  getCodGuard: async () => (await api.get<CodGuardSettings>('/v1/vendor/cod-guard')).data,
  updateCodGuard: async (body: CodGuardSettings) => (await api.patch<CodGuardSettings>('/v1/vendor/cod-guard', body)).data,
  deleteCodGuard: async () => (await api.delete<CodGuardSettings>('/v1/vendor/cod-guard')).data,
};

// An emptied RichTextEditor still emits markup like "<p></p>"; send that as
// "" so the server clears the field and the storefront falls back to its
// built-in copy instead of rendering an empty popup/banner.
export function blankHtmlToEmpty(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() ? html : '';
}
