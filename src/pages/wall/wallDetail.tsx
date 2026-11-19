import { useEffect, useRef, useState } from 'react';
import { AreaChart, ColumnChart, Fit, SERIES, kTaka } from './wallCharts';

/**
 * The office wall's 30-day dialog (2026-11-19): pressing a panel or a tile opens its section's last 30 days, fetched only
 * then from GET /v1/wall/detail/:section (server: office-wall-detail.service.ts, kept 10 minutes there), so the 5-second
 * refresh never asks the database for it. One shape for every section: numbers, day charts, tables.
 */

type Unit = 'count' | 'taka' | 'pct' | 'ms' | 'gb' | 'usd' | 'text' | 'date';
interface Detail {
  section: string;
  title: string;
  from: string;
  to: string;
  note?: string;
  stats: Array<{ label: string; value: number | string | null; unit?: Unit; hint?: string }>;
  charts: Array<{ title: string; unit: Unit; kind: 'bars' | 'area'; points: Array<{ day: string; value: number }>; compare?: { label: string; points: Array<{ day: string; value: number }> } }>;
  tables: Array<{ title: string; columns: Array<{ label: string; unit?: Unit }>; rows: Array<Array<string | number | null>> }>;
}

/** Which 30-day section each panel and tile opens. */
export const DETAIL_OF: Record<string, string> = {
  // panels
  hours: 'orders',
  trend: 'orders',
  latest: 'orders',
  status: 'orders',
  source: 'orders',
  payment: 'orders',
  zone: 'orders',
  courier: 'orders',
  channels: 'channels',
  topStores: 'stores',
  signups30: 'stores',
  topProducts: 'products',
  plans: 'income',
  income30: 'income',
  todo: 'todo',
  security: 'security',
  bots: 'security',
  cyber: 'cyber',
  traffic: 'cyber',
  sources: 'cyber',
  countries: 'cyber',
  network: 'server',
  server: 'server',
  apps: 'apps',
  visitHours: 'visits',
  devErrors: 'devErrors',
  slowRoutes: 'slowRoutes',
  integrations: 'integrations',
  jobs: 'jobs',
  edge: 'edge',
  // tiles (prefixed so a tile and a panel with the same id can differ)
  'tile:orders': 'orders',
  'tile:sales': 'orders',
  'tile:aov': 'orders',
  'tile:income': 'income',
  'tile:mrr': 'income',
  'tile:visits': 'visits',
  'tile:activeStores': 'stores',
  'tile:newStores': 'stores',
  'tile:shoppers': 'stores',
  'tile:sms': 'usage',
  'tile:ai': 'usage',
  'tile:security': 'security',
  'tile:cyber': 'cyber',
  'tile:apiTraffic': 'cyber',
  'tile:network': 'server',
  'tile:cpu': 'server',
  'tile:memory': 'server',
  'tile:database': 'jobs',
  'tile:todo': 'todo',
};

