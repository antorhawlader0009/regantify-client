import { api } from './api';

// Mirrors server/src/admin/admin-switches.controller.ts and admin-limits.controller.ts (super-admin-plan.md Step 14).

export interface PlatformSwitch {
  key: string;
  label: string;
  description: string;
  /** Changing it asks for the authenticator code again (it touches money). */
  needsCode: boolean;
  on: boolean;
  note: string | null;
  changedBy: string | null;
  changedAt: string | null;
}

export const LIMIT_FIELDS = ['productLimitPerDay', 'orderLimitPerDay', 'staffLimit', 'imageUploadLimitPerDay', 'landingPageLimit'] as const;
export type LimitField = (typeof LIMIT_FIELDS)[number];
export const LIMIT_LABEL: Record<LimitField, string> = {
  productLimitPerDay: 'New products per day',
  orderLimitPerDay: 'Orders per day',
  staffLimit: 'Staff',
  imageUploadLimitPerDay: 'Image uploads per day',
  landingPageLimit: 'Landing pages',
};

type Limits = Record<LimitField, number | null>;
export interface LimitRow extends Limits {
  id: string;
  until: string | null;
  reason: string;
  by: string;
  createdAt: string;
}
export interface StoreLimitsView {
  plan: Limits & { name: string };
  active: LimitRow | null;
  history: Array<LimitRow & { endedAt: string | null; endedReason: string | null }>;
}

export const adminSwitchesApi = {
  list: () => api.get<PlatformSwitch[]>('/v1/admin/switches').then((r) => r.data),
  set: (key: string, body: { on: boolean; note?: string; code?: string }) => api.put(`/v1/admin/switches/${key}`, body).then((r) => r.data),

  limits: (vendorId: string) => api.get<StoreLimitsView>(`/v1/admin/vendors/${vendorId}/limits`).then((r) => r.data),
  setLimits: (vendorId: string, body: Partial<Limits> & { reason: string; days?: number }) => api.post(`/v1/admin/vendors/${vendorId}/limits`, body).then((r) => r.data),
  endLimits: (vendorId: string, reason: string) => api.post(`/v1/admin/vendors/${vendorId}/limits/end`, { reason }).then((r) => r.data),
};
