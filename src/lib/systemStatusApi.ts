import { api } from './api';

// Super Admin > System status (TellMe idea 154) — mirrors the server's SystemHealthService.status().

export interface JobStatus {
  name: string;
  label: string;
  everySeconds: number;
  lastRunAt: string | null;
  lastOkAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
  lastErrorAt: string | null;
  runs: number;
  agoSeconds: number | null;
  /** OK | LATE | NEVER (never seen although the server has been up long enough) | WAITING (the server is new, give it time). */
  state: 'OK' | 'LATE' | 'NEVER' | 'WAITING';
}

export interface SystemStatus {
  checkedAt: string;
  server: { uptimeSeconds: number; version: string; node: string; memoryMb: number };
  database: { ok: boolean; latencyMs: number | null };
  jobs: JobStatus[];
  lateCount: number;
  last24h: { failedWebhooks: number; webhooksRetrying: number; courierBookingsFailed: number; paymentsPaidButNotApplied: number };
  alertPhoneSet: boolean;
}

export const systemStatusApi = {
  get: () => api.get<SystemStatus>('/v1/admin/system-status').then((r) => r.data),
};

// Integrations and the error log (super-admin-new.md Step 2) — mirrors server/src/system-health/integration-health.service.ts.

export type IntegrationState = 'ok' | 'shaky' | 'down' | 'idle';
export interface IntegrationCard {
  key: string;
  label: string;
  /** Judged on the last two hours. */
  status: IntegrationState;
  ok: number;
  failed: number;
  failedShare: number | null;
  lastError: string | null;
  lastErrorAt: string | null;
  /** 24 hourly buckets, oldest first. */
  hours: Array<{ hour: string; ok: number; failed: number }>;
}
export interface IntegrationsView {
  cards: IntegrationCard[];
  failingWebhookStores: Array<{ vendorId: string; storeName: string; failed: number }>;
}
export interface AppErrorRow {
  id: string;
  name: string;
  message: string;
  stack: string | null;
  where: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastMethod: string | null;
  lastPath: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export const integrationHealthApi = {
  integrations: () => api.get<IntegrationsView>('/v1/admin/system-status/integrations').then((r) => r.data),
  errors: (show: 'open' | 'resolved') => api.get<AppErrorRow[]>('/v1/admin/system-status/errors', { params: { show } }).then((r) => r.data),
  resolve: (id: string) => api.post(`/v1/admin/system-status/errors/${id}/resolve`).then((r) => r.data),
};
