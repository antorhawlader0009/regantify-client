import { toast } from './toast';

/**
 * Daily caps (new products, orders, image uploads; 2026-10-20). Every plan is unlimited for sellers; the server caps one day
 * but never sends the number. It only says how many are left once 5 or fewer remain, in two places:
 * - the `X-Daily-Limit: products=4,images=2` header on the answer of the action that used one (read in api.ts below),
 * - `usage.daily` on GET /v1/plans/usage, for the banners on Dashboard, Products, Orders and Billing.
 * Mirrors server/src/plans/daily-limit-notice.ts.
 */
export type DailyKind = 'products' | 'orders' | 'images';
export interface DailyCapState {
  /** How many are left today, only once 5 or fewer remain; null = plenty (the number is never shown). */
  left: number | null;
  /** Today's cap is used up. */
  reached: boolean;
}
export type DailyCaps = Record<DailyKind, DailyCapState>;

const NOUN: Record<DailyKind, [string, string]> = {
  products: ['new product', 'new products'],
  orders: ['order', 'orders'],
  images: ['image upload', 'image uploads'],
};

/** The sentence for a cap that is close or used up; null while there is nothing to warn about. */
export function dailyCapMessage(kind: DailyKind, state: Pick<DailyCapState, 'left' | 'reached'>): string | null {
  const [one, many] = NOUN[kind];
  if (state.reached || state.left === 0) return `Today's limit for ${many} is used up. It starts again after midnight. Please talk to support to raise it.`;
  if (state.left === null) return null;
  return `Only ${state.left} more ${state.left === 1 ? one : many} left for today. Please talk to support to raise the limit.`;
}

/** Shown once per kind and count, so a burst of uploads doesn't stack the same toast. */
const shown = new Set<string>();

/** Reads the warning header of a dashboard answer and shows it as a toast. */
export function toastDailyLimitHeader(value: unknown): void {
  if (typeof value !== 'string' || !value) return;
  for (const part of value.split(',')) {
    const [kind, raw] = part.split('=');
    if (kind !== 'products' && kind !== 'orders' && kind !== 'images') continue;
    const left = Number(raw);
    if (!Number.isInteger(left) || left < 0) continue;
    const key = `${kind}:${left}`;
    if (shown.has(key)) continue;
    shown.add(key);
    const message = dailyCapMessage(kind, { left, reached: false });
    if (message) toast.error(message);
  }
}
