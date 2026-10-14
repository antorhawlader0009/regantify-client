import { api } from './api';

// Mirrors server/src/referrals/referrals.controller.ts (super-admin-new.md Step 6).

export type ReferralStatus = 'SIGNED_UP' | 'PAID' | 'REJECTED';

export type MyReferrals =
  | { enabled: false }
  | {
      enabled: true;
      code: string;
      partner: { percent: number; months: number } | null;
      reward: { amount: number; days: number };
      totals: { signedUp: number; paid: number; earned: number };
      referrals: Array<{ id: string; storeName: string; status: ReferralStatus; createdAt: string; firstPaidAt: string | null; earned: number; days: number }>;
    };

export interface AdminReferrals {
  settings: { enabled: boolean; rewardAmount: number; rewardDays: number; updatedBy: string | null };
  totals: { signedUp: number; paid: number; rejected: number; paidOut: number };
  partners: Array<{ vendorId: string; storeName: string; percent: number; months: number; note: string | null; active: boolean; createdByName: string; createdAt: string }>;
  top: Array<{ vendorId: string; storeName: string; signedUp: number; paid: number; earned: number }>;
  referrals: Array<{ id: string; referrerId: string; referredId: string; referrerName: string; referredName: string; code: string; status: ReferralStatus; rejectReason: string | null; percent: number | null; months: number | null; firstPaidAt: string | null; createdAt: string }>;
  earnings: Array<{ id: string; kind: 'COMMISSION' | 'REWARD'; amount: number; days: number; createdAt: string; reversedAt: string | null; reversedBy: string | null; reverseReason: string | null; referrerId: string; referrerName: string; referredName: string; canReverse: boolean }>;
}

export const referralsApi = {
  mine: () => api.get<MyReferrals>('/v1/vendor/referrals').then((r) => r.data),
  overview: () => api.get<AdminReferrals>('/v1/admin/referrals').then((r) => r.data),
  saveSettings: (body: { enabled: boolean; rewardAmount: number; rewardDays: number }) => api.put('/v1/admin/referrals/settings', body).then((r) => r.data),
  savePartner: (vendorId: string, body: { percent: number; months: number; note?: string; active: boolean }) => api.put(`/v1/admin/referrals/partners/${vendorId}`, body).then((r) => r.data),
  reverse: (id: string, reason: string) => api.post(`/v1/admin/referrals/earnings/${id}/reverse`, { reason }).then((r) => r.data),
};
