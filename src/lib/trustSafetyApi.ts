import { api } from './api';

// Mirrors server/src/trust-safety/trust-safety.controller.ts (super-admin-new.md Step 3).

export const PROHIBITED_CATEGORIES = ['WEAPONS', 'DRUGS', 'ADULT', 'COUNTERFEIT', 'MEDICINE', 'GAMBLING', 'WILDLIFE', 'OTHER'] as const;
export const CATEGORY_LABEL: Record<string, string> = {
  WEAPONS: 'Weapons',
  DRUGS: 'Drugs',
  ADULT: 'Adult',
  COUNTERFEIT: 'Fake brands',
  MEDICINE: 'Medicine',
  GAMBLING: 'Gambling',
  WILDLIFE: 'Wildlife',
  OTHER: 'Other',
};

export interface ProductFlagRow {
  id: string;
  status: 'OPEN' | 'ALLOWED' | 'HIDDEN' | 'CLEARED';
  terms: string[];
  categories: string[];
  source: 'EDIT' | 'SCAN';
  note: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string; price: number; photo: string | null; visibility: 'PUBLIC' | 'DRAFT'; hidden: boolean; hiddenReason: string | null; excerpt: string };
  store: { id: string; storeName: string; subdomain: string; status: string };
}

export interface AdminProductRow {
  id: string;
  name: string;
  sku: string;
  slug: string;
  price: number;
  photo: string | null;
  visibility: 'PUBLIC' | 'DRAFT';
  hidden: boolean;
  adminHiddenReason: string | null;
  createdAt: string;
  vendor: { id: string; storeName: string; subdomain: string };
}

export interface StoreRiskRow {
  vendorId: string;
  storeName: string;
  subdomain: string;
  status: string;
  score: number;
  reasons: Array<{ points: number; text: string }>;
  kycApproved: boolean;
  online30d: number;
  orders30d: number;
}

export interface ScanState {
  running: boolean;
  scanned: number;
  flagged: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export const trustSafetyApi = {
  flags: (status: 'OPEN' | 'DONE') => api.get<{ open: number; flags: ProductFlagRow[] }>('/v1/admin/trust-safety/flags', { params: { status } }).then((r) => r.data),
  decide: (id: string, body: { action: 'ALLOW' | 'HIDE'; note?: string; warn?: boolean }) => api.post(`/v1/admin/trust-safety/flags/${id}/decide`, body).then((r) => r.data),
  products: (params: { search?: string; vendorId?: string; hidden?: string; page?: number }) =>
    api.get<{ total: number; page: number; perPage: number; products: AdminProductRow[] }>('/v1/admin/trust-safety/products', { params }).then((r) => r.data),
  hide: (id: string, body: { reason: string; warn?: boolean }) => api.post(`/v1/admin/trust-safety/products/${id}/hide`, body).then((r) => r.data),
  unhide: (id: string) => api.post(`/v1/admin/trust-safety/products/${id}/unhide`).then((r) => r.data),
  terms: () => api.get<Array<{ id: string; term: string; category: string; createdByName: string; createdAt: string }>>('/v1/admin/trust-safety/terms').then((r) => r.data),
  addTerms: (body: { terms: string[]; category: string }) => api.post<{ added: number; skipped: number }>('/v1/admin/trust-safety/terms', body).then((r) => r.data),
  removeTerm: (id: string) => api.delete(`/v1/admin/trust-safety/terms/${id}`).then((r) => r.data),
  scanStatus: () => api.get<ScanState>('/v1/admin/trust-safety/scan').then((r) => r.data),
  scan: () => api.post<ScanState>('/v1/admin/trust-safety/scan').then((r) => r.data),
  risk: () => api.get<StoreRiskRow[]>('/v1/admin/trust-safety/risk').then((r) => r.data),
};
