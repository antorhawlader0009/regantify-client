import { useEffect, useMemo, useState } from 'react';
import './wall.css';
import { PANELS, TILES, TileCard, type PanelDef, type Summary, type WallHistory } from './wallWidgets';
import { SettingsDialog, loadSettings, saveSettings, type WallSettings } from './wallSettings';
import { DETAIL_OF, DetailDialog } from './wallDetail';
import { time12 } from './wallCharts';

/**
 * Office wall (2026-11-18, redesigned 2026-11-19): one screen for the office monitor with the server, today's orders, the platform's
 * money and the busiest stores. Light by default; what it shows, the order, the theme and the refresh time are picked in its own
 * Settings (gear button) and kept in this browser. Everything is sized to the window so it never scrolls.
 * Opened only on its own private address, behind Cloudflare Access (an emailed one-time code); the data route checks
 * Cloudflare's token too (server/src/office-wall/). It asks the same address (same origin).
 */

/** Points kept for the CPU / memory / network lines: 120 refreshes = 10 minutes at 5 s. */
const HISTORY = 120;

function nextHistory(h: WallHistory, body: Summary): WallHistory {
  const push = (list: number[], v: number | null | undefined) => (v === null || v === undefined ? list : [...list, v].slice(-HISTORY));
  return {
    cpu: push(h.cpu, body.host.cpuPercent),
    memory: push(h.memory, body.host.memory?.percent),
    netIn: push(h.netIn, body.network?.inBps === null || body.network?.inBps === undefined ? null : body.network.inBps * 8),
    netOut: push(h.netOut, body.network?.outBps === null || body.network?.outBps === undefined ? null : body.network.outBps * 8),
  };
}

