import { api } from './api';

// Mirrors server/src/app-market/app-platform-push.service.ts (Super Admin > Platform > Shop > App push, MARKETPLACE-APP-plan.md Step 13).

export type PlatformPushKind = 'FLASH_SALE' | 'NEWS';

export interface PlatformPushRow {
  id: string;
  kind: PlatformPushKind;
  title: string;
  body: string;
  queued: number;
  sentAt: string;
}

export interface PlatformPushOverview {
  phones: number;
  sentToday: number;
  perDay: number;
  canSendNow: boolean;
  history: PlatformPushRow[];
}

export interface AppMarketStats {
  /** The APP_MARKET kill switch (changed in Settings > Switches by the owner). */
  marketOn: boolean;
  last7: { orders: number; sales: number };
  last30: { orders: number; sales: number };
  shoppersWithApp: number;
  shoppersWithCart: number;
  storesListed: number;
  storesBlockedByPlan: number;
}

export const appPushAdminApi = {
  stats: async () => (await api.get<AppMarketStats>('/v1/admin/app-push/stats')).data,
  overview: async () => (await api.get<PlatformPushOverview>('/v1/admin/app-push')).data,
  send: async (input: { kind: PlatformPushKind; title: string; body: string }) => (await api.post<{ id: string; queued: number }>('/v1/admin/app-push/send', input)).data,
};
