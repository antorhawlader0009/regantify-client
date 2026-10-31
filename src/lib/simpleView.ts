import { useQuery } from '@tanstack/react-query';
import { isNavGroup, vendorNav } from './navConfig';
import { getVendorPlanUsage } from './plansApi';
import { useDashboardView } from './useDashboardView';

/**
 * Which dashboard pages are Full mode only (SIMPLE-VIEW-plan.md Step 3). The sidebar pages are the `advanced: true`
 * marks in navConfig.ts; the rest are pages reached from buttons inside other pages, listed here.
 */
const EXTRA_FULL_VIEW_PATHS = [
  // Orders sub-pages (the tools behind Orders' "More filters and tools").
  '/vendor/orders/rider-cash',
  '/vendor/orders/standing',
  '/vendor/orders/chats',
  '/vendor/orders/refunds',
  '/vendor/orders/return-check-in',
  '/vendor/orders/tracking-bulk',
  '/vendor/orders/import',
  '/vendor/orders/handover',
  // Reviews: questions and adding a review by hand.
  '/vendor/reviews/questions',
  '/vendor/reviews/reports',
  '/vendor/reviews/add',
];

function markedPaths(): string[] {
  const out: string[] = [];
  for (const s of vendorNav) {
    if (s.advanced && s.path) out.push(s.path);
    for (const c of s.children ?? []) {
      if (isNavGroup(c)) {
        for (const l of c.children) if (c.advanced || l.advanced) out.push(l.path);
      } else if (c.advanced) out.push(c.path);
    }
  }
  return out;
}

const FULL_VIEW_PATHS = [...markedPaths(), ...EXTRA_FULL_VIEW_PATHS];

/** The Full mode page a dashboard address belongs to (itself or a page under it), or null for a Simple mode page. */
export function fullViewPageOf(pathname: string): string | null {
  let best: string | null = null;
  for (const p of FULL_VIEW_PATHS) {
    if ((pathname === p || pathname.startsWith(`${p}/`)) && (!best || p.length > best.length)) best = p;
  }
  return best;
}

export const isFullViewPath = (pathname: string) => fullViewPageOf(pathname) !== null;

/**
 * Full mode pages that stay in a Simple mode menu for this person: the ones they pinned, plus the ones in use that the
 * app knows cheaply (LMS and POS when the plan includes them; rule 10). Empty in Full mode.
 */
export function useSimpleViewKeeps(): string[] {
  const { isSimple, pins } = useDashboardView();
  const { data: usage } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage, retry: false, enabled: isSimple });
  if (!isSimple) return [];
  const keep = [...pins];
  if (usage?.plan?.lmsEnabled) keep.push('/vendor/lms');
  if (usage?.plan?.posEnabled) keep.push('/vendor/pos');
  return keep;
}
