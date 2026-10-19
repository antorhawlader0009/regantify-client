import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { AXIS, GRID, NEUTRAL, SERIES_ORDER, TOOLTIP, animationMs } from './theme';
import { ChartFrame, GradientDefs, Legend, TooltipBox, seriesSolid, type ChartRow, type ChartSeries } from './parts';

/**
 * Thin rounded bars with a gradient (the "Project Statistics" chart of the reference). One or more series side by side; a `neutral` series is grey
 * (a comparison). The bar ends are rounded at the top only, so the bar stays anchored to the baseline. Hover shows the dark tooltip over a faint column.
 */
export function GradientBarChart({
  label,
  rows,
  xKey,
  series,
  xLabel = (v) => String(v),
  tooltipTitle,
  format,
  axisFormat = format,
  height = 280,
  loading,
  stacked = false,
}: {
  /** The chart's accessible name, e.g. "Income per day". */
  label: string;
  rows: readonly object[];
  xKey: string;
  series: ChartSeries[];
  xLabel?: (v: string | number) => string;
  tooltipTitle?: (v: string | number) => string;
  format: (n: number) => string;
  axisFormat?: (n: number) => string;
  height?: number;
  loading?: boolean;
  stacked?: boolean;
}) {
  const table = rows as ChartRow[];
  const colors = series.map((s, i) => s.color ?? SERIES_ORDER[i % SERIES_ORDER.length]);
  const empty = table.length === 0 || table.every((r) => series.every((s) => !Number(r[s.key])));
  const ms = animationMs();

  const tooltip = ({ active, payload, label: x }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    return (
      <TooltipBox
        title={x !== undefined ? (tooltipTitle ?? xLabel)(x as string | number) : undefined}
        lines={series.map((s, i) => ({ label: s.label, value: format(Number(payload.find((p) => p.dataKey === s.key)?.value ?? 0)), color: seriesSolid(s, colors[i]) }))}
      />
    );
  };

  return (
    <>
      <ChartFrame
        label={label}
        height={height}
        loading={loading}
        empty={empty}
        table={{ columns: ['', ...series.map((s) => s.label)], rows: table.map((r) => [(tooltipTitle ?? xLabel)(r[xKey] ?? ''), ...series.map((s) => format(Number(r[s.key] ?? 0)))]) }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={table} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={4} barCategoryGap="28%">
            <GradientDefs colors={colors} />
            <CartesianGrid {...GRID} />
            <XAxis dataKey={xKey} tickFormatter={xLabel} tick={AXIS.tick} axisLine={false} tickLine={false} tickMargin={AXIS.tickMargin} minTickGap={12} />
            <YAxis tickFormatter={axisFormat} tick={AXIS.tick} axisLine={false} tickLine={false} width={56} allowDecimals={false} />
            <Tooltip content={tooltip} cursor={{ fill: TOOLTIP.cursor, radius: 8 } as object} />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId={stacked ? 'a' : undefined}
                fill={s.neutral ? NEUTRAL.fill : `url(#${colors[i].id})`}
                className={s.neutral ? 'admin-chart-neutral' : undefined}
                radius={stacked && i < series.length - 1 ? 0 : [6, 6, 0, 0]}
                maxBarSize={14}
                isAnimationActive={ms > 0}
                animationDuration={ms}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
      {series.length > 1 && !loading && !empty && <Legend items={series.map((s, i) => ({ label: s.label, color: seriesSolid(s, colors[i]) }))} />}
    </>
  );
}
