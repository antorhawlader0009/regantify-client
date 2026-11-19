import { Fragment, type ReactNode } from 'react';
import { AreaChart, BarList, ClockDial, ColumnChart, Donut, Fit, Ring, SERIES, Sparkline, compact, kTaka, type DonutSlice } from './wallCharts';

/** The shape of GET /v1/wall/summary (server/src/office-wall/office-wall.service.ts). */
export interface Slice {
  key: string;
  orders: number;
  sales: number;
}
export interface Summary extends InfraParts {
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
  processMemoryMb: number;
  eventLoop: { lastMinute: { p99Ms: number } | null; worstP99LastHourMs: number | null };
  jobs: { total: number; late: number; lateNames: string[] };
  orders: { today: { orders: number; sales: number }; sameTimeYesterday: { orders: number; sales: number } };
  hours: Array<{ hour: number; orders: number; sales: number }>;
  yesterdayHours: Array<{ hour: number; orders: number; sales: number }>;
  latest: Array<{ id: string; store: string; total: number; source: string; payment: string; zone: string; at: string }>;
  alerts: string[];
  /** The typical day hour by hour (server/src/office-wall/rhythm.ts), for the "busy hours" dials. */
  rhythm?: null | {
    builtAt: string;
    sales: { days: number; hours: Array<{ hour: number; orders: number; sales: number }>; weekdays: Array<{ dow: number; orders: number; sales: number }> };
    visitors: { days: number; hours: Array<{ hour: number; perDay: number }> };
    signups: { days: number; hours: Array<{ hour: number; n: number }> };
    server: { days: number; cpu: Array<{ hour: number; avg: number | null; peak: number | null; days: number }>; requests: Array<{ hour: number; perDay: number | null; days: number }> };
  };
  slowAt: string;
  income: { today: number; sameTimeYesterday: number; parts: { plans: number; sms: number; ai: number; fees: number }; walletTopups: number; last30: Array<{ day: string; amount: number }> };
  signups30: Array<{ day: string; n: number }>;
  mrr: number;
  plans: Array<{ code: string; name: string; stores: number }>;
  payingStores: number;
  stores: { total: number; active: number; newToday: number; withOrder: number; active7d: number };
  visits: { today: number; stores: number; hours: Array<{ hour: number; n: number }> };
  breakdown: { status: Slice[]; source: Slice[]; payment: Slice[]; zone: Slice[]; courier: Slice[] };
  channels: Slice[];
  trend: Array<{ day: string; orders: number; sales: number }>;
  topStores: Array<{ store: string; subdomain: string; orders: number; sales: number }>;
  topProducts: Array<{ product: string; store: string; quantity: number; sales: number }>;
  security: {
    botsBlocked: Slice[];
    botStores: number;
    signIns24h: number;
    newDevices24h: number;
    adminSignIns24h: number;
    adminNewDevices24h: number;
    adminLocked: number;
    adminFailedTries: number;
    loginAsStore24h: number;
    loginAsStoreEdit24h: number;
    riskyHigh: number;
    riskyMedium: number;
    vpnOrders: number;
    abroadOrders: number;
    blockedPhonesTried: number;
    storeReportsOpen: number;
    productFlagsOpen: number;
    productFlagsNew24h: number;
  };
  usage: { smsParts: number; smsTexts: number; aiCredits: number; aiCalls: number; aiCostUsd: number; newShoppers: number };
  todo: {
    planRequests: number;
    withdrawPending: { count: number; amount: number };
    withdrawToPay: { count: number; amount: number };
    kycSubmitted: number;
    supportWaiting: number;
    supportOpen: number;
    paidNotApplied: number;
    failedWebhooks: number;
    appErrors: number;
    smsBalance: { balance: number | null; level: string };
  };
}

export interface TrafficMinute {
  minute: number;
  n: number;
  s4: number;
  s5: number;
  r429: number;
  deny: number;
  probe: number;
  authFail: number;
  slow: number;
  avgMs: number;
}
export interface InfraParts {
  network: { scope: 'VPS' | 'API'; inBps: number | null; outBps: number | null; inTotalGb: number; outTotalGb: number } | null;
  traffic: {
    shared: boolean;
    series: TrafficMinute[];
    visitors5: number;
    visitors60: number;
    /** Busiest sources of the last `sourceWindowMin` minutes: a day-salted hash code, never an address. */
    topSources: Array<{ code: string; ip: string; country: string; network: string; company: string; requests: number; errors: number; share: number }>;
    sourceWindowMin: number;
    countries: Array<{ country: string; requests: number }>;
  };
  apps: { probes: Array<{ name: string; up: boolean; ms: number | null }>; caddy: Array<{ group: string; rps: number | null; errorPct: number | null; p95Ms: number | null }> | null };
  edge: {
    configured: boolean;
    error: string | null;
    lastHour: Array<{ at: string; requests: number; threats: number; cached: number; bytes: number }>;
    hourTotals: { requests: number; threats: number; cachedPct: number; bytes: number; visitors: number; s4: number; s5: number };
    threatCountries: Array<{ country: string; threats: number }>;
    topCountries: Array<{ country: string; requests: number; threats: number }>;
    blockedNetworks: Array<{ company: string; country: string; count: number }>;
    blockedIps: Array<{ ip: string; country: string; company: string; count: number }>;
    blocks24h: Array<{ action: string; source: string; count: number }>;
  };
  dev: {
    version: string;
    node: string;
    uptimeSeconds: number;
    heapMb: number;
    errors: Array<{ name: string; message: string | null; where: string | null; path: string | null; count: number; lastSeenAt: string }>;
    slowRoutes: Array<{ route: string; count: number; p50Ms: number; p95Ms: number; maxMs: number }>;
    perfSince: string;
    integrations: Array<{ key: string; label: string; status: string; ok: number; failed: number; failedShare: number | null; lastError: string | null; lastErrorAt: string | null }>;
    jobs: { total: number; ok: number; problems: Array<{ label: string; state: string; agoSeconds: number | null; lastError: string | null }> };
  };
  cyber: {
    level: 'NORMAL' | 'WATCH' | 'ATTACK';
    reasons: string[];
    rpm: number;
    baseRpm: number;
    ratio: number;
    errPct: number;
    limited5: number;
    authFail5: number;
    probes5: number;
    deny5: number;
  };
}

/** What the screen keeps between polls (the server only knows "now"). */
export interface WallHistory {
  cpu: number[];
  memory: number[];
  /** Network in / out in bits per second, one point per refresh. */
  netIn: number[];
  netOut: number[];
}

