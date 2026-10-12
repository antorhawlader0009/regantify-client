import { api } from './api';

// Finance > Receipts and Super Admin > Receipt Details (TellMe idea 157) — mirrors the server's PaymentReceiptsService.

export interface ReceiptRow {
  id: string;
  /** RCPT-000123 */
  number: string;
  date: string;
  description: string;
  amount: number;
  paymentMethod: string | null;
}

export interface PlatformCompany {
  companyName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  footerNote: string | null;
}

export interface Receipt extends ReceiptRow {
  transactionId: string | null;
  invoiceNumber: string;
  store: { name: string; address: string | null; phone: string | null };
  company: PlatformCompany;
}

export const paymentReceiptsApi = {
  list: () => api.get<ReceiptRow[]>('/v1/payment-receipts').then((r) => r.data),
  get: (id: string) => api.get<Receipt>(`/v1/payment-receipts/${id}`).then((r) => r.data),
};

export const platformSettingsApi = {
  get: () => api.get<PlatformCompany>('/v1/admin/platform-settings').then((r) => r.data),
  save: (input: Partial<Record<keyof PlatformCompany, string>>) => api.put<PlatformCompany>('/v1/admin/platform-settings', input).then((r) => r.data),
};
