import { api } from './api';

// Mirrors server/src/resale/resale-admin.controller.ts: Super Admin > a store's page > Reseller card (RESELLER-plan.md Step 1).

export type ResaleRefusal = 'PAUSED' | 'NOT_ENABLED' | 'NO_STORE' | 'STORE_OFFLINE' | 'BLOCKED' | 'NOT_VERIFIED' | 'KYC_RESTRICTED';
export type ResaleAccess = { allowed: true; reason: null } | { allowed: false; reason: ResaleRefusal };
/** The feature flag's mode, or MISSING when Super Admin has not created the flag yet (= off). */
export type ResaleFlagMode = 'OFF' | 'LIST' | 'PERCENT' | 'PLANS' | 'ALL' | 'MISSING';

export interface StoreResale {
  supply: ResaleAccess;
  sell: ResaleAccess;
  flags: { supply: ResaleFlagMode; sell: ResaleFlagMode };
  verified: boolean;
  platformFeePercent: number;
  feePercent: number | null;
  blocked: { since: string; reason: string | null } | null;
  updatedBy: string | null;
  updatedAt: string | null;
  /** Steps 13 and 15: the reseller's return rate and its automatic listing pause; the supplier's stock-out pause. */
  returnRate: number | null;
  returnPausedAt: string | null;
  returnPauseRate: number;
  supplierPause: { until: string; reason: string | null } | null;
}

export const RESALE_REFUSAL_LABEL: Record<ResaleRefusal, string> = {
  PAUSED: 'Paused for everyone (Settings > Switches)',
  NOT_ENABLED: 'Not switched on for this store (Feature flags)',
  NO_STORE: 'Store not found',
  STORE_OFFLINE: 'Store is not open',
  BLOCKED: 'Blocked for this store',
  NOT_VERIFIED: 'Store is not verified',
  KYC_RESTRICTED: 'Restricted by an open verification',
};

export const resaleAdminApi = {
  get: (vendorId: string) => api.get<StoreResale>(`/v1/admin/vendors/${vendorId}/resale`).then((r) => r.data),
  update: (vendorId: string, body: { feePercent: number | null; blocked: boolean; reason: string; liftSupplierPause?: boolean }) =>
    api.put<StoreResale>(`/v1/admin/vendors/${vendorId}/resale`, body).then((r) => r.data),
};
