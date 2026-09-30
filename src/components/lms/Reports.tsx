import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { changeOf, formatValue, type ValueKind } from '../analytics/format';
import { lmsApi, type LmsCompared, type LmsReport } from '../../lib/lmsApi';

/*
 * The pieces of LMS > Reports (LMS-plan.md Step 11), in the LMS's own light
 * theme. The change maths and number formats come from the dashboard's
 * Analytics (components/analytics/format.ts), so both read the same way;
 * the look is the LMS's. Charts follow the dataviz rules: one hue for
 * magnitude (--lms-chart), thin marks, the number always printed or in a
 * tooltip, and a table view.
 */

/** "45 sec", "12 min", "3 h 5 min", "2 days". */
export function formatMinutes(min: number | null): string {
  if (min == null) return '—';
  if (min < 1) return `${Math.max(1, Math.round(min * 60))} sec`;
  if (min < 60) return `${Math.round(min)} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) {
    const rest = Math.round(min - hours * 60);
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function formatPct(value: number | null): string {
  return value == null ? '—' : `${Math.round(value)}%`;
}

/** The Call Desk's "My day": what the caller did today, and what's still due. */
export function MyDay() {
  const day = useQuery({ queryKey: ['lms', 'my-day'], queryFn: lmsApi.myDay, refetchInterval: 60_000 });
  if (!day.data) return null;
  const { contacts, won, tasksDue } = day.data;
  return (
    <p className="mt-0.5 text-sm tabular-nums">
      <span className="text-lms-muted">Today: </span>
      {contacts} contact{contacts === 1 ? '' : 's'}, {won} won, {tasksDue} task{tasksDue === 1 ? '' : 's'} due
    </p>
  );
}

/** Headline numbers as one joined strip, split by hairlines. */
export function Strip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-lms-line bg-lms-line sm:grid-cols-3 lg:grid-cols-6">{children}</div>
  );
}

/**
 * One headline number and its change from the previous period: an arrow
 * and signed words, so it never relies on colour. Rates change in points.
 */
export function StripCell({
  label,
  value,
  kind,
  display,
  lowerIsBetter,
  hint,
}: {
  label: string;
  value: LmsCompared | number;
  kind?: ValueKind;
  /** Shown instead of formatValue (e.g. minutes as "12 min"). */
  display?: (n: number) => string;
  lowerIsBetter?: boolean;
  hint?: ReactNode;
}) {
  const current = typeof value === 'number' ? value : value.current;
  const text = current == null ? '—' : display ? display(current) : formatValue(current, kind ?? 'count');
  return (
    <div className="min-w-0 bg-lms-surface px-4 py-3">
      <p className="truncate text-[13px] text-lms-muted">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tabular-nums">{text}</p>
      <p className="mt-1 truncate text-xs text-lms-muted">
        {typeof value === 'number' ? hint : <Change value={value} kind={kind ?? 'count'} lowerIsBetter={lowerIsBetter} display={display} />}
      </p>
    </div>
  );
}

function Change({ value, kind, lowerIsBetter, display }: { value: LmsCompared; kind: ValueKind; lowerIsBetter?: boolean; display?: (n: number) => string }) {
  const { current, previous } = value;
  const before = previous == null ? 'nothing' : display ? display(previous) : formatValue(previous, kind);
  const change = current != null && previous != null ? changeOf({ current, previous }, kind) : null;
  if (!change || Math.abs(change.value) < 0.05) return <span>{before} the period before</span>;
  const up = change.value > 0;
  const good = up !== Boolean(lowerIsBetter);
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span>
      <span className={`inline-flex items-center font-medium ${good ? 'text-lms-stage-won' : 'text-lms-alert'}`}>
        <Arrow size={13} aria-hidden />
        {change.label}
      </span>{' '}
      vs {before}
    </span>
  );
}

/** A titled block of the report. */
export function Block({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[10px] border border-lms-line bg-lms-surface p-5 ${className}`}>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13px] text-lms-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Ranked rows with a thin bar under each, sized to the biggest; the number is always printed. */
export function BarRows({ rows, empty }: { rows: { key: string; label: ReactNode; value: number; display?: ReactNode }[]; empty: string }) {
  if (!rows.length) return <p className="py-6 text-sm text-lms-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="shrink-0 tabular-nums font-medium">{r.display ?? r.value.toLocaleString('en-US')}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-lms-page" aria-hidden>
            <div className="h-full rounded-full bg-lms-chart" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function hourLabel(hour: number): string {
  const h = hour % 12 || 12;
  return `${h} ${hour < 12 ? 'am' : 'pm'}`;
}

/**
 * Reach rate by hour of the day (Dhaka): one column per hour, one hue,
 * a tooltip per column with the calls behind it. An hour with no calls
 * has no column (not a 0%, which would read as nobody answering).
 */
export function HourChart({ hours }: { hours: LmsReport['byHour'] }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  const height = 200;
  const padL = 36;
  const padB = 22;
  const top = 8;
  const plotH = height - padB - top;
  const slot = Math.max(0, width - padL) / 24;
  const barW = Math.max(2, slot - 2); // a 2px surface gap between columns
  const y = (v: number) => top + plotH - (v / 100) * plotH;
  const hovered = active == null ? null : hours[active];

  return (
    <div ref={box} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Reach rate by hour of the day" onPointerLeave={() => setActive(null)} className="block">
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={padL} x2={width} y1={y(t)} y2={y(t)} className="stroke-lms-line" strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={padL - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} className="fill-lms-muted">
                {t}%
              </text>
            </g>
          ))}
          {hours.map((h, i) => {
            const bx = padL + i * slot + 1;
            const v = h.reachRate ?? 0;
            const barH = h.calls ? Math.max(2, y(0) - y(v)) : 0;
            const r = Math.min(4, barW / 2, barH);
            const by = y(0) - barH;
            return (
              <g key={h.hour} onPointerEnter={() => setActive(i)}>
                {/* The hit target is the whole column, bigger than the bar. */}
                <rect x={padL + i * slot} y={top} width={slot} height={plotH} fill="transparent" />
                {barH > 0 && (
                  <path
                    d={`M ${bx},${y(0)} V ${by + r} Q ${bx},${by} ${bx + r},${by} H ${bx + barW - r} Q ${bx + barW},${by} ${bx + barW},${by + r} V ${y(0)} Z`}
                    className="fill-lms-chart"
                    fillOpacity={active == null || active === i ? 1 : 0.45}
                  />
                )}
                {i % 3 === 0 && (
                  <text x={bx + barW / 2} y={height - 6} fontSize={11} textAnchor="middle" className="fill-lms-muted">
                    {hourLabel(h.hour)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hovered && (
        <div
          className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-md border border-lms-line bg-lms-surface px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(0, padL + (active ?? 0) * slot + slot + 6), Math.max(0, width - 170)) }}
        >
          <p className="text-lms-muted">
            {hourLabel(hovered.hour)} to {hourLabel((hovered.hour + 1) % 24)}
          </p>
          <p className="font-semibold tabular-nums">
            {hovered.calls ? `${formatPct(hovered.reachRate)} picked up (${hovered.reached} of ${hovered.calls} calls)` : 'No calls'}
          </p>
        </div>
      )}
    </div>
  );
}
