import { api } from './api';

// Mirrors server/src/admin/plan-renewal.controller.ts - Super Admin > Plans > Renewals (super-admin-plan.md Step 9).

export interface RenewalRow {
  vendorId: string;
  storeName: string;
  ownerName: string | null;
  phone: string | null;
  plan: string;
  price: number;
  endsAt: string | null;
  graceEndsAt: string | null;
  /** Calendar days (Dhaka) until the end date; 0 = today, negative = past. */
  daysLeft: number | null;
  /** Reminders already sent for this end date: 7, 3, 1, 0 days before. */
  remindersSent: number[];
  lastManualReminder: string | null;
}

export interface EndedRow {
  vendorId: string;
  storeName: string;
  ownerName: string | null;
  phone: string | null;
  plan: string;
  endedAt: string;
  lastManualReminder: string | null;
}

export interface Renewals {
  graceDays: number;
  endingSoon: RenewalRow[];
  inGrace: RenewalRow[];
  recentlyEnded: EndedRow[];
}

export const adminRenewalsApi = {
  lists: () => api.get<Renewals>('/v1/admin/renewals').then((r) => r.data),
  setGrace: (graceDays: number) => api.put<{ graceDays: number }>('/v1/admin/renewals/grace', { graceDays }).then((r) => r.data),
  remind: (vendorId: string, reason: string) => api.post<{ texted: boolean }>(`/v1/admin/renewals/${vendorId}/remind`, { reason }).then((r) => r.data),
};
