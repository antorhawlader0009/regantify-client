import { api } from './api';

// Mirrors server/src/economics/economics.service.ts (super-admin-new.md Step 10).

export interface EconomicsRates {
  aiUsdRate: number;
  aiUsdRateSet: boolean;
  smsRate: number;
  smsRateSet: boolean;
  gatewayFeePercent: number;
  gatewayFeePercentSet: boolean;
}

export interface EconomicsPlanRow {
  planCode: string;
  plan: string;
  stores: number;
  lossMaking: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number | null;
  arpu: number;
  costAi: number;
  costSms: number;
}

export interface EconomicsLoser {
  vendorId: string;
  storeName: string;
  subdomain: string;
  plan: string;
  revenue: number;
  cost: number;
  margin: number;
  biggestCost: 'AI' | 'SMS' | 'Gateway' | null;
  costAi: number;
  costSms: number;
  costGateway: number;
}

export interface EconomicsOverview {
  month: string;
  months: string[];
  computedAt: string | null;
  rates: EconomicsRates;
  totals: {
    revPlan: number;
    revSms: number;
    revAi: number;
    revFees: number;
    costAi: number;
    costSms: number;
    costGateway: number;
    revenue: number;
    cost: number;
    margin: number;
    aiUsd: number;
    smsSent: number;
    stores: number;
  };
  byPlan: EconomicsPlanRow[];
  ai: { revenue: number; cost: number; usd: number };
  sms: { revenue: number; cost: number; sent: number };
  losers: EconomicsLoser[];
  unit: { payingStores: number; arpu: number; lostStores: number; churnPercent: number; ltv: number | null };
  trend: Array<{ month: string; revenue: number; cost: number; margin: number; payingStores: number }>;
  cohorts: Array<{ cohort: string; stores: number; cells: Array<{ revenue: number; margin: number; paying: number }> }>;
}

export const adminEconomicsApi = {
  overview: (month?: string) => api.get<EconomicsOverview>('/v1/admin/economics', { params: month ? { month } : {} }).then((r) => r.data),
  setRates: (body: { aiUsdRate?: number | null; smsRate?: number | null; gatewayFeePercent?: number | null }) =>
    api.put<EconomicsRates>('/v1/admin/economics/rates', body).then((r) => r.data),
  rebuild: () => api.post<{ ok: true }>('/v1/admin/economics/rebuild').then((r) => r.data),
};
