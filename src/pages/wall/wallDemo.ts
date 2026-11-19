import type { InfraParts, Summary, TrafficMinute } from './wallWidgets';

/**
 * Sample numbers for looking at the wall on a developer's computer (`/wall?demo`). Loaded only in a dev build (import.meta.env.DEV),
 * so it never reaches the live wall. The first call builds a day; every later call (each refresh) adds a few new orders, visitors,
 * blocked bots and so on, so the screen moves like the real one.
 */
const NAMES = ['Gadget Depo BD', 'Solvane Fashion', 'Shopnet', 'Kids Corner', 'Bengal Leather', 'Urban Kicks', 'Glow Beauty', 'Home Nest', 'Tech Zone BD', 'Mahabesh', 'Petmart BD', 'Paper House', 'Tasty Bite', 'Viva Store', 'Chicwove'];
const PRODUCTS = ['Wireless Earbuds Pro', 'Panjabi Cotton Navy', 'Leather Wallet', 'Kids T-shirt Pack', 'Smart Watch X2', 'Face Serum 30ml', 'Running Shoes', 'Non-stick Pan 28cm', 'Power Bank 20000', 'Cotton Saree'];

const rnd = (a: number, b: number) => Math.round(a + Math.random() * (b - a));
const dayAgo = (n: number) => new Date(Date.now() + 6 * 3_600_000 - n * 86_400_000).toISOString().slice(0, 10);

