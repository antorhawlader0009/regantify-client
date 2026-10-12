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
