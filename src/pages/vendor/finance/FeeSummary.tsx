import { useQuery } from '@tanstack/react-query';
import { CreditCard, Check } from 'lucide-react';
import { getPlans, getVendorPlanUsage } from '../../../lib/plansApi';

function formatFee(value: string) {
  return `+${Number(value).toLocaleString('en-US')}৳`;
}

/**
 * Finance > Fee Summary — PLAN.md Step 12. Surfaces the per-tier payment
 * gateway fee (from Plan.paymentGatewayFeeBdt, Step 1) so a vendor can
 * see what they're currently paying and what upgrading would change.
 * Display-only: no real payment gateway exists yet (checkout is
 * COD-only — see PLAN.md's own note), so nothing here actually deducts
 * a fee per transaction. That's flagged as a follow-up project once a
 * real gateway is integrated, not part of this page.
 */
export default function FeeSummary() {
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['vendor-plan-usage'],
    queryFn: getVendorPlanUsage,
  });
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
  });

  const loading = usageLoading || plansLoading;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Fee Summary</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Every plan includes a free payment gateway with a per-transaction fee — higher tiers pay less.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-regantify-text-muted">
          Loading…
        </div>
      ) : (
        <>
          {usage && (
            <div className="bg-regantify-black rounded-2xl p-6 max-w-sm text-white mb-6">
              <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
                <CreditCard size={16} />
                Your plan: {usage.plan.name}
              </div>
              <p className="text-3xl font-semibold mt-3">{formatFee(usage.plan.paymentGatewayFeeBdt)}</p>
              <p className="text-white/60 text-xs mt-1">per transaction, on top of the order total</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide bg-regantify-content border-b border-black/5">
                  <th className="p-4">Plan</th>
                  <th className="p-4">Fee per transaction</th>
                  <th className="p-4">Custom payment gateway</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const isCurrent = usage?.plan.code === plan.code;
                  return (
                    <tr key={plan.id} className="border-b border-black/5 last:border-b-0">
                      <td className="p-4">
                        <span className="text-sm font-medium text-regantify-text">{plan.name}</span>
                        {isCurrent && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-regantify-cta bg-regantify-cta/10 px-2 py-0.5 rounded-full">
                            <Check size={10} />
                            Your plan
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-regantify-text">{formatFee(plan.paymentGatewayFeeBdt)}</td>
                      <td className="p-4 text-sm text-regantify-text-muted">
                        {plan.customPaymentGatewayAllowed ? 'Option available' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-regantify-text-muted mt-4">
            The free gateway is Cash on Delivery today — the per-transaction fee applies once a real online payment
            gateway is added.
          </p>
        </>
      )}
    </div>
  );
}