function baseSummary(): Summary {
  const nowHour = new Date(Date.now() + 6 * 3_600_000).getUTCHours();
  const hours = Array.from({ length: nowHour + 1 }, (_, h) => ({ hour: h, orders: rnd(h < 8 ? 5 : 40, h < 8 ? 30 : 140), sales: rnd(20_000, 200_000) }));
  const orders = hours.reduce((s, h) => s + h.orders, 0);
  const sales = hours.reduce((s, h) => s + h.sales, 0);
  const d30 = Array.from({ length: 30 }, (_, i) => dayAgo(29 - i));
  return {
    at: new Date().toISOString(),
    day: dayAgo(0),
    host: { cpuPercent: rnd(20, 60), cpuCores: 12, load: { one: 3.1, five: 2.8, fifteen: 2.4 }, memory: { totalMb: 48_000, usedMb: 21_500, percent: rnd(42, 50) }, disk: { totalGb: 400, usedGb: 142, percent: 35.5 }, uptimeSeconds: 900_000 },
    database: { ok: true, latencyMs: rnd(1, 4) },
    processMemoryMb: 410,
    eventLoop: { lastMinute: { p99Ms: rnd(8, 20) }, worstP99LastHourMs: 40 },
    jobs: { total: 63, late: 0, lateNames: [] },
    orders: { today: { orders, sales }, sameTimeYesterday: { orders: Math.round(orders * 0.9), sales: Math.round(sales * 1.05) } },
    hours,
    yesterdayHours: Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: rnd(h < 8 ? 4 : 30, h < 8 ? 30 : 150), sales: 0 })),
    latest: Array.from({ length: 20 }, (_, i) => ({
      id: `demo${i}`,
      store: NAMES[i % NAMES.length],
      total: rnd(400, 5000),
      source: ['STOREFRONT', 'MANUAL', 'POS', 'STOREFRONT'][i % 4],
      payment: ['COD', 'ONLINE', 'COD', 'GATEWAY', 'POS'][i % 5],
      zone: 'DHAKA',
      at: new Date(Date.now() - i * 95_000).toISOString(),
    })),
    alerts: [],
    slowAt: new Date().toISOString(),
    income: { today: 48_250, sameTimeYesterday: 52_100, parts: { plans: 32_000, sms: 9000, ai: 3250, fees: 4000 }, walletTopups: 12_000, last30: d30.map((day) => ({ day, amount: rnd(20_000, 90_000) })) },
    signups30: d30.map((day) => ({ day, n: rnd(3, 25) })),
    mrr: 1_250_000,
    plans: [
      { code: 'FREE', name: 'Free', stores: 2140 },
      { code: 'ADVANCE', name: 'Advance', stores: 160 },
      { code: 'STARTER', name: 'Starter', stores: 310 },
      { code: 'BASIC', name: 'Basic', stores: 520 },
    ],
    payingStores: 990,
    stores: { total: 3130, active: 3050, newToday: 14, withOrder: 412, active7d: 1880 },
    visits: { today: 38_400, stores: 960, hours: hours.map((h) => ({ hour: h.hour, n: rnd(800, 5200) })) },
    breakdown: {
      status: [
        { key: 'PENDING', orders: 210, sales: 0 },
        { key: 'PROCESSING', orders: 340, sales: 0 },
        { key: 'SHIPPING', orders: 120, sales: 0 },
        { key: 'COMPLETED', orders: 90, sales: 0 },
        { key: 'CANCELLED', orders: 45, sales: 0 },
        { key: 'ON_HOLD', orders: 30, sales: 0 },
        { key: 'PAYMENT_INITIATED', orders: 22, sales: 0 },
      ],
      source: [
        { key: 'STOREFRONT', orders: 610, sales: 0 },
        { key: 'MANUAL', orders: 150, sales: 0 },
        { key: 'POS', orders: 60, sales: 0 },
        { key: 'RESELLER', orders: 22, sales: 0 },
      ],
      payment: [
        { key: 'COD', orders: 620, sales: 0 },
        { key: 'ONLINE', orders: 110, sales: 0 },
        { key: 'GATEWAY', orders: 40, sales: 0 },
        { key: 'MOBILE', orders: 12, sales: 0 },
        { key: 'POS', orders: 60, sales: 0 },
      ],
      zone: [
        { key: 'DHAKA', orders: 400, sales: 0 },
        { key: 'OUTSIDE_DHAKA', orders: 330, sales: 0 },
        { key: 'AROUND_DHAKA', orders: 40, sales: 0 },
        { key: 'PICKUP', orders: 12, sales: 0 },
      ],
      courier: [
        { key: 'STEADFAST', orders: 210, sales: 0 },
        { key: 'PATHAO', orders: 160, sales: 0 },
        { key: 'REDX', orders: 40, sales: 0 },
      ],
    },
    channels: [
      { key: 'facebook', orders: 380, sales: 520_000 },
      { key: 'direct', orders: 140, sales: 200_000 },
      { key: 'untracked', orders: 90, sales: 100_000 },
      { key: 'google', orders: 60, sales: 90_000 },
      { key: 'instagram', orders: 40, sales: 60_000 },
      { key: 'tiktok', orders: 30, sales: 40_000 },
      { key: 'whatsapp', orders: 22, sales: 30_000 },
      { key: 'app', orders: 20, sales: 30_000 },
    ],
    trend: Array.from({ length: 14 }, (_, i) => ({ day: dayAgo(13 - i), orders: rnd(600, 1400), sales: rnd(800_000, 2_000_000) })),
    topStores: NAMES.map((store, i) => ({ store, subdomain: `demo${i}`, orders: 90 - i * 5, sales: 150_000 - i * 8000 })),
    topProducts: PRODUCTS.map((product, i) => ({ product, store: NAMES[i], quantity: 60 - i * 4, sales: 90_000 - i * 5000 })),
    ...liveInfra(),
    security: {
      botsBlocked: [
        { key: 'TOO_FAST', orders: rnd(20, 60), sales: 0 },
        { key: 'PHONE_LIMIT', orders: rnd(5, 25), sales: 0 },
        { key: 'IP_LIMIT', orders: rnd(0, 12), sales: 0 },
        { key: 'HONEYPOT', orders: rnd(2, 10), sales: 0 },
      ],
      botStores: 17,
      signIns24h: 1840,
      newDevices24h: 96,
      adminSignIns24h: 4,
      adminNewDevices24h: 0,
      adminLocked: 0,
      adminFailedTries: 2,
      loginAsStore24h: 3,
      loginAsStoreEdit24h: 1,
      riskyHigh: 12,
      riskyMedium: 41,
      vpnOrders: 6,
      abroadOrders: 3,
      blockedPhonesTried: 5,
      storeReportsOpen: 2,
      productFlagsOpen: 4,
      productFlagsNew24h: 1,
    },
    usage: { smsParts: 5320, smsTexts: 4100, aiCredits: 182_000, aiCalls: 2300, aiCostUsd: 18.2, newShoppers: 640 },
    todo: {
      planRequests: 3,
      withdrawPending: { count: 5, amount: 84_000 },
      withdrawToPay: { count: 2, amount: 30_000 },
      kycSubmitted: 1,
      supportWaiting: 2,
      supportOpen: 9,
      paidNotApplied: 0,
      failedWebhooks: 4,
      appErrors: 1,
      smsBalance: { balance: 12_450, level: 'OK' },
    },
  };
}