const isoDay = /^\d{4}-\d{2}-\d{2}$/;
function fmt(v: string | number | null | undefined, unit?: Unit): string {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'string') {
    if (unit === 'date' || isoDay.test(v) || /^\d{4}-\d{2}-\d{2}T/.test(v)) return dateText(v);
    return v;
  }
  switch (unit) {
    case 'taka':
      return kTaka(v);
    case 'pct':
      return `${v}%`;
    case 'ms':
      return `${Math.round(v).toLocaleString('en-IN')} ms`;
    case 'gb':
      return `${v} GB`;
    case 'usd':
      return `$${v.toFixed(2)}`;
    default:
      return v.toLocaleString('en-IN');
  }
}
function dateText(v: string): string {
  if (isoDay.test(v)) return new Date(`${v}T00:00:00+06:00`).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short' });
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
const shortDay = (d: string) => (isoDay.test(d) ? dateText(d) : d);

export function DetailDialog({ section, onClose }: { section: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (section && !d.open) d.showModal();
    if (!section && d.open) d.close();
  }, [section]);

  useEffect(() => {
    if (!section) return;
    let alive = true;
    setData(null);
    setError('');
    (async () => {
      try {
        if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
          const { demoDetail } = await import('./wallDemo');
          const demo = demoDetail(section);
          if (demo) {
            if (alive) setData(demo as Detail);
            return;
          }
        }
        const base = import.meta.env.DEV ? `${location.protocol}//${location.hostname}:4000` : '';
        const res = await fetch(`${base}/v1/wall/detail/${encodeURIComponent(section)}`, { credentials: import.meta.env.DEV ? 'omit' : 'include', cache: 'no-store' });
        if (!res.ok) throw new Error(`The server answered ${res.status}.`);
        const body = (await res.json()) as Detail;
        if (alive) setData(body);
      } catch (e) {
        if (alive) setError((e as Error).message || 'Could not load the last 30 days.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [section]);

  return (
    <dialog
      ref={ref}
      className="wall-dialog wall-detail"
      // The browser sends "close" a moment after the dialog shuts; if another panel was pressed in that moment the dialog is open
      // again, and this late event must not shut the new one.
      onClose={() => !ref.current?.open && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="flex max-h-[calc(100dvh-48px)] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[1.3em] font-semibold">{data?.title ?? 'Last 30 days'}</h2>
            {data && (
              <p className="text-[0.9em] text-[var(--muted)]">
                {dateText(data.from)} to {dateText(data.to)} · numbers refresh every 10 minutes
              </p>
            )}
          </div>
          <button type="button" className="rounded-lg px-2 py-1 text-[var(--ink2)] hover:bg-[var(--track)]" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {error && <p className="rounded-lg bg-[var(--bad)] px-3 py-2 font-medium text-white">{error}</p>}
          {!data && !error && <p className="text-[var(--muted)]">Loading the last 30 days…</p>}
          {data && (
            <>
              {data.note && <p className="rounded-lg bg-[var(--track)] px-3 py-2 text-[0.92em] text-[var(--ink2)]">{data.note}</p>}
              {data.stats.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {data.stats.map((s) => (
                    <div key={s.label} className="rounded-xl border border-[var(--line)] px-3 py-2">
                      <p className="truncate text-[0.85em] text-[var(--ink2)]">{s.label}</p>
                      <p className="text-[1.45em] font-bold tabular-nums">{fmt(s.value, s.unit)}</p>
                      {s.hint && <p className="truncate text-[0.8em] text-[var(--muted)]">{s.hint}</p>}
                    </div>
                  ))}
                </div>
              )}
              {data.charts.length > 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.charts.map((c, i) => (
                    <DetailChartBox key={c.title} chart={c} color={SERIES[[0, 2, 6, 4, 1, 5][i % 6]]} />
                  ))}
                </div>
              )}
              {data.tables.map((t) => (
                <DetailTableBox key={t.title} table={t} />
              ))}
              {!data.stats.length && !data.charts.length && !data.tables.length && !data.note && <p className="text-[var(--muted)]">Nothing to show for these 30 days.</p>}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

function DetailChartBox({ chart, color }: { chart: Detail['charts'][number]; color: string }) {
  const labels = chart.points.map((p) => shortDay(p.day));
  const values = chart.points.map((p) => p.value);
  const tip = (i: number) =>
    `${labels[i]}: ${fmt(values[i], chart.unit)}${chart.compare ? ` · ${chart.compare.label} ${fmt(chart.compare.points[i]?.value ?? 0, chart.unit)}` : ''}`;
  const tickEvery = chart.points.length > 24 ? 7 : chart.points.length > 12 ? 4 : 3;
  return (
    <div className="rounded-xl border border-[var(--line)] p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="font-medium">{chart.title}</p>
        {chart.compare && (
          <span className="flex items-center gap-1.5 text-[0.82em] text-[var(--ink2)]">
            <span className="inline-block h-[2px] w-4" style={{ background: `repeating-linear-gradient(90deg, ${SERIES[1]} 0 5px, transparent 5px 8px)` }} />
            {chart.compare.label}
          </span>
        )}
      </div>
      <div className="h-[170px]">
        <Fit>
          {(w, h) =>
            chart.kind === 'area' ? (
              <AreaChart w={w} h={h} values={values} labels={labels} color={color} tickEvery={tickEvery} tip={tip} />
            ) : (
              <ColumnChart w={w} h={h} values={values} compare={chart.compare?.points.map((p) => p.value)} labels={labels} color={color} compareColor={SERIES[1]} tickEvery={tickEvery} tip={tip} />
            )
          }
        </Fit>
      </div>
    </div>
  );
}

function DetailTableBox({ table }: { table: Detail['tables'][number] }) {
  const [all, setAll] = useState(false);
  const rows = all ? table.rows : table.rows.slice(0, 15);
  return (
    <div>
      <p className="mb-1.5 font-semibold">{table.title}</p>
      {table.rows.length === 0 ? (
        <p className="text-[0.92em] text-[var(--muted)]">Nothing in these 30 days.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full text-[0.92em]">
            <thead>
              <tr className="bg-[var(--track)] text-left text-[var(--ink2)]">
                {table.columns.map((c) => (
                  <th key={c.label} className={`whitespace-nowrap px-3 py-1.5 font-medium ${c.unit && c.unit !== 'text' && c.unit !== 'date' ? 'text-right' : ''}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-[var(--line)]">
                  {r.map((cell, j) => {
                    const unit = table.columns[j]?.unit;
                    const num = unit && unit !== 'text' && unit !== 'date';
                    return (
                      <td key={j} className={`max-w-[28em] truncate px-3 py-1.5 ${num ? 'text-right tabular-nums' : ''} ${j === 0 ? 'font-medium' : ''}`} title={typeof cell === 'string' ? cell : undefined}>
                        {fmt(cell, unit)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {table.rows.length > 15 && (
        <button type="button" className="mt-1 text-[0.88em] font-medium text-[var(--s1)]" onClick={() => setAll((x) => !x)}>
          {all ? 'Show fewer' : `Show all ${table.rows.length}`}
        </button>
      )}
    </div>
  );
}
