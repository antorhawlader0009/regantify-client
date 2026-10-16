import { api } from './api';

// Products > Sell through resellers (RESELLER-plan.md Step 2). Mirrors server/src/resale/resale-supply.service.ts. Every call answers
// 403 RESALE_NOT_ALLOWED (with a plain sentence) while the store is not allowed to supply; the page shows that sentence.

export type ResaleApproval = 'OPEN' | 'APPROVAL' | 'INVITE';
export type CommissionType = 'FLAT' | 'PERCENT';

export interface ResaleSupplierSettings {
  enabled: boolean;
  approval: ResaleApproval;
  termsBn: string;
  termsEn: string;
  shipWithinDays: number;
  returnWindowDays: number;
  pickupNote: string;
  saved: boolean;
}

export interface ResaleSettingsAnswer {
  settings: ResaleSupplierSettings;
  suggested: { termsBn: string; termsEn: string };
  courierConnected: boolean;
  /** Step 13: offers paused by the system (repeated stock-out cancels); null when not paused. */
  paused: { until: string; reason: string | null } | null;
  offers: { active: number; stopped: number };
}

export interface ResaleTermsView {
  commissionType: CommissionType;
  commissionValue: number;
  minPrice: number | null;
  maxPrice: number | null;
  priceFrom: number;
  priceTo: number;
  earningPerPiece: number;
}

export interface ResaleOfferView {
  id: string;
  active: boolean;
  marketingNote: string;
  terms: ResaleTermsView;
  /** A change worse for resellers, waiting for its date (3 days' notice). */
  pending: (ResaleTermsView & { from: string }) | null;
  updatedAt: string;
}

export interface ResaleOfferItem {
  productId: string;
  name: string;
  photoUrl: string | null;
  visibility: string;
  priceFrom: number;
  priceTo: number;
  hasOptions: boolean;
  samePriceForAll: boolean;
  /** Why this product can't be offered, or null. */
  refusal: string | null;
  offer: ResaleOfferView | null;
  noticeFrom?: string | null;
}

export interface SaveOfferInput {
  commissionType: CommissionType;
  commissionValue: number;
  minPrice: number | null;
  maxPrice: number | null;
  marketingNote?: string;
}

export const RESALE_SUPPLY_KEY = ['resale-supply'] as const;

export const resaleSupplyApi = {
  settings: () => api.get<ResaleSettingsAnswer>('/v1/resale/supply/settings').then((r) => r.data),
  saveSettings: (body: Omit<ResaleSupplierSettings, 'saved'>) => api.put<ResaleSettingsAnswer>('/v1/resale/supply/settings', body).then((r) => r.data),
  offers: (params: { q?: string; show?: 'all' | 'offered'; page?: number }) =>
    api.get<{ total: number; page: number; perPage: number; items: ResaleOfferItem[] }>('/v1/resale/supply/offers', { params }).then((r) => r.data),
  saveOffer: (productId: string, body: SaveOfferInput) => api.put<ResaleOfferItem>(`/v1/resale/supply/offers/${productId}`, body).then((r) => r.data),
  stopOffer: (productId: string) => api.delete<ResaleOfferItem>(`/v1/resale/supply/offers/${productId}`).then((r) => r.data),
  bulk: (body: { productIds: string[]; commissionType: CommissionType; commissionValue: number }) =>
    api
      .post<{ saved: number; waiting: number; notFound: number; skipped: Array<{ productId: string; name: string; reason: string }> }>('/v1/resale/supply/offers/bulk', body)
      .then((r) => r.data),
};

/** "৳150 per piece" / "10%". */
export function commissionLabel(t: { commissionType: CommissionType; commissionValue: number }): string {
  return t.commissionType === 'FLAT' ? `৳${t.commissionValue.toLocaleString()} per piece` : `${t.commissionValue}%`;
}