// ---- Network, API traffic, Cloudflare, cyber (demo) ----

const minuteNow = () => Math.floor(Date.now() / 60_000);
let trafficRows: TrafficMinute[] = [];
let netIn = 4_000_000;
let netOut = 9_000_000;

function trafficMinute(minute: number): TrafficMinute {
  const n = rnd(900, 1600);
  return { minute, n, s4: rnd(10, 60), s5: rnd(0, 4), r429: rnd(0, 12), deny: rnd(5, 40), probe: rnd(0, 6), authFail: rnd(0, 5), slow: rnd(0, 3), avgMs: rnd(25, 70) };
}

/** Busiest sources: hash codes like the server makes, never an address. */
function demoSources() {
  const list = [
    { code: 'A41F9C', ip: '203.0.113.24', country: 'BD', network: 'MOBILE', company: 'Grameenphone', requests: rnd(180, 260), errors: rnd(0, 3) },
    { code: '7E02B1', ip: '198.51.100.17', country: 'US', network: 'HOSTING', company: 'DIGITALOCEAN-ASN', requests: rnd(120, 400), errors: rnd(60, 200) },
    { code: 'C93D10', ip: '203.0.113.140', country: 'BD', network: 'BROADBAND', company: 'Link3 Technologies', requests: rnd(90, 160), errors: 0 },
    { code: '05BB7A', ip: '203.0.113.9', country: 'BD', network: 'MOBILE', company: 'Robi Axiata', requests: rnd(60, 120), errors: rnd(0, 2) },
    { code: 'E6D4F2', ip: '192.0.2.205', country: 'IN', network: 'BROADBAND', company: 'Reliance Jio', requests: rnd(30, 80), errors: 0 },
    { code: '9F1A3E', ip: '198.51.100.61', country: 'NL', network: 'HOSTING', company: 'Hetzner', requests: rnd(20, 90), errors: rnd(10, 60) },
    { code: '31CC08', ip: '203.0.113.12', country: 'BD', network: 'MOBILE', company: 'Banglalink', requests: rnd(20, 60), errors: 0 },
  ].sort((a, b) => b.requests - a.requests);
  const total = rnd(11_000, 14_000);
  return list.map((s) => ({ ...s, share: Math.round((s.requests / total) * 1000) / 10 }));
}

