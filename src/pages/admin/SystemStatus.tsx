import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, CircleAlert, Clock, Loader2 } from 'lucide-react';
import { systemStatusApi, type JobStatus } from '../../lib/systemStatusApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { SmsBalanceCard } from '../../components/admin/SmsBalanceCard';
import { ErrorLogSection, IntegrationsSection } from '../../components/admin/IntegrationHealth';

const ago = (seconds: number | null) => {
  if (seconds === null) return 'never';
  if (seconds < 90) return `${seconds}s ago`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 172_800) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86_400)} days ago`;
};
const every = (seconds: number) => (seconds < 120 ? 'every minute' : seconds < 7200 ? `every ${Math.round(seconds / 60)} min` : `every ${Math.round(seconds / 3600)} h`);
const uptime = (s: number) => (s < 3600 ? `${Math.round(s / 60)} min` : s < 172_800 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86_400)} days`);

const STATE: Record<JobStatus['state'], { label: string; cls: string }> = {
  OK: { label: 'Running', cls: 'bg-green-50 text-green-700 border-green-200' },
  LATE: { label: 'Stopped?', cls: 'bg-red-50 text-red-700 border-red-200' },
  NEVER: { label: 'Never ran', cls: 'bg-red-50 text-red-700 border-red-200' },
  WAITING: { label: 'Waiting', cls: 'bg-neutral-50 text-neutral-600 border-neutral-200' },
};

function Count({ label, value, hint, bad }: { label: string; value: number; hint: string; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-4">
      <p className={`text-2xl font-semibold tabular-nums ${value > 0 && bad ? 'text-red-700' : 'text-regantify-text'}`}>{value}</p>
      <p className="mt-0.5 text-sm font-medium text-regantify-text">{label}</p>
      <p className="mt-0.5 text-xs text-regantify-text-muted">{hint}</p>
    </div>
  );
}

/**
 * Super Admin > System status (TellMe idea 154): is the database answering, is every important background job still running, and is anything stuck.
 * A job shows "Stopped?" when it has not written its heartbeat for three times its normal gap. Refreshes every 30 seconds.
 */
export default function SystemStatus() {
  const { data, isLoading, error } = useQuery({ queryKey: ['system-status'], queryFn: systemStatusApi.get, refetchInterval: 30_000 });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }
  if (error || !data) return <p className="py-10 text-center text-sm text-red-600">Could not read the system status.</p>;

  const allGood = data.database.ok && data.lateCount === 0;
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <Activity className="mt-1 text-regantify-text-muted" size={20} />
        <div>
          <h1 className="text-lg font-semibold text-regantify-text">System status</h1>
          <p className="text-sm text-regantify-text-muted">Checked {formatDhakaDateTime(data.checkedAt)}. Refreshes by itself.</p>
        </div>
      </div>

      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${allGood ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
        {allGood ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
        <p className="text-sm font-medium">
          {!data.database.ok ? 'The database is not answering.' : data.lateCount > 0 ? `${data.lateCount} background ${data.lateCount === 1 ? 'job looks' : 'jobs look'} stopped.` : 'Everything is running.'}
        </p>
      </div>

      <SmsBalanceCard />

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-black/5 bg-white p-4">
          <p className="text-xs text-regantify-text-muted">Database</p>
          <p className={`text-lg font-semibold ${data.database.ok ? 'text-green-700' : 'text-red-700'}`}>{data.database.ok ? 'Up' : 'Down'}</p>
          <p className="text-xs text-regantify-text-muted">{data.database.latencyMs !== null ? `${data.database.latencyMs} ms to answer` : ''}</p>
        </div>
        <div className="rounded-xl border border-black/5 bg-white p-4">
          <p className="text-xs text-regantify-text-muted">This server has been up</p>
          <p className="text-lg font-semibold text-regantify-text">{uptime(data.server.uptimeSeconds)}</p>
          <p className="text-xs text-regantify-text-muted">Node {data.server.node}</p>
        </div>
        <div className="rounded-xl border border-black/5 bg-white p-4">
          <p className="text-xs text-regantify-text-muted">Memory in use</p>
          <p className="text-lg font-semibold text-regantify-text">{data.server.memoryMb} MB</p>
        </div>
        <div className="rounded-xl border border-black/5 bg-white p-4">
          <p className="text-xs text-regantify-text-muted">Text when a job stops</p>
          <p className={`text-lg font-semibold ${data.alertPhoneSet ? 'text-green-700' : 'text-amber-700'}`}>{data.alertPhoneSet ? 'On' : 'Off'}</p>
          <p className="text-xs text-regantify-text-muted">{data.alertPhoneSet ? 'to ADMIN_ALERT_PHONE' : 'set ADMIN_ALERT_PHONE in server/.env'}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-regantify-text">Last 24 hours</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <Count label="Webhooks failed" value={data.last24h.failedWebhooks} hint="Sent to a store's own address, all tries used up" bad />
          <Count label="Webhooks retrying" value={data.last24h.webhooksRetrying} hint="Failed once or more, still being tried" />
          <Count label="Courier bookings failed" value={data.last24h.courierBookingsFailed} hint="Orders where the courier refused the booking" bad />
          <Count label="Paid but not applied" value={data.last24h.paymentsPaidButNotApplied} hint="Money arrived, the order or credit was not updated. Check these first." bad />
        </div>
      </section>

      <IntegrationsSection />

      <ErrorLogSection />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-regantify-text">Background jobs</h2>
        <div className="overflow-x-auto rounded-xl border border-black/5 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-regantify-text-muted">
                <th className="px-4 py-2 font-normal">Job</th>
                <th className="px-4 py-2 font-normal">Should run</th>
                <th className="px-4 py-2 font-normal">Last ran</th>
                <th className="px-4 py-2 font-normal">Took</th>
                <th className="px-4 py-2 font-normal">State</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map((j) => {
                const s = STATE[j.state];
                return (
                  <tr key={j.name} className="border-b border-black/5 last:border-0 align-top">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-regantify-text">{j.label}</p>
                      <p className="text-xs text-regantify-text-muted">{j.name}</p>
                      {j.lastError && (
                        <p className="mt-1 text-xs text-red-700">
                          Last error{j.lastErrorAt ? ` (${formatDhakaDateTime(j.lastErrorAt)})` : ''}: {j.lastError}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-regantify-text-muted">
                      <Clock size={12} className="mr-1 inline" />
                      {every(j.everySeconds)}
                    </td>
                    <td className="px-4 py-2.5 text-regantify-text-muted">{ago(j.agoSeconds)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-regantify-text-muted">{j.lastDurationMs !== null ? `${j.lastDurationMs} ms` : '-'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-regantify-text-muted">
          Local development and the live server share one database, so a job that runs on either one shows here. A job that ran with an error still counts as running; the error is
          shown under it.
        </p>
      </section>
    </div>
  );
}
