import { api } from './api';

// Mirrors server/src/admin/admin-shoppers.controller.ts — Super Admin > Customers (super-admin-plan.md Step 8).

export interface ShopperSummary {
  phone: string;
  name: string;
  hasAccount: boolean;
  loginOff: boolean;
  orders: number;
  stores: number;
  cancelled: number;
  returned: number;
  blacklistedByStores: number;
  lastOrderAt: string | null;
  platformBlocked: boolean;
}

export interface ShopperProfile {
  phone: string;
  summary: ShopperSummary;
  names: string[];
  account: { id: string; name: string; email: string | null; address: string | null; since: string; loginOffAt: string | null; loginOffReason: string | null } | null;
  perStore: Array<{ vendorId: string; storeName: string; orders: number; completed: number; cancelled: number; returned: number; spent: number; last: string }>;
  storeBlacklists: Array<{ vendorId: string; storeName: string; reason: string | null }>;
  recentOrders: Array<{ id: string; number: number; publicCode: string | null; status: string; total: number; paymentMethod: string; createdAt: string; vendorId: string; storeName: string }>;
  block: { reason: string; by: string; since: string; until: string | null; attempts: number; lastAttemptAt: string | null; active: boolean } | null;
}

export interface BlockedPhone {
  phone: string;
  reason: string;
  by: string;
  since: string;
  until: string | null;
  attempts: number;
  lastAttemptAt: string | null;
  active: boolean;
}

const enc = encodeURIComponent;

export const adminShoppersApi = {
  search: (q: string) => api.get<{ nameSearchDays: number | null; items: ShopperSummary[] }>('/v1/admin/shoppers', { params: { q } }).then((r) => r.data),
  profile: (phone: string) => api.get<ShopperProfile>(`/v1/admin/shoppers/${enc(phone)}`).then((r) => r.data),
  blocklist: () => api.get<BlockedPhone[]>('/v1/admin/shoppers/blocklist').then((r) => r.data),
  block: (phone: string, reason: string, untilDays?: number) => api.post('/v1/admin/shoppers/block', { phone, reason, untilDays }).then((r) => r.data),
  unblock: (phone: string, reason: string) => api.post(`/v1/admin/shoppers/${enc(phone)}/unblock`, { reason }).then((r) => r.data),
  loginOff: (phone: string, reason: string) => api.post(`/v1/admin/shoppers/${enc(phone)}/login-off`, { reason }).then((r) => r.data),
  loginOn: (phone: string, reason: string) => api.post(`/v1/admin/shoppers/${enc(phone)}/login-on`, { reason }).then((r) => r.data),
  signOut: (phone: string, reason: string) => api.post(`/v1/admin/shoppers/${enc(phone)}/sign-out`, { reason }).then((r) => r.data),
  passwordSms: (phone: string, reason: string) => api.post<{ sentTo: string }>(`/v1/admin/shoppers/${enc(phone)}/password-sms`, { reason }).then((r) => r.data),
};
