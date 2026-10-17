import { api } from './api';
import type { PendingApproval } from './approvalsApi';
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
  /** Super Admin paused this store's withdrawals (Step 6). */
  withdrawPause: { since: string; reason: string | null } | null;
  /** Pay from the wallet: this store's own setting (DEFAULT = follow the platform rule), the rule, and whether it can pay now. */
  walletPurchase: { setting: 'DEFAULT' | 'ON' | 'OFF'; platformMode: 'OFF' | 'VERIFIED' | 'ALL'; verified: boolean; allowed: boolean };
  wallet: { balance: number; smsCredits: number; aiCredits: number };
  usage: {
    products: StoreLimit;
    staff: StoreLimit;
    landingPages: StoreLimit;
    visitsThisMonth: StoreLimit;
    dailyOrderLimit: number | null;
    /** Set when Super Admin gave this store limits of its own (Step 14); the numbers above already include them. */
    ownLimits: { until: string | null; reason: string } | null;
    orders30d: number;
    gmv30d: number;
    lastOrderAt: string | null;
    perDay: Array<{ bucket: string; orders: number; gmv: number }>;
  };
  connections: { couriers: StoreConnection[]; gateways: StoreConnection[]; customDomain: string | null; telegramChats: number; pushDevices: number };
}
export interface StoreMoney {
  /** Shopper refunds this store still owes (TellMe idea 145); null if it could not be read. */
  refundsOwed: { since: string; count: number; total: number; lateCount: number; items: Array<{ orderId: string; ref: string; remaining: number; waitingDays: number }> } | null;
  smsEntries: Array<{ id: string; delta: number; balanceAfter: number; reason: string; note: string | null; createdAt: string }>;
  transactions: Array<{ id: string; type: 'CREDIT' | 'DEBIT'; amount: number; balanceAfter: number; description: string; createdAt: string }>;
  payments: Array<{ id: string; invoiceNumber: string; purpose: string; packageId: string | null; status: string; amount: number; receiptNumber: number | null; createdAt: string; fulfilledAt: string | null }>;
  withdrawals: Array<{ id: string; amount: number; method: string; status: string; createdAt: string; resolvedAt: string | null; payoutReference: string | null }>;
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
  // Step 5 (super-admin-plan.md)
  theme: string;
  customDomain: string | null;
  tags: string[];
  planEndsAt: string | null;
  orders30d: number;
  gmv30d: number;
  kycState: 'none' | 'open' | 'approved';
  health: StoreHealth;
}

export type HealthBand = 'HEALTHY' | 'NEEDS_HELP' | 'AT_RISK';
export interface StoreHealth {
  score: number;
  band: HealthBand;
  /** What is missing, biggest first. */
  gaps: string[];
}

export interface AdminVendorListResponse {
  vendors: AdminVendor[];
  total: number;
  page: number;
  perPage: number;
  /** Per status, following every other filter. */
  counts: Record<'ALL' | VendorStatus, number>;
  tags: string[];
}

export type VendorSort = 'createdAt' | 'storeName' | 'balance' | 'lastLoginAt' | 'orders30d' | 'gmv30d' | 'health';

export interface ListVendorsParams {
  search?: string;
  page?: number;
  perPage?: number;
  sortBy?: VendorSort;
  sortOrder?: 'asc' | 'desc';
  status?: VendorStatus;
  plan?: PlanCode;
  endingInDays?: number;
  signupFrom?: string;
  signupTo?: string;
  inactiveDays?: number;
  hasDomain?: 'yes' | 'no';
  kyc?: 'none' | 'open' | 'approved';
  theme?: string;
  tag?: string;
  health?: HealthBand;
  noOrders?: boolean;
}

export interface PendingStore {
  id: string;
  storeName: string;
  subdomain: string;
  createdAt: string;
  ownerName: string | null;
  phone: string | null;
  email: string | null;
  warnings: string[];
}

export interface AdminNote {
  id: string;
  text: string;
  authorName: string;
  pinned: boolean;
  createdAt: string;
}

export interface BulkResult {
  requested: number;
  done: number;
  texted: number;
  failed: Array<{ id: string; storeName: string; error: string }>;
}

export type BulkBody =
  | { action: 'STATUS'; status: 'ACTIVE' | 'PENDING' | 'SUSPENDED'; vendorIds: string[]; reason: string }
  | { action: 'EXTEND'; days: number; vendorIds: string[]; reason: string }
  | { action: 'TAG_ADD' | 'TAG_REMOVE'; tag: string; vendorIds: string[]; reason: string };

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

export interface AdminCreateStoreBody {
  ownerName: string;
  phone: string;
  password: string;
  storeName: string;
  subdomain?: string;
  email?: string;
  sendSms?: boolean;
}

