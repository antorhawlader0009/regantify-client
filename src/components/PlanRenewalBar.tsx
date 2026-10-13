import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { getVendorPlanUsage } from '../lib/plansApi';

/**
 * The red strip while a paid plan is past its end date but still working (the grace period, super-admin-plan.md Step 9): it says when the store falls back
 * to the Free plan and links to Billing. Nothing shows otherwise. Shares the Sidebar's plan query, so it costs no extra request.
 */
export function PlanRenewalBar() {
  const { data } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage, retry: false, staleTime: 60_000 });
  const g = data?.planGrace;
  if (!g?.inGrace || !g.graceEndsAt) return null;
  const left = Math.max(1, Math.ceil((new Date(g.graceEndsAt).getTime() - Date.now()) / 86_400_000));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
      <Clock size={16} className="shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        Renew now. Your {data?.plan.name} plan has ended. It keeps working for {left} more {left === 1 ? 'day' : 'days'}, then your store moves to the Free plan.
      </p>
      <Link to="/vendor/billing" className="shrink-0 font-medium underline underline-offset-2">
        Renew
      </Link>
    </div>
  );
}