function liveInfra(): InfraParts {
  const now = minuteNow();
  if (!trafficRows.length) trafficRows = Array.from({ length: 61 }, (_, i) => trafficMinute(now - 60 + i));
  while (trafficRows[trafficRows.length - 1].minute < now) {
    trafficRows.push(trafficMinute(trafficRows[trafficRows.length - 1].minute + 1));
    trafficRows = trafficRows.slice(-61);
  }
  // The current minute fills up as the screen watches.
  const cur = trafficRows[trafficRows.length - 1];
  cur.n += rnd(60, 140);
  cur.s4 += rnd(0, 5);
  netIn = Math.max(1_000_000, netIn + rnd(-700_000, 700_000));
  netOut = Math.max(2_000_000, netOut + rnd(-1_200_000, 1_200_000));
  const done = trafficRows.slice(0, -1);
  const rpm = done.slice(-5).reduce((s, m) => s + m.n, 0) / 5;
  const base = done.slice(-35, -5).reduce((s, m) => s + m.n, 0) / 30;
  const sum = (f: keyof TrafficMinute) => done.slice(-5).reduce((s, m) => s + (m[f] as number), 0);
  const edgeRows = Array.from({ length: 12 }, (_, i) => ({ at: new Date(Date.now() - (11 - i) * 300_000).toISOString(), requests: rnd(40_000, 90_000), threats: rnd(0, 40), cached: rnd(20_000, 50_000), bytes: rnd(400e6, 900e6) }));
  const threats = edgeRows.reduce((s, r) => s + r.threats, 0);
  const watch = threats >= 100;
  return {
    network: { scope: 'VPS', inBps: netIn, outBps: netOut, inTotalGb: 31_244, outTotalGb: 58_102 },
    traffic: {
      shared: true,
      series: structuredClone(trafficRows),
      visitors5: rnd(900, 1400),
      visitors60: rnd(6000, 9000),
      sourceWindowMin: 10,
      topSources: demoSources(),
      countries: [
        { country: 'BD', requests: rnd(9000, 12000) },
        { country: 'US', requests: rnd(300, 900) },
        { country: 'IN', requests: rnd(200, 500) },
        { country: 'SG', requests: rnd(100, 300) },
        { country: 'GB', requests: rnd(50, 150) },
        { country: 'SA', requests: rnd(40, 120) },
      ],
    },
    apps: {
      probes: [
        { name: 'Storefront 1', up: true, ms: rnd(20, 90) },
        { name: 'Storefront 2', up: true, ms: rnd(20, 120) },
        { name: 'Storefront 3', up: true, ms: rnd(30, 600) },
        { name: 'Dashboard (client)', up: true, ms: rnd(3, 12) },
      ],
      caddy: [
        { group: 'Storefront', rps: rnd(80, 160), errorPct: 0.2, p95Ms: 250 },
        { group: 'API', rps: rnd(15, 30), errorPct: 0.4, p95Ms: 100 },
        { group: 'Dashboard', rps: rnd(2, 8), errorPct: 0, p95Ms: 25 },
      ],
    },
    edge: {
      configured: true,
      error: null,
      lastHour: edgeRows,
      hourTotals: { requests: edgeRows.reduce((s, r) => s + r.requests, 0), threats, cachedPct: 58, bytes: edgeRows.reduce((s, r) => s + r.bytes, 0), visitors: rnd(8000, 12000), s4: rnd(2000, 4000), s5: rnd(10, 80) },
      topCountries: [
        { country: 'BD', requests: rnd(600_000, 750_000), threats: 2 },
        { country: 'US', requests: rnd(40_000, 60_000), threats: Math.round(threats * 0.4) },
        { country: 'IN', requests: rnd(15_000, 25_000), threats: 4 },
        { country: 'AE', requests: rnd(8_000, 12_000), threats: 0 },
        { country: 'SA', requests: rnd(6_000, 9_000), threats: 0 },
        { country: 'NL', requests: rnd(3_000, 6_000), threats: Math.round(threats * 0.25) },
        { country: 'MY', requests: rnd(2_000, 4_000), threats: 0 },
      ],
      blockedIps: [
        { ip: '198.51.100.17', country: 'US', company: 'DIGITALOCEAN-ASN', count: rnd(200, 400) },
        { ip: '192.0.2.92', country: 'NL', company: 'TECHOFF SRV', count: rnd(80, 200) },
      ],
      blockedNetworks: [
        { company: 'DIGITALOCEAN-ASN', country: 'US', count: rnd(300, 500) },
        { company: 'OVH SAS', country: 'FR', count: rnd(100, 250) },
      ],
      threatCountries: [
        { country: 'US', threats: Math.round(threats * 0.4) },
        { country: 'NL', threats: Math.round(threats * 0.25) },
        { country: 'CN', threats: Math.round(threats * 0.2) },
      ],
      blocks24h: [
        { action: 'managed_challenge', source: 'securitylevel', count: rnd(1200, 2000) },
        { action: 'block', source: 'firewallManaged', count: rnd(300, 700) },
        { action: 'block', source: 'ratelimit', count: rnd(50, 200) },
      ],
    },
    dev: {
      version: '0.1.0',
      node: 'v24.11.0',
      uptimeSeconds: 52_000,
      heapMb: rnd(180, 230),
      errors: [
        { name: 'TypeError', message: "Cannot read properties of undefined (reading 'variants')", where: 'src/orders/orders.service.ts:812', path: 'POST /v1/orders', count: 14, lastSeenAt: new Date(Date.now() - rnd(60, 600) * 1000).toISOString() },
        { name: 'PrismaClientKnownRequestError', message: 'Unique constraint failed on the fields: (`vendorId`,`slug`)', where: 'src/products/products.service.ts:430', path: 'PATCH /v1/products/:id', count: 5, lastSeenAt: new Date(Date.now() - 3_400_000).toISOString() },
        { name: 'FetchError', message: 'Pathao answered 502 Bad Gateway', where: 'src/courier/providers/pathao.provider.ts:221', path: 'POST /v1/orders/:id/courier/book', count: 2, lastSeenAt: new Date(Date.now() - 9_000_000).toISOString() },
      ],
      slowRoutes: [
        { route: 'GET /v1/analytics/profit-by-product', count: 41, p50Ms: 640, p95Ms: rnd(1100, 1500), maxMs: 2900 },
        { route: 'POST /v1/store/:subdomain/chat/stream', count: 230, p50Ms: 2100, p95Ms: rnd(800, 980), maxMs: 6200 },
        { route: 'GET /v1/orders', count: 1820, p50Ms: 120, p95Ms: rnd(380, 460), maxMs: 1900 },
        { route: 'GET /v1/store/:subdomain/products', count: 9400, p50Ms: 18, p95Ms: rnd(150, 220), maxMs: 800 },
        { route: 'POST /v1/orders', count: 610, p50Ms: 90, p95Ms: rnd(170, 210), maxMs: 900 },
        { route: 'GET /v1/dashboard/summary', count: 1300, p50Ms: 60, p95Ms: rnd(130, 160), maxMs: 600 },
      ],
      perfSince: new Date(Date.now() - 52_000_000).toISOString(),
      integrations: [
        { key: 'PATHAO', label: 'Pathao', status: 'shaky', ok: 410, failed: 38, failedShare: 8.5, lastError: '502 Bad Gateway', lastErrorAt: new Date().toISOString() },
        { key: 'SMS', label: 'SMS (bulksmsbd)', status: 'ok', ok: 5200, failed: 4, failedShare: 0.1, lastError: null, lastErrorAt: null },
        { key: 'PAYSTATION', label: 'PayStation', status: 'ok', ok: 180, failed: 0, failedShare: 0, lastError: null, lastErrorAt: null },
        { key: 'STEADFAST', label: 'SteadFast', status: 'ok', ok: 960, failed: 0, failedShare: 0, lastError: null, lastErrorAt: null },
        { key: 'ANTHROPIC', label: 'Claude AI', status: 'ok', ok: 2300, failed: 3, failedShare: 0.1, lastError: null, lastErrorAt: null },
        { key: 'SES', label: 'Email (Amazon SES)', status: 'ok', ok: 140, failed: 0, failedShare: 0, lastError: null, lastErrorAt: null },
        { key: 'TELEGRAM', label: 'Telegram', status: 'ok', ok: 3000, failed: 0, failedShare: 0, lastError: null, lastErrorAt: null },
      ],
      jobs: {
        total: 85,
        ok: 84,
        problems: [{ label: 'Courier status sync (every 20 min)', state: 'OK', agoSeconds: 420, lastError: 'RedX: request timed out after 20000 ms' }],
      },
    },
    cyber: {
      level: watch ? 'WATCH' : 'NORMAL',
      reasons: watch ? [`Cloudflare stopped ${threats} threats in the last hour`] : [],
      rpm: Math.round(rpm),
      baseRpm: Math.round(base),
      ratio: Math.round((rpm / base) * 10) / 10,
      errPct: Math.round((sum('s5') / (rpm * 5)) * 1000) / 10,
      limited5: sum('r429'),
      authFail5: sum('authFail'),
      probes5: sum('probe'),
      deny5: sum('deny'),
    },
  };
}

