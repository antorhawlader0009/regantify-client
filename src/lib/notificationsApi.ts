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
  topic: 'NEW_ORDER' | 'ORDER_ATTENTION' | 'PLAN_ENDING' | 'LOW_STOCK' | 'DAILY_SUMMARY' | 'NEW_REVIEW' | null;
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

  // -- Telegram --
  telegramConfig: () => api.get<TelegramConfig>('/v1/notifications/telegram/config').then((r) => r.data),
  telegramChats: () => api.get<TelegramChat[]>('/v1/notifications/telegram/chats').then((r) => r.data),
  /** A one-time t.me link: opening it and pressing Start connects that chat. GROUP is for the store owner. */
  telegramLink: (kind: 'PRIVATE' | 'GROUP') => api.post<{ url: string; expiresAt: string }>('/v1/notifications/telegram/link', { kind }).then((r) => r.data),
  telegramTopics: (id: string, topics: TelegramTopic[]) => api.patch(`/v1/notifications/telegram/chats/${id}/topics`, { topics }).then((r) => r.data),
  telegramRemove: (id: string) => api.delete(`/v1/notifications/telegram/chats/${id}`).then((r) => r.data),
  telegramTest: () => api.post<{ sent: number; chats: number }>('/v1/notifications/telegram/test').then((r) => r.data),

  /** Owner only. `smsPhone: ''` goes back to the owner's own phone. */
  updateSettings: (patch: Partial<Omit<NotificationSettings, 'ownerPhone' | 'smsPhone'>> & { smsPhone?: string }) =>
    api.patch<NotificationSettings>('/v1/notifications/settings', patch).then((r) => r.data),
};

/** What a Telegram chat can be told about: the bell topics, plus lead alerts for an LMS agent (private chats only). */
export type TelegramTopic = PushTopic | 'LMS';

export interface TelegramConfig {
  /** False while the server has no bot token. */
  enabled: boolean;
  botUsername: string | null;
}

export interface TelegramChat {
  id: string;
  kind: 'PRIVATE' | 'GROUP';
  title: string | null;
  topics: TelegramTopic[];
  createdAt: string;
  /** This person can change or remove it (their own chat, or any group for the owner). */
  canManage: boolean;
}

/** What a phone or browser can be told about (the bell topics). */
export type PushTopic = 'NEW_ORDER' | 'ORDER_ATTENTION' | 'PLAN_ENDING' | 'LOW_STOCK' | 'DAILY_SUMMARY' | 'NEW_REVIEW';

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
  /** The end-of-day summary (bell, plus the phones and Telegram chats that ticked it). */
  dailySummary: boolean;
  /** Dhaka hour, 0-23. */
  dailySummaryHour: number;
  ownerPhone: string | null;
}
