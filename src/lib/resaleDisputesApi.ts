import { api } from './api';

// Reseller system Step 14 (RESELLER-plan.md): problems with resale orders. Mirrors server/src/resale/resale-disputes.service.ts.

export type DisputeReason = 'WRONG_ITEM' | 'DAMAGED' | 'MISSING' | 'LATE' | 'OTHER';
export type DisputeStatus = 'OPEN' | 'ANSWERED' | 'DECIDED' | 'WITHDRAWN';

export const DISPUTE_REASON_LABEL: Record<DisputeReason, string> = {
  WRONG_ITEM: 'Wrong item sent',
  DAMAGED: 'Damaged item',
  MISSING: 'Parcel or item missing',
  LATE: 'Delivered too late',
  OTHER: 'Other problem',
};

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  OPEN: 'Waiting for the supplier',
  ANSWERED: 'Waiting for Regantify',
  DECIDED: 'Decided',
  WITHDRAWN: 'Taken back',
};

export interface Dispute {
  id: string;
  resaleOrderId: string;
  supplyOrderId: string;
  reason: DisputeReason;
  reasonText: string;
  details: string;
  photos: string[];
  checkedWithCustomer: boolean;
  supplierAnswer: string | null;
  supplierPhotos: string[];
  answeredAt: string | null;
  status: DisputeStatus;
  decision: 'FOR_RESELLER' | 'FOR_SUPPLIER' | null;
  decisionNote: string | null;
  decidedAt: string | null;
  compensation: number | null;
  compensationStatus: 'WAITING' | 'PAID' | null;
  createdAt: string;
  resaleOrderRef?: string | null;
  supplyOrderRef?: string | null;
  orderTotal?: number | null;
  orderStatus?: string | null;
  reseller?: { id: string; storeName: string; subdomain: string } | null;
  supplier?: { id: string; storeName: string; subdomain: string } | null;
  earning?: { amount: number; status: string } | null;
}

export const RESALE_DISPUTES_KEY = ['resale-disputes'] as const;

export const resaleDisputesApi = {
  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return api.post<{ url: string }>('/v1/resale/disputes/photo', form).then((r) => r.data.url);
  },
  mine: () => api.get<Dispute[]>('/v1/resale/disputes/mine').then((r) => r.data),
  toAnswer: () => api.get<Dispute[]>('/v1/resale/disputes/to-answer').then((r) => r.data),
  forOrder: (orderId: string) =>
    api.get<{ canOpen: boolean; dispute: Dispute | null; reason?: string; until?: string }>(`/v1/resale/disputes/order/${orderId}`).then((r) => r.data),
  open: (body: { resaleOrderId: string; reason: DisputeReason; details: string; photos: string[]; checkedWithCustomer: boolean }) =>
    api.post<Dispute>('/v1/resale/disputes', body).then((r) => r.data),
  withdraw: (id: string) => api.post(`/v1/resale/disputes/${id}/withdraw`).then((r) => r.data),
  answer: (id: string, body: { answer: string; photos: string[] }) => api.post<Dispute>(`/v1/resale/disputes/${id}/answer`, body).then((r) => r.data),
};

/** Super Admin > Reseller problems. */
export const resaleDisputesAdminApi = {
  list: (status?: DisputeStatus, page = 1) =>
    api
      .get<{ total: number; page: number; perPage: number; counts: Partial<Record<DisputeStatus, number>>; items: Dispute[] }>('/v1/admin/resale/disputes', { params: { status, page } })
      .then((r) => r.data),
  decide: (id: string, body: { decision: 'FOR_RESELLER' | 'FOR_SUPPLIER'; compensation?: number; note: string }) =>
    api.post<Dispute>(`/v1/admin/resale/disputes/${id}/decide`, body).then((r) => r.data),
};