let state: Summary | null = null;
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const bump = (rows: Array<{ key: string; orders: number; sales: number }>, key: string, sales = 0) => {
  const r = rows.find((x) => x.key === key);
  if (r) {
    r.orders += 1;
    r.sales += sales;
  } else rows.push({ key, orders: 1, sales });
  rows.sort((a, b) => b.orders - a.orders);
};

export function demoSummary(): Summary {
  if (!state) {
    state = baseSummary();
    return structuredClone(state);
  }
  const d = state;
  const nowHour = new Date(Date.now() + 6 * 3_600_000).getUTCHours();
  const fresh = rnd(0, 4);
  for (let i = 0; i < fresh; i++) {
    const total = rnd(300, 6000);
    const store = pick(NAMES);
    const source = pick(['STOREFRONT', 'STOREFRONT', 'STOREFRONT', 'MANUAL', 'POS']);
    const payment = source === 'POS' ? 'POS' : pick(['COD', 'COD', 'COD', 'ONLINE', 'GATEWAY', 'MOBILE']);
    d.latest.unshift({ id: `demo${Date.now()}-${i}`, store, total, source, payment, zone: pick(['DHAKA', 'OUTSIDE_DHAKA']), at: new Date().toISOString() });
    d.orders.today.orders += 1;
    d.orders.today.sales += total;
    let h = d.hours.find((x) => x.hour === nowHour);
    if (!h) d.hours.push((h = { hour: nowHour, orders: 0, sales: 0 }));
    h.orders += 1;
    h.sales += total;
    const top = d.topStores.find((x) => x.store === store);
    if (top) {
      top.orders += 1;
      top.sales += total;
      d.topStores.sort((a, b) => b.orders - a.orders);
    }
    const p = pick(d.topProducts);
    p.quantity += rnd(1, 2);
    p.sales += total;
    d.topProducts.sort((a, b) => b.quantity - a.quantity);
    bump(d.breakdown.status, 'PENDING');
    bump(d.breakdown.source, source, total);
    bump(d.breakdown.payment, payment, total);
    if (source !== 'POS') bump(d.channels, pick(['facebook', 'facebook', 'direct', 'google', 'instagram', 'tiktok', 'whatsapp', 'untracked']), total);
  }
  d.latest = d.latest.slice(0, 20);
  // Some pending orders get confirmed, some shipped.
  const pending = d.breakdown.status.find((x) => x.key === 'PENDING');
  const processing = d.breakdown.status.find((x) => x.key === 'PROCESSING');
  if (pending && processing && pending.orders > 5 && Math.random() < 0.6) {
    const n = rnd(1, 3);
    pending.orders -= n;
    processing.orders += n;
  }
  d.orders.sameTimeYesterday.orders += rnd(0, 3);
  d.orders.sameTimeYesterday.sales += rnd(0, 6000);
  const last = d.trend[d.trend.length - 1];
  last.orders = d.orders.today.orders;
  last.sales = d.orders.today.sales;
  const v = rnd(10, 120);
  d.visits.today += v;
  let vh = d.visits.hours.find((x) => x.hour === nowHour);
  if (!vh) d.visits.hours.push((vh = { hour: nowHour, n: 0 }));
  vh.n += v;
  if (fresh && Math.random() < 0.3) d.stores.withOrder += 1;
  if (Math.random() < 0.25) {
    const add = rnd(150, 2500);
    d.income.today += add;
    d.income.parts.fees += add;
    d.income.last30[d.income.last30.length - 1].amount = d.income.today;
  }
  if (Math.random() < 0.4) d.security.botsBlocked[rnd(0, d.security.botsBlocked.length - 1)].orders += 1;
  if (Math.random() < 0.15) d.security.riskyMedium += 1;
  d.usage.smsParts += rnd(0, 12);
  d.usage.aiCredits += rnd(0, 400);
  const cpu = Math.min(85, Math.max(12, (d.host.cpuPercent ?? 30) + rnd(-8, 8)));
  d.host.cpuPercent = cpu;
  if (d.host.memory) d.host.memory.percent = Math.round(Math.min(70, Math.max(38, d.host.memory.percent + (Math.random() - 0.5))) * 10) / 10;
  d.host.load.one = Math.round(cpu * 0.12 * 100) / 100;
  d.database.latencyMs = rnd(1, 4);
  Object.assign(d, liveInfra());
  d.at = new Date().toISOString();
  return structuredClone(d);
}

