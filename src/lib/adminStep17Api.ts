import { api } from './api';

// Mirrors server/src/admin/admin-{reviews,reports,marketing,data-requests}.controller.ts (super-admin-plan.md Step 17).

export interface AdminReview {
  id: string;
  title: string;
  excerpt: string;
  rating: number;
  photos: number;
  customerName: string | null;
  approved: boolean;
  createdAt: string;
  products: string[];
  store: { id: string; name: string; subdomain: string; ageDays: number };
  hidden: { at: string; reason: string | null; by: string | null } | null;
}
export interface ReviewFilters {
  rating?: number;
  search?: string;
  hasPhoto?: boolean;
  newStoreDays?: number;
  hidden?: 'hidden' | 'visible' | '';
  page?: number;
}

export type ReportStatus = 'OPEN' | 'DISMISSED' | 'WARNED' | 'SUSPENDED';
export interface StoreReportRow {
  id: string;
  reason: string;
  reasonLabel: string;
  note: string | null;
  phone: string | null;
  status: ReportStatus;
  createdAt: string;
  handledByName: string | null;
  handledNote: string | null;
  handledAt: string | null;
  store: { id: string; name: string; subdomain: string; status: string; openReports: number };
}

export interface MarketingConfig {
  bannerText: string;
  bannerLink: string;
  featured: Array<{ id: string; name: string; subdomain: string; logoUrl: string | null; live: boolean }>;
}
export interface MarketingStore {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
}

export interface DataRequestRow {
  id: string;
  kind: 'STORE_EXPORT' | 'SHOPPER_EXPORT' | 'SHOPPER_ERASE';
  subject: string;
  subjectLabel: string;
  reason: string;
  adminName: string;
  summary: Record<string, unknown> | null;
  createdAt: string;
}
export interface StoreExportJob {
  id: string;
  status: 'RUNNING' | 'READY' | 'FAILED';
  sizeBytes: number | null;
  error: string | null;
  ready: boolean;
}
export interface ErasePreview {
  phone: string;
  account: boolean;
  orders: number;
  reviews: number;
  abandonedCheckouts: number;
  storeNotes: number;
}

const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && v !== false));

export const adminStep17Api = {
  reviews: (f: ReviewFilters) =>
    api.get<{ total: number; page: number; perPage: number; items: AdminReview[] }>('/v1/admin/reviews', { params: clean({ ...f, hasPhoto: f.hasPhoto ? 'true' : undefined }) }).then((r) => r.data),
  hideReview: (id: string, reason: string) => api.post(`/v1/admin/reviews/${id}/hide`, { reason }).then((r) => r.data),
  unhideReview: (id: string, reason: string) => api.post(`/v1/admin/reviews/${id}/unhide`, { reason }).then((r) => r.data),

  reports: (status: string, page: number) =>
    api.get<{ total: number; page: number; perPage: number; openTotal: number; items: StoreReportRow[] }>('/v1/admin/reports', { params: clean({ status, page }) }).then((r) => r.data),
  dismissReport: (id: string, note: string) => api.post(`/v1/admin/reports/${id}/dismiss`, { note }).then((r) => r.data),
  warnReport: (id: string, note: string) => api.post(`/v1/admin/reports/${id}/warn`, { note }).then((r) => r.data),
  suspendReport: (id: string, note: string) => api.post(`/v1/admin/reports/${id}/suspend`, { note }).then((r) => r.data),

  marketing: () => api.get<MarketingConfig>('/v1/admin/marketing').then((r) => r.data),
  marketingStores: (q: string, all = false) => api.get<MarketingStore[]>('/v1/admin/marketing/stores', { params: { q, all: all ? 'true' : undefined } }).then((r) => r.data),
  saveMarketing: (body: { bannerText: string; bannerLink: string; featuredStoreIds: string[] }) => api.put('/v1/admin/marketing', body).then((r) => r.data),

  dataRequests: () => api.get<DataRequestRow[]>('/v1/admin/data-requests').then((r) => r.data),
  startStoreExport: (vendorId: string, reason: string) => api.post<{ id: string }>('/v1/admin/data-requests/store-export', { vendorId, reason }).then((r) => r.data),
  storeExportStatus: (jobId: string) => api.get<StoreExportJob>(`/v1/admin/data-requests/store-export/${jobId}`).then((r) => r.data),
  /** Fetched with the signed-in session, then handed to the browser as a download. */
  downloadFile: async (path: string, params: Record<string, string>, fallbackName: string) => {
    const res = await api.get<Blob>(path, { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fallbackName;
    a.click();
    URL.revokeObjectURL(url);
  },
  erasePreview: (phone: string) => api.get<ErasePreview>('/v1/admin/data-requests/shopper-erase/preview', { params: { phone } }).then((r) => r.data),
  eraseShopper: (body: { phone: string; confirmPhone: string; reason: string; code: string }) => api.post('/v1/admin/data-requests/shopper-erase', body).then((r) => r.data),
};
