import { api } from './api';

export type TransactionType = 'CREDIT' | 'DEBIT';

export interface Transaction {
  id: string;
  vendorId: string;
  type: TransactionType;
  amount: string;
  balanceAfter: string;
  description: string;
  orderId?: string | null;
  withdrawRequestId?: string | null;
  createdAt: string;
}

export interface TransactionsPage {
  transactions: Transaction[];
  total: number;
  page: number;
  perPage: number;
}

export interface WalletSummary {
  balance: string;
  pendingWithdrawals: string;
  totalWithdrawn: string;
}

export type WithdrawMethod = 'BKASH' | 'NAGAD' | 'BANK';
export type WithdrawRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface WithdrawRequest {
  id: string;
  vendorId: string;
  amount: string;
  method: WithdrawMethod;
  receiverNumber: string | null;
  bankDetails: string | null;
  status: WithdrawRequestStatus;
  note: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWithdrawRequestPayload {
  amount: number;
  method: WithdrawMethod;
  receiverNumber?: string;
  bankDetails?: string;
  note?: string;
}

export const financeApi = {
  getWallet: () => api.get<WalletSummary>('/v1/finance/wallet').then((r) => r.data),

  getTransactions: (page = 1, perPage = 20) =>
    api
      .get<TransactionsPage>('/v1/finance/transactions', { params: { page, perPage } })
      .then((r) => r.data),

  // Finance > Withdraw's "Request Withdrawal" flow — see FinanceController.
  createWithdrawRequest: (payload: CreateWithdrawRequestPayload) =>
    api.post<WithdrawRequest>('/v1/finance/withdraw-requests', payload).then((r) => r.data),

  getWithdrawRequests: () =>
    api.get<WithdrawRequest[]>('/v1/finance/withdraw-requests').then((r) => r.data),
};
