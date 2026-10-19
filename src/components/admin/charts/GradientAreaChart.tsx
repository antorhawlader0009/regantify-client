import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { AXIS, GRID, NEUTRAL, SERIES_ORDER, animationMs } from './theme';
import { ChartFrame, GradientDefs, Legend, TooltipBox, seriesSolid, type ChartRow, type ChartSeries } from './parts';

/**
 * A 2px line with a gradient fill fading to nothing, for amounts over time. A `neutral` series is drawn as a grey dashed line with no fill
 * ("previous period"). Hover shows a crosshair and the dark tooltip.
 */
export function GradientAreaChart({
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
}: {
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
          <AreaChart data={table} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <GradientDefs colors={colors} fade />
            <CartesianGrid {...GRID} />
            <XAxis dataKey={xKey} tickFormatter={xLabel} tick={AXIS.tick} axisLine={false} tickLine={false} tickMargin={AXIS.tickMargin} minTickGap={16} />
            <YAxis tickFormatter={axisFormat} tick={AXIS.tick} axisLine={false} tickLine={false} width={56} allowDecimals={false} />
            <Tooltip content={tooltip} cursor={{ stroke: '#CBD2DC', strokeWidth: 1 }} />
            {series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.neutral ? NEUTRAL.solid : colors[i].solid}
                strokeWidth={2}
                strokeDasharray={s.neutral ? '4 4' : undefined}
                fill={s.neutral ? 'transparent' : `url(#${colors[i].id}-fade)`}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: s.neutral ? NEUTRAL.solid : colors[i].solid }}
                isAnimationActive={ms > 0}
                animationDuration={ms}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
      {series.length > 1 && !loading && !empty && <Legend items={series.map((s, i) => ({ label: s.label, color: seriesSolid(s, colors[i]) }))} />}
    </>
  );
}
