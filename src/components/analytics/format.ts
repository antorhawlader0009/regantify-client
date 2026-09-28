import type { AnalyticsBucket, Compared } from '../../lib/analyticsApi';

export type ValueKind = 'money' | 'count' | 'percent';

/** "৳12,950", or "−৳500" for a loss. */
export function formatTaka(value: number) {
  const amount = Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return value < 0 && amount !== '0' ? `−৳${amount}` : `৳${amount}`;
}

/** Short form for chart axes: ৳950, ৳12.5k, ৳1.2M. */
export function formatCompact(value: number, kind: ValueKind = 'count') {
  const sign = value < 0 ? '−' : '';
  const prefix = `${sign}${kind === 'money' ? '৳' : ''}`;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${prefix}${+(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${+(abs / 1_000).toFixed(1)}k`;
  return `${prefix}${+abs.toFixed(kind === 'percent' ? 1 : 0)}${kind === 'percent' ? '%' : ''}`;
}

export function formatValue(value: number, kind: ValueKind) {
  if (kind === 'money') return formatTaka(value);
  if (kind === 'percent') return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** "12 Sep" for a day bucket, "Sep 26" for a month bucket. */
export function bucketLabel(bucket: string, kind: AnalyticsBucket, long = false) {
  if (kind === 'month') {
    return new Date(`${bucket}-01T00:00:00`).toLocaleDateString('en-GB', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' });
  }
  return new Date(`${bucket}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(long && { weekday: 'short', year: 'numeric' }),
  });
}

/** Every number is compared with the equally long period right before the picked dates. */
export const COMPARE_LABEL = 'vs previous period';

/**
 * The change from the previous period: a % change for money and
 * counts, a difference in percentage points for rates (a conversion
 * rate going 2% → 3% is "+1 pt", not "+50%"). Null when there's
 * nothing to compare against.
 */
export function changeOf({ current, previous }: Compared, kind: ValueKind): { value: number; label: string } | null {
  if (kind === 'percent') {
    if (current === 0 && previous === 0) return null;
    const diff = current - previous;
    return { value: diff, label: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pts` };
  }
  if (previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { value: pct, label: `${pct > 0 ? '+' : ''}${Math.abs(pct) >= 100 ? pct.toFixed(0) : pct.toFixed(1)}%` };
}

export function sharePct(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}
