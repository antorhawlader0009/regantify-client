import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Small SVG charts for the office wall. Each one measures its own box (useSize) and draws to fit it exactly, so the wall never scrolls.
 * Colours come from CSS variables on the wall root (--s1..--s8 categorical, --ink*, --line), so light and dark swap in one place.
 * Marks follow the dataviz rules: thin bars with 4 px rounded tops, 2 px lines, a 2 px surface gap between donut slices, quiet grid.
 */

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: Math.floor(r.width), h: Math.floor(r.height) }));
    });
    ro.observe(el);
    // A box mounted inside a dialog that is just opening can be measured as 0 first; measure again once it has laid out.
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: Math.floor(r.width), h: Math.floor(r.height) }));
    };
    const raf = requestAnimationFrame(measure);
    const late = setTimeout(measure, 250);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(late);
    };
  }, []);
  return [ref, size] as const;
}

/** A box that fills the space it is given and hands its size to the drawing. */
export function Fit({ children, className = '' }: { children: (w: number, h: number) => ReactNode; className?: string }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  return (
    <div ref={ref} className={`wall-fit ${className}`}>
      {w > 0 && h > 0 ? children(w, h) : null}
    </div>
  );
}

const roundedTop = (x: number, y: number, w: number, h: number, r: number) => {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

/** A tiny trend line with a soft fill, for tiles. */
export function Sparkline({ values, color = 'var(--s1)', w, h }: { values: number[]; color?: string; w: number; h: number }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const step = w / (values.length - 1);
  const y = (v: number) => h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`);
  const id = `sp${Math.abs(hash(color + values.join(',')))}`;
  return (
    <svg width={w} height={h} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,${h} L${pts.join(' L')} L${w},${h} Z`} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(values.length - 1) * step} cy={y(values[values.length - 1])} r={3} fill={color} stroke="var(--card)" strokeWidth={1.5} />
    </svg>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
  note?: string;
}

