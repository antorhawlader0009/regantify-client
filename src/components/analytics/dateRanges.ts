// Date ranges for the Analytics date picker. Days are "YYYY-MM-DD" in
// Dhaka time, both ends included, the same shape the server takes
// (server/src/analytics/analytics-period.ts). Date math runs on UTC
// midnights so the viewer's own time zone never shifts a day.

import type { DateRange } from '../../lib/analyticsApi';

export type { DateRange };

const DAY_MS = 24 * 60 * 60_000;

/** Analytics tracking data is kept this long (server: RETENTION_YEARS); the picker stops there. */
export const RETENTION_YEARS = 2;

export function parseDay(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  return toDay(new Date(parseDay(day).getTime() + n * DAY_MS));
}

/** Today's date in Dhaka, wherever the viewer is. */
export function todayDhaka(): string {
  return new Date(Date.now() + 6 * 60 * 60_000).toISOString().slice(0, 10);
}

/** The oldest day the picker offers: the same date RETENTION_YEARS ago. */
export function earliestDay(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  return toDay(new Date(Date.UTC(y - RETENTION_YEARS, m - 1, d)));
}

/** Number of days in a range, both ends counted. */
export function rangeDays({ from, to }: DateRange): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / DAY_MS) + 1;
}

/** The equally long range right before, which every number is compared with. */
export function previousRange(range: DateRange): DateRange {
  const days = rangeDays(range);
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}

export type PresetId =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'last7'
  | 'lastWeek'
  | 'last28'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'last90'
  | 'quarter'
  | 'thisYear'
  | 'lastYear';

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'thisWeek', label: 'This week (Sun – Today)' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'lastWeek', label: 'Last week (Sun – Sat)' },
  { id: 'last28', label: 'Last 28 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'last90', label: 'Last 90 days' },
  { id: 'quarter', label: 'Quarter to date' },
  { id: 'thisYear', label: 'This year (Jan – Today)' },
  { id: 'lastYear', label: 'Last calendar year' },
];

export const DEFAULT_PRESET: PresetId = 'last30';

export function presetLabel(id: PresetId): string {
  return PRESETS.find((p) => p.id === id)!.label;
}

/**
 * The dates a preset covers today. "Last N days" are N whole days ending
 * yesterday, so a day still in progress never drags a trend down.
 */
export function presetRange(id: PresetId, today: string): DateRange {
  const t = parseDay(today);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  const weekday = t.getUTCDay(); // 0 = Sunday
  const monthStart = (year: number, month: number) => toDay(new Date(Date.UTC(year, month, 1)));
  const lastDays = (n: number) => ({ from: addDays(today, -n), to: addDays(today, -1) });
  switch (id) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday':
      return { from: addDays(today, -1), to: addDays(today, -1) };
    case 'thisWeek':
      return { from: addDays(today, -weekday), to: today };
    case 'lastWeek':
      return { from: addDays(today, -weekday - 7), to: addDays(today, -weekday - 1) };
    case 'last7':
      return lastDays(7);
    case 'last28':
      return lastDays(28);
    case 'last30':
      return lastDays(30);
    case 'last90':
      return lastDays(90);
    case 'thisMonth':
      return { from: monthStart(y, m), to: today };
    case 'lastMonth':
      return { from: monthStart(y, m - 1), to: addDays(monthStart(y, m), -1) };
    case 'quarter':
      return { from: monthStart(y, m - (m % 3)), to: today };
    case 'thisYear':
      return { from: monthStart(y, 0), to: today };
    case 'lastYear':
      return { from: monthStart(y - 1, 0), to: toDay(new Date(Date.UTC(y - 1, 11, 31))) };
  }
}

/** A range kept inside what can be shown: not before the retention limit, not after today. */
export function clampRange(range: DateRange, today: string): DateRange {
  const min = earliestDay(today);
  const from = range.from < min ? min : range.from > today ? today : range.from;
  const to = range.to > today ? today : range.to < from ? from : range.to;
  return { from, to };
}

const MONTH_DAY: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' };

/** "Aug 31 – Sep 27, 2026", "Dec 29, 2025 – Jan 4, 2026" or "Sep 28, 2026". */
export function formatRange({ from, to }: DateRange): string {
  const a = parseDay(from);
  const b = parseDay(to);
  const withYear = (d: Date) => d.toLocaleDateString('en-US', { ...MONTH_DAY, year: 'numeric' });
  if (from === to) return withYear(a);
  if (a.getUTCFullYear() === b.getUTCFullYear()) return `${a.toLocaleDateString('en-US', MONTH_DAY)} – ${withYear(b)}`;
  return `${withYear(a)} – ${withYear(b)}`;
}

export function isValidDay(day: string | null | undefined): day is string {
  return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(parseDay(day).getTime()) && toDay(parseDay(day)) === day;
}
