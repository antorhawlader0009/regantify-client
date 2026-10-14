import { api } from './api';
import { toast } from './toast';

// Mirrors server/src/admin/admin-approvals.controller.ts (super-admin-new.md Step 7).

/** What a big action answers when it waits for a second person instead of running. */
export interface PendingApproval {
  pendingApproval: { id: string; summary: string };
}

export function isPendingApproval(r: unknown): r is PendingApproval {
  return typeof r === 'object' && r !== null && 'pendingApproval' in r;
}

/** One message for every gated action. */
export function toastPendingApproval(): void {
  toast.success('Sent for a second approval. It runs as soon as a teammate approves it in Approvals.');
}

export interface ApprovalRow {
  id: string;
  action: 'WALLET_ADJUST' | 'CLOSE_STORE' | 'TRANSFER_STORE' | 'PAYOUT' | 'SHOPPER_ERASE';
  actionLabel: string;
  vendorId: string | null;
  summary: string;
  requestedByName: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'REJECTED' | 'FAILED' | 'EXPIRED';
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  error: string | null;
  createdAt: string;
  expiresAt: string;
  canDecide: boolean;
  mine: boolean;
}

export interface ApprovalRules {
  walletApprovalAbove: number;
  payoutApprovalAbove: number;
  approveCloseStore: boolean;
  approveTransferStore: boolean;
  approveShopperErase: boolean;
  ipAllowListOn: boolean;
  ipAllowList: string[];
  updatedBy: string | null;
  yourIp: string | null;
  envOverride: boolean;
}

export const approvalsApi = {
  list: (show: 'PENDING' | 'DONE') => api.get<ApprovalRow[]>('/v1/admin/approvals', { params: { show } }).then((r) => r.data),
  count: () => api.get<{ pending: number }>('/v1/admin/approvals/count').then((r) => r.data),
  approve: (id: string, code: string) => api.post(`/v1/admin/approvals/${id}/approve`, { code }).then((r) => r.data),
  reject: (id: string, note: string) => api.post(`/v1/admin/approvals/${id}/reject`, { note }).then((r) => r.data),
  rules: () => api.get<ApprovalRules>('/v1/admin/approvals/rules').then((r) => r.data),
  saveRules: (body: Omit<ApprovalRules, 'updatedBy' | 'yourIp' | 'envOverride'> & { code: string }) => api.put<ApprovalRules>('/v1/admin/approvals/rules', body).then((r) => r.data),
  teamSignIns: (userId: string) =>
    api.get<Array<{ id: string; at: string; via: string; browser: string; ipMasked: string | null; isNewDevice: boolean }>>(`/v1/admin/team/${userId}/sign-ins`).then((r) => r.data),
};
