import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export interface TrendPoint {
  day: string; // YYYY-MM-DD
  booked: number;
  delivered: number;
}

// Categorical slots 1-2 of the dataviz reference palette, validated on the
// white card surface (CVD ΔE 24.7, normal-vision ΔE 33.6, both ≥ 3:1).
const SERIES = [
  { key: 'booked' as const, label: 'Booked', color: '#2a78d6' },
  { key: 'delivered' as const, label: 'Delivered', color: '#eb6834' },
];

const HEIGHT = 200;
const PAD = { top: 12, right: 12, bottom: 24, left: 32 };

function shortDate(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** 3-4 whole-number gridline values from 0 up to at least `max`. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  // Smallest 1/2/5 × 10^k step that covers max in at most 3 steps.
  const raw = max / 3;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude);
  const ticks: number[] = [];
  for (let v = 0; v < max + step; v += step) ticks.push(v);
  return ticks;
}

/** Width of the element, kept current as it resizes. */
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
 * Pathao Dashboard's bookings vs deliveries per day (pathao-plan.md Step
 * 10). Two thin lines on one count axis, a crosshair + tooltip listing
 * both values at the hovered day (also reachable with ←/→ after focusing
 * the chart), and a table view with every number.
 */
export function BookingsTrendChart({ data }: { data: TrendPoint[] }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const max = Math.max(0, ...data.flatMap((d) => [d.booked, d.delivered]));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;

  function indexAt(clientX: number, target: Element) {
    const rect = target.getBoundingClientRect();
    const rel = clientX - rect.left - PAD.left;
    const i = Math.round((rel / (plotW || 1)) * (data.length - 1));
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

  const point = active != null ? data[active] : null;
  const labelIdx = data.length > 2 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : data.map((_, i) => i);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-4">
          {SERIES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-regantify-text">
              <span className="inline-block w-4 h-0.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <button type="button" onClick={() => setAsTable((v) => !v)} className="text-xs underline text-regantify-text-muted hover:text-regantify-text">
          {asTable ? 'View as chart' : 'View as table'}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-64 overflow-y-auto border border-black/5 rounded-xl">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs text-regantify-text-muted">
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 font-medium text-right">Booked</th>
                <th className="px-3 py-2 font-medium text-right">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.day} className="border-t border-black/5">
                  <td className="px-3 py-1.5 text-regantify-text">{shortDate(d.day)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-regantify-text">{d.booked}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-regantify-text">{d.delivered}</td>
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
              height={HEIGHT}
              role="img"
              aria-label="Bookings and deliveries per day. Use the left and right arrow keys to read each day."
              tabIndex={0}
              onKeyDown={onKeyDown}
              onBlur={() => setActive(null)}
              onPointerMove={(e: PointerEvent<SVGSVGElement>) => setActive(indexAt(e.clientX, e.currentTarget))}
              onPointerLeave={() => setActive(null)}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-regantify-cta/40 rounded-lg"
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#000" strokeOpacity={t === 0 ? 0.15 : 0.06} />
                  <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#6b6b6b">
                    {t}
                  </text>
                </g>
              ))}
              {labelIdx.map((i) => (
                <text
                  key={i}
                  x={x(i)}
                  y={HEIGHT - 6}
                  fontSize={11}
                  fill="#6b6b6b"
                  textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                >
                  {shortDate(data[i].day)}
                </text>
              ))}
              {point && active != null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="#000" strokeOpacity={0.25} />}
              {SERIES.map((s) => (
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
              {point &&
                active != null &&
                SERIES.map((s) => <circle key={s.key} cx={x(active)} cy={y(point[s.key])} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />)}
            </svg>
          )}
          {point && active != null && (
            <div
              className="pointer-events-none absolute top-0 z-10 bg-white border border-black/10 rounded-lg shadow-sm px-3 py-2 text-xs"
              style={{ left: Math.min(Math.max(0, x(active) + 12), Math.max(0, width - 140)) }}
            >
              <p className="text-regantify-text-muted mb-1">{shortDate(point.day)}</p>
              {SERIES.map((s) => (
                <p key={s.key} className="flex items-center gap-2">
                  <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: s.color }} />
                  <span className="font-semibold text-regantify-text tabular-nums">{point[s.key]}</span>
                  <span className="text-regantify-text-muted">{s.label}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
