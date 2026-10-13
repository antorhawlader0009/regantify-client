import { api } from './api';
import type { PlanCode } from './plansApi';

// Mirrors server/src/admin/admin-messages.controller.ts — Super Admin > Messages (super-admin-plan.md Step 11).

export interface MessageAudience {
  vendorIds?: string[];
  /** The All Vendors list's own query (plan, endingInDays, inactiveDays, tag, status, health…). */
  filter?: Record<string, string>;
  planCodes?: PlanCode[];
  feature?: 'POS' | 'LMS' | 'CUSTOM_DOMAIN';
}

export interface MessageContent {
  title: string;
  body: string;
  sms?: string;
  link?: string;
  audience: MessageAudience;
}

export interface MessagePreview {
  recipients: number;
  sample: string[];
  example: { title: string; body: string; sms: string | null } | null;
  sms: { texts: number; noPhone: number; parts: number; rate: number | null; cost: number | null; balance: number | null; tooMany: boolean } | null;
}

export interface SentMessage {
  id: string;
  title: string;
  body: string;
  sms: string | null;
  by: string;
  createdAt: string;
  finishedAt: string | null;
  status: 'SENDING' | 'DONE' | 'INTERRUPTED';
  recipients: number;
  bellSent: number;
  smsAttempted: number;
  smsSent: number;
  smsFailed: number;
  smsParts: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  sms: string | null;
}

export const adminMessagesApi = {
  preview: (c: MessageContent) => api.post<MessagePreview>('/v1/admin/messages/preview', c).then((r) => r.data),
  send: (c: MessageContent, confirmCount: number) => api.post<{ id: string; recipients: number }>('/v1/admin/messages/send', { ...c, confirmCount }).then((r) => r.data),
  history: () => api.get<SentMessage[]>('/v1/admin/messages').then((r) => r.data),
  templates: () => api.get<MessageTemplate[]>('/v1/admin/messages/templates').then((r) => r.data),
  saveTemplate: (id: string | null, t: Omit<MessageTemplate, 'id'>) => (id ? api.patch(`/v1/admin/messages/templates/${id}`, t) : api.post('/v1/admin/messages/templates', t)).then((r) => r.data),
  deleteTemplate: (id: string) => api.delete(`/v1/admin/messages/templates/${id}`).then((r) => r.data),
  smsRate: () => api.get<{ rate: number | null }>('/v1/admin/messages/sms-rate').then((r) => r.data),
  setSmsRate: (rate: number | null) => api.put<{ rate: number | null }>('/v1/admin/messages/sms-rate', { rate }).then((r) => r.data),
};
