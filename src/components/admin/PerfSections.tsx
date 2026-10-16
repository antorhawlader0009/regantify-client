import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { perfApi, type VitalSummary } from '../../lib/systemStatusApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';

// Super Admin > System status: real shoppers' page speed and this server's request timings (PERFORMANCE-PLAN.md Step 1).

const METRIC_LABEL: Record<VitalSummary['metric'], { name: string; hint: string; unit: 'ms' | '' }> = {
  LCP: { name: 'Main picture shows (LCP)', hint: 'Good under 2.5 s', unit: 'ms' },
  INP: { name: 'Reacts to a tap (INP)', hint: 'Good under 200 ms', unit: 'ms' },
  CLS: { name: 'Page jumps (CLS)', hint: 'Good under 0.1', unit: '' },
  FCP: { name: 'First paint (FCP)', hint: 'Good under 1.8 s', unit: 'ms' },
  TTFB: { name: 'Server answers (TTFB)', hint: 'Good under 0.8 s', unit: 'ms' },
};
const ORDER: VitalSummary['metric'][] = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'];

const value = (v: VitalSummary) => (METRIC_LABEL[v.metric].unit === 'ms' ? `${Math.round(v.average)} ms` : v.average.toFixed(3));

/** Core Web Vitals from real store visitors, per metric and device. */
export function WebVitalsSection() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useQuery({ queryKey: ['web-vitals', days], queryFn: () => perfApi.webVitals(days), staleTime: 60_000 });
  const rows = [...(data?.platform ?? [])].sort((a, b) => ORDER.indexOf(a.metric) - ORDER.indexOf(b.metric) || a.device.localeCompare(b.device));

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-regantify-text">Store speed for real visitors</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1 text-xs">
          <option value={1}>Today</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs text-regantify-text-muted">
              <th className="px-4 py-2 font-normal">Measure</th>
              <th className="px-4 py-2 font-normal">Device</th>
              <th className="px-4 py-2 font-normal">Page views</th>
              <th className="px-4 py-2 font-normal">Average</th>
              <th className="px-4 py-2 font-normal">Good</th>
              <th className="px-4 py-2 font-normal">Poor</th>
              <th className="px-4 py-2 font-normal">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={`${v.metric}-${v.device}`} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-regantify-text">{METRIC_LABEL[v.metric].name}</p>
                  <p className="text-xs text-regantify-text-muted">{METRIC_LABEL[v.metric].hint}</p>
                </td>
                <td className="px-4 py-2.5 text-regantify-text-muted">{v.device === 'MOBILE' ? 'Phone' : 'Computer'}</td>
                <td className="px-4 py-2.5 tabular-nums">{v.samples.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums">{value(v)}</td>
                <td className="px-4 py-2.5 tabular-nums">{v.goodPercent}%</td>
                <td className="px-4 py-2.5 tabular-nums">{v.poorPercent}%</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${v.pass ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    {v.pass ? 'Passes' : 'Needs work'}
                  </span>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-xs text-regantify-text-muted">
                  No numbers yet. They arrive as shoppers open store pages.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.slowStores.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
          <p className="border-b border-black/5 px-4 py-2 text-xs text-regantify-text-muted">Stores where phone visitors wait longest for the main picture (30+ page views)</p>
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-regantify-text-muted">
                <th className="px-4 py-2 font-normal">Store</th>
                <th className="px-4 py-2 font-normal">Page views</th>
                <th className="px-4 py-2 font-normal">Good</th>
                <th className="px-4 py-2 font-normal">Average</th>
              </tr>
            </thead>
            <tbody>
              {data.slowStores.map((s) => (
                <tr key={s.vendorId} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-regantify-text">{s.storeName ?? 'Removed store'}</p>
                    {s.subdomain && <p className="console-id text-xs text-regantify-text-muted">{s.subdomain}</p>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{s.samples.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums">{s.goodPercent}%</td>
                  <td className="px-4 py-2.5 tabular-nums">{(s.averageMs / 1000).toFixed(1)} s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-regantify-text-muted">
        &quot;Passes&quot; means at least 75% of page views were good, the rule Google uses. Only counts are kept, never who visited.
      </p>
    </section>
  );
}

/** Request timings of the server process that answered, since it started. */
export function ApiTimingsSection() {
  const { data } = useQuery({ queryKey: ['api-timings'], queryFn: perfApi.timings, refetchInterval: 60_000 });
  if (!data) return null;
  const routes = data.routes.slice(0, 25);

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-regantify-text">Slowest server routes</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs text-regantify-text-muted">
              <th className="px-4 py-2 font-normal">Route</th>
              <th className="px-4 py-2 font-normal">Calls</th>
              <th className="px-4 py-2 font-normal">Typical</th>
              <th className="px-4 py-2 font-normal">Slow 5%</th>
              <th className="px-4 py-2 font-normal">Slowest</th>
              <th className="px-4 py-2 font-normal">Over {data.slowMs} ms</th>
              <th className="px-4 py-2 font-normal">Queries each</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.route} className="border-b border-black/5 last:border-0">
                <td className="console-id px-4 py-2.5 text-xs text-regantify-text">{r.route}</td>
                <td className="px-4 py-2.5 tabular-nums">{r.count.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums">{r.p50Ms} ms</td>
                <td className="px-4 py-2.5 tabular-nums">{r.p95Ms} ms</td>
                <td className="px-4 py-2.5 tabular-nums">{r.maxMs} ms</td>
                <td className="px-4 py-2.5 tabular-nums">{r.slow}</td>
                <td className="px-4 py-2.5 tabular-nums">{r.avgQueries ?? '-'}</td>
              </tr>
            ))}
            {routes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-xs text-regantify-text-muted">
                  Nothing counted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-regantify-text-muted">
        Counted by the server process that answered this page (process {data.pid}) since {formatDhakaDateTime(data.since)}; a restart starts again.
        {data.perfLog ? ' Database queries are being counted (PERF_LOG is on).' : ' Set PERF_LOG=true in the server settings to also count database queries per route.'}
      </p>
    </section>
  );
}
