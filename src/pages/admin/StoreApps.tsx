import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { Badge } from '../../components/admin/ui/Primitives';

interface Row {
  id: string;
  vendorId: string;
  store: string;
  kind: string;
  status: string;
  rebuild: boolean;
  versionName: string;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  log: string | null;
}
interface Overview {
  builder: { state: string; load1: number | null; load5: number | null; freeGb: number | null; streak: number; seenAt: string } | null;
  queue: Row[];
  recent: Row[];
  avgBuildSeconds: number | null;
  failedInARow: number;
  apps: number;
  devices: { sharedApp: number; ownApps: number };
  push: { enabled: boolean; projectId: string | null };
  settings: Record<string, number | string | null | undefined>;
}

const field = 'w-28 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm';
const SETTINGS: Array<{ key: string; label: string; hint: string; step?: number }> = [
  { key: 'load1Max', label: 'Busiest 1-minute load', hint: 'A build starts only below this', step: 0.1 },
  { key: 'load5Max', label: 'Busiest 5-minute load', hint: 'And below this', step: 0.1 },
  { key: 'freeGbMin', label: 'Free memory (GB)', hint: 'At least this much must be free' },
  { key: 'checksNeeded', label: 'Quiet checks in a row', hint: 'Once a minute' },
  { key: 'nightStartHour', label: 'Night window starts (Dhaka hour)', hint: 'Rebuilds of every app run only here' },
  { key: 'nightEndHour', label: 'Night window ends (Dhaka hour)', hint: 'Exclusive' },
  { key: 'waitHoursBeforeNight', label: 'Longest wait (hours)', hint: 'After this a job may run at night on memory alone' },
  { key: 'storeAppBuildsPerMonth', label: 'Builds per store per month', hint: 'A failed build does not count' },
  { key: 'appPromoPerDay', label: 'Offer notifications per day', hint: 'Per shopper in the app' },
];

const tone = (s: string): 'green' | 'red' | 'blue' | 'neutral' => (s === 'DONE' ? 'green' : s === 'FAILED' ? 'red' : s === 'BUILDING' ? 'blue' : 'neutral');
const mins = (s: number | null) => (s == null ? 'no data yet' : s < 90 ? `${s} s` : `${Math.round(s / 60)} min`);

