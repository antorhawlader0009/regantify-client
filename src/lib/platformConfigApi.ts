import { api } from './api';

// Mirrors server/src/admin/admin-platform-config.controller.ts: Super Admin > Settings (super-admin-plan.md Step 15).

export type SignupMode = 'OPEN' | 'APPROVAL' | 'CLOSED';

export interface PlatformConfig {
  contact: { supportPhone: string; supportWhatsapp: string; alertPhone: string; alertPhoneFromEnv: boolean };
  signup: { mode: SignupMode; reservedSubdomains: string[]; blockedStoreWords: string[]; builtInReserved: string[]; newStoreView: 'SIMPLE' | 'FULL' };
  money: {
    minWithdraw: number;
    withdrawFeeFlat: number;
    withdrawFeePercent: number;
    planGraceDays: number;
    smsLowBalance: number;
    /** Most app promotions one store may send per Dhaka day. */
    appPromoPerDay: number;
    trialPlanCode: string;
    trialDays: number;
    /** Who may pay for plans, SMS and AI Credit packs from the wallet: nobody, verified stores, every store. A store's own setting beats it. */
    walletPurchaseMode: 'OFF' | 'VERIFIED' | 'ALL';
    /** Stores Super Admin set apart on their own page. */
    walletPurchaseOverrides: { on: number; off: number };
    plans: Array<{ code: string; name: string }>;
  };
  /** Reseller system (RESELLER-plan.md Step 1). `flags` = the mode of the RESALE_SUPPLY / RESALE_SELL feature flags, MISSING when not created (= off). */
  resale: {
    verifiedSuppliers: boolean;
    verifiedResellers: boolean;
    feePercent: number;
    holdDays: number;
    maxListings: number;
    autoCancelDays: number;
    returnPauseRate: number;
    onlinePayment: boolean;
    flags: { supply: string; sell: string };
  };
  terms: { version: number; termsText: string; privacyText: string; updatedAt: string | null; owners: number; acceptedCurrent: number };
  maintenance: { text: string; from: string | null; until: string | null; showingNow: boolean };
  keys: Array<{ label: string; set: boolean; note: string }>;
}

export type ConfigSection = 'contact' | 'signup' | 'money' | 'resale' | 'terms' | 'maintenance';

export const platformConfigApi = {
  get: () => api.get<PlatformConfig>('/v1/admin/platform-config').then((r) => r.data),
  save: (section: ConfigSection, body: Record<string, unknown>) => api.put(`/v1/admin/platform-config/${section}`, body).then((r) => r.data),
};
