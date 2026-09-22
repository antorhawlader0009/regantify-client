import { api } from './api';

// Mirrors server/src/admin/admin-dashboard.controller.ts — Super Admin >
// Dashboard's platform revenue summary (see PlatformRevenue's schema
// comment for why this is tracked separately from any vendor's own
// Finance > Wallet balance).

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

export const adminDashboardApi = {
  getPlatformRevenue: () =>
    api.get<PlatformRevenueSummary>('/v1/admin/dashboard/platform-revenue').then((r) => r.data),
};
