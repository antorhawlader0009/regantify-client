import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface DonutSlice {
  key: string;
  label: ReactNode;
  value: number;
  color: string;
  /** Makes the legend row a link (e.g. the orders list filtered to that status). */
  to?: string;
  /** Text shown for the value in the legend; defaults to the number. */
  display?: ReactNode;
}

/**
 * A ring chart with the total in the middle and a legend that doubles as the detail (each row also links where it can).
 * Hovering a legend row or a slice dims the others. The ring is drawn with stroke-dasharray circles, so there is no chart library
 * and every number is also in the legend (the ring itself is decorative for screen readers).
 */
export function DonutChart({
  slices,
  centerValue,
  centerLabel,
  size = 148,
  emptyText,
}: {
  slices: DonutSlice[];
  centerValue?: ReactNode;
  centerLabel?: string;
  size?: number;
  emptyText: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return <p className="py-10 text-center text-sm text-neutral-500">{emptyText}</p>;

  const stroke = 20;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 2 : 0;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
          {slices.map((s) => {
            const len = (s.value / total) * C;
            const dash = Math.max(0, len - gap);
            const el = (
              <circle
                key={s.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={active === s.key ? stroke + 3 : stroke}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                opacity={active && active !== s.key ? 0.35 : 1}
                className="transition-[opacity,stroke-width] duration-150"
                onMouseEnter={() => setActive(s.key)}
                onMouseLeave={() => setActive(null)}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[22px] font-semibold leading-none tabular-nums text-regantify-text">{centerValue ?? total.toLocaleString()}</span>
          {centerLabel && <span className="mt-1 text-[11px] text-neutral-500">{centerLabel}</span>}
        </div>
      </div>

      <ul className="m-0 w-full min-w-0 flex-1 list-none space-y-0.5 p-0">
        {slices.map((s) => {
          const pct = Math.round((s.value / total) * 100);
          const row = (
            <>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-regantify-text">{s.label}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-regantify-text">{s.display ?? s.value.toLocaleString()}</span>
              <span className="w-9 shrink-0 text-right text-xs tabular-nums text-neutral-500">{pct}%</span>
            </>
          );
          const cls = `flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${active === s.key ? 'bg-neutral-50' : ''}`;
          return (
            <li key={s.key} onMouseEnter={() => setActive(s.key)} onMouseLeave={() => setActive(null)}>
              {s.to ? (
                <Link to={s.to} className={`${cls} hover:bg-neutral-50`}>
                  {row}
                </Link>
              ) : (
                <div className={cls}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Semantic colours for an order status, fixed so "Completed" is always the same green. */
export const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  ON_HOLD: '#a78bfa',
  PROCESSING: '#2a78d6',
  SHIPPING: '#6366f1',
  READY_FOR_PICKUP: '#06b6d4',
  COMPLETED: '#16a34a',
  CANCELLED: '#ef4444',
  RETURN: '#f97316',
  REFUNDED: '#94a3b8',
  PAYMENT_FAILED: '#dc2626',
  PAYMENT_INITIATED: '#cbd5e1',
  STOCK_OUT: '#78716c',
};

/** A palette for categories without fixed meaning (channels, sources). */
export const CATEGORY_COLORS = ['#2a78d6', '#1baf7a', '#eb6834', '#8b5cf6', '#06b6d4', '#94a3b8'];
