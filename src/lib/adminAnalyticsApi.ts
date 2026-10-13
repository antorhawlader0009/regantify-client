import { api } from './api';

// Mirrors server/src/admin/admin-analytics.service.ts (super-admin-plan.md Step 16).

export interface DayCount {
  day: string;
  count: number;
}
export interface FunnelRow {
  month: string;
  signups: number;
  withProduct: number;
  withOrder: number;
  productPct: number | null;
  orderPct: number | null;
  medianDaysToFirstOrder: number | null;
}
export interface MrrMonth {
  month: string;
  mrr: number;
  newMrr: number;
  upgradeMrr: number;
  downgradeMrr: number;
  lostMrr: number;
  newStores: number;
  upgradeStores: number;
  downgradeStores: number;
  lostStores: number;
  /** Part of this month's history was rebuilt, not recorded. */
  estimated: boolean;
}
export interface LostLastMonth {
  month: string;
  stores: number;
  mrr: number;
  estimated: boolean;
  byPlan: Array<{ plan: string; stores: number; mrr: number }>;
  list: Array<{ vendorId: string; storeName: string; plan: string; mrr: number; at: string }>;
}
export interface RetentionRow {
  month: string;
  signups: number;
  /** After 1, 2, 3 and 6 months; null while that month has not finished. */
  active: Array<number | null>;
  paying: Array<number | null>;
}
export interface Adoption {
  stores: number;
  pct: number | null;
}

export interface AdminAnalytics {
  generatedAt: string;
  definitions: string[];
  growth: { signupsPerDay: DayCount[]; signupsPerWeek: Array<{ week: string; count: number }>; funnel: FunnelRow[] };
  revenue: {
    mrrNow: number;
    payingStores: number;
    payingNow: Array<{ plan: string; stores: number; mrr: number }>;
    mrrByMonth: MrrMonth[];
    lostLastMonth: LostLastMonth;
    incomeByMonth: Array<{ month: string; plans: number; sms: number; ai: number; fees: number; total: number }>;
    incomePerPlan: Array<{ plan: string; payments: number; amount: number }>;
  };
  retention: RetentionRow[];
  usage: {
    activeStoresTotal: number;
    storesWithSales30d: number;
    bySize: Array<{ label: string; stores: number; orders: number; gmv: number }>;
    top: Array<{ vendorId: string; storeName: string; subdomain: string; plan: string; orders: number; gmv: number }>;
    adoption: { lms: Adoption; pos: Adoption; couriers: Adoption; customDomain: Adoption; ai: Adoption };
    smsPerDay: DayCount[];
    aiCreditsPerDay: DayCount[];
  };
}

export const adminAnalyticsApi = {
  get: () => api.get<AdminAnalytics>('/v1/admin/analytics').then((r) => r.data),
};
