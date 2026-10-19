import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from 'recharts';
import { NEUTRAL, SERIES_ORDER, animationMs } from './theme';
import { ChartFrame, GradientDefs, Legend, TooltipBox } from './parts';

export interface Ring {
  key: string;
  label: string;
  value: number;
  /** The whole the ring is a share of; the ring shows value / max. */
  max: number;
  /** How the value reads in the tooltip and table, e.g. "42 of 180 stores". */
  detail?: string;
}

const share = (r: Ring) => (r.max > 0 ? Math.min(100, Math.max(0, (r.value / r.max) * 100)) : 0);

/**
 * 1 to 4 concentric gradient rings on grey tracks with a big number in the middle (the "65% App Design" chart of the reference).
 * The first ring is the outer one and its share is the centre number unless `centerValue` is given.
 */
export function RadialRings({
  label,
  rings,
  centerValue,
  centerCaption,
  height = 260,
  loading,
}: {
  label: string;
  rings: Ring[];
  centerValue?: string;
  centerCaption?: string;
  height?: number;
  loading?: boolean;
}) {
  const list = rings.slice(0, 4);
  const colors = list.map((_, i) => SERIES_ORDER[i]);
  const hColors = colors.map((c) => ({ ...c, id: `${c.id}-r` }));
  // RadialBarChart draws the first item innermost, so the list is reversed to put the first ring outside.
  const data = list.map((r, i) => ({ ...r, pct: share(r), fill: `url(#${hColors[i].id})`, solid: colors[i].solid })).reverse();
  const ms = animationMs();
  const first = list[0];

  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as (typeof data)[number];
    return <TooltipBox lines={[{ label: d.label, value: d.detail ?? `${Math.round(d.pct)}%`, color: d.solid }]} />;
  };

  return (
    <>
      <ChartFrame
        label={label}
        height={height}
        loading={loading}
        empty={list.length === 0 || list.every((r) => r.max <= 0)}
        table={{ columns: ['', 'Share', 'Detail'], rows: list.map((r) => [r.label, `${Math.round(share(r))}%`, r.detail ?? `${r.value} of ${r.max}`]) }}
      >
        <div className="relative h-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart data={data} innerRadius="38%" outerRadius="100%" startAngle={90} endAngle={-270} barSize={12} barGap={6}>
              <GradientDefs colors={hColors} vertical={false} />
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip content={tooltip} cursor={false} />
              <RadialBar dataKey="pct" cornerRadius={12} background={{ fill: NEUTRAL.track }} isAnimationActive={ms > 0} animationDuration={ms} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[26px] font-semibold leading-tight text-regantify-text tabular-nums">{centerValue ?? (first ? `${Math.round(share(first))}%` : '')}</span>
            {(centerCaption ?? first?.label) && <span className="max-w-[110px] text-[12px] font-medium text-regantify-cta">{centerCaption ?? first?.label}</span>}
          </div>
        </div>
      </ChartFrame>
      {!loading && list.length > 1 && <Legend items={list.map((r, i) => ({ label: r.label, color: colors[i].solid, value: `${Math.round(share(r))}%` }))} />}
    </>
  );
}
