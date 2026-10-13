import { api } from './api';
import type { PlanCode } from './plansApi';

// Mirrors server/src/admin — Super Admin > All Vendors.
export type VendorStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CLOSED';

// Super Admin > a store's own page (super-admin-plan.md Step 4), mirrors server/src/admin/admin-store.service.ts.
export interface StoreLimit {
  used: number;
  limit: number | null;
}
export interface StoreConnection {
  name: string;
  on: boolean;
  since: string;
}
export interface StoreDetail {
  id: string;
  storeName: string;
  subdomain: string;
  customDomain: string | null;
  status: VendorStatus;
  theme: string;
  address: string | null;
  createdAt: string;
  owner: { name: string | null; phone: string | null; email: string | null; lastLoginAt: string | null };
  plan: { code: PlanCode; name: string; priceMonthly: number; startedAt: string | null; expiresAt: string | null; status: string };
  kyc: { status: string; dueAt: string } | null;
  openTickets: number;
  wallet: { balance: number; smsCredits: number; aiCredits: number };
  usage: {
    products: StoreLimit;
    staff: StoreLimit;
    landingPages: StoreLimit;
    visitsThisMonth: StoreLimit;
    dailyOrderLimit: number | null;
    orders30d: number;
    gmv30d: number;
    lastOrderAt: string | null;
    perDay: Array<{ bucket: string; orders: number; gmv: number }>;
  };
  connections: { couriers: StoreConnection[]; gateways: StoreConnection[]; customDomain: string | null; telegramChats: number; pushDevices: number };
}
export interface StoreMoney {
  transactions: Array<{ id: string; type: 'CREDIT' | 'DEBIT'; amount: number; balanceAfter: number; description: string; createdAt: string }>;
  payments: Array<{ id: string; invoiceNumber: string; purpose: string; packageId: string | null; status: string; amount: number; receiptNumber: number | null; createdAt: string; fulfilledAt: string | null }>;
  withdrawals: Array<{ id: string; amount: number; method: string; status: string; createdAt: string; resolvedAt: string | null }>;
  platformFees: { allTime: number; last30d: number };
}
export interface Paged<T> {
  total: number;
  page: number;
  perPage: number;
  items: T[];
}
export interface StoreOrderRow {
  id: string;
  invoiceNumber: number;
  publicCode: string | null;
  status: string;
  source: string;
  total: number;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
}
export interface StoreProductRow {
  id: string;
  name: string;
  sku: string;
  price: number;
  discountPrice: number | null;
  stockQuantity: number | null;
  visibility: string;
  createdAt: string;
}
export interface StoreCustomerRow {
  phone: string;
  name: string;
  orders: number;
  spent: number;
  last: string;
}
export interface StoreHistory {
  log: Array<{ id: string; adminName: string; action: string; summary: string; reason: string | null; createdAt: string }>;
  tickets: Array<{ id: string; number: number; subject: string; status: string; lastMessageAt: string }>;
  kyc: Array<{ id: string; status: string; requestedAt: string; dueAt: string; reviewedAt: string | null }>;
}

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
  // Suspending needs a reason: the owner is texted it.
  updateVendorStatus: (vendorId: string, status: VendorStatus, reason?: string) =>
    api
      .patch<{ id: string; status: VendorStatus; texted: boolean }>(`/v1/admin/vendors/${vendorId}/status`, { status, reason })
      .then((r) => r.data),

  // A store's own page.
  storeDetail: (id: string) => api.get<StoreDetail>(`/v1/admin/vendors/${id}/detail`).then((r) => r.data),
  storeMoney: (id: string) => api.get<StoreMoney>(`/v1/admin/vendors/${id}/money`).then((r) => r.data),
  storeOrders: (id: string, params: { search?: string; page?: number }) => api.get<Paged<StoreOrderRow>>(`/v1/admin/vendors/${id}/orders`, { params }).then((r) => r.data),
  storeProducts: (id: string, params: { search?: string; page?: number }) => api.get<Paged<StoreProductRow>>(`/v1/admin/vendors/${id}/products`, { params }).then((r) => r.data),
  storeCustomers: (id: string, params: { search?: string; page?: number }) => api.get<Paged<StoreCustomerRow>>(`/v1/admin/vendors/${id}/customers`, { params }).then((r) => r.data),
  storeHistory: (id: string) => api.get<StoreHistory>(`/v1/admin/vendors/${id}/history`).then((r) => r.data),
  extendPlan: (id: string, days: number, reason: string) => api.post<{ expiresAt: string }>(`/v1/admin/vendors/${id}/extend-plan`, { days, reason }).then((r) => r.data),
  sendPasswordSms: (id: string, reason: string) => api.post<{ sentTo: string }>(`/v1/admin/vendors/${id}/password-sms`, { reason }).then((r) => r.data),
  signOutStore: (id: string, reason: string) => api.post<{ accounts: number }>(`/v1/admin/vendors/${id}/sign-out-all`, { reason }).then((r) => r.data),
  closeStore: (id: string, body: { reason: string; storeName: string; code: string }) => api.post<{ status: 'CLOSED'; texted: boolean }>(`/v1/admin/vendors/${id}/close`, body).then((r) => r.data),
  reopenStore: (id: string, reason: string) => api.post<{ status: 'ACTIVE'; texted: boolean }>(`/v1/admin/vendors/${id}/reopen`, { reason }).then((r) => r.data),
  transferStart: (id: string, body: { reason: string; storeName: string; code: string; newPhone: string }) => api.post<{ sentTo: string }>(`/v1/admin/vendors/${id}/transfer/start`, body).then((r) => r.data),
  transferConfirm: (id: string, body: { reason: string; newPhone: string; otp: string }) => api.post<{ owner: string }>(`/v1/admin/vendors/${id}/transfer/confirm`, body).then((r) => r.data),

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
      .post<{ balanceAfter: number; amount: number }>(`/v1/admin/vendors/${vendorId}/ai-tokens`, { amount, reason })
      .then((r) => r.data),
};
