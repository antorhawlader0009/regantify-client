import { api } from './api';

// Seller verification (TellMe idea 160) — mirrors the server's KycService.

export type KycState = 'NONE' | 'REQUESTED' | 'SUBMITTED' | 'REJECTED' | 'APPROVED';
export type KycKind = 'NID_FRONT' | 'NID_BACK' | 'SELFIE' | 'TRADE_LICENSE';

/** What the store's dashboard needs (GET /v1/kyc/me). */
export interface MyKyc {
  /** PENDING = a new store waiting for Super Admin's approval (when that is switched on). */
  storeStatus?: string;
  state: KycState;
  /** Past the deadline with documents still owed: no new orders and no new products. */
  restricted: boolean;
  approvedAt?: string | null;
  dueAt?: string;
  /** YYYY-MM-DD in Dhaka time. */
  dueDay?: string;
  daysLeft?: number;
  /** Super Admin's message for the store. */
  note?: string | null;
  requireTradeLicense?: boolean;
  rejectReason?: string | null;
  submittedAt?: string | null;
  requestedAt?: string;
}

export interface KycListItem {
  id: string;
  status: 'REQUESTED' | 'SUBMITTED' | 'REJECTED' | 'APPROVED' | 'CANCELLED';
  vendor: { id: string; storeName: string; subdomain: string; phone: string | null };
  requestedBy: string;
  requestedAt: string;
  dueAt: string;
  submittedAt: string | null;
  restricted: boolean;
}

export interface KycList {
  total: number;
  page: number;
  perPage: number;
  counts: Record<string, number>;
  items: KycListItem[];
}

export interface KycDetail {
  id: string;
  status: KycListItem['status'];
  vendor: { id: string; storeName: string; subdomain: string; phone: string | null };
  requestedBy: string;
  note: string | null;
  requireTradeLicense: boolean;
  requestedAt: string;
  dueAt: string;
  restricted: boolean;
  submittedAt: string | null;
  fullName: string | null;
  nidNumber: string | null;
  dateOfBirth: string | null;
  address: string | null;
  vendorNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectReason: string | null;
  documentsDeleteAt: string | null;
  documents: Array<{ kind: KycKind; label: string; mime: string; size: number }>;
  events: Array<{ at: string; actor: string; action: string; note: string | null }>;
}

export const kycApi = {
  mine: () => api.get<MyKyc>('/v1/kyc/me').then((r) => r.data),
  submit: (form: FormData) => api.post<{ ok: true }>('/v1/kyc/me/submit', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
};

export const adminKycApi = {
  list: (params: { status?: string; search?: string; page?: number }) => api.get<KycList>('/v1/admin/kyc', { params }).then((r) => r.data),
  request: (input: { vendorId: string; days: number; note?: string; requireTradeLicense?: boolean }) =>
    api.post<{ id: string; dueAt: string }>('/v1/admin/kyc/request', input).then((r) => r.data),
  detail: (id: string) => api.get<KycDetail>(`/v1/admin/kyc/${id}`).then((r) => r.data),
  /** The picture as a blob (the server needs the signed-in session, so it cannot be a plain image link). */
  document: (id: string, kind: KycKind) => api.get<Blob>(`/v1/admin/kyc/${id}/documents/${kind}`, { responseType: 'blob' }).then((r) => r.data),
  approve: (id: string) => api.post(`/v1/admin/kyc/${id}/approve`).then((r) => r.data),
  reject: (id: string, reason: string, days: number) => api.post<{ dueAt: string }>(`/v1/admin/kyc/${id}/reject`, { reason, days }).then((r) => r.data),
  extend: (id: string, days: number) => api.patch<{ dueAt: string }>(`/v1/admin/kyc/${id}/extend`, { days }).then((r) => r.data),
  cancel: (id: string) => api.post(`/v1/admin/kyc/${id}/cancel`).then((r) => r.data),
  deleteDocuments: (id: string) => api.post(`/v1/admin/kyc/${id}/delete-documents`).then((r) => r.data),
};