export const adminApi = {
  listVendors: (params: ListVendorsParams = {}) =>
    api.get<AdminVendorListResponse>('/v1/admin/vendors', { params }).then((r) => r.data),

  // "New store": the platform team opens a store with the owner's phone and a password, no OTP (AuthService.adminCreateVendor).
  createVendor: (body: AdminCreateStoreBody) =>
    api
      .post<{ vendorId: string; storeName: string; subdomain: string; phone: string; smsSent: boolean }>('/v1/admin/vendors', body)
      .then((r) => r.data),

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

  listVendorsCsv: (params: ListVendorsParams) => api.get<string>('/v1/admin/vendors/export', { params, responseType: 'text' }).then((r) => r.data),
  pendingQueue: () => api.get<PendingStore[]>('/v1/admin/vendors/pending-queue').then((r) => r.data),
  approvalSetting: () => api.get<{ enabled: boolean }>('/v1/admin/vendors/approval-setting').then((r) => r.data),
  setApprovalSetting: (enabled: boolean) => api.put<{ enabled: boolean }>('/v1/admin/vendors/approval-setting', { enabled }).then((r) => r.data),
  approveStore: (id: string) => api.post<{ texted: boolean }>(`/v1/admin/vendors/${id}/approve`, {}).then((r) => r.data),
  rejectStore: (id: string, reason: string) => api.post<{ texted: boolean }>(`/v1/admin/vendors/${id}/reject`, { reason }).then((r) => r.data),
  bulk: (body: BulkBody) => api.post<BulkResult>('/v1/admin/vendors/bulk', body).then((r) => r.data),
  storeHealth: (id: string) => api.get<{ health: StoreHealth; tags: string[] }>(`/v1/admin/vendors/${id}/health`).then((r) => r.data),
  setStoreTags: (id: string, tags: string[]) => api.put<{ tags: string[] }>(`/v1/admin/vendors/${id}/tags`, { tags }).then((r) => r.data),
  storeNotes: (id: string) => api.get<AdminNote[]>(`/v1/admin/vendors/${id}/notes`).then((r) => r.data),
  addStoreNote: (id: string, text: string, pinned: boolean) => api.post<AdminNote>(`/v1/admin/vendors/${id}/notes`, { text, pinned }).then((r) => r.data),
  pinStoreNote: (id: string, noteId: string, pinned: boolean) => api.patch(`/v1/admin/vendors/${id}/notes/${noteId}`, { pinned }).then((r) => r.data),

  // A store's own page.
  storeDetail: (id: string) => api.get<StoreDetail>(`/v1/admin/vendors/${id}/detail`).then((r) => r.data),
  storeMoney: (id: string) => api.get<StoreMoney>(`/v1/admin/vendors/${id}/money`).then((r) => r.data),
  storeOrders: (id: string, params: { search?: string; page?: number }) => api.get<Paged<StoreOrderRow>>(`/v1/admin/vendors/${id}/orders`, { params }).then((r) => r.data),
  storeProducts: (id: string, params: { search?: string; page?: number }) => api.get<Paged<StoreProductRow>>(`/v1/admin/vendors/${id}/products`, { params }).then((r) => r.data),
  storeCustomers: (id: string, params: { search?: string; page?: number }) => api.get<Paged<StoreCustomerRow>>(`/v1/admin/vendors/${id}/customers`, { params }).then((r) => r.data),
  storeHistory: (id: string) => api.get<StoreHistory>(`/v1/admin/vendors/${id}/history`).then((r) => r.data),
  walletAdjust: (id: string, type: 'CREDIT' | 'DEBIT', amount: number, reason: string) => api.post<{ balance: number } | PendingApproval>(`/v1/admin/vendors/${id}/wallet-adjust`, { type, amount, reason }).then((r) => r.data),
  smsCreditsAdjust: (id: string, amount: number, reason: string) => api.post<{ smsCredits: number }>(`/v1/admin/vendors/${id}/sms-credits`, { amount, reason }).then((r) => r.data),
  pauseWithdrawals: (id: string, reason: string) => api.post<{ paused: boolean }>(`/v1/admin/vendors/${id}/pause-withdrawals`, { reason }).then((r) => r.data),
  setWalletPurchases: (id: string, setting: 'DEFAULT' | 'ON' | 'OFF', reason: string) =>
    api.post<{ setting: string; allowed: boolean }>(`/v1/admin/vendors/${id}/wallet-purchases`, { setting, reason }).then((r) => r.data),
  resumeWithdrawals: (id: string, reason: string) => api.post<{ paused: boolean }>(`/v1/admin/vendors/${id}/resume-withdrawals`, { reason }).then((r) => r.data),
  extendPlan: (id: string, days: number, reason: string) => api.post<{ expiresAt: string }>(`/v1/admin/vendors/${id}/extend-plan`, { days, reason }).then((r) => r.data),
  sendPasswordSms: (id: string, reason: string) => api.post<{ sentTo: string }>(`/v1/admin/vendors/${id}/password-sms`, { reason }).then((r) => r.data),
  signOutStore: (id: string, reason: string) => api.post<{ accounts: number }>(`/v1/admin/vendors/${id}/sign-out-all`, { reason }).then((r) => r.data),
  closeStore: (id: string, body: { reason: string; storeName: string; code: string }) => api.post<{ status: 'CLOSED'; texted: boolean } | PendingApproval>(`/v1/admin/vendors/${id}/close`, body).then((r) => r.data),
  reopenStore: (id: string, reason: string) => api.post<{ status: 'ACTIVE'; texted: boolean }>(`/v1/admin/vendors/${id}/reopen`, { reason }).then((r) => r.data),
  transferStart: (id: string, body: { reason: string; storeName: string; code: string; newPhone: string }) => api.post<{ sentTo: string } | PendingApproval>(`/v1/admin/vendors/${id}/transfer/start`, body).then((r) => r.data),
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
