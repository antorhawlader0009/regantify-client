import { api } from './api';

// Orders > Chat orders: the Chat order saver Chrome extension — mirrors server/src/chat-extension/chat-extension.service.ts.

export interface ChatExtensionDevice {
  id: string;
  name: string;
  linkedBy: string;
  userId: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ChatExtensionStatus {
  retentionDays: number;
  messageLimit: number;
  consentVersion: string;
  recordCount: number;
  devices: ChatExtensionDevice[];
}

export interface ChatRecord {
  id: string;
  source: 'FB_MESSAGES' | 'BUSINESS_INBOX' | 'WHATSAPP' | 'OTHER';
  customerName: string;
  phone: string | null;
  address: string | null;
  district: string | null;
  items: string | null;
  orderId: string | null;
  createdAt: string;
}

export interface ChatRecordDetail extends ChatRecord {
  note: string | null;
  messages: Array<{ from: 'customer' | 'store'; text: string }>;
  updatedAt: string;
}

/** A customer photo kept with a saved chat (encrypted on the server, deleted 90 days after it was saved). */
export interface ChatRecordPhoto {
  id: string;
  note: string | null;
  bytes: number;
  createdAt: string;
  deletesAt: string;
}

export interface ChatRecordEdit {
  customerName?: string;
  phone?: string;
  address?: string;
  district?: string;
  items?: string;
  note?: string;
}

export interface ChatOrderPrefill {
  customerName: string;
  customerPhone: string | null;
  shippingAddress: string | null;
  shippingDistrict: string | null;
  staffNote: string;
  orderId: string | null;
}

export const chatExtensionApi = {
  status: () => api.get<ChatExtensionStatus>('/v1/chat-extension/status').then((r) => r.data),
  pairCode: () => api.post<{ code: string; expiresAt: string }>('/v1/chat-extension/pair-code').then((r) => r.data),
  revokeDevice: (id: string) => api.delete(`/v1/chat-extension/devices/${id}`).then((r) => r.data),
  updateSettings: (body: { retentionDays?: number; messageLimit?: number }) => api.patch('/v1/chat-extension/settings', body).then((r) => r.data),
  records: (q: string, page: number) => api.get<{ items: ChatRecord[]; total: number; page: number; perPage: number }>('/v1/chat-extension/records', { params: { q: q || undefined, page } }).then((r) => r.data),
  record: (id: string) => api.get<ChatRecordDetail>(`/v1/chat-extension/records/${id}`).then((r) => r.data),
  update: (id: string, body: ChatRecordEdit) => api.patch<ChatRecordDetail>(`/v1/chat-extension/records/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/v1/chat-extension/records/${id}`).then((r) => r.data),
  removeAll: () => api.delete<{ deleted: number }>('/v1/chat-extension/records').then((r) => r.data),
  exportAll: () => api.get<{ exportedAt: string; records: ChatRecordDetail[] }>('/v1/chat-extension/records/export').then((r) => r.data),
  orderPrefill: (id: string) => api.get<ChatOrderPrefill>(`/v1/chat-extension/records/${id}/order-prefill`).then((r) => r.data),
  photos: (id: string) => api.get<ChatRecordPhoto[]>(`/v1/chat-extension/records/${id}/photos`).then((r) => r.data),
  /** The photo as a browser object URL (it needs the signed-in session, so it can't be a plain <img src>). Revoke it when done. */
  photoUrl: (photoId: string) => api.get<Blob>(`/v1/chat-extension/photos/${photoId}`, { responseType: 'blob' }).then((r) => URL.createObjectURL(r.data)),
  deletePhoto: (photoId: string) => api.delete(`/v1/chat-extension/photos/${photoId}`).then((r) => r.data),
  linkOrder: (id: string, orderId: string) => api.post(`/v1/chat-extension/records/${id}/order`, { orderId }).then((r) => r.data),
};