function useViewport() {
  const [v, setV] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** Columns and rows for the panel grid so every panel fits; spare cells go to panels that read better wide. */
const WIDE_NEXT = ['latest', 'topStores', 'topProducts', 'channels', 'income30', 'signups30', 'visitHours', 'todo', 'server'];
/** A panel's comfortable width (px): narrower than this the grid prefers another row. */
const PANEL_PX = 270;
/** The narrowest (px) and the shortest (px) a panel may ever get; past that, panels are left out (and the header says so). */
const MIN_PANEL_PX = 220;
const MIN_PANEL_H = 150;
/** Narrowest a number tile may get (px). */
const MIN_TILE_PX = 175;

/** How many tile rows a number of tiles takes at this width. */
function tileRowsFor(count: number, width: number): number {
  const perRow = Math.min(8, Math.max(2, Math.floor(width / MIN_TILE_PX)));
  return count ? Math.ceil(count / perRow) : 0;
}

/**
 * Columns and rows for the panels so that every one fits with no scrolling. Spare cells go to panels that read better wide.
 * On a small screen it adds rows, then narrows columns down to MIN_PANEL_PX, and only when even that can't hold them
 * leaves the last panels out (`hidden`).
 */
function gridFor(all: PanelDef[], width: number, height: number, tileRows: number) {
  const tileH = Math.min(Math.max(height * 0.11, 80), 150);
  const availH = height - 64 - tileRows * (tileH + 12) - 12;
  const maxRows = Math.max(1, Math.floor(availH / MIN_PANEL_H));
  const prefCols = Math.max(1, Math.floor(width / PANEL_PX));
  const hardCols = Math.max(1, Math.floor(width / MIN_PANEL_PX));
  const capacity = maxRows * hardCols;
  const panels = all.slice(0, capacity);
  const hidden = all.length - panels.length;
  const n = panels.length;
  const rowsFor = (u: number) => (u <= 4 ? 1 : u <= 10 ? 2 : u <= 18 ? 3 : 4);
  const fit = (u: number) => {
    let r = rowsFor(u);
    let c = Math.ceil(u / r);
    if (c > prefCols) {
      c = prefCols;
      r = Math.ceil(u / c);
    }
    if (r > maxRows) {
      r = maxRows;
      c = Math.min(hardCols, Math.ceil(u / r));
      r = Math.ceil(u / c);
    }
    return { r, c };
  };
  let wide = new Set(panels.filter((p) => p.wide).map((p) => p.id));
  let units = n + wide.size;
  let { r: rows, c: cols } = fit(units);
  // Wide panels only when they don't push the grid past what the screen holds.
  if (cols < 3 || rows > maxRows || cols * rows < units) {
    wide = new Set();
    units = n;
    ({ r: rows, c: cols } = fit(units));
  }
  let spare = cols * rows - units;
  if (cols >= 3) {
    const ids = panels.map((p) => p.id);
    for (const id of [...WIDE_NEXT, ...ids]) {
      if (spare <= 0) break;
      if (ids.includes(id) && !wide.has(id)) {
        wide.add(id);
        spare -= 1;
      }
    }
  }
  return { cols, rows, wide, panels, hidden };
}

export default function OfficeWall() {
  const [settings, setSettings] = useState<WallSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  /** The section whose 30-day dialog is open (wallDetail.tsx), or null. */
  const [detail, setDetail] = useState<string | null>(null);
  const [data, setData] = useState<Summary | null>(null);
  const [hist, setHist] = useState<WallHistory>({ cpu: [], memory: [], netIn: [], netOut: [] });
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const now = useClock();
  const refreshMs = settings.refreshSec * 1000;

  const update = (s: WallSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  useEffect(() => {
    document.title = 'Regantify wall';
    let alive = true;
    const load = async () => {
      try {
        // Dev build only: `/wall?demo` shows sample numbers; otherwise it asks the local API on port 4000 (needs WALL_DEV_OPEN=true there).
        if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
          const { demoSummary } = await import('./wallDemo');
          const body = demoSummary();
          if (!alive) return;
          setData(body);
          setError('');
          setHist((h) => nextHistory(h, body));
          return;
        }
        const url = import.meta.env.DEV ? `${location.protocol}//${location.hostname}:4000/v1/wall/summary` : '/v1/wall/summary';
        const res = await fetch(url, { credentials: import.meta.env.DEV ? 'omit' : 'include', cache: 'no-store' });
        if (res.status === 401) {
          // An old or broken Cloudflare sign-in: sign out of Access and back in (a new emailed code).
          if (alive) setSignedOut(true);
          throw new Error('Your Cloudflare sign-in is not accepted.');
        }
        if (!res.ok) throw new Error(`The server answered ${res.status}.`);
        const body = (await res.json()) as Summary;
        if (!alive) return;
        setData(body);
        setError('');
        setSignedOut(false);
        setHist((h) => nextHistory(h, body));
      } catch (e) {
        if (alive) setError((e as Error).message || 'Could not reach the server.');
      }
    };
    void load();
    const t = setInterval(load, refreshMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refreshMs]);


  const chosenPanels = useMemo(() => settings.panels.filter((p) => p.on).map((p) => PANELS.find((d) => d.id === p.id)!).filter(Boolean), [settings.panels]);
  const { w: width, h: height } = useViewport();
  // A tile whose number a panel on screen already shows is left out, so nothing is on the wall twice.
  const tilesFor = (shown: Set<string>) =>
    settings.tiles.filter((t) => t.on).map((t) => TILES.find((d) => d.id === t.id)!).filter((t) => t && !t.twins?.some((id) => shown.has(id)));
  const grid = useMemo(() => {
    const guess = tilesFor(new Set(chosenPanels.map((p) => p.id)));
    return gridFor(chosenPanels, width, height, tileRowsFor(guess.length, width));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenPanels, settings.tiles, width, height]);
  const panels = grid.panels;
  const shownPanels = useMemo(() => new Set(panels.map((p) => p.id)), [panels]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tiles = useMemo(() => tilesFor(shownPanels), [settings.tiles, shownPanels]);
  const tileRows = tileRowsFor(tiles.length, width);
  const tileCols = Math.max(1, Math.ceil(tiles.length / Math.max(1, tileRows)));

  const clock = time12(now, true);
  const date = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const nowHour = Number(now.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', hour12: false })) % 24;
  const stale = data ? now.getTime() - new Date(data.at).getTime() > Math.max(refreshMs * 4, 60_000) : false;

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className="wall-root" data-theme={settings.theme}>
      <header className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="text-[1.6em] font-bold tracking-tight">Regantify</h1>
          <span className="truncate text-[var(--ink2)]">{date}</span>
        </div>
        <div className="flex items-center gap-3">
          {grid.hidden > 0 && (
            <span className="text-[0.92em] font-semibold text-[var(--bad)]" title="Pick fewer panels in Settings, or use a bigger screen">
              {grid.hidden} panel{grid.hidden === 1 ? '' : 's'} hidden: screen too small
            </span>
          )}
          <span className={`text-[0.92em] ${error || stale ? 'font-semibold text-[var(--bad)]' : 'text-[var(--muted)]'}`}>
            {error || (stale ? 'Data is old: the server is not answering' : data ? `Updated ${time12(data.at, true)}` : 'Loading…')}
          </span>
          <span className="text-[2em] font-bold tabular-nums leading-none">{clock}</span>
          <button type="button" className="wall-icon-btn" onClick={fullscreen} aria-label="Full screen" title="Full screen">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
          <button type="button" className="wall-icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
            <span className="text-[0.9em]">Settings</span>
          </button>
        </div>
      </header>

      {signedOut && (
        <div className="wall-alerts shrink-0 items-center justify-between">
          <span>Cloudflare sign-in is not accepted. Sign in again with your email code.</span>
          <a href="/cdn-cgi/access/logout" className="rounded-lg bg-white px-3 py-1 text-[#b91c1c]">
            Sign in again
          </a>
        </div>
      )}

      {data && (data.alerts.length > 0 || data.cyber?.level === 'ATTACK') && (
        <div className="wall-alerts shrink-0" role="alert">
          {data.cyber?.level === 'ATTACK' && <span>⚠ Possible cyber attack: {data.cyber.reasons.slice(0, 2).join(' · ')}</span>}
          {data.alerts.map((a) => (
            <span key={a}>⚠ {a}</span>
          ))}
        </div>
      )}

      {data ? (
        <>
          {tiles.length > 0 && (
            <section className="grid shrink-0 gap-[0.75em]" style={{ gridTemplateColumns: `repeat(${tileCols}, minmax(0, 1fr))`, gridAutoRows: 'clamp(5.8em, 11vh, 9.5em)' }}>
              {tiles.map((t) => (
                <TileCard key={t.id} def={t} d={data} hist={hist} shown={shownPanels} onOpen={DETAIL_OF[`tile:${t.id}`] ? () => setDetail(DETAIL_OF[`tile:${t.id}`]) : undefined} />
              ))}
            </section>
          )}
          {panels.length > 0 && (
            <section
              className="grid min-h-0 flex-1 gap-[0.75em]"
              style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`, gridAutoFlow: 'row dense' }}
            >
              {panels.map((p) => (
                <div
                  key={p.id}
                  className={`wall-card wall-panel ${DETAIL_OF[p.id] ? 'wall-open' : ''}`}
                  style={grid.wide.has(p.id) ? { gridColumn: 'span 2' } : undefined}
                  {...(DETAIL_OF[p.id]
                    ? {
                        role: 'button',
                        tabIndex: 0,
                        'aria-label': `${p.title}: open the last 30 days`,
                        onClick: () => setDetail(DETAIL_OF[p.id]),
                        onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setDetail(DETAIL_OF[p.id])),
                      }
                    : {})}
                >
                  <h2 className="wall-panel-title">
                    <span className="truncate">{p.title}</span>
                    {DETAIL_OF[p.id] && <span className="wall-30d shrink-0 text-[0.8em] font-medium text-[var(--s1)]">30 days ›</span>}
                  </h2>
                  <div className="wall-panel-body">{p.render(data, { hist, nowHour, shown: shownPanels })}</div>
                </div>
              ))}
            </section>
          )}
        </>
      ) : (
        <div className="grid flex-1 place-items-center text-[1.2em] text-[var(--muted)]">{error || 'Loading the wall…'}</div>
      )}

      <SettingsDialog open={showSettings} value={settings} onChange={update} onClose={() => setShowSettings(false)} />
      <DetailDialog section={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
