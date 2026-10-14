import { api } from './api';

// Mirrors server/src/lifecycle/lifecycle.controller.ts (super-admin-new.md Step 4).

export const LIFECYCLE_TRIGGERS = ['NO_PRODUCT', 'NO_ORDER', 'FIRST_ORDER', 'INACTIVE'] as const;
export type LifecycleTrigger = (typeof LIFECYCLE_TRIGGERS)[number];
export const TRIGGER_LABEL: Record<LifecycleTrigger, { label: string; when: (d: number) => string; converted: string | null }> = {
  NO_PRODUCT: { label: 'No product yet', when: (d) => `${d} day${d === 1 ? '' : 's'} after sign-up, still no product`, converted: 'added a product' },
  NO_ORDER: { label: 'Products but no order', when: (d) => `${d} day${d === 1 ? '' : 's'} after the first product, still no order`, converted: 'got an order' },
  FIRST_ORDER: { label: 'First order', when: (d) => (d === 0 ? 'Right after the first order' : `${d} day${d === 1 ? '' : 's'} after the first order`), converted: null },
  INACTIVE: { label: 'Not signed in', when: (d) => `No sign-in for ${d} day${d === 1 ? '' : 's'}`, converted: 'signed in again' },
};

export interface LifecycleRule {
  id: string;
  name: string;
  trigger: LifecycleTrigger;
  delayDays: number;
  title: string;
  body: string;
  smsText: string | null;
  /** Also emailed to the owner (super-admin-new.md Step 13). */
  sendEmail: boolean;
  link: string | null;
  enabled: boolean;
  enabledAt: string | null;
  createdByName: string;
  updatedByName: string | null;
  updatedAt: string;
  sent?: number;
  sent30d?: number;
  smsSent?: number;
  /** Did the thing within 7 days of the message; null for First order. */
  converted?: number | null;
}

export type RuleInput = Pick<LifecycleRule, 'name' | 'trigger' | 'delayDays' | 'title' | 'body'> & { smsText?: string; sendEmail?: boolean; link?: string };

export const lifecycleApi = {
  list: () => api.get<{ paused: boolean; rules: LifecycleRule[] }>('/v1/admin/lifecycle').then((r) => r.data),
  preview: (id: string) =>
    api.get<{ matchingNow: number; dueNext: number; sample: { title: string; body: string; sms: string | null; storeName: string } }>(`/v1/admin/lifecycle/${id}/preview`).then((r) => r.data),
  runs: (id: string) => api.get<Array<{ id: string; sentAt: string; smsSent: boolean; vendorId: string; storeName: string }>>(`/v1/admin/lifecycle/${id}/runs`).then((r) => r.data),
  create: (body: RuleInput) => api.post<LifecycleRule>('/v1/admin/lifecycle', body).then((r) => r.data),
  update: (id: string, body: Partial<RuleInput> & { enabled?: boolean }) => api.patch<LifecycleRule>(`/v1/admin/lifecycle/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/v1/admin/lifecycle/${id}`).then((r) => r.data),
};
