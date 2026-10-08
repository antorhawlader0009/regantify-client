import { api } from './api';

export type NotificationType = 'ORDER' | 'WITHDRAW' | 'WALLET' | 'SUBSCRIPTION' | 'REVIEW' | 'SUPPORT' | 'SYSTEM' | 'STOCK';
export type NotificationTone = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';

export interface VendorNotification {
  id: string;
  type: NotificationType;
  tone: NotificationTone;
  title: string;
  body: string | null;
  /** In-app route, e.g. /vendor/orders/<id>. */
  link: string | null;
  /** What exactly happened, for the sound / SMS alerts; null for everything else. */
  topic: 'NEW_ORDER' | 'ORDER_ATTENTION' | 'PLAN_ENDING' | 'LOW_STOCK' | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: VendorNotification[];
  unreadCount: number;
}

/** One page of the full "All notifications" history. */
export interface NotificationPage {
  items: VendorNotification[];
  total: number;
  unreadCount: number;
  /** Unread per type; a type with nothing unread is missing. */
  unreadByType: Partial<Record<NotificationType, number>>;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const notificationsApi = {
  list: (limit = 30) =>
    api.get<NotificationList>('/v1/notifications', { params: { limit } }).then((r) => r.data),

  listAll: (params: { page: number; pageSize?: number; unread?: boolean; type?: NotificationType }) =>
    api.get<NotificationPage>('/v1/notifications/all', { params }).then((r) => r.data),

  markRead: (id: string) => api.post(`/v1/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () => api.post('/v1/notifications/read-all').then((r) => r.data),

  getSettings: () => api.get<NotificationSettings>('/v1/notifications/settings').then((r) => r.data),

  // -- Phone notifications (push), see lib/pushNotifications.ts --
  pushConfig: () => api.get<PushConfig>('/v1/notifications/push/config').then((r) => r.data),
  pushDevices: () => api.get<PushDevice[]>('/v1/notifications/push/devices').then((r) => r.data),
  pushSubscribe: (body: { endpoint: string; keys: { p256dh: string; auth: string }; deviceName?: string; topics?: PushTopic[] }) =>
    api.post<PushDevice>('/v1/notifications/push/subscribe', body).then((r) => r.data),
  pushUnsubscribe: (endpoint: string) => api.post('/v1/notifications/push/unsubscribe', { endpoint }).then((r) => r.data),
  pushTopics: (endpoint: string, topics: PushTopic[]) => api.patch('/v1/notifications/push/topics', { endpoint, topics }).then((r) => r.data),
  pushTest: () => api.post<{ sent: number; devices: number }>('/v1/notifications/push/test').then((r) => r.data),

  /** Owner only. `smsPhone: ''` goes back to the owner's own phone. */
  updateSettings: (patch: Partial<Omit<NotificationSettings, 'ownerPhone' | 'smsPhone'>> & { smsPhone?: string }) =>
    api.patch<NotificationSettings>('/v1/notifications/settings', patch).then((r) => r.data),
};

/** What a phone or browser can be told about (the bell topics). */
export type PushTopic = 'NEW_ORDER' | 'ORDER_ATTENTION' | 'PLAN_ENDING' | 'LOW_STOCK';

export interface PushConfig {
  /** False while the server has no VAPID keys: phone notifications are off for everyone. */
  enabled: boolean;
  publicKey: string | null;
}

export interface PushDevice {
  id: string;
  endpoint: string;
  topics: PushTopic[];
  deviceName: string | null;
  createdAt: string;
}

/** Notifications > Alert settings, the store's SMS part (paid from its SMS credits). */
export interface NotificationSettings {
  smsNewOrder: boolean;
  smsOrderAttention: boolean;
  smsPlanEnding: boolean;
  smsLowStock: boolean;
  /** Null = the owner's own phone (ownerPhone). */
  smsPhone: string | null;
  /** No SMS 10 PM to 8 AM. */
  smsQuietHours: boolean;
  ownerPhone: string | null;
}
