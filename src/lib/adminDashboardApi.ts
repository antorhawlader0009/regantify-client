import { api } from './api';

// Mirrors server/src/admin/admin-dashboard.controller.ts — Super Admin >
// Dashboard. `overview` is the whole page (admin-overview.service.ts has the
// definitions of every number); `getPlatformRevenue` is the older all-time
// platform fee list (see PlatformRevenue's schema comment for why it is
// tracked separately from any vendor's own Finance > Wallet balance).

export interface PlatformRevenueRow {
  id: string;
  amount: string;
  description: string;
  vendorId: string;
  vendorName: string | null;
  invoiceNumber: number | null;
  createdAt: string;
}

export interface PlatformRevenueSummary {
  totalRevenue: string;
  recent: PlatformRevenueRow[];
}

export type OverviewRange = 'today' | '7d' | '30d' | 'month';

export interface Compared {
  current: number;
  previous: number;
}

export type SmsBalanceLevel = 'OK' | 'LOW' | 'CRITICAL' | 'UNKNOWN';

export interface SmsBalanceStatus {
  /** False when no API key is set on the server. */
  configured: boolean;
  /** Taka; null when it could not be read. */
  balance: number | null;
  error: string | null;
  checkedAt: string;
  threshold: number;
  level: SmsBalanceLevel;
}

export interface AdminOverview {
  range: OverviewRange;
  generatedAt: string;
  period: { from: string; to: string; previousLabel: string };
  income: {
    total: Compared;
    plans: Compared;
    sms: Compared;
    ai: Compared;
    platformFees: Compared;
    /** Not income: the stores' own money held by the platform. */
    walletTopups: Compared;
    /** Not income: old store debts paid down inside a purchase. */
    debtsCleared: Compared;
  };
  subscriptions: {
    payingStores: number;
    freeStores: number;
    mrr: number;
    plans: Array<{ code: string; name: string; price: number; stores: number; mrr: number }>;
    newPaying: Compared;
    renewals: Compared;
    ended: Compared;
    upgrades: Compared;
    downgrades: Compared;
  };
  stores: {
    total: number;
    active7d: number;
    suspended: number;
    pending: number;
    underKyc: number;
    signupsToday: number;
    signups7d: number;
    signups: Compared;
  };
  gmv: {
    total: Compared;
    orders: Compared;
    average: Compared;
    bySource: Record<'STOREFRONT' | 'MANUAL' | 'POS', { orders: number; gmv: number }>;
  };
  needsAction: {
    planRequests: number;
    withdrawPending: { count: number; amount: number };
    withdrawToPay: { count: number; amount: number };
    kycSubmitted: number;
    supportWaiting: number;
    lateJobs: string[];
    paidNotApplied: number;
    failedWebhooks: number;
    sms: SmsBalanceStatus;
  };
  charts: {
    signups: Array<{ bucket: string; signups: number }>;
    income: Array<{ bucket: string; income: number }>;
  };
}

export const adminDashboardApi = {
  getPlatformRevenue: () =>
    api.get<PlatformRevenueSummary>('/v1/admin/dashboard/platform-revenue').then((r) => r.data),
  overview: (range: OverviewRange) =>
    api.get<AdminOverview>('/v1/admin/dashboard/overview', { params: { range } }).then((r) => r.data),
  /** The bulksmsbd.net balance, read fresh. */
  smsBalance: () => api.get<SmsBalanceStatus>('/v1/admin/dashboard/sms-balance').then((r) => r.data),
  setSmsThreshold: (threshold: number) =>
    api.patch<SmsBalanceStatus>('/v1/admin/dashboard/sms-threshold', { threshold }).then((r) => r.data),
};
