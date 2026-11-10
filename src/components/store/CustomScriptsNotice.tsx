import { useQuery } from '@tanstack/react-query';
import { getVendorPlanUsage } from '../../lib/plansApi';
import { domainsApi } from '../../lib/domainsApi';
import { LockedFeatureCard } from '../ui/UpgradePrompt';

// Custom Head Scripts and JavaScript Code (2026-11-10, the owner's rule): only Starter / Advance, only while the store's own
// domain is Live, and they run only on that domain, never on the free {sub}.regantify.com address. The server refuses saving
// otherwise; this says why before the store types anything. Custom CSS is for every plan.
export function CustomScriptsNotice() {
  const planCode = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage, staleTime: 60_000 }).data?.plan.code;
  const domain = useQuery({ queryKey: ['vendor-domain-target', 'scripts'], queryFn: domainsApi.status, staleTime: 60_000 }).data;
  if (!planCode || !domain) return null;

  if (planCode !== 'STARTER' && planCode !== 'ADVANCE') {
    return (
      <div className="mb-4">
        <LockedFeatureCard
          title="Custom scripts are on the Starter and Advance plans"
          message="Upgrade to Starter or Advance and connect your own domain to add scripts. Custom CSS works on every plan."
        />
      </div>
    );
  }
  if (domain.status !== 'ACTIVE' || !domain.domain) {
    return (
      <div className="mb-4">
        <LockedFeatureCard
          title="Connect your own domain first"
          message="Custom scripts run only on your own domain, never on your free regantify.com address. Connect it in Store > Domain and wait until it shows Live."
        />
      </div>
    );
  }
  return (
    <p className="mb-4 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
      These scripts run only on <span className="font-mono">https://{domain.domain}</span>, not on your regantify.com address.
    </p>
  );
}
