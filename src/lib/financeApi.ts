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
  /**
   * Display-only (the amounts and running balance are the ledger's own): a charge that took the
   * balance below 0 is a due, OPEN until later money brings it back to 0 or more, then PAID by that
   * money's order (null when it wasn't an order, e.g. a top-up).
   */
  due?: { status: 'OPEN' } | { status: 'PAID'; paidBy: string | null; paidAt: string };
  /** On money that arrived while the balance was below 0: how much of it cleared that due, and for which orders. */
  clearedDue?: { amount: string; orders: string[] };
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
  /** COD the couriers collected for delivered parcels and haven't paid yet. They pay it to you directly, not into this wallet. */
  codWithCouriers: { amount: number; count: number };
}

/** Finance > Transactions filters. Days are Dhaka days, YYYY-MM-DD, inclusive. */
export interface TransactionsQuery {
  page?: number;
  perPage?: number;
  type?: TransactionType;
  from?: string;
  to?: string;
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

export interface WithdrawDetailsPayload {
  amount: number;
  method: WithdrawMethod;
  receiverNumber?: string;
  bankDetails?: string;
  note?: string;
}

// The same details plus the 6-digit SMS code (2FA) from sendWithdrawOtp.
export interface CreateWithdrawRequestPayload extends WithdrawDetailsPayload {
  otpCode: string;
}

export interface WithdrawOtpSent {
  sentTo: string; // masked, e.g. 017•••••678
  expiresInSeconds: number;
  resendInSeconds: number;
}

export const financeApi = {
  getWallet: () => api.get<WalletSummary>('/v1/finance/wallet').then((r) => r.data),

  getTransactions: (query: TransactionsQuery = {}) =>
    api
      .get<TransactionsPage>('/v1/finance/transactions', {
        params: { page: query.page ?? 1, perPage: query.perPage ?? 20, type: query.type, from: query.from || undefined, to: query.to || undefined },
      })
      .then((r) => r.data),

  // Finance > Withdraw's "Request Withdrawal" flow — see FinanceController.
  // Step 1 texts a code to the owner's phone; step 2 sends it with the request.
  sendWithdrawOtp: (payload: WithdrawDetailsPayload) =>
    api.post<WithdrawOtpSent>('/v1/finance/withdraw-requests/send-otp', payload).then((r) => r.data),

  createWithdrawRequest: (payload: CreateWithdrawRequestPayload) =>
    api.post<WithdrawRequest>('/v1/finance/withdraw-requests', payload).then((r) => r.data),

  getWithdrawRequests: () =>
    api.get<WithdrawRequest[]>('/v1/finance/withdraw-requests').then((r) => r.data),
};
