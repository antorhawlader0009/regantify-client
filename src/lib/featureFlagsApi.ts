import { api } from './api';

// Mirrors server/src/features/features.controller.ts, AdminFeatureFlagsController (super-admin-new.md Step 1).

export const FLAG_MODES = ['OFF', 'LIST', 'PERCENT', 'PLANS', 'ALL'] as const;
export type FlagMode = (typeof FLAG_MODES)[number];
export const PLAN_CODES = ['FREE', 'BASIC', 'STARTER', 'ADVANCE'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export interface FeatureFlagRow {
  key: string;
  label: string;
  description: string | null;
  mode: FlagMode;
  percent: number;
  planCodes: PlanCode[];
  includeBeta: boolean;
  listedStores: number;
  modeChangedAt: string;
  updatedBy: string;
  updatedAt: string;
  /** On for every store for over 30 days: time to take the check out of the code and delete the flag. */
  stale: boolean;
}

export interface FeatureFlagDetail extends Omit<FeatureFlagRow, 'listedStores' | 'updatedBy'> {
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  stores: Array<{ id: string; storeName: string; subdomain: string; betaOptIn: boolean }>;
  /** How many stores have it right now, out of all stores. */
  reach: { on: number; total: number };
}

export interface FlagUpdate {
  label?: string;
  description?: string;
  mode?: FlagMode;
  percent?: number;
  planCodes?: PlanCode[];
  includeBeta?: boolean;
}

export const featureFlagsApi = {
  list: () => api.get<{ betaStores: number; flags: FeatureFlagRow[] }>('/v1/admin/feature-flags').then((r) => r.data),
  get: (key: string) => api.get<FeatureFlagDetail>(`/v1/admin/feature-flags/${key}`).then((r) => r.data),
  create: (body: { key: string; label: string; description?: string }) => api.post<FeatureFlagDetail>('/v1/admin/feature-flags', body).then((r) => r.data),
  update: (key: string, body: FlagUpdate) => api.patch<FeatureFlagDetail>(`/v1/admin/feature-flags/${key}`, body).then((r) => r.data),
  addStores: (key: string, vendorIds: string[]) => api.post<FeatureFlagDetail>(`/v1/admin/feature-flags/${key}/stores`, { vendorIds }).then((r) => r.data),
  removeStore: (key: string, vendorId: string) => api.delete<FeatureFlagDetail>(`/v1/admin/feature-flags/${key}/stores/${vendorId}`).then((r) => r.data),
  remove: (key: string) => api.delete(`/v1/admin/feature-flags/${key}`).then((r) => r.data),
  betaStores: () =>
    api.get<Array<{ id: string; storeName: string; subdomain: string; betaOptInAt: string | null }>>('/v1/admin/feature-flags/beta-stores').then((r) => r.data),
};
