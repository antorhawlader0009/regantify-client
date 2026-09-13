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
  createdAt: string;
}

export interface TransactionsPage {
  transactions: Transaction[];
  total: number;
  page: number;
  perPage: number;
}

export const financeApi = {
  getWallet: () => api.get<{ balance: string }>('/api/v1/finance/wallet').then((r) => r.data),

  getTransactions: (page = 1, perPage = 20) =>
    api
      .get<TransactionsPage>('/api/v1/finance/transactions', { params: { page, perPage } })
      .then((r) => r.data),
};
