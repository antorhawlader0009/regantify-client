import { api } from './api';

// PayStation — the one payment rail Finance > Wallet's test-payment
// button, SMS > Buy SMS, AI Chat Bot > Buy, and Billing > Pay with
// PayStation all go through. Mirrors the server's PaymentPurpose/
// PaymentStatus enums exactly (STOREFRONT_ORDER isn't listed here since
// it's initiated from storefront/, not this dashboard — see
// storefront/src/lib/checkoutApi.ts's own copy).
export type PaymentPurpose = 'WALLET_TOPUP' | 'SMS_PACKAGE' | 'CHATBOT_PACKAGE' | 'PLAN_UPGRADE';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface InitiatePaymentPayload {
  purpose: PaymentPurpose;
  packageId?: string;
  amount?: number;
}

export interface InitiatePaymentResult {
  invoiceNumber: string;
  paymentUrl: string;
  amount: number;
}

export interface PaymentTransaction {
  id: string;
  vendorId: string;
  invoiceNumber: string;
  trxId: string | null;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  packageId: string | null;
  amount: string;
  paymentMethod: string | null;
  fulfilledAt: string | null;
  createdAt: string;
}

export const paymentsApi = {
  // Starts a PayStation checkout session — redirect the browser to the
  // returned paymentUrl (see Wallet.tsx / BuySmsDialog / BuyChatBotDialog).
  initiate: (payload: InitiatePaymentPayload) =>
    api.post<InitiatePaymentResult>('/v1/payments/initiate', payload).then((r) => r.data),

  // Payment-callback page's own re-verification — never trust the
  // redirect's own query params, always ask the server to confirm with
  // PayStation itself.
  reconcile: (invoiceNumber: string) =>
    api.post<{ status: PaymentStatus; alreadyFulfilled: boolean }>(`/v1/payments/reconcile/${invoiceNumber}`).then((r) => r.data),

  getStatus: (invoiceNumber: string) =>
    api.get<PaymentTransaction>(`/v1/payments/status/${invoiceNumber}`).then((r) => r.data),

  getHistory: () => api.get<PaymentTransaction[]>('/v1/payments/history').then((r) => r.data),
};
