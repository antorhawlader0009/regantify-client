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

export const appPushAdminApi = {
  overview: async () => (await api.get<PlatformPushOverview>('/v1/admin/app-push')).data,
  send: async (input: { kind: PlatformPushKind; title: string; body: string }) => (await api.post<{ id: string; queued: number }>('/v1/admin/app-push/send', input)).data,
};
