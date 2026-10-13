import { api } from './api';

// Mirrors server/src/admin/admin-orders.controller.ts — Super Admin > Orders (super-admin-plan.md Step 7).

export interface AdminOrderQuery {
  q?: string;
  vendorId?: string;
  status?: string;
  source?: string;
  paymentMethod?: string;
  courier?: string;
  from?: string;
  to?: string;
  minAmount?: number;
  maxAmount?: number;
  risk?: string;
  page?: number;
}

export interface AdminOrderRow {
  id: string;
  number: number;
  publicCode: string | null;
  status: string;
  source: string;
  paymentMethod: string;
  total: number;
  customerName: string;
  customerPhone: string;
  courier: string;
  tracking: string | null;
  risk: string | null;
  createdAt: string;
  vendorId: string;
  storeName: string;
}

export interface PaymentHit {
  kind: 'PAYSTATION' | 'SSLCOMMERZ';
  id: string;
  reference: string;
  purpose: string;
  status: string;
  amount: number;
  applied: boolean;
  createdAt: string;
  orderId: string | null;
  vendorId: string;
  storeName: string;
}

export interface AdminOrderPage {
  total: number;
  page: number;
  perPage: number;
  hint?: string;
  payments: PaymentHit[];
  items: AdminOrderRow[];
}

export interface AdminOrderDetail {
  id: string;
  store: { id: string; storeName: string; subdomain: string };
  number: number;
  publicCode: string | null;
  status: string;
  source: string;
  createdAt: string;
  trashed: boolean;
  customer: { name: string; phone: string; address: string; zone: string; note: string | null };
  money: {
    subtotal: number | null;
    delivery: number | null;
    vat: number | null;
    platformCharge: number | null;
    platformChargePayer: string;
    discount: number | null;
    discountLabel: string | null;
    total: number | null;
    paymentMethod: string;
    advance: number | null;
    advanceMethod: string | null;
    platformFeesBooked: Array<{ id: string; amount: number; description: string; createdAt: string }>;
    settledAt: string | null;
  };
  courier: {
    provider: string;
    bookingStatus: string;
    status: string | null;
    consignmentId: string | null;
    trackingCode: string | null;
    manualCourier: string | null;
    manualTracking: string | null;
    codAmount: number | null;
    deliveryFee: number | null;
    events: Array<{ id: string; provider: string; source: string; event: string; rawStatus: string | null; appliedStatus: string | null; note: string | null; createdAt: string }>;
  };
  risk: { level: string; reasons: unknown } | null;
  items: Array<{ id: string; productName: string; selectedOptions: Record<string, string>; unitPrice: number; quantity: number; lineTotal: number; isGift: boolean }>;
  history: Array<{ id: string; fromStatus: string | null; toStatus: string; note: string | null; changedBy: string | null; correction: boolean; reasonCode: string | null; createdAt: string }>;
  payments: {
    paystation: Array<{ id: string; invoiceNumber: string; trxId: string | null; purpose: string; status: string; amount: number; paymentMethod: string | null; fulfilledAt: string | null; createdAt: string }>;
    gateway: Array<{ id: string; invoiceNumber: string; valId: string | null; status: string; amount: number; cardType: string | null; fulfilledAt: string | null; createdAt: string }>;
  };
  notes: Array<{ id: string; text: string; authorName: string; createdAt: string }>;
  canRecheck: boolean;
}

export const adminOrdersApi = {
  search: (params: AdminOrderQuery) => api.get<AdminOrderPage>('/v1/admin/orders', { params }).then((r) => r.data),
  detail: (id: string) => api.get<AdminOrderDetail>(`/v1/admin/orders/${id}`).then((r) => r.data),
  addNote: (id: string, text: string) => api.post(`/v1/admin/orders/${id}/notes`, { text }).then((r) => r.data),
  recheckPayment: (id: string) => api.post<{ paid: boolean; status: string }>(`/v1/admin/orders/${id}/recheck-payment`, {}).then((r) => r.data),
};
