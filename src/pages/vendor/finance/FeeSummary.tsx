import { useQuery } from '@tanstack/react-query';
import { CreditCard, Check } from 'lucide-react';
import { getPlans, getVendorPlanUsage } from '../../../lib/plansApi';
import type { PaymentFeeType, PaymentFeePayer } from '../../../lib/plansApi';

function formatFee(value: string, type: PaymentFeeType) {
  return type === 'PERCENTAGE' ? `+${Number(value)}%` : `+${Number(value).toLocaleString('en-US')}৳`;
}

// "Fee From: Vendor" — this plan's fee comes out of the vendor's OWN
// payout at order completion instead of being added to what the
// shopper pays (see server's PaymentFeePayer). Worth calling out here
// specifically since it's the vendor's own money either way.
function payerNote(payer: PaymentFeePayer) {
  return payer === 'VENDOR' ? 'paid by you, not the customer' : 'paid by the customer';
}

/**
 * Finance > Fee Summary — PLAN.md Step 12. Surfaces the per-tier payment
 * gateway fees (Plan.codGatewayFeeBdt / onlinePaymentGatewayFeeBdt —
 * split per built-in gateway since COD and Online Payment can charge
 * different amounts) so a vendor can see what they're currently paying
 * and what upgrading would change. Display-only here too: the fee
 * itself is charged at checkout by OrdersService/CreateOrderDto (see
 * src/payment-gateways/), not by this page — this is just a read-only
 * summary of the rate per plan.
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
          Every plan includes Cash On Delivery and Online Payment (Regantify) with their own per-transaction fee —
          higher tiers pay less.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-regantify-text-muted">
          Loading…
        </div>
      ) : (
        <>
          {usage && (
            <div className="grid grid-cols-2 gap-4 max-w-xl mb-6">
              <div className="bg-regantify-black rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
                  <CreditCard size={16} />
                  Cash On Delivery
                </div>
                <p className="text-3xl font-semibold mt-3">{formatFee(usage.plan.codGatewayFeeBdt, usage.plan.codGatewayFeeType)}</p>
                <p className="text-white/60 text-xs mt-1">
                  per order, on your {usage.plan.name} plan — {payerNote(usage.plan.codGatewayFeePayer)}
                </p>
              </div>
              <div className="bg-regantify-black rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
                  <CreditCard size={16} />
                  Online Payment (Regantify)
                </div>
                <p className="text-3xl font-semibold mt-3">
                  {formatFee(usage.plan.onlinePaymentGatewayFeeBdt, usage.plan.onlinePaymentGatewayFeeType)}
                </p>
                <p className="text-white/60 text-xs mt-1">
                  per order, on your {usage.plan.name} plan — {payerNote(usage.plan.onlinePaymentGatewayFeePayer)}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide bg-regantify-content border-b border-black/5">
                  <th className="p-4">Plan</th>
                  <th className="p-4">Cash On Delivery fee</th>
                  <th className="p-4">Online Payment fee</th>
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
                      <td className="p-4 text-sm text-regantify-text">
                        {formatFee(plan.codGatewayFeeBdt, plan.codGatewayFeeType)}
                        {plan.codGatewayFeePayer === 'VENDOR' && (
                          <span className="block text-[11px] text-regantify-text-muted">paid by you</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-regantify-text">
                        {formatFee(plan.onlinePaymentGatewayFeeBdt, plan.onlinePaymentGatewayFeeType)}
                        {plan.onlinePaymentGatewayFeePayer === 'VENDOR' && (
                          <span className="block text-[11px] text-regantify-text-muted">paid by you</span>
                        )}
                      </td>
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
            Each gateway's fee applies per order paid through it — manage your store's gateways under Store &gt;
            Payment Gateway.
          </p>
        </>
      )}
    </div>
  );
}
