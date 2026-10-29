import { api } from './api';
import type { PlanCode } from './plansApi';

// Mirrors server/src/admin/admin-fees.controller.ts - Super Admin > Commission Settings (super-admin-plan.md Step 12).

export type FeeDealType = 'COD' | 'ONLINE_PAYMENT' | 'ADVANCE';
export type FeePayer = 'CUSTOMER' | 'VENDOR';

export interface PlanFees {
  id: string;
  code: PlanCode;
  name: string;
  /** Stores on this plan right now. */
  stores: number;
  cod: { flat: number; percent: number; payer: FeePayer };
  online: { flat: number; percent: number; payer: FeePayer };
  /** Also the fee on an order payment link (they share one rate). */
  advance: { flat: number; percent: number };
}

export interface FeeDeal {
  id: string;
  vendorId: string;
  storeName: string;
  type: FeeDealType;
  flat: number;
  percent: number;
  payer: FeePayer | null;
  until: string | null;
  reason: string;
  by: string;
  createdAt: string;
  endedAt: string | null;
  endedReason: string | null;
}

export interface FeeOverview {
  plans: PlanFees[];
  deals: FeeDeal[];
  endedDeals: FeeDeal[];
}

export interface FeeImpact {
  stores: number;
  keepTheirRate: number;
  changed: number;
}

export interface NewFeeDeal {
  vendorId: string;
  type: FeeDealType;
  flat: number;
  percent: number;
  payer?: FeePayer;
  untilDays?: number;
  reason: string;
}

export const adminFeesApi = {
  overview: () => api.get<FeeOverview>('/v1/admin/fees').then((r) => r.data),
  impact: (planId: string, groups: FeeDealType[]) => api.get<FeeImpact>('/v1/admin/fees/impact', { params: { planId, groups: groups.join(',') } }).then((r) => r.data),
  forStore: (vendorId: string) => api.get<Array<FeeDeal & { active: boolean }>>(`/v1/admin/fees/stores/${vendorId}`).then((r) => r.data),
  createDeal: (body: NewFeeDeal) => api.post('/v1/admin/fees/deals', body).then((r) => r.data),
  endDeal: (id: string, reason: string) => api.post(`/v1/admin/fees/deals/${id}/end`, { reason }).then((r) => r.data),
};
