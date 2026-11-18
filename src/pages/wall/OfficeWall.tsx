import { useEffect, useState } from 'react';

/**
 * Office wall (2026-11-18): one dark screen for the office monitor with the server, today's orders and the busiest stores.
 * Opened only on its own private address, behind Cloudflare Access (an emailed one-time code); the data route checks
 * Cloudflare's token too (server/src/office-wall/). It asks the same address (same origin) every 15 seconds.
 */
interface Summary {
  at: string;
  day: string;
  host: {
    cpuPercent: number | null;
    cpuCores: number;
    load: { one: number; five: number; fifteen: number };
    memory: { totalMb: number; usedMb: number; percent: number } | null;
    disk: { totalGb: number; usedGb: number; percent: number } | null;
    uptimeSeconds: number | null;
  };
  database: { ok: boolean; latencyMs: number | null };
  jobs: { total: number; late: number };
  orders: { today: { orders: number; sales: number }; sameTimeYesterday: { orders: number; sales: number } };
  hours: Array<{ hour: number; orders: number; sales: number }>;
  latest: Array<{ id: string; store: string; total: number; source: string; at: string }>;
  topStores: Array<{ store: string; subdomain: string; orders: number; sales: number }>;
  stores: { total: number; active: number; newToday: number };
  alerts: string[];
}

