import { api } from './api';

// Mirrors server/src/admin-alerts/admin-alerts.controller.ts and admin/admin-search.controller.ts (super-admin-plan.md Step 18).

export interface AdminAlert {
  id: string;
  topic: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  unread: boolean;
}
export interface AdminAlertSettings {
  topics: Array<{ key: string; label: string; allowed: boolean; enabled: boolean }>;
  dailySummary: boolean;
  canSummary: boolean;
  telegram: { available: boolean; chats: Array<{ id: string; title: string | null; createdAt: string; lastSentAt: string | null }> };
}

export interface AdminSearchHit {
  id: string;
  title: string;
  subtitle: string;
  path: string;
}
export interface AdminSearchGroup {
  group: string;
  hits: AdminSearchHit[];
}

export const adminAlertsApi = {
  feed: () => api.get<{ unread: number; items: AdminAlert[] }>('/v1/admin/alerts').then((r) => r.data),
  markRead: () => api.post('/v1/admin/alerts/read').then((r) => r.data),
  settings: () => api.get<AdminAlertSettings>('/v1/admin/alerts/settings').then((r) => r.data),
  saveSettings: (topics: string[], dailySummary: boolean) => api.put('/v1/admin/alerts/settings', { topics, dailySummary }).then((r) => r.data),
  telegramLink: () => api.post<{ url: string; expiresAt: string }>('/v1/admin/alerts/telegram/link').then((r) => r.data),
  telegramTest: () => api.post<{ sent: number }>('/v1/admin/alerts/telegram/test').then((r) => r.data),
  telegramRemove: (id: string) => api.delete(`/v1/admin/alerts/telegram/${id}`).then((r) => r.data),
  search: (q: string) => api.get<AdminSearchGroup[]>('/v1/admin/search', { params: { q } }).then((r) => r.data),
};
