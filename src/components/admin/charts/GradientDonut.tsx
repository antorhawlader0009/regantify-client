import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from 'recharts';
import { NEUTRAL, SERIES_ORDER, animationMs, type SeriesColor } from './theme';
import { ChartFrame, GradientDefs, Legend, TooltipBox } from './parts';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color?: SeriesColor;
}

/** Up to 4 coloured slices; anything after the 4th folds into one grey "Other" (a 5th colour is never invented). */
function fold(slices: DonutSlice[]): Array<DonutSlice & { fill: string; solid: string }> {
  const sorted = slices.filter((s) => s.value > 0);
  const head = sorted.slice(0, 4).map((s, i) => {
    const c = s.color ?? SERIES_ORDER[i];
    return { ...s, fill: `url(#${c.id}-h)`, solid: c.solid };
  });
  const rest = sorted.slice(4).reduce((sum, s) => sum + s.value, 0);
  return rest > 0 ? [...head, { key: 'other', label: 'Other', value: rest, fill: NEUTRAL.fill, solid: NEUTRAL.solid }] : head;
}

/**
 * The thick gradient ring of the reference ("Monthly Target"): rounded segment ends with a small gap, a big number in the middle, an optional
 * floating label pill, and a legend underneath with each slice's share.
 */
export function GradientDonut({
  label,
  slices,
  format,
  centerValue,
  centerCaption,
  pill,
  height = 240,
  loading,
}: {
  label: string;
  slices: DonutSlice[];
  format: (n: number) => string;
  centerValue?: string;
  centerCaption?: string;
  /** A short highlight shown as a pill over the ring, e.g. "32 stores waiting". */
  pill?: string;
  height?: number;
  loading?: boolean;
}) {
  const data = fold(slices);
  const total = data.reduce((s, d) => s + d.value, 0);
  const pct = (v: number) => (total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '0%');
  const ms = animationMs();
  const colors = data.map((d, i) => d.color ?? SERIES_ORDER[i]).filter((c, i) => data[i].key !== 'other') as SeriesColor[];
  // Gradient ids for the donut run left to right, so they get their own "-h" copies.
  const hColors = colors.map((c) => ({ ...c, id: `${c.id}-h` }));

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as (typeof data)[number];
    return <TooltipBox lines={[{ label: d.label, value: `${format(d.value)} (${pct(d.value)})`, color: d.solid }]} />;
  };

  return (
    <>
      <ChartFrame
        label={label}
        height={height}
        loading={loading}
        empty={total === 0}
        table={{ columns: ['', 'Value', 'Share'], rows: data.map((d) => [d.label, format(d.value), pct(d.value)]) }}
      >
        <div className="relative h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <GradientDefs colors={hColors} vertical={false} />
              <Tooltip content={tooltip} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius="64%"
                outerRadius="92%"
                paddingAngle={data.length > 1 ? 3 : 0}
                cornerRadius={10}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive={ms > 0}
                animationDuration={ms}
              >
                {data.map((d) => (
                  <Cell key={d.key} fill={d.fill} className={d.key === 'other' ? 'admin-chart-neutral' : undefined} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {(centerValue || centerCaption) && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              {centerValue && <span className="text-[24px] font-semibold leading-tight text-regantify-text tabular-nums">{centerValue}</span>}
              {centerCaption && <span className="text-[12px] text-regantify-text-muted">{centerCaption}</span>}
            </div>
          )}
          {pill && (
            <span className="pointer-events-none absolute left-2 top-4 rounded-full bg-[image:var(--console-accent-gradient)] px-3 py-1 text-[12px] font-medium text-white shadow-[0_6px_14px_rgba(245,87,108,0.3)]">
              {pill}
            </span>
          )}
        </div>
      </ChartFrame>
      {!loading && total > 0 && <Legend items={data.map((d) => ({ label: d.label, color: d.solid, value: pct(d.value) }))} />}
    </>
  );
}
