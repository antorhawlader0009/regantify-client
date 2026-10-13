import { api } from './api';
import type { WithdrawMethod, WithdrawRequest, WithdrawRequestStatus } from './financeApi';

// Mirrors server/src/admin/admin-withdraw-requests.controller.ts and admin-money.controller.ts — Super
// Admin > Finance > Payouts, Platform Revenue and Reconciliation (super-admin-plan.md Step 6).

export interface AdminWithdrawRequest extends WithdrawRequest {
  vendor: { id: string; storeName: string; subdomain: string };
  /** The bKash/Nagad transaction id or bank reference typed when it was marked paid. */
  payoutReference?: string | null;
}

export interface WithdrawFilters {
  status?: WithdrawRequestStatus;
  method?: WithdrawMethod;
  from?: string;
  to?: string;
  search?: string;
}

export type RevenueGroup = 'day' | 'month' | 'store';
export interface RevenueRow {
  key: string;
  label: string;
  plans: number;
  sms: number;
  ai: number;
  fees: number;
  total: number;
  walletTopups: number;
}
export interface RevenueReport {
  group: RevenueGroup;
  from: string;
  to: string;
  rows: RevenueRow[];
  totals: Omit<RevenueRow, 'key' | 'label'>;
}

export interface Reconciliation {
  notApplied: Array<{ id: string; invoiceNumber: string; purpose: string; amount: number; since: string; vendorId: string; storeName: string }>;
  orderNotWaiting: Array<{ id: string; invoiceNumber: string; amount: number; paidAt: string; vendorId: string; storeName: string; orderId: string | null; orderNumber: number | null; orderStatus: string | null }>;
  doublePaid: Array<{ orderId: string; orderNumber: number | null; orderStatus: string | null; vendorId: string | null; storeName: string; payments: number; total: number }>;
}

export const adminFinanceApi = {
  // The page picks its own default filter (Pending); the server stays flexible.
  listWithdrawRequests: (filters: WithdrawFilters = {}) =>
    api.get<AdminWithdrawRequest[]>('/v1/admin/withdraw-requests', { params: filters }).then((r) => r.data),

  resolveWithdrawRequest: (id: string, decision: 'APPROVED' | 'REJECTED') =>
    api.patch<AdminWithdrawRequest>(`/v1/admin/withdraw-requests/${id}`, { decision }).then((r) => r.data),

  markWithdrawRequestPaid: (id: string, reference?: string) =>
    api.patch<AdminWithdrawRequest>(`/v1/admin/withdraw-requests/${id}/mark-paid`, { reference }).then((r) => r.data),

  batchMarkPaid: (items: Array<{ id: string; reference?: string }>) =>
    api.post<{ requested: number; done: number; failed: Array<{ id: string; error: string }> }>('/v1/admin/money/withdrawals/batch-paid', { items }).then((r) => r.data),

  withdrawalsCsv: (filters: WithdrawFilters) => api.get<string>('/v1/admin/money/withdrawals/export', { params: filters, responseType: 'text' }).then((r) => r.data),

  revenue: (group: RevenueGroup, from?: string, to?: string) => api.get<RevenueReport>('/v1/admin/money/revenue', { params: { group, from, to } }).then((r) => r.data),
  revenueCsv: (group: RevenueGroup, from?: string, to?: string) => api.get<string>('/v1/admin/money/revenue/export', { params: { group, from, to }, responseType: 'text' }).then((r) => r.data),

  reconciliation: () => api.get<Reconciliation>('/v1/admin/money/reconciliation').then((r) => r.data),
  applyPayment: (paymentId: string) => api.post<{ status: string; alreadyFulfilled: boolean }>(`/v1/admin/money/reconciliation/${paymentId}/apply`, {}).then((r) => r.data),
};

export type { WithdrawMethod };

/** Saves text as a file in the browser. */
export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