/** Donut with the total in the middle and a legend (value and share) beside it, as many rows as fit. */
export function Donut({ slices, w, h, centerLabel, format = (n) => n.toLocaleString('en-IN') }: { slices: DonutSlice[]; w: number; h: number; centerLabel: string; format?: (n: number) => string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const d = Math.max(40, Math.min(h, w * 0.38));
  const r = d / 2;
  const stroke = Math.max(8, r * 0.3);
  const rad = r - stroke / 2;
  const C = 2 * Math.PI * rad;
  let acc = 0;
  const shown = slices.filter((s) => s.value > 0);
  const rowH = 22;
  const rows = Math.max(1, Math.floor(h / rowH));
  return (
    <div className="flex h-full items-center gap-3">
      <svg width={d} height={d} className="shrink-0" role="img" aria-label={`${centerLabel}: ${shown.map((s) => `${s.label} ${s.value}`).join(', ')}`}>
        <circle cx={r} cy={r} r={rad} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        {total > 0 &&
          shown.map((s) => {
            const len = (s.value / total) * C;
            const gap = shown.length > 1 ? Math.min(2, len / 2) : 0;
            const el = (
              <circle
                key={s.label}
                cx={r}
                cy={r}
                r={rad}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(0, len - gap)} ${C}`}
                strokeDashoffset={-acc}
                transform={`rotate(-90 ${r} ${r})`}
              >
                <title>{`${s.label}: ${format(s.value)} (${Math.round((s.value / total) * 100)}%)`}</title>
              </circle>
            );
            acc += len;
            return el;
          })}
        <text x={r} y={r - 2} textAnchor="middle" className="wall-donut-total">
          {format(total)}
        </text>
        <text x={r} y={r + 14} textAnchor="middle" className="wall-donut-label">
          {centerLabel}
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-[2px]">
        {(shown.length ? shown : slices).slice(0, rows).map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[0.92em] leading-[20px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-[var(--ink2)]">{s.label}</span>
            <span className="tabular-nums font-medium">{format(s.value)}</span>
            <span className="w-9 text-right tabular-nums text-[var(--muted)]">{total ? `${Math.round((s.value / total) * 100)}%` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BarRow {
  label: string;
  sub?: string;
  value: number;
  right: string;
  color: string;
}

/** Ranked rows with a thin bar under each label; draws as many rows as fit in the height. */
export function BarList({ rows, h, empty = 'Nothing yet today.', numbered }: { rows: BarRow[]; h: number; empty?: string; numbered?: boolean }) {
  if (!rows.length) return <p className="text-[var(--muted)]">{empty}</p>;
  const rowH = 30;
  const n = Math.max(1, Math.floor(h / rowH));
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="flex h-full flex-col justify-start">
      {rows.slice(0, n).map((r, i) => (
        <li key={`${r.label}-${i}`} className="flex flex-col justify-center" style={{ height: rowH }}>
          <div className="flex items-baseline gap-2 leading-tight">
            {numbered && <span className="w-4 shrink-0 text-right text-[0.85em] tabular-nums text-[var(--muted)]">{i + 1}</span>}
            {/* Label and sub each cut on their own, so neither runs past the row. */}
            <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
              <span className="min-w-0 shrink truncate">{r.label}</span>
              {r.sub && <span className="min-w-0 shrink-[2] truncate text-[0.85em] text-[var(--muted)]">{r.sub}</span>}
            </span>
            <span className="shrink-0 tabular-nums font-medium">{r.right}</span>
          </div>
          <div className={`mt-[3px] h-[5px] overflow-hidden rounded-full bg-[var(--track)] ${numbered ? 'ml-6' : ''}`}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Vertical bars with an optional comparison line (same unit, one axis). */
export function ColumnChart({
  values,
  compare,
  labels,
  w,
  h,
  color = 'var(--s1)',
  compareColor = 'var(--s2)',
  highlight,
  tip,
  tickEvery = 6,
}: {
  values: number[];
  compare?: number[];
  labels: string[];
  w: number;
  h: number;
  color?: string;
  compareColor?: string;
  highlight?: number;
  tip: (i: number) => string;
  tickEvery?: number;
}) {
  const axisH = 16;
  const leftW = 28;
  const plotW = Math.max(10, w - leftW);
  const plotH = Math.max(10, h - axisH - 4);
  const max = niceMax(Math.max(1, ...values, ...(compare ?? [])));
  const n = values.length;
  const slot = plotW / n;
  const bw = Math.max(2, Math.min(28, slot - 2));
  const y = (v: number) => 4 + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const linePts = compare?.map((v, i) => `${leftW + i * slot + slot / 2},${y(v)}`);
  return (
    <svg width={w} height={h} role="img" aria-label={labels.map((l, i) => tip(i)).slice(0, 3).join('; ')}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={leftW} x2={w} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
          <text x={leftW - 4} y={y(t) + 4} textAnchor="end" className="wall-axis">
            {compact(t)}
          </text>
        </g>
      ))}
      {values.map((v, i) => {
        const x = leftW + i * slot + (slot - bw) / 2;
        const top = y(v);
        return (
          <g key={i}>
            <rect x={leftW + i * slot} y={4} width={slot} height={plotH} fill="transparent">
              <title>{tip(i)}</title>
            </rect>
            <path d={roundedTop(x, top, bw, 4 + plotH - top, 4)} fill={color} opacity={highlight === undefined || highlight === i ? 1 : 0.78} pointerEvents="none" />
          </g>
        );
      })}
      {linePts && <polyline points={linePts.join(' ')} fill="none" stroke={compareColor} strokeWidth={2} strokeLinejoin="round" strokeDasharray="5 4" pointerEvents="none" />}
      {labels.map((l, i) =>
        (i % tickEvery === 0 && n - 1 - i >= tickEvery / 2) || i === n - 1 ? (
          <text key={i} x={leftW + i * slot + slot / 2} y={h - 3} textAnchor="middle" className="wall-axis">
            {l}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** Area over time with a dotted grid, value labels on the axis only. */
export function AreaChart({ values, labels, w, h, color = 'var(--s3)', tip, tickEvery = 7 }: { values: number[]; labels: string[]; w: number; h: number; color?: string; tip: (i: number) => string; tickEvery?: number }) {
  const axisH = 16;
  const leftW = 34;
  const plotW = Math.max(10, w - leftW - 4);
  const plotH = Math.max(10, h - axisH - 6);
  const max = niceMax(Math.max(1, ...values));
  const n = values.length;
  const step = n > 1 ? plotW / (n - 1) : plotW;
  const x = (i: number) => leftW + i * step;
  const y = (v: number) => 6 + plotH - (v / max) * plotH;
  const pts = values.map((v, i) => `${x(i)},${y(v)}`);
  const id = `ar${Math.abs(hash(color + n + values.join(',')))}`;
  return (
    <svg width={w} height={h} role="img" aria-label={tip(n - 1)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.32" />
          <stop offset="1" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, max / 2, max].map((t) => (
        <g key={t}>
          <line x1={leftW} x2={w} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
          <text x={leftW - 4} y={y(t) + 4} textAnchor="end" className="wall-axis">
            {compact(t)}
          </text>
        </g>
      ))}
      <path d={`M${x(0)},${y(0)} L${pts.join(' L')} L${x(n - 1)},${y(0)} Z`} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <g key={i}>
          <rect x={x(i) - step / 2} y={6} width={step} height={plotH} fill="transparent">
            <title>{tip(i)}</title>
          </rect>
        </g>
      ))}
      <circle cx={x(n - 1)} cy={y(values[n - 1] ?? 0)} r={4} fill={color} stroke="var(--card)" strokeWidth={2} />
      {labels.map((l, i) =>
        (i % tickEvery === 0 && n - 1 - i >= tickEvery / 2) || i === n - 1 ? (
          <text key={i} x={x(i)} y={h - 3} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="wall-axis">
            {l}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** A ring gauge: grey track, coloured arc, red from 85 %. The number is written inside, so colour is never the only signal. */
export function Ring({ percent, label, size, color = 'var(--s1)' }: { percent: number | null; label: string; size: number; color?: string }) {
  const p = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  const high = percent !== null && p >= 85;
  const stroke = Math.max(6, size * 0.11);
  const r = size / 2 - stroke / 2;
  const C = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} role="img" aria-label={`${label} ${percent ?? 'unknown'}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={high ? 'var(--bad)' : color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(p / 100) * C} ${C}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 2} textAnchor="middle" className="wall-ring-value" style={{ fontSize: size * 0.22 }}>
        {percent === null ? '…' : `${Math.round(p)}%`}
      </text>
      <text x={size / 2} y={size / 2 + size * 0.2} textAnchor="middle" className="wall-ring-label" style={{ fontSize: Math.max(9, size * 0.11) }}>
        {label}
      </text>
    </svg>
  );
}

/**
 * A 24-hour watch face (the owner's request, 2026-11-19): midnight at the top, noon at the bottom, one wedge per hour whose
 * length shows that hour's value, the busiest hour drawn solid with its time in the middle, and a hand at the current Dhaka
 * time. An hour with no data (null) leaves its slot empty. Every wedge has a tooltip, and the label says the busiest hour, so
 * colour is never the only signal.
 */
export function ClockDial({
  values,
  size,
  color = 'var(--s1)',
  nowHour,
  nowMinute = 0,
  label,
  tip,
}: {
  values: Array<number | null>;
  size: number;
  color?: string;
  nowHour: number;
  nowMinute?: number;
  label: string;
  tip: (hour: number) => string;
}) {
  const c = size / 2;
  const pad = Math.max(12, size * 0.1);
  const R = c - pad;
  const r0 = R * 0.4;
  const max = Math.max(0, ...values.map((v) => v ?? 0));
  const peak = max > 0 ? values.findIndex((v) => v === max) : -1;
  const at = (a: number, r: number) => [c + r * Math.sin(a), c - r * Math.cos(a)];
  const step = (Math.PI * 2) / 24;
  const gap = step * 0.12;
  const wedge = (h: number, r1: number) => {
    const a0 = h * step + gap / 2;
    const a1 = (h + 1) * step - gap / 2;
    const [x0, y0] = at(a0, r0);
    const [x1, y1] = at(a0, r1);
    const [x2, y2] = at(a1, r1);
    const [x3, y3] = at(a1, r0);
    return `M${x0},${y0} L${x1},${y1} A${r1},${r1} 0 0 1 ${x2},${y2} L${x3},${y3} A${r0},${r0} 0 0 0 ${x0},${y0} Z`;
  };
  const hand = ((nowHour + nowMinute / 60) / 24) * Math.PI * 2;
  const [hx, hy] = at(hand, R + pad * 0.35);
  const fs = Math.max(9, size * 0.065);
  return (
    <svg width={size} height={size} role="img" aria-label={peak >= 0 ? `${label}: busiest at ${String(peak).padStart(2, '0')}:00` : `${label}: no data yet`}>
      {Array.from({ length: 24 }, (_, h) => (
        <path key={`t${h}`} d={wedge(h, R)} fill="var(--track)" />
      ))}
      {values.map((v, h) => {
        if (v === null || max <= 0) return null;
        const r1 = r0 + Math.max(0.04, v / max) * (R - r0);
        return (
          <path key={h} d={wedge(h, r1)} fill={color} fillOpacity={h === peak ? 1 : 0.3 + 0.55 * (v / max)}>
            <title>{tip(h)}</title>
          </path>
        );
      })}
      {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
        const [x, y] = at(h * step, R + pad * 0.55);
        const big = h % 6 === 0;
        return (
          <text key={`l${h}`} x={x} y={y + fs * 0.35} textAnchor="middle" fill={big ? 'var(--ink2)' : 'var(--muted)'} style={{ fontSize: big ? fs : fs * 0.85, fontWeight: big ? 600 : 400 }}>
            {String(h).padStart(2, '0')}
          </text>
        );
      })}
      <line x1={c} y1={c} x2={hx} y2={hy} stroke="var(--ink)" strokeWidth={Math.max(1.5, size * 0.008)} strokeLinecap="round" opacity={0.75} />
      <circle cx={c} cy={c} r={r0 * 0.92} fill="var(--card)" />
      <circle cx={c} cy={c} r={Math.max(2, size * 0.012)} fill="var(--ink)" />
      <text x={c} y={c - fs * 0.25} textAnchor="middle" fill="var(--ink)" style={{ fontSize: fs * 1.55, fontWeight: 700 }}>
        {peak >= 0 ? `${String(peak).padStart(2, '0')}:00` : '…'}
      </text>
      <text x={c} y={c + fs * 1.15} textAnchor="middle" fill="var(--muted)" style={{ fontSize: fs * 0.9 }}>
        {peak >= 0 ? 'busiest' : 'collecting'}
      </text>
    </svg>
  );
}

export function niceMax(v: number): number {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return nice * p;
}

/** Short number for axes and counts: 950, 1.2k, 284k, 1.28M. */
export function compact(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

/**
 * Taka always in thousands so amounts stay short on the wall (the owner's choice, 2026-11-19): ৳120 = ৳0.12k, ৳2,500 = ৳2.5k,
 * ৳48,250 = ৳48.3k, ৳3,84,000 = ৳384k; from ৳10 lakh it switches to M (৳12,84,500 = ৳1.28M) so it never grows long again.
 */
export function kTaka(n: number): string {
  const v = Math.round(n);
  if (v === 0) return '৳0';
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${sign}৳${+(a / 1_000_000).toFixed(2)}M`;
  const k = a / 1000;
  return `${sign}৳${+k.toFixed(k < 10 ? 2 : k < 100 ? 1 : 0)}k`;
}
