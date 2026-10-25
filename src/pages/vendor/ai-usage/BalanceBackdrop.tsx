import { useId } from 'react';

/**
 * The AI Usages balance card's background art: soft white wave lines and two
 * faint rings over the card's blue gradient. Inline SVG (no file to load),
 * decoration only: behind the content, ignores clicks, hidden from screen
 * readers. Put it as the first child of a `relative overflow-hidden` card and
 * give the card's content `relative`.
 *
 * `trend` (optional, e.g. the period's daily credits) draws the front wave
 * from real numbers, so the card's line is the store's own use, not a stock curve.
 */
export function BalanceBackdrop({ trend }: { trend?: number[] }) {
  const id = useId().replace(/:/g, '');
  const W = 400;
  const H = 160;

  // The front wave: the trend when there is one, else a gentle fixed curve.
  const front = trend && trend.length >= 2 && Math.max(...trend) > 0 ? trendPath(trend, W, H) : 'M0,118 C60,96 110,132 170,112 S290,74 340,92 S390,104 400,98';

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx="85%" cy="10%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* light from the top right corner */}
      <rect width={W} height={H} fill={`url(#glow-${id})`} />

      {/* two faint rings, top right */}
      <circle cx={W - 40} cy={18} r={58} fill="none" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      <circle cx={W - 40} cy={18} r={92} fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />

      {/* back wave */}
      <path
        d="M0,132 C70,112 120,146 190,128 S310,96 360,114 S395,124 400,120"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.14"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />

      {/* front wave with a soft fill under it */}
      <path d={`${front} L${W},${H} L0,${H} Z`} fill={`url(#fill-${id})`} />
      <path d={front} fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A smooth line through the values, kept in the lower part of the card so it never sits under the big number. */
function trendPath(values: number[], W: number, H: number): string {
  const max = Math.max(...values);
  const top = H * 0.55;
  const bottom = H * 0.9;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, bottom - (v / max) * (bottom - top)] as const);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}
