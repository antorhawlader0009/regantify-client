import { api } from './api';

// Mirrors server/src/email/ (super-admin-new.md Step 13).

export interface EmailStatus {
  provider: string;
  configured: boolean;
  from: string;
  /** Still on Resend's test sender: only the Resend account owner's own address receives. */
  testSender: boolean;
  replyTo: string | null;
}

export interface EmailLogRow {
  id: string;
  vendorId: string | null;
  storeName: string | null;
  toAddress: string;
  subject: string;
  kind: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  provider: string;
  providerId: string | null;
  error: string | null;
  createdAt: string;
}

export interface EmailLogPage {
  status: EmailStatus;
  last24h: Partial<Record<'SENT' | 'FAILED' | 'SKIPPED', number>>;
  kinds: string[];
  total: number;
  page: number;
  perPage: number;
  items: EmailLogRow[];
}

export const emailApi = {
  log: (params: { status?: string; kind?: string; search?: string; page?: number }) => api.get<EmailLogPage>('/v1/admin/email', { params }).then((r) => r.data),
  test: (to: string) => api.post<{ ok: boolean; error: string | null }>('/v1/admin/email/test', { to }).then((r) => r.data),
};
