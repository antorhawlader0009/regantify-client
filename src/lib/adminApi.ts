import { api } from './api';
import type { PlanCode } from './plansApi';

// Mirrors server/src/admin — Super Admin > All Vendors.
export type VendorStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export interface AdminVendor {
  id: string;
  storeName: string;
  subdomain: string;
  status: VendorStatus;
  phone: string | null;
  email: string | null;
  ownerName: string | null;
  address: string | null;
  // Decimal serialized as a string by Prisma's JSON encoding (e.g. "1250.00") — parse with Number(...) before formatting.
  balance: string;
  smsCredits: number;
  /** The store's AI Credit wallet. */
  aiCreditBalance: number;
  createdAt: string;
  lastLoginAt: string | null;
  productCount: number;
  orderCount: number;
  // PLAN.md Step 15 — 'FREE' for a vendor with no VendorSubscription row, same fallback the server applies for enforcement.
  planCode: PlanCode;
  planName: string;
}

export interface AdminVendorListResponse {
  vendors: AdminVendor[];
  total: number;
  page: number;
  perPage: number;
}

export interface ListVendorsParams {
  search?: string;
  page?: number;
  perPage?: number;
  sortBy?: 'createdAt' | 'storeName' | 'balance' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export type ImpersonationMode = 'VIEW' | 'EDIT';

export interface AdminAuditItem {
  id: string;
  at: string;
  adminUserId: string;
  adminName: string;
  action: string;
  summary: string;
  targetType: string | null;
  targetId: string | null;
  vendorId: string | null;
  storeName: string | null;
  /** [{ field, before, after }] or { sent: {...} } */
  changes: unknown;
  reason: string | null;
  ip: string | null;
}

export interface AdminAuditPage {
  total: number;
  page: number;
  perPage: number;
  items: AdminAuditItem[];
  actions: string[];
  admins: Array<{ id: string; name: string }>;
}

export interface AdminAuditQuery {
  admin?: string;
  action?: string;
  vendorId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export const adminApi = {
  listVendors: (params: ListVendorsParams = {}) =>
    api.get<AdminVendorListResponse>('/v1/admin/vendors', { params }).then((r) => r.data),

  // "Login as Vendor" — returns a one-time token, valid 24h if unused,
  // that VendorImpersonateEntry exchanges for a 15-min vendor session in
  // a separate tab. See server/src/admin/admin.service.ts.
  impersonateVendor: (vendorId: string, reason: string, mode: ImpersonationMode) =>
    api.post<{ token: string }>(`/v1/admin/vendors/${vendorId}/impersonate`, { reason, mode }).then((r) => r.data),

  // Settings > Activity log (super-admin-plan.md Step 2).
  auditLog: (params: AdminAuditQuery & { page?: number }) => api.get<AdminAuditPage>('/v1/admin/audit-log', { params }).then((r) => r.data),
  auditLogCsv: (params: AdminAuditQuery) => api.get<string>('/v1/admin/audit-log/export', { params, responseType: 'text' }).then((r) => r.data),

  // Actions column — SUSPENDED blocks the vendor's dashboard login/session
  // AND their public storefront; see AdminService.updateVendorStatus.
  updateVendorStatus: (vendorId: string, status: VendorStatus) =>
    api
      .patch<{ id: string; status: VendorStatus }>(`/v1/admin/vendors/${vendorId}/status`, { status })
      .then((r) => r.data),

  // All Vendors > Change Plan (PLAN.md Step 15) — direct manual
  // assignment, independent of the Plan Requests approve/reject flow
  // (see adminPlansApi.resolvePlanRequest).
  assignVendorPlan: (vendorId: string, planCode: PlanCode) =>
    api.patch(`/v1/admin/vendors/${vendorId}/plan`, { planCode }).then((r) => r.data),

  // All Vendors > store details > Add or remove AI Credits (ai-token-plan.md
  // Step 8). Positive adds, negative removes (never below 0); the reason
  // shows on the store's AI Credit history.
  adjustAiCredits: (vendorId: string, amount: number, reason: string) =>
    api
      .post<{ balanceAfter: number; amount: number }>(`/v1/admin/vendors/${vendorId}/ai-credits`, { amount, reason })
      .then((r) => r.data),
};
