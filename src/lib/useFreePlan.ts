import { useQuery } from '@tanstack/react-query';
import { getVendorPlanUsage } from './plansApi';

/**
 * Whether the store is on the Free plan now (true / false), or undefined while loading. Free has no Custom CSS, no CSV
 * import/export, only the Meta Pixel ID among the integrations, only SteadFast for booking, and must show the footer credit
 * (the owner's rules, 2026-11-18). The server enforces all of it; this only shows the locks.
 */
export function useIsFreePlan(): boolean | undefined {
  const code = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage, staleTime: 60_000 }).data?.plan.code;
  return code === undefined ? undefined : code === 'FREE';
}