const REFRESH_MS = 15_000;
const taka = (n: number) => `৳${Math.round(n).toLocaleString('en-IN')}`;
const SOURCE: Record<string, string> = { STOREFRONT: 'Online', MANUAL: 'Added', POS: 'POS', RESELLER: 'Resale' };

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function OfficeWall() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const now = useClock();

  useEffect(() => {
    document.title = 'Regantify wall';
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/v1/wall/summary', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) throw new Error(res.status === 401 ? 'Not signed in through Cloudflare. Reload the page.' : `The server answered ${res.status}.`);
        const body = (await res.json()) as Summary;
        if (alive) {
          setData(body);
          setError('');
        }
      } catch (e) {
        if (alive) setError((e as Error).message || 'Could not reach the server.');
      }
    };
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const clock = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', weekday: 'long', day: 'numeric', month: 'long' });
  const stale = data ? now.getTime() - new Date(data.at).getTime() > REFRESH_MS * 4 : false;

  return (
    <div className="min-h-screen bg-[#0b0f14] p-6 text-[#e6edf3]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Regantify</h1>
          <p className="text-sm text-[#8b98a5]">{date}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold tabular-nums">{clock}</p>
          <p className={`text-xs ${error || stale ? 'text-[#ff7b72]' : 'text-[#8b98a5]'}`}>
            {error || (stale ? 'Data is old: the server is not answering' : data ? `Updated ${new Date(data.at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka' })}` : 'Loading…')}
          </p>
        </div>
      </header>

      {data && data.alerts.length > 0 && (
        <div className="mb-5 rounded-xl bg-red-600 px-5 py-3 text-lg font-medium text-white">
          {data.alerts.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </div>
      )}

      {data && (
        <>
          <section className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Gauge label="CPU" percent={data.host.cpuPercent} detail={`${data.host.cpuCores} cores · load ${data.host.load.one}`} />
            <Gauge
              label="Memory"
              percent={data.host.memory?.percent ?? null}
              detail={data.host.memory ? `${(data.host.memory.usedMb / 1024).toFixed(1)} of ${(data.host.memory.totalMb / 1024).toFixed(0)} GB` : 'Not available'}
            />
            <Gauge label="Disk" percent={data.host.disk?.percent ?? null} detail={data.host.disk ? `${data.host.disk.usedGb} of ${data.host.disk.totalGb} GB` : 'Not available'} />
            <Tile
              label="Database"
              value={data.database.ok ? `${data.database.latencyMs ?? '?'} ms` : 'Down'}
              bad={!data.database.ok}
              detail={`${data.jobs.late ? `${data.jobs.late} job(s) late` : `All ${data.jobs.total} jobs on time`} · up ${uptime(data.host.uptimeSeconds)}`}
            />
          </section>

          <section className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile label="Orders today" value={data.orders.today.orders.toLocaleString('en-IN')} big detail={compare(data.orders.today.orders, data.orders.sameTimeYesterday.orders, (n) => String(n))} />
            <Tile label="Sales today" value={taka(data.orders.today.sales)} big detail={compare(data.orders.today.sales, data.orders.sameTimeYesterday.sales, taka)} />
            <Tile label="New stores today" value={String(data.stores.newToday)} big detail={`${data.stores.active.toLocaleString('en-IN')} active of ${data.stores.total.toLocaleString('en-IN')}`} />
            <Tile label="Stores with an order today" value={String(data.topStores.length >= 10 ? '10+' : data.topStores.length)} big detail="Busiest ten listed below" />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Panel title="Orders by hour (Dhaka)">
              <HourBars hours={data.hours} nowHour={Number(now.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', hour12: false }))} />
            </Panel>
            <Panel title="Top stores today">
              {data.topStores.length === 0 ? (
                <p className="text-[#8b98a5]">No orders yet today.</p>
              ) : (
                <ol className="space-y-2">
                  {data.topStores.map((s, i) => (
                    <li key={s.subdomain} className="flex items-baseline justify-between gap-3">
                      <span className="truncate">
                        <span className="mr-2 inline-block w-5 text-right tabular-nums text-[#8b98a5]">{i + 1}</span>
                        {s.store}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {s.orders} <span className="text-[#8b98a5]">· {taka(s.sales)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
            <Panel title="Latest orders">
              {data.latest.length === 0 ? (
                <p className="text-[#8b98a5]">No orders yet today.</p>
              ) : (
                <ul className="space-y-2">
                  {data.latest.map((o) => (
                    <li key={o.id} className="flex items-baseline justify-between gap-3">
                      <span className="truncate">
                        <span className="mr-2 tabular-nums text-[#8b98a5]">{new Date(o.at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' })}</span>
                        {o.store}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {taka(o.total)} <span className="text-xs text-[#8b98a5]">{SOURCE[o.source] ?? o.source}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}

function uptime(s: number | null): string {
  if (s === null) return '?';
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  return d ? `${d}d ${h}h` : `${h}h`;
}

function compare(today: number, yesterday: number, fmt: (n: number) => string): string {
  if (!yesterday) return `Yesterday by now: ${fmt(yesterday)}`;
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}% vs yesterday by now (${fmt(yesterday)})`;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#131a22] p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-[#8b98a5]">{title}</h2>
      <div className="text-base">{children}</div>
    </div>
  );
}

function Tile({ label, value, detail, big, bad }: { label: string; value: string; detail: string; big?: boolean; bad?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${bad ? 'bg-red-600 text-white' : 'bg-[#131a22]'}`}>
      <p className={`text-sm ${bad ? 'text-white' : 'text-[#8b98a5]'}`}>{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${big ? 'text-5xl' : 'text-4xl'}`}>{value}</p>
      <p className={`mt-2 text-sm ${bad ? 'text-white' : 'text-[#8b98a5]'}`}>{detail}</p>
    </div>
  );
}

/** A usage bar: grey track, blue fill, red from 85%. The number is always written, so the colour is never the only signal. */
function Gauge({ label, percent, detail }: { label: string; percent: number | null; detail: string }) {
  const p = percent === null ? null : Math.max(0, Math.min(100, percent));
  const high = p !== null && p >= 85;
  return (
    <div className="rounded-2xl bg-[#131a22] p-5">
      <p className="text-sm text-[#8b98a5]">{label}</p>
      <p className={`mt-1 text-4xl font-semibold tabular-nums ${high ? 'text-[#ff7b72]' : ''}`}>{p === null ? '…' : `${p}%`}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#26303b]" role="img" aria-label={`${label} ${p ?? 0}%`}>
        <div className={`h-full rounded-full ${high ? 'bg-[#ff7b72]' : 'bg-[#4c9aff]'}`} style={{ width: `${p ?? 0}%` }} />
      </div>
      <p className="mt-2 text-sm text-[#8b98a5]">{detail}</p>
    </div>
  );
}

/** Orders per Dhaka hour, 0 to 23; the hours still to come stay empty. One series, so no legend; hover shows the numbers. */
function HourBars({ hours, nowHour }: { hours: Summary['hours']; nowHour: number }) {
  const byHour = new Map(hours.map((h) => [h.hour, h]));
  const max = Math.max(1, ...hours.map((h) => h.orders));
  return (
    <div>
      <div className="flex h-48 items-end gap-[2px]">
        {Array.from({ length: 24 }, (_, h) => {
          const row = byHour.get(h);
          const n = row?.orders ?? 0;
          return (
            <div key={h} className="group relative flex h-full flex-1 items-end" title={`${String(h).padStart(2, '0')}:00 · ${n} orders · ${taka(row?.sales ?? 0)}`}>
              <div className={`w-full rounded-t ${h === nowHour ? 'bg-[#79b8ff]' : 'bg-[#4c9aff]'}`} style={{ height: n ? `${Math.max(3, (n / max) * 100)}%` : '0' }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs tabular-nums text-[#8b98a5]">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
      <p className="mt-2 text-sm text-[#8b98a5]">Busiest hour: {max > 1 || hours.length ? `${String(hours.reduce((a, b) => (b.orders > a.orders ? b : a), { hour: 0, orders: 0, sales: 0 }).hour).padStart(2, '0')}:00, ${max} orders` : 'none yet'}</p>
    </div>
  );
}
