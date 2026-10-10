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
  /** Low stock limit for products without their own (Edit Product > Low stock alert). */
  lowStockThreshold: number;
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
  // "Delivery charge in advance": a COD shopper pays the delivery charge online before the order is placed.
  advanceEnabled: boolean;
  // Only carts of at least this much (BDT). A string when it comes from the server (a decimal), a number when sent.
  advanceMinOrder: string | number | null;
  // The advance isn't paid within an hour: true = the order goes On Hold for a call, false = Payment failed.
  advanceUnpaidHold: boolean;
  // Pre-order advance: a COD order with pre-order products pays this % of them online first; null = off.
  preOrderAdvancePercent: number | null;
  // A new storefront order that looks like a copy of an open one (same phone and product within 24 hours)
  // starts On Hold instead of Pending. It is marked either way.
  duplicateOrderHold: boolean;
  // After-checkout SMS code: hours the shopper has to enter it before the order is dealt with; null = never.
  verificationExpiryHours: number | null;
  // false = the order is cancelled (stock goes back); true = it stays On Hold and the store is told to call.
  verificationExpiryHold: boolean;
  // "Cancel my order" on the shopper's tracking and thank-you pages, while the order is Pending or On Hold.
  customerCancelEnabled: boolean;
}

// Store > Store Away (holiday mode) — mirrors StoreSettingsService.getStoreAwaySettings.
export type StoreAwayMode = 'TAKE_ORDERS' | 'BROWSE_ONLY';

export interface StoreAwaySettings {
  enabled: boolean;
  mode: StoreAwayMode;
  message: string;
  /** The day the store is back (YYYY-MM-DD, Dhaka); null = until turned off. */
  returnDate: string | null;
  /** On right now (enabled and the return day hasn't come). Read-only. */
  active: boolean;
}

// Store > Order Tracking (tracking-plan.md Step 5) — mirrors StoreSettingsService's
// getTrackingNotifySettings. Owner-only, on VendorController.
export type TrackingNotifyEventName = 'confirmed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'delivery_failed' | 'returned' | 'cancelled';

export interface TrackingNotifyEvent {
  event: TrackingNotifyEventName;
  label: string;
  enabled: boolean;
  /** The text in use: the vendor's own, or the built-in one for the chosen language. */
  text: string;
  custom: boolean;
  defaultText: { en: string; bn: string };
}

export interface TrackingNotifySettings {
  language: 'en' | 'bn';
  quietHours: boolean;
  /** Hours without courier movement before a parcel on its way is flagged as stalled. */
  stalledAfterHours: number;
  variables: string[];
  maxTextLength: number;
  events: TrackingNotifyEvent[];
}

export interface UpdateTrackingNotifySettings {
  language?: 'en' | 'bn';
  quietHours?: boolean;
  stalledAfterHours?: number;
  events?: Partial<Record<TrackingNotifyEventName, { enabled?: boolean; text?: string | null }>>;
}

export const storeSettingsApi = {
  getTrackingNotify: async () => (await api.get<TrackingNotifySettings>('/v1/vendor/tracking-notify-settings')).data,
  updateTrackingNotify: async (body: UpdateTrackingNotifySettings) =>
    (await api.patch<TrackingNotifySettings>('/v1/vendor/tracking-notify-settings', body)).data,

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

  getStoreAway: async () => (await api.get<StoreAwaySettings>('/v1/vendor/store-away')).data,
  updateStoreAway: async (body: Omit<StoreAwaySettings, 'active'>) =>
    (await api.patch<StoreAwaySettings>('/v1/vendor/store-away', body)).data,
};

// An emptied RichTextEditor still emits markup like "<p></p>"; send that as
// "" so the server clears the field and the storefront falls back to its
// built-in copy instead of rendering an empty popup/banner.
export function blankHtmlToEmpty(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() ? html : '';
}
