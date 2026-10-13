import { useQuery } from '@tanstack/react-query';
import { api } from './api';

// Mirrors server/src/platform-settings/platform-info.controller.ts: what Super Admin's Settings say to a store (super-admin-plan.md Step 15).

export interface PlatformInfo {
  support: { phone: string | null; whatsapp: string | null };
  maintenance: { text: string; until: string | null } | null;
  withdraw: { min: number; feeFlat: number; feePercent: number };
  terms: { version: number; mustAccept: boolean };
}
export interface PlatformTerms {
  version: number;
  termsText: string;
  privacyText: string;
  updatedAt: string | null;
}

export const PLATFORM_INFO_KEY = ['platform-info'];

export const platformApi = {
  info: () => api.get<PlatformInfo>('/v1/platform/info').then((r) => r.data),
  terms: () => api.get<PlatformTerms>('/v1/platform/terms').then((r) => r.data),
  acceptTerms: () => api.post('/v1/platform/terms/accept').then((r) => r.data),
};

/** The platform's settings for this store; shared by every component that needs one, so it is fetched once. */
export function usePlatformInfo() {
  return useQuery({ queryKey: PLATFORM_INFO_KEY, queryFn: platformApi.info, staleTime: 5 * 60_000, retry: false });
}

/** The fee Super Admin keeps from a payout of `amount` (flat + percent), to the paisa. Same arithmetic as the server. */
export function withdrawFee(amount: number, rules: { feeFlat: number; feePercent: number }): number {
  return Math.round((rules.feeFlat + (amount * rules.feePercent) / 100) * 100) / 100;
}