// ---- 30-day dialogs (demo) ----

/**
 * Sample 30-day answers for the sections that have no history on a developer's computer (no Valkey day history, no
 * Cloudflare token): Cyber, Server, Dashboard & storefront load and Cloudflare. Other sections ask the local API.
 * Shaped like the server's office-wall-detail.service.ts answer. Addresses are documentation-only test IPs.
 */
export function demoDetail(section: string): unknown | null {
  const days = Array.from({ length: 30 }, (_, i) => dayAgo(29 - i));
  const series = (lo: number, hi: number) => days.map((day) => ({ day, value: rnd(lo, hi) }));
  const base = { section, from: days[0], to: days[29], charts: [] as unknown[], tables: [] as unknown[] };
  if (section === 'cyber') {
    const req = series(900_000, 1_700_000);
    req[22].value = 4_100_000; // a spike, so the chart shows what an attack day looks like
    const total = req.reduce((s, p) => s + p.value, 0);
    return {
      ...base,
      title: 'API traffic and attacks, last 30 days',
      stats: [
        { label: 'API requests', value: total, unit: 'count' },
        { label: 'Errors (4xx + 5xx)', value: 3.4, unit: 'pct' },
        { label: 'Server errors (5xx)', value: 1_920, unit: 'count' },
        { label: 'Rate-limited (429)', value: 48_300, unit: 'count' },
        { label: 'Failed sign-ins', value: 6_210, unit: 'count' },
        { label: 'Scanner probes', value: 9_870, unit: 'count' },
        { label: 'Average answer', value: 46, unit: 'ms' },
      ],
      charts: [
        {
          title: 'API requests per day',
          unit: 'count',
          kind: 'bars',
          points: req,
          compare: { label: 'Errors', points: req.map((p) => ({ day: p.day, value: Math.round(p.value * (p.value > 3e6 ? 0.3 : 0.03)) })) },
        },
        { title: 'Unique visitors (IPs) per day', unit: 'count', kind: 'area', points: series(14_000, 22_000) },
        { title: 'Failed sign-ins and scanner probes per day', unit: 'count', kind: 'bars', points: series(80, 300), compare: { label: 'Scanner probes', points: series(150, 500) } },
      ],
      tables: [
        {
          title: 'Busiest IPs (all 30 days)',
          columns: [{ label: 'IP' }, { label: 'Country' }, { label: 'Network' }, { label: 'Kind' }, { label: 'Requests', unit: 'count' }, { label: 'Share', unit: 'pct' }],
          rows: [
            ['198.51.100.17', 'US', 'DIGITALOCEAN-ASN', 'Data center / VPN', 912_000, 2.1],
            ['203.0.113.24', 'BD', 'Grameenphone', 'Mobile', 301_200, 0.7],
            ['203.0.113.140', 'BD', 'Link3 Technologies', 'Broadband', 188_400, 0.4],
            ['198.51.100.61', 'NL', 'Hetzner', 'Data center / VPN', 120_900, 0.3],
            ['192.0.2.205', 'IN', 'Reliance Jio', 'Broadband', 64_000, 0.1],
          ],
        },
        {
          title: 'Countries',
          columns: [{ label: 'Country' }, { label: 'Requests', unit: 'count' }, { label: 'Share', unit: 'pct' }],
          rows: [
            ['BD', Math.round(total * 0.88), 88],
            ['US', Math.round(total * 0.05), 5],
            ['IN', Math.round(total * 0.03), 3],
            ['NL', Math.round(total * 0.01), 1],
          ],
        },
      ],
    };
  }
  if (section === 'server') {
    const cpu = series(18, 45);
    return {
      ...base,
      title: 'Server, last 30 days',
      note: 'Sampled once a minute.',
      stats: [
        { label: 'CPU peak', value: 91.4, unit: 'pct' },
        { label: 'Memory peak', value: 63.2, unit: 'pct' },
        { label: 'Disk now', value: 35.5, unit: 'pct' },
        { label: 'Network in', value: 412.6, unit: 'gb' },
        { label: 'Network out', value: 1_284.3, unit: 'gb' },
      ],
      charts: [
        {
          title: 'CPU per day: average (bars) and peak (line)',
          unit: 'pct',
          kind: 'bars',
          points: cpu,
          compare: { label: 'Peak', points: cpu.map((p) => ({ day: p.day, value: Math.min(99, p.value + rnd(20, 45)) })) },
        },
        { title: 'Memory per day: average (bars) and peak (line)', unit: 'pct', kind: 'bars', points: series(40, 50), compare: { label: 'Peak', points: series(52, 63) } },
        { title: 'Network per day: out (bars) and in (line), GB', unit: 'gb', kind: 'bars', points: series(30, 55), compare: { label: 'In', points: series(10, 18) } },
      ],
    };
  }
  if (section === 'apps') {
    return {
      ...base,
      title: 'Dashboard and storefront load, last 30 days',
      note: 'Counted only while a wall screen is open (one check every 15 seconds).',
      stats: [
        { label: 'Storefront 1', value: 61, unit: 'ms', hint: '99.9% up' },
        { label: 'Storefront 2', value: 58, unit: 'ms', hint: '100% up' },
        { label: 'Storefront 3', value: 72, unit: 'ms', hint: '99.7% up' },
        { label: 'Dashboard (client)', value: 6, unit: 'ms', hint: '100% up' },
      ],
      charts: [{ title: 'Storefront 1: average answer per day', unit: 'ms', kind: 'bars', points: series(35, 120) }],
      tables: [
        {
          title: 'Processes',
          columns: [{ label: 'Process' }, { label: 'Checks', unit: 'count' }, { label: 'Average answer', unit: 'ms' }, { label: 'Down checks', unit: 'count' }, { label: 'Up', unit: 'pct' }],
          rows: [
            ['Storefront 1', 41_200, 61, 4, 99.9],
            ['Storefront 2', 41_200, 58, 0, 100],
            ['Storefront 3', 41_180, 72, 12, 99.7],
            ['Dashboard (client)', 41_200, 6, 0, 100],
          ],
        },
      ],
    };
  }
  if (section === 'edge') {
    const req = series(1_400_000, 2_600_000);
    const total = req.reduce((s, p) => s + p.value, 0);
    return {
      ...base,
      title: 'Cloudflare edge, last 30 days',
      stats: [
        { label: 'Requests (all sites)', value: total, unit: 'count' },
        { label: 'Threats stopped', value: 38_400, unit: 'count' },
        { label: 'From cache', value: 57.2, unit: 'pct' },
        { label: 'Data served', value: 2_412.8, unit: 'gb' },
      ],
      charts: [
        { title: 'Requests per day', unit: 'count', kind: 'area', points: req },
        { title: 'Threats per day', unit: 'count', kind: 'bars', points: series(400, 2_600) },
        { title: 'Unique visitors per day', unit: 'count', kind: 'area', points: series(60_000, 95_000) },
      ],
      tables: [
        {
          title: 'Countries',
          columns: [{ label: 'Country' }, { label: 'Requests', unit: 'count' }, { label: 'Share', unit: 'pct' }, { label: 'Threats', unit: 'count' }],
          rows: [
            ['BD', Math.round(total * 0.87), 87, 410],
            ['US', Math.round(total * 0.06), 6, 21_300],
            ['IN', Math.round(total * 0.03), 3, 2_100],
            ['NL', Math.round(total * 0.01), 1, 9_800],
          ],
        },
      ],
    };
  }
  return null;
}
