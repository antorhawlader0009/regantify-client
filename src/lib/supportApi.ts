import { api } from './api';

export type SupportStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';
export type SupportCategory = 'ORDERS' | 'PAYMENTS' | 'BILLING' | 'COURIER' | 'STOREFRONT' | 'ACCOUNT' | 'OTHER';
export type SupportPriority = 'NORMAL' | 'URGENT';

export interface SupportTicketSummary {
  id: string;
  number: number;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  lastMessageAt: string;
  vendorUnread: boolean;
  adminUnread: boolean;
  closedAt: string | null;
  createdAt: string;
  _count: { messages: number };
}

export interface SupportMessage {
  id: string;
  authorRole: 'VENDOR' | 'ADMIN';
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface SupportTicket extends Omit<SupportTicketSummary, '_count'> {
  messages: SupportMessage[];
}

export interface AdminSupportTicketSummary extends SupportTicketSummary {
  vendor: { id: string; storeName: string; subdomain: string };
}

export interface AdminSupportTicket extends SupportTicket {
  vendor: {
    id: string;
    storeName: string;
    subdomain: string;
    user: { phone: string | null; email: string | null; fullName: string | null };
    subscription: { plan: { name: string } } | null;
  };
}

export interface AdminSupportList {
  tickets: AdminSupportTicketSummary[];
  counts: Record<SupportStatus, number>;
}

export interface CreateTicketPayload {
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  message: string;
}

export const supportApi = {
  list: () => api.get<SupportTicketSummary[]>('/v1/support/tickets').then((r) => r.data),
  unreadCount: () => api.get<{ count: number }>('/v1/support/tickets/unread-count').then((r) => r.data.count),
  create: (payload: CreateTicketPayload) => api.post<SupportTicketSummary>('/v1/support/tickets', payload).then((r) => r.data),
  get: (id: string) => api.get<SupportTicket>(`/v1/support/tickets/${id}`).then((r) => r.data),
  reply: (id: string, body: string) => api.post<SupportTicket>(`/v1/support/tickets/${id}/messages`, { body }).then((r) => r.data),
  close: (id: string) => api.post<SupportTicket>(`/v1/support/tickets/${id}/close`).then((r) => r.data),
};

export const adminSupportApi = {
  list: (params: { status?: SupportStatus; search?: string }) =>
    api.get<AdminSupportList>('/v1/admin/support/tickets', { params }).then((r) => r.data),
  unreadCount: () => api.get<{ count: number }>('/v1/admin/support/tickets/unread-count').then((r) => r.data.count),
  get: (id: string) => api.get<AdminSupportTicket>(`/v1/admin/support/tickets/${id}`).then((r) => r.data),
  reply: (id: string, body: string) => api.post<AdminSupportTicket>(`/v1/admin/support/tickets/${id}/messages`, { body }).then((r) => r.data),
  setStatus: (id: string, status: 'OPEN' | 'CLOSED') =>
    api.patch<AdminSupportTicket>(`/v1/admin/support/tickets/${id}/status`, { status }).then((r) => r.data),
};
