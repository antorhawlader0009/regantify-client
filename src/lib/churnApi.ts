import { api } from './api';

// Mirrors server/src/churn/churn.controller.ts (super-admin-new.md Step 5).

export const CHURN_REASONS = ['TOO_EXPENSIVE', 'NOT_ENOUGH_SALES', 'MISSING_FEATURE', 'OTHER_PLATFORM', 'CLOSING', 'TECH_PROBLEMS', 'OTHER'] as const;
export type ChurnReason = (typeof CHURN_REASONS)[number];
export const REASON_LABEL: Record<ChurnReason, string> = {
  TOO_EXPENSIVE: 'It costs too much',
  NOT_ENOUGH_SALES: 'Not enough sales to pay for it',
  MISSING_FEATURE: 'A feature I need is missing',
  OTHER_PLATFORM: 'Moving to another platform',
  CLOSING: 'Closing the business',
  TECH_PROBLEMS: 'Things did not work well',
  OTHER: 'Something else',
};

export interface ChurnOfferShown {
  type: 'PROMO' | 'DAYS' | 'MESSAGE';
  message: string;
  promoCode: string | null;
  days: number | null;
  fromPlan: string;
}

export interface ChurnOverview {
  last90: { total: number; lapsed: number; downgraded: number; answered: number; skipped: number; wonBack: number };
  reasons: Array<{ reason: ChurnReason; count: number; offered: number; taken: number; wonBack: number }>;
  months: Array<{ month: string; lapsed: number; downgraded: number; wonBack: number }>;
  offers: Array<{ reason: ChurnReason; custom: boolean; type: 'PROMO' | 'DAYS' | 'MESSAGE'; promoCode: string | null; days: number | null; message: string; updatedBy: string | null }>;
  recent: Array<{
    id: string;
    vendorId: string;
    storeName: string;
    kind: 'LAPSED' | 'DOWNGRADED';
    fromPlanCode: string;
    toPlanCode: string;
    reason: ChurnReason | 'SKIPPED' | null;
    note: string | null;
    offerType: string | null;
    offerValue: string | null;
    offerTakenAt: string | null;
    winback7At: string | null;
    winback30At: string | null;
    reactivatedAt: string | null;
    createdAt: string;
  }>;
}

export const churnApi = {
  pending: () => api.get<{ event: { id: string; kind: 'LAPSED' | 'DOWNGRADED'; fromPlan: string; createdAt: string } | null }>('/v1/vendor/churn/pending').then((r) => r.data),
  answer: (id: string, body: { reason: ChurnReason | 'SKIPPED'; note?: string }) => api.post<{ offer: ChurnOfferShown | null }>(`/v1/vendor/churn/${id}/answer`, body).then((r) => r.data),
  accept: (id: string) => api.post<{ promoCode?: string; days?: number; plan?: string }>(`/v1/vendor/churn/${id}/accept`).then((r) => r.data),
  overview: () => api.get<ChurnOverview>('/v1/admin/churn').then((r) => r.data),
  setOffer: (reason: ChurnReason, body: { type: string; promoCode?: string; days?: number; message: string }) => api.put(`/v1/admin/churn/offers/${reason}`, body).then((r) => r.data),
};