function Table({ rows, onCancel }: { rows: Row[]; onCancel?: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return <p className="py-3 text-sm text-regantify-text-muted">Nothing here.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-xs text-regantify-text-muted">
          <th className="py-2 pr-3 font-medium">Store</th>
          <th className="py-2 pr-3 font-medium">What</th>
          <th className="py-2 pr-3 font-medium">Status</th>
          <th className="py-2 pr-3 font-medium">Asked</th>
          <th className="py-2 font-medium" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-line align-top">
            <td className="py-2 pr-3">{r.store}</td>
            <td className="py-2 pr-3">
              {r.kind === 'KEY_CHECK' ? 'Key check' : `Version ${r.versionName}`}
              {r.rebuild && <span className="ml-1 text-xs text-regantify-text-muted">(rebuild)</span>}
            </td>
            <td className="py-2 pr-3">
              <Badge tone={tone(r.status)}>{r.status.toLowerCase().replace(/_/g, ' ')}</Badge>
              {r.error && <p className="mt-1 max-w-xs text-xs text-red-700">{r.error}</p>}
              {r.log && (
                <>
                  <button type="button" className="mt-1 block text-xs underline" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    {open === r.id ? 'Hide log' : 'Show log'}
                  </button>
                  {open === r.id && <pre className="mt-1 max-h-56 max-w-md overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 text-[11px]">{r.log}</pre>}
                </>
              )}
            </td>
            <td className="py-2 pr-3 whitespace-nowrap">{formatDhakaDateTime(r.queuedAt)}</td>
            <td className="py-2 text-right">
              {onCancel && (r.status === 'QUEUED' || r.status === 'WAITING_FOR_QUIET') && (
                <button type="button" className="text-xs underline" onClick={() => onCancel(r.id)}>
                  Cancel
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Super Admin > Stores > Apps (STORE-APP-plan.md Step 17): the queue and the builds of every store's own app, failed builds with their logs, the builder's
 * state, the quiet-rule settings, the shared app's phones and push, and "Rebuild every app" (night only, not counted toward a store's builds).
 */
export default function AdminStoreApps() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-store-apps'], queryFn: () => api.get<Overview>('/v1/admin/store-apps').then((r) => r.data), refetchInterval: 15000 });
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data) return;
    setForm(Object.fromEntries(SETTINGS.map((s) => [s.key, data.settings[s.key] == null ? '' : String(data.settings[s.key])])));
  }, [data]);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-store-apps'] });
  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, number> = {};
      for (const s of SETTINGS) if (form[s.key]?.trim() !== '' && form[s.key] !== undefined) body[s.key] = Number(form[s.key]);
      return api.put('/v1/admin/store-apps/settings', body);
    },
    onSuccess: () => {
      toast.success('Saved. The builder applies it within a minute.');
      void refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save.')),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/v1/admin/store-apps/builds/${id}/cancel`),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not cancel.')),
  });
  const rebuild = useMutation({
    mutationFn: () => api.post<{ queued: number }>('/v1/admin/store-apps/rebuild-all').then((r) => r.data),
    onSuccess: (r) => {
      toast.success(`${r.queued} apps queued. They build at night.`);
      void refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not queue the rebuild.')),
  });

  if (isLoading || !data) return <p className="p-6 text-sm text-regantify-text-muted">Loading...</p>;
  const age = data.builder ? Math.round((Date.now() - new Date(data.builder.seenAt).getTime()) / 60000) : null;
  const down = age == null || age > 10;

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-regantify-text">Store apps</h1>
        <p className="mt-1 text-sm text-regantify-text-muted">The own apps of stores, the build queue and the builder. {data.apps} stores have started an app.</p>
      </header>

      {data.failedInARow >= 3 && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">The last {data.failedInARow} builds all failed. Open a failed build below to read its log.</p>}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-regantify-text-muted">Builder</p>
          <p className={`mt-1 text-lg font-semibold ${down ? 'text-red-700' : ''}`}>{down ? 'Not heard from' : data.builder!.state.toLowerCase()}</p>
          <p className="text-xs text-regantify-text-muted">{age == null ? 'never' : `${age} min ago`}{data.builder?.load1 != null ? `, load ${data.builder.load1.toFixed(1)}` : ''}{data.builder?.freeGb != null ? `, ${data.builder.freeGb.toFixed(1)} GB free` : ''}</p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-regantify-text-muted">Average build</p>
          <p className="mt-1 text-lg font-semibold">{mins(data.avgBuildSeconds)}</p>
          <p className="text-xs text-regantify-text-muted">last 20 good builds</p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-regantify-text-muted">Phones</p>
          <p className="mt-1 text-lg font-semibold">{data.devices.sharedApp} shared app</p>
          <p className="text-xs text-regantify-text-muted">{data.devices.ownApps} in own apps</p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-regantify-text-muted">Shared app push</p>
          <p className={`mt-1 text-lg font-semibold ${data.push.enabled ? '' : 'text-red-700'}`}>{data.push.enabled ? 'On' : 'Off'}</p>
          <p className="text-xs text-regantify-text-muted">{data.push.projectId ?? 'no Firebase key on the server'}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5">
        <h2 className="mb-2 text-[17px] font-semibold">Waiting and running</h2>
        <Table rows={data.queue} onCancel={(id) => cancel.mutate(id)} />
      </section>

      <section className="rounded-2xl bg-white p-5">
        <h2 className="mb-2 text-[17px] font-semibold">Recent builds</h2>
        <Table rows={data.recent} />
      </section>

      <section className="rounded-2xl bg-white p-5">
        <h2 className="mb-1 text-[17px] font-semibold">Builder settings</h2>
        <p className="mb-3 text-sm text-regantify-text-muted">A build starts only when the server is quiet. Leave a box empty to keep the built-in value. Turn the whole feature off in Settings, Switches.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SETTINGS.map((s) => (
            <label key={s.key} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {s.label}
                <span className="block text-xs text-regantify-text-muted">{s.hint}</span>
              </span>
              <input className={field} type="number" step={s.step ?? 1} value={form[s.key] ?? ''} onChange={(e) => setForm({ ...form, [s.key]: e.target.value })} />
            </label>
          ))}
        </div>
        <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          {save.isPending ? 'Saving...' : 'Save settings'}
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5">
        <h2 className="mb-1 text-[17px] font-semibold">Rebuild every app</h2>
        <p className="mb-3 text-sm text-regantify-text-muted">
          After a template fix, or a new Android target level each August. Makes one new build for every store that has a good build, using its own details. They run only in the night window and do not use up the stores&rsquo; builds of the month.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Queue a rebuild of every store app?')) rebuild.mutate();
          }}
          disabled={rebuild.isPending}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium"
        >
          {rebuild.isPending ? 'Queuing...' : 'Rebuild every app'}
        </button>
      </section>
    </div>
  );
}
