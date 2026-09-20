import { api } from './api';
import type { WithdrawMethod, WithdrawRequest, WithdrawRequestStatus } from './financeApi';

// Mirrors server/src/admin/admin-withdraw-requests.controller.ts — Super
// Admin > Finance > Payouts, the admin side of Finance > Withdraw's
// vendor request flow.

export interface AdminWithdrawRequest extends WithdrawRequest {
  vendor: { id: string; storeName: string; subdomain: string };
}

export const adminFinanceApi = {
  // Defaults to nothing (all statuses) — the page itself defaults its
  // own filter to PENDING, same "server stays flexible, client picks a
  // sane default" split used elsewhere (e.g. Plan Requests' status tabs).
  listWithdrawRequests: (status?: WithdrawRequestStatus) =>
    api
      .get<AdminWithdrawRequest[]>('/v1/admin/withdraw-requests', { params: { status } })
      .then((r) => r.data),

  resolveWithdrawRequest: (id: string, decision: 'APPROVED' | 'REJECTED') =>
    api.patch<AdminWithdrawRequest>(`/v1/admin/withdraw-requests/${id}`, { decision }).then((r) => r.data),

  markWithdrawRequestPaid: (id: string) =>
    api.patch<AdminWithdrawRequest>(`/v1/admin/withdraw-requests/${id}/mark-paid`).then((r) => r.data),
};

export type { WithdrawMethod };
