import { useEffect, useRef } from 'react';
import { PANELS, TILES } from './wallWidgets';

/**
 * What the wall shows on this screen: kept in this browser only (localStorage), so each office monitor can have its own mix.
 * The list holds every widget in the chosen order with an on/off flag; widgets added later appear at the end with their default.
 */
export type WallTheme = 'light' | 'dark';
export interface WallItem {
  id: string;
  on: boolean;
}
export interface WallSettings {
  theme: WallTheme;
  refreshSec: number;
  tiles: WallItem[];
  panels: WallItem[];
}

const KEY = 'regantify-wall-settings-v4';
const DEFAULT_TILES = ['orders', 'sales', 'income', 'aov', 'visits', 'activeStores', 'newStores', 'shoppers'];
const DEFAULT_PANELS = ['rushSales', 'rushServer', 'hours', 'traffic', 'cyber', 'sources', 'countries', 'network', 'apps', 'server', 'trend', 'status', 'channels', 'topStores', 'latest', 'security', 'todo'];
export const MAX_TILES = 16;
export const MAX_PANELS = 18;

/** One-click mixes for a screen, by who watches it. Nothing in a preset shows the same number twice. */
const PRESETS: Array<{ name: string; hint: string; tiles: string[]; panels: string[] }> = [
  { name: 'All-round', hint: 'business, cyber and server together', tiles: DEFAULT_TILES, panels: DEFAULT_PANELS },
  {
    name: 'Business',
    hint: 'orders, money, stores',
    tiles: ['orders', 'sales', 'income', 'aov', 'visits', 'activeStores', 'newStores', 'mrr'],
    panels: ['hours', 'trend', 'status', 'source', 'payment', 'zone', 'channels', 'topStores', 'topProducts', 'latest', 'plans', 'income30', 'signups30', 'todo'],
  },
  {
    name: 'Cyber team',
    hint: 'attacks, IPs, countries',
    tiles: ['orders', 'visits', 'activeStores', 'shoppers'],
    panels: ['cyber', 'traffic', 'sources', 'countries', 'edge', 'bots', 'security', 'network', 'apps', 'server'],
  },
  {
    name: 'Developers',
    hint: 'errors, slow routes, jobs',
    tiles: ['orders', 'visits', 'sms', 'ai'],
    panels: ['devErrors', 'slowRoutes', 'integrations', 'jobs', 'server', 'apps', 'traffic', 'network', 'cyber', 'latest'],
  },
];

/** The preset's items on, in its order, then everything else off. */
function applyPreset(items: WallItem[], on: string[]): WallItem[] {
  const all = items.map((x) => x.id);
  return [...on.filter((id) => all.includes(id)).map((id) => ({ id, on: true })), ...all.filter((id) => !on.includes(id)).map((id) => ({ id, on: false }))];
}

/** Panels added later that a wall already set up should get switched on by itself (once, while there is room). */
const FRESH_ON = ['rushSales', 'rushServer'];

function withDefaults(saved: WallItem[] | undefined, all: string[], defaults: string[], max = Infinity): WallItem[] {
  const known = new Set(all);
  const list = (saved ?? []).filter((x) => known.has(x.id));
  const have = new Set(list.map((x) => x.id));
  if (!saved?.length) return [...defaults.map((id) => ({ id, on: true })), ...all.filter((id) => !defaults.includes(id)).map((id) => ({ id, on: false }))];
  let on = list.filter((x) => x.on).length;
  const added = all.filter((id) => !have.has(id)).map((id) => {
    const fresh = FRESH_ON.includes(id) && on < max;
    if (fresh) on += 1;
    return { id, on: fresh };
  });
  return [...list, ...added];
}

export function defaultSettings(): WallSettings {
  return {
    theme: 'light',
    refreshSec: 5,
    tiles: withDefaults(undefined, TILES.map((t) => t.id), DEFAULT_TILES),
    panels: withDefaults(undefined, PANELS.map((p) => p.id), DEFAULT_PANELS),
  };
}

export function loadSettings(): WallSettings {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const s = JSON.parse(raw) as Partial<WallSettings>;
    return {
      theme: s.theme === 'dark' ? 'dark' : 'light',
      refreshSec: [5, 15, 30, 60].includes(Number(s.refreshSec)) ? Number(s.refreshSec) : 5,
      tiles: withDefaults(s.tiles, TILES.map((t) => t.id), DEFAULT_TILES),
      panels: withDefaults(s.panels, PANELS.map((p) => p.id), DEFAULT_PANELS, MAX_PANELS),
    };
  } catch {
    return base;
  }
}

export function saveSettings(s: WallSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private window or blocked storage: the choice lasts until the page reloads.
  }
}

