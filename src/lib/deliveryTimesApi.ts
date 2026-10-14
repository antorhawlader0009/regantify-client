import { api } from './api';

// Mirrors server/src/delivery-times/ (super-admin-new.md Step 12).

export interface DeliveryTimesOverview {
  days: number;
  rules: { sameCityDays: number; otherDays: number };
  totals: { openLate: number; delivered: number; deliveredLate: number };
  stores: Array<{ vendorId: string; storeName: string; subdomain: string; openLate: number; delivered: number; deliveredLate: number; latePercent: number | null; avgDays: number | null }>;
}

export interface StoreLateOrders {
  days: number;
  store: { id: string; storeName: string; subdomain: string };
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    zone: string;
    createdAt: string;
    deadline: string;
    deliveredAt: string | null;
    stillOpen: boolean;
    daysLate: number;
    daysToBooking: number | null;
    courier: string | null;
  }>;
}

export const deliveryTimesApi = {
  stores: (days: number) => api.get<DeliveryTimesOverview>('/v1/admin/delivery-times', { params: { days } }).then((r) => r.data),
  storeOrders: (vendorId: string, days: number) => api.get<StoreLateOrders>(`/v1/admin/delivery-times/${vendorId}`, { params: { days } }).then((r) => r.data),
};
