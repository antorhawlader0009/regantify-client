import { useState, type ReactNode } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { NEUTRAL, TOOLTIP, type SeriesColor } from './theme';

/* Pieces every chart in the Super Admin kit shares (admin-panel-new-theme.md Step 4): gradients, the dark tooltip, the legend and the frame. */

/** One series of a bar or area chart. `neutral` draws it grey (a comparison such as "previous period"). */
export interface ChartSeries {
  key: string;
  label: string;
  color?: SeriesColor;
  neutral?: boolean;
}

export type ChartRow = Record<string, string | number | null>;

/** `<defs>` with one linear gradient per colour; `vertical` runs top to bottom (bars, areas), otherwise left to right (rings, donut). */
export function GradientDefs({ colors, vertical = true, fade = false }: { colors: SeriesColor[]; vertical?: boolean; fade?: boolean }) {
  return (
    <defs>
      {colors.map((c) => (
        <linearGradient key={c.id + (fade ? '-fade' : '')} id={c.id + (fade ? '-fade' : '')} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
          {fade ? (
            <>
              <stop offset="0%" stopColor={c.from} stopOpacity={0.32} />
              <stop offset="100%" stopColor={c.to} stopOpacity={0} />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor={c.from} />
              <stop offset="100%" stopColor={c.to} />
            </>
          )}
        </linearGradient>
      ))}
    </defs>
  );
}

export interface TooltipLine {
  label: string;
  value: string;
  color: string;
}

/** The dark hover bubble ("Average 7 hr 12 mins / Projects 3" in the reference). Text stays in text colours; only the dot carries the series colour. */
export function TooltipBox({ title, lines }: { title?: ReactNode; lines: TooltipLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="pointer-events-none min-w-[140px] px-3 py-2 text-[12.5px] shadow-lg" style={{ background: TOOLTIP.background, color: TOOLTIP.text, borderRadius: TOOLTIP.radius }}>
      {title && <p className="mb-1 font-medium" style={{ color: TOOLTIP.muted }}>{title}</p>}
      {lines.map((l) => (
        <p key={l.label} className="flex items-center gap-2 leading-5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} aria-hidden />
          <span style={{ color: TOOLTIP.muted }}>{l.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">{l.value}</span>
        </p>
      ))}
    </div>
  );
}

/** The legend under a chart: a colour dot and the name in text colour, optionally a value. Shown for 2 or more series. */
export function Legend({ items }: { items: Array<{ label: string; color: string; value?: string }> }) {
  return (
    <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[12.5px] text-regantify-text-muted">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} aria-hidden />
          <span>{it.label}</span>
          {it.value && <span className="font-semibold text-regantify-text tabular-nums">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}

export const seriesSolid = (s: ChartSeries, fallback: SeriesColor) => (s.neutral ? NEUTRAL.solid : (s.color ?? fallback).solid);

/**
 * The frame around every chart: an accessible name, a loading placeholder, an empty state (never a fake shape), and a "Table" switch that shows the
 * same numbers as a plain table (the accessibility fallback, and the relief for colours under 3:1).
 */
export function ChartFrame({
  label,
  height,
  loading,
  empty,
  emptyText = 'No data for this period yet.',
  table,
  children,
}: {
  label: string;
  height: number;
  loading?: boolean;
  empty?: boolean;
  emptyText?: string;
  table: { columns: string[]; rows: Array<Array<string>> };
  children: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  if (loading) return <div className="animate-pulse rounded-xl bg-[var(--console-skeleton)]" style={{ height }} aria-label={`${label}: loading`} />;
  if (empty) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-[var(--console-tile)] text-[13px] text-regantify-text-muted" style={{ height }}>
        {emptyText}
      </div>
    );
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAsTable((v) => !v)}
        aria-pressed={asTable}
        title={asTable ? 'Show as chart' : 'Show as table'}
        aria-label={asTable ? `${label}: show as chart` : `${label}: show as table`}
        className="absolute -top-1 right-0 z-10 grid h-7 w-7 place-items-center rounded-full text-regantify-text-muted transition hover:bg-regantify-search hover:text-regantify-text"
      >
        {asTable ? <BarChart3 size={15} /> : <Table2 size={15} />}
      </button>
      {asTable ? (
        <div className="overflow-auto pt-7" style={{ maxHeight: height + 40 }}>
          <table className="w-full">
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <th key={c} className={i === 0 ? 'text-left' : 'text-right'}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((cell, ci) => (
                    <td key={ci} className={ci === 0 ? 'text-left' : 'text-right tabular-nums'}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={label} style={{ height }}>
          {children}
        </div>
      )}
    </div>
  );
}