function move<T>(list: T[], i: number, by: number): T[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

function ItemList({
  title,
  hint,
  items,
  labels,
  max,
  onChange,
  noteOf,
}: {
  title: string;
  hint: string;
  items: WallItem[];
  labels: Record<string, string>;
  max: number;
  onChange: (v: WallItem[]) => void;
  noteOf?: (id: string) => string | null;
}) {
  const onCount = items.filter((x) => x.on).length;
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-[0.9em] text-[var(--muted)]">
          {onCount} shown · {hint}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={it.id} className="wall-item">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={it.on}
                disabled={!it.on && onCount >= max}
                onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, on: e.target.checked } : x)))}
              />
              <span className={`truncate ${it.on ? '' : 'text-[var(--muted)]'}`}>{labels[it.id] ?? it.id}</span>
              {it.on && noteOf?.(it.id) && <span className="shrink-0 text-[0.8em] text-[var(--warn)]">{noteOf(it.id)}</span>}
            </label>
            <button type="button" className="wall-move" aria-label="Move up" disabled={i === 0} onClick={() => onChange(move(items, i, -1))}>
              ↑
            </button>
            <button type="button" className="wall-move" aria-label="Move down" disabled={i === items.length - 1} onClick={() => onChange(move(items, i, 1))}>
              ↓
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SettingsDialog({ open, value, onChange, onClose }: { open: boolean; value: WallSettings; onChange: (s: WallSettings) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const tileLabels = Object.fromEntries(TILES.map((t) => [t.id, t.label]));
  const panelOn = new Set(value.panels.filter((p) => p.on).map((p) => p.id));
  const titleOf = (id: string) => PANELS.find((p) => p.id === id)?.title ?? id;
  /** A tile is not drawn while a panel showing the same number is on (OfficeWall): say so here. */
  const tileNote = (id: string) => {
    const twin = TILES.find((t) => t.id === id)?.twins?.find((p) => panelOn.has(p));
    return twin ? `hidden: in "${titleOf(twin)}"` : null;
  };
  const panelLabels = Object.fromEntries(PANELS.map((p) => [p.id, p.title]));

  return (
    <dialog ref={ref} className="wall-dialog" onClose={() => !ref.current?.open && onClose()} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="flex max-h-[calc(100dvh-48px)] flex-col">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-[1.25em] font-semibold">Wall settings</h2>
          <button type="button" className="rounded-lg px-2 py-1 text-[var(--ink2)] hover:bg-[var(--track)]" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[var(--ink2)]">Theme</span>
              <div className="wall-seg">
                {(['light', 'dark'] as const).map((t) => (
                  <button key={t} type="button" aria-pressed={value.theme === t} onClick={() => onChange({ ...value, theme: t })}>
                    {t === 'light' ? 'Light' : 'Dark'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[var(--ink2)]">Refresh every</span>
              <div className="wall-seg">
                {[5, 15, 30, 60].map((s) => (
                  <button key={s} type="button" aria-pressed={value.refreshSec === s} onClick={() => onChange({ ...value, refreshSec: s })}>
                    {s} s
                  </button>
                ))}
              </div>
            </div>
          </div>
          <section>
            <h3 className="mb-2 font-semibold">Ready-made screens</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="rounded-xl border border-[var(--line)] px-3 py-2 text-left hover:bg-[var(--track)]"
                  onClick={() => onChange({ ...value, tiles: applyPreset(value.tiles, p.tiles), panels: applyPreset(value.panels, p.panels) })}
                >
                  <span className="block font-semibold">{p.name}</span>
                  <span className="block text-[0.85em] text-[var(--muted)]">{p.hint}</span>
                </button>
              ))}
            </div>
          </section>
          <ItemList title="Number tiles (top row)" hint="8 fit in one row" items={value.tiles} labels={tileLabels} max={MAX_TILES} noteOf={tileNote} onChange={(tiles) => onChange({ ...value, tiles })} />
          <ItemList title="Charts and lists" hint="the grid resizes to fit them all" items={value.panels} labels={panelLabels} max={MAX_PANELS} onChange={(panels) => onChange({ ...value, panels })} />
          <p className="text-[0.9em] text-[var(--muted)]">Saved in this browser only, so each office screen can show its own mix. Everything always fits on one screen with no scrolling.</p>
        </div>
        <div className="flex justify-between border-t border-[var(--line)] px-5 py-3">
          <button type="button" className="rounded-lg px-3 py-1.5 text-[var(--ink2)] hover:bg-[var(--track)]" onClick={() => onChange(defaultSettings())}>
            Reset to default
          </button>
          <button type="button" className="rounded-lg bg-[var(--s1)] px-4 py-1.5 font-medium text-white" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