/** Bits per second, short: 820 kbps, 12.4 Mbps, 1.2 Gbps (input is bytes per second). */
export function bps(bytesPerSec: number | null): string {
  if (bytesPerSec === null) return '…';
  const b = bytesPerSec * 8;
  if (b >= 1e9) return `${+(b / 1e9).toFixed(2)} Gbps`;
  if (b >= 1e6) return `${+(b / 1e6).toFixed(b >= 1e8 ? 0 : 1)} Mbps`;
  return `${Math.round(b / 1e3)} kbps`;
}
const bytes = (n: number) => (n >= 1e9 ? `${+(n / 1e9).toFixed(2)} GB` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} kB`);

export const taka = kTaka;
const num = (n: number) => n.toLocaleString('en-IN');
const hh = (h: number) => String(h).padStart(2, '0');
const shortDay = (d: string) => new Date(`${d}T00:00:00+06:00`).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short' });

// ---- Fixed colours per thing (a colour follows the thing, never its rank) ----

/** Label and categorical slot for each key; anything unknown folds into "Other" (grey). */
type Legend = Record<string, [label: string, slot: number]>;
const SOURCE: Legend = { STOREFRONT: ['Online store', 0], MANUAL: ['Added', 1], POS: ['POS', 2], RESELLER: ['Resale', 6] };
const PAYMENT: Legend = { COD: ['Cash on delivery', 1], ONLINE: ['Online', 0], GATEWAY: ['Own gateway', 6], MOBILE: ['bKash (manual)', 4], POS: ['POS', 2], OTHER: ['Other', -1] };
const ZONE: Legend = { DHAKA: ['Inside Dhaka', 0], AROUND_DHAKA: ['Around Dhaka', 2], OUTSIDE_DHAKA: ['Outside Dhaka', 1], PICKUP: ['Shop pickup', 6] };
const COURIER: Legend = { STEADFAST: ['SteadFast', 2], PATHAO: ['Pathao', 7], REDX: ['RedX', 1], CARRYBEE: ['CarryBee', 3] };
const CHANNEL: Legend = {
  facebook: ['Facebook', 0],
  instagram: ['Instagram', 4],
  google: ['Google', 5],
  tiktok: ['TikTok', 6],
  youtube: ['YouTube', 7],
  whatsapp: ['WhatsApp', 2],
  direct: ['Direct', 1],
  shop: ['Regantify Shop', 3],
  app: ['Regantify app', 3],
  qr: ['QR code', 3],
  untracked: ['Not tracked', -1],
};
const BOT_REASON: Legend = { TOO_FAST: ['Filled too fast', 1], PHONE_LIMIT: ['Same phone again', 3], IP_LIMIT: ['Same network flood', 7], HONEYPOT: ['Hidden trap box', 6] };
const STATUS_GROUP: Record<string, string> = {
  PENDING: 'PENDING',
  ON_HOLD: 'ON_HOLD',
  PROCESSING: 'PROCESSING',
  STOCK_OUT: 'ON_HOLD',
  SHIPPING: 'SHIPPING',
  READY_FOR_PICKUP: 'SHIPPING',
  COMPLETED: 'COMPLETED',
  PAYMENT_INITIATED: 'UNPAID',
  PARTIAL_PAYMENT_PENDING: 'UNPAID',
  PAYMENT_FAILED: 'CLOSED',
  CANCELLED: 'CLOSED',
  RETURN: 'CLOSED',
  REFUNDED: 'CLOSED',
};
const STATUS: Legend = {
  PENDING: ['Pending', 3],
  ON_HOLD: ['On hold', 1],
  PROCESSING: ['Processing', 0],
  SHIPPING: ['Shipping', 6],
  COMPLETED: ['Delivered', 5],
  UNPAID: ['Unpaid', 4],
  CLOSED: ['Cancelled', 7],
};

function slicesOf(rows: Slice[], legend: Legend, by: 'orders' | 'sales' = 'orders', maxSlices = 6, group?: Record<string, string>): DonutSlice[] {
  const merged = new Map<string, number>();
  for (const r of rows) {
    const k = group ? (group[r.key] ?? 'OTHER') : r.key;
    merged.set(k, (merged.get(k) ?? 0) + r[by]);
  }
  const list = [...merged.entries()].map(([k, v]) => {
    const def = legend[k];
    return { key: k, label: def?.[0] ?? (k.charAt(0).toUpperCase() + k.slice(1).toLowerCase()).replace(/_/g, ' '), value: v, slot: def ? def[1] : -1 };
  });
  list.sort((a, b) => b.value - a.value);
  const keep = list.filter((x) => x.slot >= 0).slice(0, maxSlices);
  const rest = list.filter((x) => !keep.includes(x)).reduce((s, x) => s + x.value, 0);
  const out: DonutSlice[] = keep.map((x) => ({ label: x.label, value: x.value, color: SERIES[x.slot] }));
  if (rest > 0) out.push({ label: list.length - keep.length === 1 ? list.find((x) => !keep.includes(x))!.label : 'Other', value: rest, color: 'var(--other)' });
  return out;
}

function deltaOf(now: number, before: number): { text: string; up: boolean } | null {
  if (!before) return now ? { text: 'new today', up: true } : null;
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0 };
}

// ---- Number tiles --------------------------------------------------------------

export interface TileView {
  value: string;
  detail: string;
  delta?: { text: string; up: boolean } | null;
  spark?: number[];
  color: string;
  bad?: boolean;
}

export interface TileDef {
  id: string;
  label: string;
  /** Panels that already show this number: while one of them is on, the tile is not drawn (nothing on the wall twice). */
  twins?: string[];
  /** Panels whose chart is this tile's sparkline: while one is on, the tile shows its number without the line. */
  sparkTwins?: string[];
  render: (d: Summary, hist: WallHistory) => TileView;
}

export const TILES: TileDef[] = [
  {
    id: 'orders',
    sparkTwins: ['trend'],
    label: 'Orders today',
    render: (d) => ({
      value: num(d.orders.today.orders),
      delta: deltaOf(d.orders.today.orders, d.orders.sameTimeYesterday.orders),
      detail: `Yesterday by now ${num(d.orders.sameTimeYesterday.orders)}`,
      spark: d.trend.map((t) => t.orders),
      color: SERIES[0],
    }),
  },
  {
    id: 'sales',
    sparkTwins: ['trend'],
    label: 'Sales today',
    render: (d) => ({
      value: taka(d.orders.today.sales),
      delta: deltaOf(d.orders.today.sales, d.orders.sameTimeYesterday.sales),
      detail: `Yesterday by now ${taka(d.orders.sameTimeYesterday.sales)}`,
      spark: d.trend.map((t) => t.sales),
      color: SERIES[2],
    }),
  },
  {
    id: 'income',
    sparkTwins: ['income30'],
    label: 'Platform income today',
    render: (d) => ({
      value: taka(d.income.today),
      delta: deltaOf(d.income.today, d.income.sameTimeYesterday),
      detail: `Plans ${taka(d.income.parts.plans)} · SMS ${taka(d.income.parts.sms)} · AI ${taka(d.income.parts.ai)} · Fees ${taka(d.income.parts.fees)}`,
      spark: d.income.last30.map((x) => x.amount),
      color: SERIES[6],
    }),
  },
  {
    id: 'aov',
    sparkTwins: ['trend'],
    label: 'Average order',
    render: (d) => {
      const a = d.orders.today.orders ? d.orders.today.sales / d.orders.today.orders : 0;
      const y = d.orders.sameTimeYesterday.orders ? d.orders.sameTimeYesterday.sales / d.orders.sameTimeYesterday.orders : 0;
      return { value: taka(a), delta: deltaOf(a, y), detail: `Yesterday by now ${taka(y)}`, spark: d.trend.map((t) => (t.orders ? t.sales / t.orders : 0)), color: SERIES[3] };
    },
  },
  {
    id: 'visits',
    sparkTwins: ['visitHours'],
    label: 'Store visitors today',
    render: (d) => ({
      value: num(d.visits.today),
      detail: `${d.visits.today ? ((d.orders.today.orders / d.visits.today) * 100).toFixed(1) : '0'}% ordered · ${num(d.visits.stores)} stores visited`,
      spark: Array.from({ length: 24 }, (_, h) => d.visits.hours.find((x) => x.hour === h)?.n ?? 0),
      color: SERIES[4],
    }),
  },
  {
    id: 'activeStores',
    label: 'Stores with an order',
    render: (d) => ({ value: num(d.stores.withOrder), detail: `${num(d.stores.active7d)} active this week · ${num(d.stores.total)} stores`, color: SERIES[1] }),
  },
  {
    id: 'newStores',
    sparkTwins: ['signups30'],
    label: 'New stores today',
    render: (d) => ({ value: num(d.stores.newToday), detail: `${num(d.signups30.reduce((s, x) => s + x.n, 0))} in 30 days`, spark: d.signups30.map((x) => x.n), color: SERIES[5] }),
  },
  {
    id: 'mrr',
    label: 'Monthly plan income (MRR)',
    render: (d) => ({ value: taka(d.mrr), detail: `${num(d.payingStores)} paying stores of ${num(d.stores.total)}`, color: SERIES[6] }),
  },
  {
    id: 'shoppers',
    label: 'New shopper accounts',
    render: (d) => ({ value: num(d.usage.newShoppers), detail: 'Signed up today on any store', color: SERIES[4] }),
  },
  {
    id: 'sms',
    label: 'SMS sent today',
    render: (d) => ({
      value: num(d.usage.smsParts),
      detail: `${num(d.usage.smsTexts)} texts · balance ${d.todo.smsBalance.balance === null ? '?' : taka(d.todo.smsBalance.balance)}`,
      bad: d.todo.smsBalance.level === 'CRITICAL',
      color: SERIES[1],
    }),
  },
  {
    id: 'ai',
    label: 'AI credits used today',
    render: (d) => ({ value: num(d.usage.aiCredits), detail: `${num(d.usage.aiCalls)} answers · $${d.usage.aiCostUsd.toFixed(2)} cost`, color: SERIES[6] }),
  },
  {
    id: 'security',
    twins: ['security'],
    label: 'Security events today',
    render: (d) => {
      const s = d.security;
      const bots = s.botsBlocked.reduce((n, b) => n + b.orders, 0);
      return {
        value: num(bots + s.riskyHigh + s.vpnOrders + s.blockedPhonesTried),
        detail: `${num(bots)} fake checkouts · ${s.riskyHigh} risky · ${s.newDevices24h} new devices`,
        bad: s.adminLocked > 0,
        color: SERIES[7],
      };
    },
  },
  {
    id: 'cyber',
    twins: ['cyber'],
    label: 'Cyber status',
    render: (d) => {
      const c = d.cyber;
      return {
        value: c.level === 'ATTACK' ? 'Attack?' : c.level === 'WATCH' ? 'Watch' : 'Normal',
        detail: c.reasons[0] ?? `${num(c.rpm)} API req/min · nothing unusual`,
        bad: c.level === 'ATTACK',
        color: c.level === 'NORMAL' ? 'var(--good)' : 'var(--warn)',
      };
    },
  },
  {
    id: 'network',
    twins: ['network'],
    label: 'Network now',
    render: (d, h) => ({
      value: d.network && d.network.inBps !== null && d.network.outBps !== null ? bps(d.network.inBps + d.network.outBps) : '…',
      detail: d.network ? `↓ ${bps(d.network.inBps)} in · ↑ ${bps(d.network.outBps)} out${d.network.scope === 'API' ? ' · API only' : ''}` : 'Not available',
      spark: h.netIn.map((x, i) => x + (h.netOut[i] ?? 0)),
      color: SERIES[0],
    }),
  },
  {
    id: 'apiTraffic',
    twins: ['traffic','cyber'],
    label: 'API requests / min',
    render: (d) => ({
      value: num(d.cyber.rpm),
      detail: `${d.cyber.baseRpm ? `${d.cyber.ratio}x normal` : 'no baseline yet'} · ${num(d.traffic.visitors5)} visitors in 5 min`,
      spark: d.traffic.series.slice(0, -1).map((m) => m.n),
      bad: d.cyber.errPct >= 10,
      color: SERIES[2],
    }),
  },
  {
    id: 'cpu',
    twins: ['server'],
    label: 'Server CPU',
    render: (d, h) => ({
      value: d.host.cpuPercent === null ? '…' : `${d.host.cpuPercent}%`,
      detail: `${d.host.cpuCores} cores · load ${d.host.load.one}`,
      spark: h.cpu,
      bad: (d.host.cpuPercent ?? 0) >= 90,
      color: SERIES[0],
    }),
  },
  {
    id: 'memory',
    twins: ['server'],
    label: 'Server memory',
    render: (d, h) => ({
      value: d.host.memory ? `${d.host.memory.percent}%` : '…',
      detail: d.host.memory ? `${(d.host.memory.usedMb / 1024).toFixed(1)} of ${(d.host.memory.totalMb / 1024).toFixed(0)} GB` : 'Not available',
      spark: h.memory,
      bad: (d.host.memory?.percent ?? 0) >= 90,
      color: SERIES[6],
    }),
  },
  {
    id: 'database',
    twins: ['server'],
    label: 'Database',
    render: (d) => ({
      value: d.database.ok ? `${d.database.latencyMs ?? '?'} ms` : 'Down',
      detail: d.jobs.late ? `${d.jobs.late} job(s) late` : `All ${d.jobs.total} jobs on time`,
      bad: !d.database.ok || d.jobs.late > 0,
      color: SERIES[2],
    }),
  },
  {
    id: 'todo',
    twins: ['todo'],
    label: 'Waiting for the team',
    render: (d) => {
      const t = d.todo;
      const n = t.planRequests + t.withdrawPending.count + t.withdrawToPay.count + t.kycSubmitted + t.supportOpen;
      return { value: num(n), detail: `${t.supportOpen} tickets · ${t.withdrawPending.count + t.withdrawToPay.count} payouts · ${t.planRequests} plan requests`, bad: t.paidNotApplied > 0, color: SERIES[7] };
    },
  },
];

// ---- Panels --------------------------------------------------------------------

export interface PanelCtx {
  hist: WallHistory;
  nowHour: number;
  /** Ids of the panels on screen, so a panel can leave out what another panel already shows. */
  shown: Set<string>;
}
export interface PanelDef {
  id: string;
  title: string;
  /** Takes two columns when the grid has a spare cell. */
  wide?: boolean;
  subtitle?: (d: Summary) => string;
  render: (d: Summary, ctx: PanelCtx) => ReactNode;
}

function Legend2({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) {
  return (
    <span className="flex items-center gap-3 text-[0.85em] font-normal normal-case tracking-normal text-[var(--ink2)]">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-4 rounded" style={{ background: i.dashed ? `repeating-linear-gradient(90deg, ${i.color} 0 5px, transparent 5px 8px)` : i.color, height: i.dashed ? 2 : 8, width: i.dashed ? 16 : 8, borderRadius: 2 }} />
          {i.label}
        </span>
      ))}
    </span>
  );
}

const donutPanel = (pick: (d: Summary) => DonutSlice[], center: string, format?: (n: number) => string) => (d: Summary) => (
  <Fit>{(w, h) => <Donut slices={pick(d)} w={w} h={h} centerLabel={center} format={format} />}</Fit>
);

export const PANELS: PanelDef[] = [
  {
    id: 'hours',
    title: 'Orders by hour',
    wide: true,
    subtitle: () => '',
    render: (d, ctx) => {
      const today = Array.from({ length: 24 }, (_, h) => d.hours.find((x) => x.hour === h));
      const yest = Array.from({ length: 24 }, (_, h) => d.yesterdayHours.find((x) => x.hour === h));
      return (
        <div className="flex h-full flex-col">
          <div className="mb-1 flex justify-end">
            <Legend2 items={[{ label: 'Today', color: SERIES[0] }, { label: 'Yesterday', color: SERIES[1], dashed: true }]} />
          </div>
          <Fit>
            {(w, h) => (
              <ColumnChart
                w={w}
                h={h}
                values={today.map((x) => x?.orders ?? 0)}
                compare={yest.map((x) => x?.orders ?? 0)}
                labels={Array.from({ length: 24 }, (_, i) => hh(i))}
                highlight={ctx.nowHour}
                tickEvery={3}
                tip={(i) => `${hh(i)}:00 · today ${today[i]?.orders ?? 0} orders (${taka(today[i]?.sales ?? 0)}) · yesterday ${yest[i]?.orders ?? 0}`}
              />
            )}
          </Fit>
        </div>
      );
    },
  },
  {
    id: 'trend',
    title: 'Last 14 days',
    wide: true,
    render: (d) => {
      const labels = d.trend.map((t) => shortDay(t.day));
      return (
        <div className="grid h-full grid-cols-2 gap-4">
          <div className="flex min-h-0 flex-col">
            <p className="mb-1 text-[0.85em] text-[var(--ink2)]">Orders · {num(d.trend.reduce((s, t) => s + t.orders, 0))}</p>
            <Fit>{(w, h) => <ColumnChart w={w} h={h} values={d.trend.map((t) => t.orders)} labels={labels} color={SERIES[0]} highlight={d.trend.length - 1} tickEvery={4} tip={(i) => `${labels[i]}: ${d.trend[i].orders} orders`} />}</Fit>
          </div>
          <div className="flex min-h-0 flex-col">
            <p className="mb-1 text-[0.85em] text-[var(--ink2)]">Sales · {taka(d.trend.reduce((s, t) => s + t.sales, 0))}</p>
            <Fit>{(w, h) => <AreaChart w={w} h={h} values={d.trend.map((t) => t.sales)} labels={labels} color={SERIES[2]} tickEvery={4} tip={(i) => `${labels[i]}: ${taka(d.trend[i].sales)}`} />}</Fit>
          </div>
        </div>
      );
    },
  },
  {
    id: 'status',
    title: "Today's orders by status",
    render: donutPanel((d) => slicesOf(d.breakdown.status, STATUS, 'orders', 7, STATUS_GROUP), 'orders'),
  },
  { id: 'source', title: 'Where orders were made', render: donutPanel((d) => slicesOf(d.breakdown.source, SOURCE), 'orders') },
  { id: 'payment', title: 'How customers pay', render: donutPanel((d) => slicesOf(d.breakdown.payment, PAYMENT), 'orders') },
  { id: 'zone', title: 'Delivery area', render: donutPanel((d) => slicesOf(d.breakdown.zone, ZONE), 'orders') },
  {
    id: 'plans',
    title: 'Stores by plan',
    render: donutPanel(
      (d) => {
        const slot: Record<string, number> = { FREE: -1, BASIC: 0, STARTER: 2, ADVANCE: 6 };
        return d.plans.map((p) => ({ label: p.name, value: p.stores, color: (slot[p.code] ?? 3) >= 0 ? SERIES[slot[p.code] ?? 3] : 'var(--other)' }));
      },
      'stores',
    ),
  },
  {
    id: 'channels',
    title: 'Where customers came from',
    render: (d) => (
      <Fit>
        {(_w, h) => (
          <BarList
            h={h}
            rows={d.channels.map((c) => {
              const def = CHANNEL[c.key];
              return { label: def?.[0] ?? c.key, value: c.orders, right: `${num(c.orders)} · ${taka(c.sales)}`, color: def && def[1] >= 0 ? SERIES[def[1]] : 'var(--other)' };
            })}
          />
        )}
      </Fit>
    ),
  },
  {
    id: 'courier',
    title: 'Courier for today’s orders',
    render: donutPanel((d) => slicesOf(d.breakdown.courier, COURIER), 'parcels'),
  },
  {
    id: 'topStores',
    title: 'Top stores today',
    render: (d) => (
      <Fit>
        {(_w, h) => <BarList h={h} numbered empty="No orders yet today." rows={d.topStores.map((s) => ({ label: s.store, value: s.orders, right: `${s.orders} · ${taka(s.sales)}`, color: SERIES[0] }))} />}
      </Fit>
    ),
  },
  {
    id: 'topProducts',
    title: 'Best selling products today',
    render: (d) => (
      <Fit>
        {(_w, h) => (
          <BarList h={h} numbered empty="No orders yet today." rows={d.topProducts.map((p) => ({ label: p.product, sub: p.store, value: p.quantity, right: `${p.quantity} pcs`, color: SERIES[4] }))} />
        )}
      </Fit>
    ),
  },
  {
    id: 'latest',
    title: 'Latest orders',
    render: (d) => (
      <Fit>
        {(w, h) => {
          const n = Math.max(1, Math.floor(h / 24));
          if (!d.latest.length) return <p className="text-[var(--muted)]">No orders yet today.</p>;
          return (
            <ul>
              {d.latest.slice(0, n).map((o) => {
                const pay = PAYMENT[o.payment];
                return (
                  <li key={o.id} className="flex h-6 items-center gap-2">
                    <span className="w-11 shrink-0 tabular-nums text-[var(--muted)]">{new Date(o.at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: pay && pay[1] >= 0 ? SERIES[pay[1]] : 'var(--other)' }} title={pay?.[0]} />
                    <span className="min-w-0 flex-1 truncate">{o.store}</span>
                    {w >= 300 && <span className="shrink-0 text-[0.82em] text-[var(--muted)]">{SOURCE[o.source]?.[0] ?? o.source}</span>}
                    <span className="shrink-0 text-right tabular-nums font-medium">{taka(o.total)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }}
      </Fit>
    ),
  },
  {
    id: 'server',
    title: 'Server',
    render: (d, ctx) => <ServerPanel d={d} hist={ctx.hist} jobsShown={ctx.shown.has('jobs')} />,
  },
  { id: 'todo', title: 'Waiting for the team', render: (d, ctx) => <TodoPanel d={d} errorsShown={ctx.shown.has('devErrors')} /> },
  { id: 'security', title: 'Security', render: (d, ctx) => <SecurityPanel d={d} botsShown={ctx.shown.has('bots')} /> },
  { id: 'cyber', title: 'Cyber watch (live)', render: (d, ctx) => <CyberPanel d={d} edgeShown={ctx.shown.has('edge')} /> },
  {
    id: 'traffic',
    title: 'API traffic, last hour',
    wide: true,
    render: (d) => {
      const rows = d.traffic.series.slice(0, -1);
      const labels = rows.map((m) => new Date(m.minute * 60_000).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' }));
      return (
        <div className="flex h-full flex-col">
          <div className="mb-1 flex justify-end">
            <Legend2 items={[{ label: 'Requests', color: SERIES[2] }, { label: 'Errors (4xx + 5xx)', color: SERIES[7], dashed: true }]} />
          </div>
          <Fit>
            {(w, h) => (
              <ColumnChart
                w={w}
                h={h}
                values={rows.map((m) => m.n)}
                compare={rows.map((m) => m.s4 + m.s5)}
                labels={labels}
                color={SERIES[2]}
                compareColor={SERIES[7]}
                highlight={rows.length - 1}
                tickEvery={10}
                tip={(i) => `${labels[i]} · ${rows[i].n} requests · ${rows[i].s4} 4xx · ${rows[i].s5} 5xx · ${rows[i].r429} rate-limited · ${rows[i].avgMs} ms avg`}
              />
            )}
          </Fit>
        </div>
      );
    },
  },
  {
    id: 'network',
    title: 'Network traffic',
    render: (d, ctx) => {
      const n = d.network;
      if (!n) return <p className="text-[var(--muted)]">Network numbers are not available on this server.</p>;
      const inS = ctx.hist.netIn;
      const outS = ctx.hist.netOut;
      return (
        <div className="flex h-full flex-col">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-[1.3em] font-bold tabular-nums" style={{ color: SERIES[0] }}>
              ↓ {bps(n.inBps)}
            </span>
            <span className="text-[1.3em] font-bold tabular-nums" style={{ color: SERIES[1] }}>
              ↑ {bps(n.outBps)}
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <Fit>
              {(w, h) => (
                <div className="flex h-full flex-col justify-around">
                  <Sparkline values={inS.length > 1 ? inS : [0, 0]} w={w} h={Math.max(10, h / 2 - 6)} color={SERIES[0]} />
                  <Sparkline values={outS.length > 1 ? outS : [0, 0]} w={w} h={Math.max(10, h / 2 - 6)} color={SERIES[1]} />
                </div>
              )}
            </Fit>
          </div>
          <p className="mt-1 text-[0.82em] text-[var(--muted)]">
            {n.scope === 'VPS' ? 'Whole VPS' : 'API container only'} · since boot ↓{n.inTotalGb} GB ↑{n.outTotalGb} GB
          </p>
        </div>
      );
    },
  },
  { id: 'apps', title: 'Dashboard & storefront load', render: (d) => <AppsPanel d={d} /> },
  { id: 'sources', title: 'Busiest IPs, last 10 min', render: (d) => <SourcesPanel d={d} /> },
  {
    id: 'countries',
    title: 'Traffic by country, last hour',
    render: (d) => {
      // Cloudflare sees every host (stores, dashboard, API); without it, the API's own counts.
      const edge = d.edge.configured && d.edge.topCountries.length > 0;
      const rows = edge ? d.edge.topCountries.map((c) => ({ cc: c.country, n: c.requests, threats: c.threats })) : d.traffic.countries.map((c) => ({ cc: c.country, n: c.requests, threats: 0 }));
      const total = rows.reduce((s, r) => s + r.n, 0);
      return (
        <div className="flex h-full flex-col">
          <Fit>
            {(_w, h) => (
              <BarList
                h={h}
                empty="No traffic counted yet."
                rows={rows.map((r) => ({
                  label: countryName(r.cc),
                  sub: r.threats ? `${num(r.threats)} threats` : undefined,
                  value: r.n,
                  right: `${compact(r.n)} · ${total ? Math.round((r.n / total) * 100) : 0}%`,
                  color: r.cc === 'BD' ? SERIES[2] : r.threats ? SERIES[7] : SERIES[0],
                }))}
              />
            )}
          </Fit>
          <p className="mt-1 text-[0.8em] text-[var(--muted)]">{edge ? 'All sites, from Cloudflare' : 'API requests only (connect Cloudflare for all sites)'}</p>
        </div>
      );
    },
  },
  { id: 'devErrors', title: 'Server errors to fix (24 h)', render: (d) => <DevErrorsPanel d={d} /> },
  { id: 'slowRoutes', title: 'Slowest API routes', render: (d) => <SlowRoutesPanel d={d} /> },
  { id: 'integrations', title: 'Outside services, 24 h', render: (d) => <IntegrationsPanel d={d} /> },
  { id: 'jobs', title: 'Background jobs', render: (d) => <JobsPanel d={d} /> },
  { id: 'edge', title: 'Cloudflare edge, last hour', render: (d, ctx) => <EdgePanel d={d} countriesShown={ctx.shown.has('countries')} /> },
  {
    id: 'bots',
    title: 'Fake checkouts blocked today',
    render: donutPanel((d) => slicesOf(d.security.botsBlocked, BOT_REASON), 'blocked'),
  },
  {
    id: 'income30',
    title: 'Platform income, 30 days',
    render: (d) => {
      const labels = d.income.last30.map((x) => shortDay(x.day));
      return <Fit>{(w, h) => <AreaChart w={w} h={h} values={d.income.last30.map((x) => x.amount)} labels={labels} color={SERIES[6]} tickEvery={7} tip={(i) => `${labels[i]}: ${taka(d.income.last30[i].amount)}`} />}</Fit>;
    },
  },
  {
    id: 'signups30',
    title: 'New stores, 30 days',
    render: (d) => {
      const labels = d.signups30.map((x) => shortDay(x.day));
      return <Fit>{(w, h) => <ColumnChart w={w} h={h} values={d.signups30.map((x) => x.n)} labels={labels} color={SERIES[5]} highlight={labels.length - 1} tickEvery={7} tip={(i) => `${labels[i]}: ${d.signups30[i].n} new stores`} />}</Fit>;
    },
  },
  {
    id: 'visitHours',
    title: 'Store visitors by hour',
    render: (d, ctx) => {
      const v = Array.from({ length: 24 }, (_, h) => d.visits.hours.find((x) => x.hour === h)?.n ?? 0);
      return <Fit>{(w, h) => <ColumnChart w={w} h={h} values={v} labels={v.map((_, i) => hh(i))} color={SERIES[4]} highlight={ctx.nowHour} tickEvery={3} tip={(i) => `${hh(i)}:00 · ${v[i]} new visitors`} />}</Fit>;
    },
  },
  {
    id: 'rushSales',
    title: 'Busy hours: sales',
    subtitle: (d) => (d.rhythm ? `typical day, last ${d.rhythm.sales.days} days` : ''),
    render: (d, ctx) => <RushSales d={d} nowHour={ctx.nowHour} />,
  },
  {
    id: 'rushServer',
    title: 'Busy hours: server',
    subtitle: (d) => (d.rhythm?.server.days ? `typical day, ${d.rhythm.server.days} day${d.rhythm.server.days === 1 ? '' : 's'} measured` : 'collecting'),
    render: (d, ctx) => <RushServer d={d} nowHour={ctx.nowHour} />,
  },
  {
    id: 'rushVisitors',
    title: 'Busy hours: visitors',
    subtitle: (d) => (d.rhythm ? `typical day, last ${d.rhythm.visitors.days} days` : ''),
    render: (d, ctx) => <RushVisitors d={d} nowHour={ctx.nowHour} />,
  },
];

// ---- Busy hours (watch dials) ----------------------------------------------------

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Bangladesh's week starts on Saturday. */
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];
const dhakaMinute = () => new Date(Date.now() + 6 * 3_600_000).getUTCMinutes();
/** The `n` busiest hours, busiest first, as "21:00, 20:00". */
function topHours(values: Array<number | null>, n: number): string {
  return values
    .map((v, h) => ({ v: v ?? 0, h }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, n)
    .map((x) => `${hh(x.h)}:00`)
    .join(', ');
}
/** The quietest hour that has data. */
function quietHour(values: Array<number | null>): number | null {
  let best: number | null = null;
  values.forEach((v, h) => {
    if (v !== null && (best === null || v < (values[best] ?? 0))) best = h;
  });
  return best;
}

function Facts({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-[0.45em] text-[0.9em]">
      {rows.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <div className="text-[0.85em] text-[var(--muted)]">{k}</div>
          <div className="truncate font-semibold text-[var(--ink)]" title={v}>
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A dial filling its box on the left, facts on the right. */
function DialWithFacts({ dial, facts }: { dial: (size: number) => ReactNode; facts: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 gap-[0.8em]">
      <Fit className="min-w-0 flex-[1.15]">{(w, h) => <div className="flex h-full items-center justify-center">{dial(Math.max(80, Math.min(w, h)))}</div>}</Fit>
      <div className="flex min-w-0 flex-1 flex-col justify-center">{facts}</div>
    </div>
  );
}

function RushSales({ d, nowHour }: { d: Summary; nowHour: number }) {
  if (!d.rhythm) return <div className="text-[var(--muted)]">Loading…</div>;
  const s = d.rhythm.sales;
  const orders = s.hours.map((x) => (x.orders > 0 ? x.orders : 0));
  const peak = s.hours.reduce((a, b) => (b.orders > a.orders ? b : a), s.hours[0]);
  const days = WEEK_ORDER.map((i) => s.weekdays.find((w) => w.dow === i) ?? { dow: i, orders: 0, sales: 0 });
  const bestDay = days.reduce((a, b) => (b.orders > a.orders ? b : a), days[0]);
  const dayMax = Math.max(0.0001, ...days.map((x) => x.orders));
  const quiet = quietHour(orders);
  return (
    <DialWithFacts
      dial={(size) => (
        <ClockDial
          size={size}
          values={orders}
          color={SERIES[0]}
          nowHour={nowHour}
          nowMinute={dhakaMinute()}
          label="Orders by hour"
          tip={(h) => `${hh(h)}:00 · ${s.hours[h].orders} orders and ${taka(s.hours[h].sales)} on a typical day`}
        />
      )}
      facts={
        <div className="flex flex-col gap-[0.6em]">
          <Facts
            rows={[
              ['Busiest hours', topHours(orders, 3) || 'No sales yet'],
              ['At the peak', peak.orders ? `${peak.orders} orders · ${taka(peak.sales)} a day` : '-'],
              ['Quietest', quiet !== null ? `${hh(quiet)}:00` : '-'],
            ]}
          />
          <div>
            <div className="mb-[0.3em] text-[0.8em] text-[var(--muted)]">
              Best day: <span className="font-semibold text-[var(--ink)]">{bestDay.orders ? WEEKDAY[bestDay.dow] : '-'}</span>
            </div>
            <div className="flex h-[2.6em] items-end gap-[0.25em]">
              {days.map((x) => (
                <div key={x.dow} className="flex flex-1 flex-col items-center gap-[0.15em]" title={`${WEEKDAY[x.dow]} · ${x.orders} orders · ${taka(x.sales)} on average`}>
                  <div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(6, (x.orders / dayMax) * 100) * 0.016}em`, background: SERIES[0], opacity: x.dow === bestDay.dow ? 1 : 0.45 }} />
                  <span className="text-[0.7em] text-[var(--muted)]">{WEEKDAY[x.dow].slice(0, 2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
}

function RushServer({ d, nowHour }: { d: Summary; nowHour: number }) {
  if (!d.rhythm) return <div className="text-[var(--muted)]">Loading…</div>;
  const sv = d.rhythm.server;
  const cpu = sv.cpu.map((x) => x.avg);
  const req = sv.requests.map((x) => x.perDay);
  const peakCpu = sv.cpu.reduce<(typeof sv.cpu)[number] | null>((a, b) => (b.avg !== null && (a === null || b.avg > (a.avg ?? 0)) ? b : a), null);
  const hottest = sv.cpu.reduce<(typeof sv.cpu)[number] | null>((a, b) => (b.peak !== null && (a === null || b.peak > (a.peak ?? 0)) ? b : a), null);
  const measured = cpu.filter((v) => v !== null).length;
  return (
    <div className="flex h-full min-h-0 flex-col gap-[0.4em]">
      <div className="flex min-h-0 flex-1 gap-[0.6em]">
        {[
          { values: cpu, color: SERIES[1], label: 'CPU', tip: (h: number) => (sv.cpu[h].avg === null ? `${hh(h)}:00 · not measured yet` : `${hh(h)}:00 · CPU ${sv.cpu[h].avg}% on average, ${sv.cpu[h].peak}% at most`) },
          { values: req, color: SERIES[2], label: 'API requests', tip: (h: number) => (sv.requests[h].perDay === null ? `${hh(h)}:00 · not measured yet` : `${hh(h)}:00 · ${num(sv.requests[h].perDay ?? 0)} API requests a day`) },
        ].map((x) => (
          <div key={x.label} className="flex min-w-0 flex-1 flex-col items-center">
            <Fit className="w-full min-h-0 flex-1">{(w, h) => <div className="flex h-full items-center justify-center"><ClockDial size={Math.max(70, Math.min(w, h))} values={x.values} color={x.color} nowHour={nowHour} nowMinute={dhakaMinute()} label={x.label} tip={x.tip} /></div>}</Fit>
            <span className="text-[0.85em] font-medium text-[var(--ink2)]">{x.label}</span>
          </div>
        ))}
      </div>
      <div className="truncate text-[0.85em] text-[var(--ink2)]">
        {measured < 24
          ? `Measuring: ${measured} of 24 hours seen so far, the full picture after one day.`
          : `CPU busiest ${peakCpu ? `${hh(peakCpu.hour)}:00 (${peakCpu.avg}% avg)` : '-'} · highest ${hottest ? `${hottest.peak}% at ${hh(hottest.hour)}:00` : '-'} · API busiest ${topHours(req, 1) || '-'}`}
      </div>
    </div>
  );
}

function RushVisitors({ d, nowHour }: { d: Summary; nowHour: number }) {
  if (!d.rhythm) return <div className="text-[var(--muted)]">Loading…</div>;
  const r = d.rhythm;
  const visits = r.visitors.hours.map((x) => x.perDay);
  const signups = r.signups.hours.map((x) => x.n);
  const peak = r.visitors.hours.reduce((a, b) => (b.perDay > a.perDay ? b : a), r.visitors.hours[0]);
  return (
    <DialWithFacts
      dial={(size) => (
        <ClockDial
          size={size}
          values={visits}
          color={SERIES[4]}
          nowHour={nowHour}
          nowMinute={dhakaMinute()}
          label="Store visitors by hour"
          tip={(h) => `${hh(h)}:00 · ${r.visitors.hours[h].perDay} visitors on a typical day`}
        />
      )}
      facts={
        <Facts
          rows={[
            ['Most visitors', topHours(visits, 3) || 'No visits yet'],
            ['At the peak', peak.perDay ? `${num(peak.perDay)} visitors a day` : '-'],
            [`New stores sign up (${r.signups.days} days)`, topHours(signups, 2) || 'No sign-ups yet'],
          ]}
        />
      }
    />
  );
}

function uptime(s: number | null): string {
  if (s === null) return '?';
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  return d ? `${d}d ${h}h` : `${h}h`;
}

function ServerPanel({ d, hist, jobsShown }: { d: Summary; hist: WallHistory; jobsShown: boolean }) {
  const facts: Array<[string, string, boolean?]> = [
    ['Database', d.database.ok ? `${d.database.latencyMs ?? '?'} ms` : 'Down', !d.database.ok],
    // The Background jobs panel lists them one by one when it is on.
    ...(jobsShown ? [] : [['Jobs', d.jobs.late ? `${d.jobs.late} late` : `${d.jobs.total} on time`, d.jobs.late > 0] as [string, string, boolean]]),
    ['Version', `v${d.dev.version}`],
    ['Load', `${d.host.load.one} / ${d.host.load.five}`],
    ['Event loop', d.eventLoop.lastMinute ? `${d.eventLoop.lastMinute.p99Ms} ms` : '?', (d.eventLoop.lastMinute?.p99Ms ?? 0) > 200],
    ['API memory', `${d.processMemoryMb} MB`],
    ['Up', uptime(d.host.uptimeSeconds)],
  ];
  return (
    <Fit>
      {(w, h) => {
        const ring = Math.max(48, Math.min((w - 16) / 3, h * 0.48));
        const rest = h - ring - 8;
        return (
          <div className="flex h-full flex-col gap-2">
            <div className="flex justify-around">
              <Ring percent={d.host.cpuPercent} label="CPU" size={ring} color={SERIES[0]} />
              <Ring percent={d.host.memory?.percent ?? null} label="Memory" size={ring} color={SERIES[6]} />
              <Ring percent={d.host.disk?.percent ?? null} label="Disk" size={ring} color={SERIES[2]} />
            </div>
            {rest > 40 && (
              <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-x-4 gap-y-0.5 text-[0.9em]">
                {facts.slice(0, Math.max(2, Math.floor((rest - (rest > 90 ? 34 : 0)) / 20) * 2)).map(([k, v, bad]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-[var(--ink2)]">{k}</span>
                    <span className={`tabular-nums font-medium ${bad ? 'text-[var(--bad)]' : ''}`}>{v}</span>
                  </div>
                ))}
                {rest > 90 && hist.cpu.length > 2 && (
                  <div className="col-span-2 mt-1">
                    <Sparkline values={hist.cpu} w={w} h={28} color={SERIES[0]} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }}
    </Fit>
  );
}

/** Last 24 hours (bot counts: today). Red = act now, orange = worth a look, green = nothing. Counts only, no phone, address or IP. */
function SecurityPanel({ d, botsShown }: { d: Summary; botsShown: boolean }) {
  const s = d.security;
  const bots = s.botsBlocked.reduce((n, b) => n + b.orders, 0);
  // [label, value, level]: 0 nothing, 1 look, 2 act now
  const rows: Array<[string, string, 0 | 1 | 2]> = [
    ['Super Admin locked', s.adminLocked ? `${s.adminLocked} locked` : s.adminFailedTries ? `${s.adminFailedTries} wrong tries` : 'None', s.adminLocked ? 2 : s.adminFailedTries ? 1 : 0],
    ['Admin sign-ins (24 h)', s.adminNewDevices24h ? `${s.adminSignIns24h} · ${s.adminNewDevices24h} new device` : String(s.adminSignIns24h), s.adminNewDevices24h ? 2 : 0],
    // Left out while the "Fake checkouts blocked today" donut is on (same total).
    ...(botsShown ? [] : [['Fake checkouts blocked', bots ? `${num(bots)} · ${s.botStores} stores` : '0', bots >= 50 ? 2 : bots ? 1 : 0] as [string, string, 0 | 1 | 2]]),
    ['High-risk orders today', s.riskyMedium ? `${s.riskyHigh} (+${s.riskyMedium} medium)` : String(s.riskyHigh), s.riskyHigh >= 10 ? 2 : s.riskyHigh || s.riskyMedium ? 1 : 0],
    ['Orders via VPN / data center', String(s.vpnOrders), s.vpnOrders >= 5 ? 2 : s.vpnOrders ? 1 : 0],
    ['Orders from abroad', String(s.abroadOrders), s.abroadOrders ? 1 : 0],
    ['Blocked phones tried again', String(s.blockedPhonesTried), s.blockedPhonesTried ? 1 : 0],
    ['Login as store (24 h)', s.loginAsStoreEdit24h ? `${s.loginAsStore24h} (${s.loginAsStoreEdit24h} can edit)` : String(s.loginAsStore24h), s.loginAsStoreEdit24h ? 1 : 0],
    ['Store sign-ins (24 h)', `${num(s.signIns24h)} · ${num(s.newDevices24h)} new device`, 0],
    ['Store reports open', String(s.storeReportsOpen), s.storeReportsOpen ? 1 : 0],
    ['Flagged products open', s.productFlagsNew24h ? `${s.productFlagsOpen} (${s.productFlagsNew24h} new)` : String(s.productFlagsOpen), s.productFlagsOpen ? 1 : 0],
  ];
  // Problems first, so the rows that fit are the ones that matter.
  const shown = [...rows].sort((a, b) => b[2] - a[2]);
  return (
    <Fit>
      {(_w, h) => (
        <ul>
          {shown.slice(0, Math.max(1, Math.floor(h / 24))).map(([label, value, level]) => (
            <li key={label} className="flex h-6 items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${level === 2 ? 'bg-[var(--bad)]' : level === 1 ? 'bg-[var(--warn)]' : 'bg-[var(--good)]'}`} />
              <span className="min-w-0 flex-1 truncate text-[var(--ink2)]">{label}</span>
              <span className={`shrink-0 tabular-nums font-medium ${level === 2 ? 'text-[var(--bad)]' : ''}`}>{value}</span>
            </li>
          ))}
        </ul>
      )}
    </Fit>
  );
}

const ago = (when: string | number) => {
  const s = Math.max(0, Math.round((Date.now() - (typeof when === 'number' ? when : new Date(when).getTime())) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`;
};

/** Open server errors seen in the last 24 hours, most frequent first: what, where in our code and which route. Never who. */
function DevErrorsPanel({ d }: { d: Summary }) {
  const rows = d.dev.errors;
  if (!rows.length) return <p className="text-[var(--good)]">No open server errors in the last 24 hours.</p>;
  return (
    <Fit>
      {(_w, h) => (
        <ul className="space-y-1">
          {rows.slice(0, Math.max(1, Math.floor(h / 40))).map((e, i) => (
            <li key={i} className="h-[38px] overflow-hidden leading-tight">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 rounded px-1.5 text-[0.8em] font-semibold tabular-nums text-[var(--bad)]" style={{ background: 'color-mix(in srgb, var(--bad) 14%, transparent)' }}>
                  {num(e.count)}x
                </span>
                <span className="min-w-0 flex-1 truncate font-medium" title={e.message ?? ''}>
                  {e.name}: {e.message}
                </span>
                <span className="shrink-0 text-[0.78em] text-[var(--muted)]">{ago(e.lastSeenAt)}</span>
              </div>
              <p className="truncate font-mono text-[0.78em] text-[var(--muted)]">{[e.where, e.path].filter(Boolean).join(' · ')}</p>
            </li>
          ))}
        </ul>
      )}
    </Fit>
  );
}

/** The API routes with the slowest p95 answer time on this process since it started. */
function SlowRoutesPanel({ d }: { d: Summary }) {
  const rows = d.dev.slowRoutes;
  if (!rows.length) return <p className="text-[var(--muted)]">Not enough requests yet on this process.</p>;
  const max = Math.max(1, ...rows.map((r) => r.p95Ms));
  return (
    <Fit>
      {(_w, h) => (
        <div className="flex h-full flex-col">
          <ul>
            {rows.slice(0, Math.max(1, Math.floor((h - 18) / 30))).map((r) => (
              <li key={r.route} className="flex h-[30px] flex-col justify-center">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-mono text-[0.85em]" title={`${r.route} · ${num(r.count)} requests · p50 ${Math.round(r.p50Ms)} ms · max ${Math.round(r.maxMs)} ms`}>
                    {r.route}
                  </span>
                  <span className={`shrink-0 tabular-nums font-medium ${r.p95Ms >= 1000 ? 'text-[var(--bad)]' : ''}`}>{Math.round(r.p95Ms)} ms</span>
                </div>
                <div className="mt-[3px] h-[5px] overflow-hidden rounded-full bg-[var(--track)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(3, (r.p95Ms / max) * 100)}%`, background: r.p95Ms >= 1000 ? 'var(--bad)' : r.p95Ms >= 300 ? 'var(--warn)' : SERIES[0] }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-auto truncate text-[0.78em] text-[var(--muted)]">
            p95 · one API process, since {new Date(d.dev.perfSince).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </Fit>
  );
}

/** Outside services the server calls (SMS, payments, couriers, AI, email...): problems first, unused ones left out. */
function IntegrationsPanel({ d }: { d: Summary }) {
  const order: Record<string, number> = { down: 0, shaky: 1, ok: 2, idle: 3 };
  const rows = d.dev.integrations
    .filter((c) => c.status !== 'idle')
    .sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2) || b.ok + b.failed - (a.ok + a.failed));
  if (!rows.length) return <p className="text-[var(--muted)]">No calls to outside services in 24 hours.</p>;
  const tone = (st: string) => (st === 'down' ? 'var(--bad)' : st === 'shaky' ? 'var(--warn)' : 'var(--good)');
  return (
    <Fit>
      {(_w, h) => (
        <ul>
          {rows.slice(0, Math.max(1, Math.floor(h / 24))).map((c) => (
            <li key={c.key} className="flex h-6 items-center gap-2" title={c.lastError ?? ''}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tone(c.status) }} />
              <span className="min-w-0 flex-1 truncate">{c.label}</span>
              <span className="shrink-0 tabular-nums text-[0.9em] text-[var(--ink2)]">{num(c.ok + c.failed)} calls</span>
              <span className={`w-16 shrink-0 text-right tabular-nums font-medium ${c.failed ? 'text-[var(--bad)]' : 'text-[var(--muted)]'}`}>
                {c.failedShare ? `${c.failedShare}% fail` : 'no fails'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Fit>
  );
}

/** Background jobs: the late or failing ones with their error, else one all-good line. */
function JobsPanel({ d }: { d: Summary }) {
  const j = d.dev.jobs;
  return (
    <Fit>
      {(_w, h) => (
        <div className="flex h-full flex-col">
          <p className="mb-1 text-[0.9em]">
            <span className="font-semibold text-[var(--good)]">{j.ok}</span>
            <span className="text-[var(--ink2)]"> of {j.total} on time</span>
            {j.problems.length ? <span className="font-semibold text-[var(--bad)]"> · {j.problems.length} need a look</span> : null}
          </p>
          <ul>
            {j.problems.slice(0, Math.max(0, Math.floor((h - 24) / 34))).map((p) => (
              <li key={p.label} className="h-[34px] overflow-hidden leading-tight">
                <div className="flex items-baseline gap-2">
                  <span className={`shrink-0 text-[0.78em] font-semibold ${p.state === 'OK' ? 'text-[var(--warn)]' : 'text-[var(--bad)]'}`}>{p.state === 'OK' ? 'ERROR' : p.state}</span>
                  <span className="min-w-0 flex-1 truncate">{p.label}</span>
                  <span className="shrink-0 text-[0.78em] text-[var(--muted)]">{p.agoSeconds === null ? 'never ran' : ago(Date.now() - p.agoSeconds * 1000)}</span>
                </div>
                <p className="truncate text-[0.78em] text-[var(--muted)]">{p.lastError ?? 'No error saved: it has not run in time'}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Fit>
  );
}

function TodoPanel({ d, errorsShown }: { d: Summary; errorsShown: boolean }) {
  const t = d.todo;
  const rows: Array<[string, string, number, boolean]> = [
    ['Payments not applied', String(t.paidNotApplied), t.paidNotApplied, true],
    ['Support tickets open', t.supportWaiting ? `${t.supportOpen} (${t.supportWaiting} over a day)` : String(t.supportOpen), t.supportOpen, t.supportWaiting > 0],
    ['Withdrawals to approve', t.withdrawPending.count ? `${t.withdrawPending.count} · ${taka(t.withdrawPending.amount)}` : '0', t.withdrawPending.count, false],
    ['Withdrawals to pay', t.withdrawToPay.count ? `${t.withdrawToPay.count} · ${taka(t.withdrawToPay.amount)}` : '0', t.withdrawToPay.count, false],
    ['Plan requests', String(t.planRequests), t.planRequests, false],
    ['Verifications to check', String(t.kycSubmitted), t.kycSubmitted, false],
    // Listed one by one in the Server errors panel when that one is on.
    ...(errorsShown ? [] : [['Code errors to fix (24 h)', String(t.appErrors), t.appErrors, t.appErrors > 0] as [string, string, number, boolean]]),
    ['Failed webhooks (24 h)', String(t.failedWebhooks), t.failedWebhooks, false],
    ['Platform SMS balance', t.smsBalance.balance === null ? 'Unknown' : taka(t.smsBalance.balance), t.smsBalance.level === 'OK' ? 0 : 1, t.smsBalance.level === 'CRITICAL' || t.smsBalance.level === 'LOW'],
  ];
  return (
    <Fit>
      {(_w, h) => (
        <ul>
          {rows.slice(0, Math.max(1, Math.floor(h / 24))).map(([label, value, n, bad]) => (
            <li key={label} className="flex h-6 items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${n === 0 ? 'bg-[var(--good)]' : bad ? 'bg-[var(--bad)]' : 'bg-[var(--warn)]'}`} />
              <span className="min-w-0 flex-1 truncate text-[var(--ink2)]">{label}</span>
              <span className={`shrink-0 tabular-nums font-medium ${n > 0 && bad ? 'text-[var(--bad)]' : ''}`}>{value}</span>
            </li>
          ))}
        </ul>
      )}
    </Fit>
  );
}

/**
 * The cyber team's live view: a big status (Normal / Watch / Attack?) with why, then the API's last 5 minutes. Thresholds
 * are on the server (office-wall.service.ts cyberVerdict). Counts only: no address is ever on the wall.
 */
function CyberPanel({ d, edgeShown }: { d: Summary; edgeShown: boolean }) {
  const c = d.cyber;
  const tone = c.level === 'ATTACK' ? 'var(--bad)' : c.level === 'WATCH' ? 'var(--warn)' : 'var(--good)';
  const word = c.level === 'ATTACK' ? 'Possible attack' : c.level === 'WATCH' ? 'Watch closely' : 'All normal';
  const rows: Array<[string, string, boolean]> = [
    ['API requests / min', c.baseRpm ? `${num(c.rpm)} (${c.ratio}x normal)` : num(c.rpm), c.ratio >= 2 && c.rpm >= 200],
    ['Server errors (5xx)', `${c.errPct}%`, c.errPct >= 3],
    ['Rate-limited (429), 5 min', num(c.limited5), c.limited5 >= 150],
    ['Failed sign-ins, 5 min', num(c.authFail5), c.authFail5 >= 20],
    ['Scanner probes, 5 min', num(c.probes5), c.probes5 >= 50],
    ['Refused 401 / 403, 5 min', num(c.deny5), c.deny5 >= 200],
    ['Unique IPs on the API, 5 min', num(d.traffic.visitors5), false],
    // Cloudflare's threat count lives in its own panel when that one is on.
    ...(edgeShown ? [] : [['Cloudflare threats, 1 h', d.edge.configured ? num(d.edge.hourTotals.threats) : 'not connected', d.edge.hourTotals.threats >= 100] as [string, string, boolean]]),
  ];
  return (
    <Fit>
      {(_w, h) => (
        <div className="flex h-full flex-col gap-1.5">
          <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)` }}>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: tone }} aria-hidden />
            <span className="font-bold" style={{ color: c.level === 'NORMAL' ? 'var(--good)' : c.level === 'ATTACK' ? 'var(--bad)' : 'var(--ink)' }}>
              {word}
            </span>
            {c.reasons[0] && <span className="min-w-0 flex-1 truncate text-[0.88em] text-[var(--ink2)]">{c.reasons[0]}</span>}
          </div>
          <ul className="min-h-0">
            {rows.slice(0, Math.max(1, Math.floor((h - 40) / 22))).map(([label, value, hot]) => (
              <li key={label} className="flex h-[22px] items-center justify-between gap-2">
                <span className="truncate text-[var(--ink2)]">{label}</span>
                <span className={`shrink-0 tabular-nums font-medium ${hot ? 'text-[var(--bad)]' : ''}`}>{value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Fit>
  );
}

let regionNames: Intl.DisplayNames | null = null;
/** "BD" -> "Bangladesh"; unknown codes stay as they are ("?" = not known yet). */
export function countryName(code: string): string {
  if (!code || code === '?' || code.length !== 2) return code === '?' ? 'Unknown' : code;
  try {
    regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

const NETWORK_KIND: Record<string, [string, string]> = {
  HOSTING: ['Data center / VPN', 'var(--bad)'],
  MOBILE: ['Mobile', 'var(--s1)'],
  BROADBAND: ['Broadband', 'var(--s3)'],
  UNKNOWN: ['Unknown', 'var(--other)'],
};

/**
 * Which IPs send the most requests to the API right now (server: origin-traffic.ts). Visitors' IPs are shown (the owner's
 * rule, 2026-11-19); our own server's address never is: it reads "This server" / "Internal".
 * Red row = one source with a big share of all requests (a flood), or one from a data center sending many errors.
 */
function SourcesPanel({ d }: { d: Summary }) {
  const list = d.traffic.topSources;
  if (!list.length) return <p className="text-[var(--muted)]">No API requests counted yet.</p>;
  return (
    <Fit>
      {(_w, h) => (
        <div className="flex h-full flex-col">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 text-[0.78em] text-[var(--muted)]">
            <span>IP</span>
            <span>Where</span>
            <span className="text-right">Requests</span>
            <span className="w-11 text-right">Share</span>
          </div>
          <ul>
            {list.slice(0, Math.max(1, Math.floor((h - 34) / 24))).map((s) => {
              const kind = NETWORK_KIND[s.network] ?? NETWORK_KIND.UNKNOWN;
              const hot = (s.share >= 15 && s.requests >= 300) || (s.network === 'HOSTING' && s.errors >= 100);
              return (
                <li key={s.code} className="grid h-6 grid-cols-[auto_1fr_auto_auto] items-center gap-x-2">
                  <span className="max-w-[11em] truncate font-mono text-[0.88em]" title={`${s.ip} (code ${s.code})`}>
                    {s.ip}
                  </span>
                  <span className="min-w-0 truncate text-[0.9em] text-[var(--ink2)]" title={s.company}>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: kind[1] }} />
                    {countryName(s.country)} · {s.company || kind[0]}
                  </span>
                  <span className="text-right tabular-nums">
                    {num(s.requests)}
                    {s.errors ? <span className="ml-1 text-[0.82em] text-[var(--bad)]">{num(s.errors)} err</span> : null}
                  </span>
                  <span className={`w-11 text-right tabular-nums font-medium ${hot ? 'text-[var(--bad)]' : ''}`}>{s.share}%</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-auto truncate text-[0.78em] text-[var(--muted)]">
            API, last {d.traffic.sourceWindowMin} min · <span style={{ color: 'var(--bad)' }}>●</span> data center/VPN{' '}
            <span style={{ color: 'var(--s1)' }}>●</span> mobile <span style={{ color: 'var(--s3)' }}>●</span> broadband
            {d.edge.blockedIps.length ? ` · Cloudflare blocked most: ${d.edge.blockedIps.slice(0, 2).map((b) => `${b.ip} (${b.country}) ${num(b.count)}`).join(', ')}` : ''}
          </p>
        </div>
      )}
    </Fit>
  );
}

/** How hard the dashboard (client) and the storefront processes are working: answer time of a tiny request, plus Caddy when connected. */
function AppsPanel({ d }: { d: Summary }) {
  const probes = d.apps.probes;
  const max = Math.max(200, ...probes.map((p) => p.ms ?? 0));
  const toneOf = (ms: number | null, up: boolean) => (!up ? 'var(--bad)' : (ms ?? 0) >= 1500 ? 'var(--bad)' : (ms ?? 0) >= 500 ? 'var(--warn)' : 'var(--good)');
  return (
    <Fit>
      {(_w, h) => {
        // The Caddy table only when there is room for it under at least two processes.
        const caddy = d.apps.caddy && h >= 150 ? d.apps.caddy : null;
        return (
        <div className="flex h-full flex-col">
          <ul>
            {probes.slice(0, Math.max(1, Math.floor((h - (caddy ? 70 : 18)) / 30))).map((p) => (
              <li key={p.name} className="flex h-[30px] flex-col justify-center">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 tabular-nums font-medium" style={{ color: p.up ? undefined : 'var(--bad)' }}>
                    {p.up ? `${p.ms} ms` : 'Down'}
                  </span>
                </div>
                <div className="mt-[3px] h-[5px] overflow-hidden rounded-full bg-[var(--track)]">
                  <div className="h-full rounded-full" style={{ width: `${p.up ? Math.max(3, ((p.ms ?? 0) / max) * 100) : 100}%`, background: toneOf(p.ms, p.up) }} />
                </div>
              </li>
            ))}
          </ul>
          {caddy ? (
            <div className="mt-auto grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-t border-[var(--line)] pt-1 text-[0.85em]">
              <span className="text-[var(--muted)]">Caddy</span>
              <span className="text-right text-[var(--muted)]">req/s</span>
              <span className="text-right text-[var(--muted)]">5xx</span>
              <span className="text-right text-[var(--muted)]">p95</span>
              {caddy.map((g) => (
                <Fragment key={g.group}>
                  <span>{g.group}</span>
                  <span className="text-right tabular-nums">{g.rps ?? '…'}</span>
                  <span className={`text-right tabular-nums ${(g.errorPct ?? 0) >= 3 ? 'text-[var(--bad)]' : ''}`}>{g.errorPct === null ? '…' : `${g.errorPct}%`}</span>
                  <span className="text-right tabular-nums">{g.p95Ms === null ? '…' : `${g.p95Ms} ms`}</span>
                </Fragment>
              ))}
            </div>
          ) : (
            <p className="mt-auto truncate text-[0.8em] text-[var(--muted)]">Answer time of a tiny request to each process, every 15 s.</p>
          )}
        </div>
        );
      }}
    </Fit>
  );
}

const CF_ACTION: Record<string, string> = { block: 'Blocked', managed_challenge: 'Challenged', challenge: 'Challenged', jschallenge: 'JS challenge', log: 'Logged', skip: 'Skipped', allow: 'Allowed' };

/** Cloudflare: requests and threats at the edge in the last hour, threat countries (names only) and firewall actions in 24 h. */
function EdgePanel({ d, countriesShown }: { d: Summary; countriesShown: boolean }) {
  const e = d.edge;
  if (!e.configured)
    return (
      <p className="text-[0.92em] text-[var(--ink2)]">
        Not connected. Make a Cloudflare API token with <b>Zone → Analytics → Read</b> for regantify.com and put it in the server env as{' '}
        <code className="rounded bg-[var(--track)] px-1">CLOUDFLARE_ANALYTICS_TOKEN</code>.
      </p>
    );
  if (e.error && !e.lastHour.length) return <p className="text-[var(--bad)]">Cloudflare: {e.error}</p>;
  const t = e.hourTotals;
  const blocks = e.blocks24h.reduce<Record<string, number>>((m, b) => ((m[CF_ACTION[b.action] ?? b.action] = (m[CF_ACTION[b.action] ?? b.action] ?? 0) + b.count), m), {});
  return (
    <div className="flex h-full flex-col gap-1">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[1.25em] font-bold tabular-nums">{compact(t.requests)}</p>
          <p className="text-[0.78em] text-[var(--muted)]">requests</p>
        </div>
        <div>
          <p className="text-[1.25em] font-bold tabular-nums" style={{ color: t.threats ? 'var(--bad)' : undefined }}>
            {compact(t.threats)}
          </p>
          <p className="text-[0.78em] text-[var(--muted)]">threats</p>
        </div>
        <div>
          <p className="text-[1.25em] font-bold tabular-nums">{t.cachedPct}%</p>
          <p className="text-[0.78em] text-[var(--muted)]">from cache · {bytes(t.bytes)}</p>
        </div>
      </div>
      <Fit>{(w, h) => <Sparkline values={e.lastHour.length > 1 ? e.lastHour.map((x) => x.requests) : [0, 0]} w={w} h={h} color={SERIES[6]} />}</Fit>
      {/* The country panel already lists threats per country when it is on. */}
      {!countriesShown && (
        <p className="truncate text-[0.82em] text-[var(--ink2)]">
          {e.threatCountries.length ? `Threats from: ${e.threatCountries.map((c) => `${countryName(c.country)} ${c.threats}`).join(', ')}` : 'No threats from any country'}
        </p>
      )}
      <p className="truncate text-[0.82em] text-[var(--ink2)]">
        {Object.keys(blocks).length ? `Firewall 24 h: ${Object.entries(blocks).map(([k, v]) => `${k} ${num(v)}`).join(' · ')}` : 'Firewall 24 h: nothing stopped'}
      </p>
    </div>
  );
}

export function TileCard({ def, d, hist, shown, onOpen }: { def: TileDef; d: Summary; hist: WallHistory; shown?: Set<string>; onOpen?: () => void }) {
  const v = def.render(d, hist);
  // The same series is already a chart on screen: keep the number, drop the little line.
  if (def.sparkTwins?.some((id) => shown?.has(id))) v.spark = undefined;
  return (
    <div
      className={`wall-card wall-tile ${v.bad ? 'is-bad' : ''} ${onOpen ? 'wall-open' : ''}`}
      style={{ ['--accent' as string]: v.color }}
      {...(onOpen
        ? {
            role: 'button',
            tabIndex: 0,
            title: 'Open the last 30 days',
            onClick: onOpen,
            onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen()),
          }
        : {})}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="wall-tile-label truncate">{def.label}</p>
        {v.delta && <span className={`wall-chip ${v.delta.up ? 'is-up' : 'is-down'}`}>{v.delta.up ? '▲' : '▼'} {v.delta.text}</span>}
      </div>
      {/* Long values (e.g. "137 Mbps") get a smaller size so they never cut off next to the sparkline. */}
      <p className="wall-tile-value tabular-nums" style={v.value.length > 6 ? { fontSize: v.value.length > 8 ? '1.45em' : '1.7em', maxWidth: '72%' } : undefined}>
        {v.value}
      </p>
      <p className="wall-tile-detail truncate">{v.detail}</p>
      {v.spark && v.spark.length > 1 && (
        <div className="wall-tile-spark">
          <Fit>{(w, h) => <Sparkline values={v.spark!} w={w} h={h} color={v.bad ? '#fff' : v.color} />}</Fit>
        </div>
      )}
    </div>
  );
}
