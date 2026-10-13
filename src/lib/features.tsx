import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useAuthStore } from '../store/authStore';

/**
 * Feature flags in the vendor app (super-admin-new.md Step 1). Super Admin turns a flag on for some stores in Admin > Feature flags;
 * the dashboard asks once which flags are on for this store and keeps the answer for a minute.
 *
 *   const on = useFeature('NEW_CHECKOUT');          // false while loading, and for any flag that doesn't exist
 *   <FeatureGate flag="NEW_CHECKOUT">...</FeatureGate>
 *
 * The server checks the same flag (FeaturesService.isOn) wherever it matters; hiding a button here is only for the eye.
 */
export interface VendorFeatures {
  on: string[];
  beta: { optedIn: boolean; since: string | null };
}

export const FEATURES_QUERY_KEY = ['vendor-features'] as const;

export const featuresApi = {
  mine: () => api.get<VendorFeatures>('/v1/vendor/features').then((r) => r.data),
  setBeta: (optIn: boolean) => api.put<{ optedIn: boolean; on: string[] }>('/v1/vendor/features/beta', { optIn }).then((r) => r.data),
};

export function useVendorFeatures() {
  const role = useAuthStore((s) => s.user?.role);
  return useQuery({
    queryKey: FEATURES_QUERY_KEY,
    queryFn: featuresApi.mine,
    enabled: role === 'VENDOR' || role === 'STAFF',
    staleTime: 60_000,
  });
}

export function useFeature(key: string): boolean {
  const { data } = useVendorFeatures();
  return data?.on.includes(key) ?? false;
}

export function FeatureGate({ flag, children, fallback = null }: { flag: string; children: ReactNode; fallback?: ReactNode }) {
  return <>{useFeature(flag) ? children : fallback}</>;
}

export function useSetBeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: featuresApi.setBeta,
    onSuccess: (r) => qc.setQueryData<VendorFeatures>(FEATURES_QUERY_KEY, { on: r.on, beta: { optedIn: r.optedIn, since: r.optedIn ? new Date().toISOString() : null } }),
  });
}
