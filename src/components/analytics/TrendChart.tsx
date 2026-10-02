import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { AnalyticsBucket } from '../../lib/analyticsApi';
import { bucketLabel, formatCompact, formatValue, type ValueKind } from './format';

export interface TrendSeries<K extends string> {
  key: K;
  label: string;
  color: string;
}

// Categorical slots 1-3 of the dataviz reference palette, in fixed
// order, validated on the white card surface (same as BookingsTrendChart).
export const PALETTE = { blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a' };

const PAD = { top: 12, right: 12, bottom: 26, left: 48 };

/**
 * 3-5 gridline values covering [min, max] on a 1/2/5 step, always
 * including 0 (min is ≤ 0: below zero only when a series, like profit,
 * goes negative).
 */
function niceTicks(max: number, min = 0): number[] {
  const span = Math.max(0, max) - Math.min(0, min);
  if (span <= 0) return [0, 1];
  const raw = span / 3;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude);
  const ticks: number[] = [];
  for (let v = Math.floor(Math.min(0, min) / step) * step; v < max + step; v += step) ticks.push(v);
  return ticks;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/**
 * Analytics trend: one or more thin lines on a single value axis (the
 * first series gets a soft area fill), a crosshair + tooltip listing
 * every series at the hovered day/month (also ←/→ after focusing the
 * chart), and a table view with every number.
 */
export function TrendChart<K extends string>({
  data,
  series,
  kind,
  bucket,
  height = 240,
  ariaLabel,
}: {
  data: Array<{ bucket: string } & Record<K, number>>;
  series: TrendSeries<K>[];
  kind: ValueKind;
  bucket: AnalyticsBucket;
  height?: number;
  ariaLabel: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const values = data.flatMap((d) => series.map((s) => d[s.key]));
  const ticks = niceTicks(Math.max(0, ...values), Math.min(0, ...values));
  const top = ticks[ticks.length - 1];
  const bottom = ticks[0];
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - bottom) / (top - bottom || 1)) * plotH;

  function indexAt(clientX: number, target: Element) {
    const rect = target.getBoundingClientRect();
    const i = Math.round(((clientX - rect.left - PAD.left) / (plotW || 1)) * (data.length - 1));
    return Math.max(0, Math.min(data.length - 1, i));
  }

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = (active ?? (e.key === 'ArrowRight' ? -1 : data.length)) + (e.key === 'ArrowRight' ? 1 : -1);
      setActive(Math.max(0, Math.min(data.length - 1, next)));
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  }

  const labelCount = width < 480 ? 3 : 5;
  const labelIdx =
    data.length <= labelCount
      ? data.map((_, i) => i)
      : Array.from({ length: labelCount }, (_, k) => Math.round((k * (data.length - 1)) / (labelCount - 1)));
  const point = active != null ? data[active] : null;
  const first = series[0];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-4">
          {series.length > 1 &&
            series.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-regantify-text">
                <span className="inline-block w-4 h-0.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
        </div>
        <button type="button" onClick={() => setAsTable((v) => !v)} className="text-xs underline text-neutral-500 hover:text-regantify-text">
          {asTable ? 'View as chart' : 'View as table'}
        </button>
      </div>

      {asTable ? (
        <div className="overflow-y-auto border border-line rounded-xl" style={{ maxHeight: height + 24 }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs text-neutral-500">
                <th className="px-3 py-2 font-medium">{bucket === 'month' ? 'Month' : 'Day'}</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 font-medium text-right">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.bucket} className="border-t border-line">
                  <td className="px-3 py-1.5 text-regantify-text">{bucketLabel(d.bucket, bucket)}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right tabular-nums text-regantify-text">
                      {formatValue(d[s.key], kind)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative">
          {width > 0 && (
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`${ariaLabel}. Use the left and right arrow keys to read each point.`}
              tabIndex={0}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
              onPointerMove={(e: PointerEvent<SVGSVGElement>) => setActive(indexAt(e.clientX, e.currentTarget))}
              onPointerLeave={() => setActive(null)}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-lg"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={first.color} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={first.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#000" strokeOpacity={t === 0 ? 0.15 : 0.06} strokeDasharray={t === 0 ? undefined : '3 4'} />
                  <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#6b6b6b">
                    {formatCompact(t, kind)}
                  </text>
                </g>
              ))}
              {labelIdx.map((i) => (
                <text
                  key={i}
                  x={x(i)}
                  y={height - 6}
                  fontSize={11}
                  fill="#6b6b6b"
                  textAnchor={data.length > 1 && i === 0 ? 'start' : data.length > 1 && i === data.length - 1 ? 'end' : 'middle'}
                >
                  {bucketLabel(data[i].bucket, bucket)}
                </text>
              ))}
              <path
                d={`M ${x(0)},${y(0)} ${data.map((d, i) => `L ${x(i)},${y(d[first.key])}`).join(' ')} L ${x(data.length - 1)},${y(0)} Z`}
                fill={`url(#${gradientId})`}
              />
              {active != null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="#000" strokeOpacity={0.2} />}
              {series.map((s) => (
                <polyline
                  key={s.key}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ')}
                />
              ))}
              {/* One day picked: a single point has no line, so mark it. */}
              {data.length === 1 &&
                active == null &&
                series.map((s) => <circle key={s.key} cx={x(0)} cy={y(data[0][s.key])} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />)}
              {point &&
                active != null &&
                series.map((s) => <circle key={s.key} cx={x(active)} cy={y(point[s.key])} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />)}
            </svg>
          )}
          {point && active != null && (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-[140px] bg-white border border-line rounded-xl shadow-lg px-3 py-2 text-xs"
              style={{ left: x(active) + 160 > width ? Math.max(0, x(active) - 172) : x(active) + 12 }}
            >
              <p className="text-neutral-500 mb-1">{bucketLabel(point.bucket, bucket, true)}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center gap-2">
                  <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: s.color }} />
                  <span className="font-semibold text-regantify-text tabular-nums">{formatValue(point[s.key], kind)}</span>
                  <span className="text-neutral-500">{s.label}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Vertical bars for a fixed set of categories in their natural order
 * (hours of the day), one hue, a tooltip per bar.
 */
export function ColumnChart({
  data,
  label,
  height = 180,
  ariaLabel,
  tickEvery = 3,
}: {
  data: { key: string; value: number; tick: string; tooltip: string }[];
  label: string;
  height?: number;
  ariaLabel: string;
  tickEvery?: number;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const padL = 32;
  const padB = 22;
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const plotW = Math.max(0, width - padL);
  const plotH = height - padB - 8;
  const slot = plotW / data.length;
  const barW = Math.max(2, slot - 2); // 2px surface gap between bars
  const y = (v: number) => 8 + plotH - (v / top) * plotH;

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} onPointerLeave={() => setActive(null)} className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width} y1={y(t)} y2={y(t)} stroke="#000" strokeOpacity={t === 0 ? 0.15 : 0.06} strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={padL - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#6b6b6b">
                {formatCompact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const bx = padL + i * slot + 1;
            const h = Math.max(0, y(0) - y(d.value));
            const r = Math.min(4, barW / 2, h);
            return (
              <g key={d.key} onPointerEnter={() => setActive(i)}>
                {/* Hit target: the whole column, bigger than the bar. */}
                <rect x={padL + i * slot} y={8} width={slot} height={plotH} fill="transparent" />
                {h > 0 && (
                  <path
                    d={`M ${bx},${y(0)} V ${y(d.value) + r} Q ${bx},${y(d.value)} ${bx + r},${y(d.value)} H ${bx + barW - r} Q ${bx + barW},${y(d.value)} ${bx + barW},${y(d.value) + r} V ${y(0)} Z`}
                    fill={PALETTE.blue}
                    fillOpacity={active == null || active === i ? 1 : 0.45}
                  />
                )}
                {i % tickEvery === 0 && (
                  <text x={bx + barW / 2} y={height - 5} fontSize={11} fill="#6b6b6b" textAnchor="middle">
                    {d.tick}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {active != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 bg-white border border-line rounded-xl shadow-lg px-3 py-2 text-xs whitespace-nowrap"
          style={{ left: Math.min(Math.max(0, padL + active * slot + slot + 6), Math.max(0, width - 150)) }}
        >
          <p className="text-neutral-500">{data[active].tooltip}</p>
          <p className="font-semibold text-regantify-text tabular-nums">
            {data[active].value.toLocaleString('en-US')} {label}
          </p>
        </div>
      )}
    </div>
  );
}
