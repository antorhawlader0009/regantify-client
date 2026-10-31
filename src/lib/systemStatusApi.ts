import { api } from './api';

// Super Admin > System status (TellMe idea 154) - mirrors the server's SystemHealthService.status().

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
  server: {
    uptimeSeconds: number;
    version: string;
    node: string;
    memoryMb: number;
    // PERFORMANCE-PLAN.md Step 18 (missing on an older server).
    heapUsedMb?: number;
    heapTotalMb?: number;
    eventLoop?: { lastMinute: { at: number; p50Ms: number; p99Ms: number; maxMs: number } | null; worstP99LastHourMs: number | null };
  };
  database: { ok: boolean; latencyMs: number | null };
  /** Push in the Regantify app (STORE-APP-plan.md Step 5), for the server process that answered. Missing on an older server. */
  push?: {
    enabled: boolean;
    thisMinute: { sent: number; failed: number; throttled: number; dead: number };
    last10Minutes: { sent: number; failed: number; throttled: number; dead: number };
    queued: { high: number; promo: number };
    pausedNow: boolean;
  };
  jobs: JobStatus[];
  lateCount: number;
  last24h: { failedWebhooks: number; webhooksRetrying: number; courierBookingsFailed: number; paymentsPaidButNotApplied: number };
  alertPhoneSet: boolean;
}

export const systemStatusApi = {
  get: () => api.get<SystemStatus>('/v1/admin/system-status').then((r) => r.data),
};

// Integrations and the error log (super-admin-new.md Step 2) - mirrors server/src/system-health/integration-health.service.ts.

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

// Speed (PERFORMANCE-PLAN.md Step 1) - mirrors server/src/perf/perf-context.ts and system-health/web-vitals.service.ts.

export interface RouteTiming {
  route: string;
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  slow: number;
  /** Only counted while the server runs with PERF_LOG=true. */
  avgQueries: number | null;
  avgQueryMs: number | null;
}
export interface ApiTimings {
  since: string;
  perfLog: boolean;
  slowMs: number;
  pid: number;
  routes: RouteTiming[];
}
export interface VitalSummary {
  metric: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';
  device: 'MOBILE' | 'DESKTOP';
  samples: number;
  /** ms, or the CLS score. */
  average: number;
  goodPercent: number;
  poorPercent: number;
  /** At least 75% of samples were good (Google's p75 rule). */
  pass: boolean;
}
export interface WebVitalsView {
  days: number;
  platform: VitalSummary[];
  slowStores: Array<{ vendorId: string; storeName: string | null; subdomain: string | null; samples: number; goodPercent: number; averageMs: number }>;
}

export const perfApi = {
  timings: () => api.get<ApiTimings>('/v1/admin/system-status/perf').then((r) => r.data),
  webVitals: (days: number) => api.get<WebVitalsView>('/v1/admin/system-status/web-vitals', { params: { days } }).then((r) => r.data),
};

export const integrationHealthApi = {
  integrations: () => api.get<IntegrationsView>('/v1/admin/system-status/integrations').then((r) => r.data),
  errors: (show: 'open' | 'resolved') => api.get<AppErrorRow[]>('/v1/admin/system-status/errors', { params: { show } }).then((r) => r.data),
  resolve: (id: string) => api.post(`/v1/admin/system-status/errors/${id}/resolve`).then((r) => r.data),
};
