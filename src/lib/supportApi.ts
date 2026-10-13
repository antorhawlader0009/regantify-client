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
  /** The store's own rating of how the closed ticket was handled (1 to 5). */
  rating?: number | null;
  ratingNote?: string | null;
  ratedAt?: string | null;
}

export interface AdminSupportTicketSummary extends SupportTicketSummary {
  assignedToId: string | null;
  assignedToName: string | null;
  tags: string[];
  rating: number | null;
  /** Still waiting on support and the last word is over a day old. */
  waitingOver24h: boolean;
  vendor: { id: string; storeName: string; subdomain: string };
}

export interface AdminSupportNote {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface AdminSupportTicket extends SupportTicket {
  assignedToId: string | null;
  assignedToName: string | null;
  tags: string[];
  notes: AdminSupportNote[];
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
  waitingCount: number;
  mine: number;
  tags: string[];
  ratings: { average: number | null; count: number };
}

export interface SavedReply {
  id: string;
  title: string;
  body: string;
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
  rate: (id: string, rating: number, note?: string) => api.post<SupportTicket>(`/v1/support/tickets/${id}/rating`, { rating, note }).then((r) => r.data),
};

export const adminSupportApi = {
  list: (params: { status?: SupportStatus; search?: string; assignee?: string; waiting?: boolean; tag?: string }) =>
    api.get<AdminSupportList>('/v1/admin/support/tickets', { params }).then((r) => r.data),
  unreadCount: () => api.get<{ count: number }>('/v1/admin/support/tickets/unread-count').then((r) => r.data.count),
  get: (id: string) => api.get<AdminSupportTicket>(`/v1/admin/support/tickets/${id}`).then((r) => r.data),
  reply: (id: string, body: string) => api.post<AdminSupportTicket>(`/v1/admin/support/tickets/${id}/messages`, { body }).then((r) => r.data),
  setStatus: (id: string, status: 'OPEN' | 'CLOSED') =>
    api.patch<AdminSupportTicket>(`/v1/admin/support/tickets/${id}/status`, { status }).then((r) => r.data),
  admins: () => api.get<Array<{ id: string; name: string }>>('/v1/admin/support/tickets/admins').then((r) => r.data),
  assign: (id: string, adminId: string | null) => api.patch<AdminSupportTicket>(`/v1/admin/support/tickets/${id}/assign`, { adminId }).then((r) => r.data),
  setTags: (id: string, tags: string[]) => api.put<AdminSupportTicket>(`/v1/admin/support/tickets/${id}/tags`, { tags }).then((r) => r.data),
  addNote: (id: string, body: string) => api.post<AdminSupportTicket>(`/v1/admin/support/tickets/${id}/notes`, { body }).then((r) => r.data),
  savedReplies: () => api.get<SavedReply[]>('/v1/admin/support/tickets/saved-replies').then((r) => r.data),
  saveReply: (id: string | null, title: string, body: string) => (id ? api.patch(`/v1/admin/support/tickets/saved-replies/${id}`, { title, body }) : api.post('/v1/admin/support/tickets/saved-replies', { title, body })).then((r) => r.data),
  deleteReply: (id: string) => api.delete(`/v1/admin/support/tickets/saved-replies/${id}`).then((r) => r.data),
};
