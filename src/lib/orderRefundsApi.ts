import { api } from './api';

// Orders > Refunds to pay (TellMe idea 145) — mirrors the server's OrderRefundsService (server/src/orders/order-refunds.service.ts).

export type RefundMethod = 'BKASH' | 'NAGAD' | 'ROCKET' | 'BANK' | 'CASH' | 'OTHER' | 'WAIVED';

export const REFUND_METHOD_LABEL: Record<RefundMethod, string> = {
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  ROCKET: 'Rocket',
  BANK: 'Bank transfer',
  CASH: 'Cash',
  OTHER: 'Other',
  WAIVED: 'Kept (no refund)',
};

export interface RefundEntry {
  id: string;
  amount: number;
  method: RefundMethod;
  reference: string | null;
  note: string | null;
  actor: string | null;
  smsSent: boolean;
  createdAt: string;
}

export interface RefundItem {
  orderId: string;
  ref: string;
  status: string;
  customerName: string;
  customerPhone: string;
  paid: number;
  refunded: number;
  remaining: number;
  paidVia: 'PAYSTATION' | 'GATEWAY';
  /** The money was an advance on a cash-on-delivery order. */
  advance: boolean;
  paidAt: string;
  closedAt: string | null;
  waitingDays: number;
  refunds: RefundEntry[];
}

export interface RefundList {
  since: string;
  pendingCount: number;
  pendingTotal: number;
  /** Waiting 3 days or more. */
  lateCount: number;
  total: number;
  page: number;
  perPage: number;
  items: RefundItem[];
}

export interface RecordRefundInput {
  amount: number;
  method: RefundMethod;
  reference?: string;
  note?: string;
  sms?: boolean;
}

export const orderRefundsApi = {
  list: (tab: 'PENDING' | 'DONE', page: number) => api.get<RefundList>('/v1/order-refunds', { params: { tab, page } }).then((r) => r.data),
  forOrder: (orderId: string) => api.get<RefundItem | null>(`/v1/order-refunds/order/${orderId}`).then((r) => r.data),
  record: (orderId: string, input: RecordRefundInput) =>
    api.post<{ id: string; remaining: number; smsSent: boolean }>(`/v1/order-refunds/order/${orderId}`, input).then((r) => r.data),
  remove: (id: string) => api.delete<{ success: true }>(`/v1/order-refunds/entry/${id}`).then((r) => r.data),
};
