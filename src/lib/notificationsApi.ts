import { api } from './api';

export type NotificationType = 'ORDER' | 'WITHDRAW' | 'WALLET' | 'SUBSCRIPTION' | 'REVIEW' | 'SUPPORT' | 'SYSTEM';
export type NotificationTone = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';

export interface VendorNotification {
  id: string;
  type: NotificationType;
  tone: NotificationTone;
  title: string;
  body: string | null;
  /** In-app route, e.g. /vendor/orders/<id>. */
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: VendorNotification[];
  unreadCount: number;
}

export const notificationsApi = {
  list: (limit = 30) =>
    api.get<NotificationList>('/v1/notifications', { params: { limit } }).then((r) => r.data),

  markRead: (id: string) => api.post(`/v1/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () => api.post('/v1/notifications/read-all').then((r) => r.data),
};
