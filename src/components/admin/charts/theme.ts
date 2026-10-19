/**
 * Colours and shared settings for the Super Admin chart kit (admin-panel-new-theme.md). Every admin chart reads its colours from here, so a series
 * looks the same on every page. Admin only: the vendor charts (components/analytics/TrendChart.tsx, components/charts/*) keep their own.
 * The CSS tokens behind the panel (accent gradient, canvas, card) are in index.css under body.admin-panel.
 */

/** One chart series: a gradient (bars, rings, donut segments) plus a solid colour for legend dots, lines and tooltips. */
export interface SeriesColor {
  /** The id used for its `<linearGradient>` inside a chart's `<defs>`. */
  id: string;
  from: string;
  to: string;
  solid: string;
}

export const SERIES: Record<'orange' | 'purple' | 'cyan' | 'green' | 'rose', SeriesColor> = {
  orange: { id: 'admin-grad-orange', from: '#FF8A3D', to: '#F5576C', solid: '#EA580C' },
  purple: { id: 'admin-grad-purple', from: '#7C3AED', to: '#C026D3', solid: '#9333EA' },
  cyan: { id: 'admin-grad-cyan', from: '#22D3EE', to: '#0284C7', solid: '#0284C7' },
  green: { id: 'admin-grad-green', from: '#34D399', to: '#059669', solid: '#059669' },
  /** Not a chart series (too close to orange and to green for colour-blind readers); used for tile tones only. */
  rose: { id: 'admin-grad-rose', from: '#FDA4AF', to: '#E11D48', solid: '#F43F5E' },
};

/**
 * The fixed order series take when a chart has several (first = the main one). Checked with the dataviz validator on 2026-10-19, in light (white)
 * and dark (#121F25) mode: #EA580C, #9333EA, #0284C7, #059669 pass lightness, chroma, normal vision and 3:1 contrast in both; colour-blind separation
 * is 7.8 at worst (the 6-8 band), so every chart with 2+ series shows a legend and every chart has a "Table" view. One palette serves both themes.
 * (The first try, #F26B3A, was under 3:1 on white and too light for dark.) A 5th series is never a new colour: it folds into "Other" (grey).
 */
export const SERIES_ORDER: SeriesColor[] = [SERIES.orange, SERIES.purple, SERIES.cyan, SERIES.green];

/** Grey for a comparison series ("previous period"), ring tracks and empty donut slices. */
export const NEUTRAL = { fill: '#D9DEE5', track: '#EEF1F5', solid: '#9CA3AF' };

/** Up / down colours for change arrows. Problems are red (user's rule), never amber. */
export const TREND = { good: '#059669', bad: '#DC2626' };

/** Axis, grid and tooltip look shared by every chart. */
export const AXIS = {
  tick: { fill: '#6B7280', fontSize: 12 },
  stroke: 'transparent',
  tickMargin: 8,
};
export const GRID = { stroke: '#EEF1F5', strokeDasharray: '0', vertical: false };
export const TOOLTIP = {
  background: '#1B2430',
  text: '#F9FAFB',
  muted: '#C9D3D6',
  radius: 10,
  /** The faint column behind the bar group under the mouse. */
  cursor: 'rgba(16, 24, 40, 0.04)',
};

/** Bar sizing: thin rounded bars like the reference. */
export const BAR = { size: 10, radius: 999, gap: 4 };

/**
 * Animation length for charts entering (ms). 0: charts draw at once. A panel full of charts that each grow on every page load is scattered motion
 * (design review, 2026-10-19); motion is kept for what a person does (the hover tooltip). Raise it here only for one deliberate moment.
 */
export function animationMs(): number {
  return 0;
}

/** Number and date formatting is shared with the vendor analytics on purpose (imported, never copied or changed). */
export { bucketLabel, changeOf, formatCompact, formatTaka, formatValue, sharePct, type ValueKind } from '../../analytics/format';
