import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { SERIES, type SeriesColor } from './theme';
import { GradientDefs } from './parts';

/**
 * A tiny trend line for a StatCard. Decorative: the tile already shows the number and its change, so it has no axes, no tooltip and is hidden
 * from screen readers. Fewer than 2 points draws nothing.
 */
export function Sparkline({ values, color = SERIES.orange, height = 40 }: { values: number[]; color?: SeriesColor; height?: number }) {
  // Nothing to show when there are under 2 points or all are zero (a flat line on the floor reads as a stray underline).
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const rows = values.map((v, i) => ({ i, v }));
  const c = { ...color, id: `${color.id}-spark` };
  return (
    <div aria-hidden style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <GradientDefs colors={[c]} fade />
          <Area type="monotone" dataKey="v" stroke={color.solid} strokeWidth={2} fill={`url(#${c.id}-fade)`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
