import { api } from './api';

// Mirrors server/src/admin/admin-platform-config.controller.ts: Super Admin > Settings (super-admin-plan.md Step 15).

export type SignupMode = 'OPEN' | 'APPROVAL' | 'CLOSED';

export interface PlatformConfig {
  contact: { supportPhone: string; supportWhatsapp: string; alertPhone: string; alertPhoneFromEnv: boolean };
  signup: { mode: SignupMode; reservedSubdomains: string[]; blockedStoreWords: string[]; builtInReserved: string[] };
  money: {
    minWithdraw: number;
    withdrawFeeFlat: number;
    withdrawFeePercent: number;
    planGraceDays: number;
    smsLowBalance: number;
    trialPlanCode: string;
    trialDays: number;
    /** Stores may pay for plans, SMS and AI Credit packs from their wallet. */
    walletPurchases: boolean;
    plans: Array<{ code: string; name: string }>;
  };
  terms: { version: number; termsText: string; privacyText: string; updatedAt: string | null; owners: number; acceptedCurrent: number };
  maintenance: { text: string; from: string | null; until: string | null; showingNow: boolean };
  keys: Array<{ label: string; set: boolean; note: string }>;
}

export type ConfigSection = 'contact' | 'signup' | 'money' | 'terms' | 'maintenance';

export const platformConfigApi = {
  get: () => api.get<PlatformConfig>('/v1/admin/platform-config').then((r) => r.data),
  save: (section: ConfigSection, body: Record<string, unknown>) => api.put(`/v1/admin/platform-config/${section}`, body).then((r) => r.data),
};
