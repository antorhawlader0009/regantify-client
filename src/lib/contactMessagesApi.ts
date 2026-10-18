import { api } from './api';

/** Customers > Messages: what shoppers wrote on the StorePal contact page (server store-contact/). */
export type ContactMessageStatus = 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';

export interface ContactMessageRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  /** The first 200 characters in the list. */
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  repliedAt: string | null;
}

export interface ContactReply {
  id: string;
  body: string;
  sentByName: string;
  emailStatus: 'SENDING' | 'SENT' | 'FAILED';
  error: string | null;
  createdAt: string;
}

export interface ContactMessage extends ContactMessageRow {
  readAt: string | null;
  replies: ContactReply[];
}

export interface ContactPageSettings {
  enabled: boolean;
  intro: string;
  whatsapp: string;
  phone: string;
  basedIn: string;
}

export const contactMessagesApi = {
  list: (q: { status?: string; search?: string; page?: number }) =>
    api
      .get<{ items: ContactMessageRow[]; total: number; page: number; pageSize: number; counts: Record<ContactMessageStatus, number> }>('/v1/contact-messages', { params: q })
      .then((r) => r.data),
  get: (id: string) => api.get<ContactMessage>(`/v1/contact-messages/${id}`).then((r) => r.data),
  unread: () => api.get<{ count: number }>('/v1/contact-messages/unread').then((r) => r.data.count),
  setStatus: (id: string, status: 'NEW' | 'READ' | 'ARCHIVED') => api.patch(`/v1/contact-messages/${id}/status`, { status }).then((r) => r.data),
  reply: (id: string, body: string) => api.post<{ ok: boolean; error: string | null }>(`/v1/contact-messages/${id}/reply`, { body }).then((r) => r.data),
  remove: (id: string) => api.delete(`/v1/contact-messages/${id}`).then((r) => r.data),
  settings: () => api.get<ContactPageSettings>('/v1/contact-messages/settings').then((r) => r.data),
  saveSettings: (s: ContactPageSettings) => api.put<ContactPageSettings>('/v1/contact-messages/settings', s).then((r) => r.data),
};
