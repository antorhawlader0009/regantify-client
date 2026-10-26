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

/** Super Admin > Analytics > Simple mode (SIMPLE-VIEW-plan.md Step 12). */
export interface DashboardViewsReport {
  since: string;
  owners: { simple: number; full: number };
  switches: { toSimple: number; toFull: number };
  pinsAdded: number;
  hiddenPagesOpened: Array<{ path: string; count: number }>;
  leftFrom: Array<{ path: string; count: number }>;
  pinned: Array<{ path: string; people: number }>;
}

/** Which storefront features shoppers use (IDEA-30): counts per feature over a window, against the period before. */
export interface FeatureUseReport {
  days: number;
  /** The first day anything was counted; null = nothing yet. */
  since: string | null;
  /** Stores with any tracked use in the window. */
  activeStores: number;
  features: Array<{ key: string; label: string; group: string; uses: number; stores: number; before: number }>;
}

/** Where new stores get stuck (IDEA-37): how many stores of a sign-up group reached each early step. */
export type ActivationStepKey = 'PRODUCT' | 'CONNECT' | 'ORDER' | 'DELIVERED';

export interface ActivationReport {
  days: number;
  /** Active stores opened in the window. */
  total: number;
  steps: Array<{
    key: ActivationStepKey;
    label: string;
    reached: number;
    /** 0 to 1 of `total`. */
    share: number;
    /** Median days from sign-up to the step; null = nobody yet. */
    medianDays: number | null;
    /** The automatic nudge that works on this step: null = none exists; a name of null = not created yet. */
    nudge: { name: string | null; enabled: boolean } | null;
  }>;
}

export interface ActivationStuckStore {
  vendorId: string;
  storeName: string;
  ownerName: string | null;
  phone: string | null;
  daysSinceSignup: number;
  daysSinceSignIn: number | null;
  done: Record<ActivationStepKey, boolean>;
}

export const adminAnalyticsApi = {
  activation: (days: number) => api.get<ActivationReport>('/v1/admin/analytics/activation', { params: { days } }).then((r) => r.data),
  activationStuck: (step: ActivationStepKey, days: number) =>
    api.get<ActivationStuckStore[]>('/v1/admin/analytics/activation/stuck', { params: { step, days } }).then((r) => r.data),
  featureUse: (days: number) => api.get<FeatureUseReport>('/v1/admin/analytics/feature-use', { params: { days } }).then((r) => r.data),
  get: () => api.get<AdminAnalytics>('/v1/admin/analytics').then((r) => r.data),
  dashboardViews: () => api.get<DashboardViewsReport>('/v1/admin/analytics/dashboard-views').then((r) => r.data),
};
