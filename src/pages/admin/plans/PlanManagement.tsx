import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPlansApi } from '../../../lib/adminPlansApi';
import type { Plan, PlanCode, PaymentFeeType, PaymentFeePayer } from '../../../lib/plansApi';
import { toast } from '../../../lib/toast';
import { EditPlanModal } from './EditPlanModal';
import type { UpdatePlanPayload } from '../../../lib/adminPlansApi';

const TIER_ORDER: PlanCode[] = ['FREE', 'BASIC', 'STARTER', 'ADVANCE'];

function formatLimit(value: number | null, suffix = '') {
  return value === null ? 'Unlimited' : `${value.toLocaleString('en-US')}${suffix}`;
}

function formatFee(amount: string, type: PaymentFeeType, payer: PaymentFeePayer) {
  const value = type === 'PERCENTAGE' ? `+${Number(amount)}%` : `+${Number(amount)}৳`;
  return payer === 'VENDOR' ? `${value} (vendor)` : value;
}

/**
 * Super Admin > Plans > Manage Plans (PLAN.md Step 15) — view/edit the 4
 * Plan rows' limits and pricing so Super Admin can tune numbers without
 * a code deploy, per Step 1's original design intent. Always exactly 4
 * rows (Plan is seeded once via prisma:seed-plans, never created/
 * deleted from the UI) — this page only ever edits, never adds/removes.
 */
export default function PlanManagement() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: adminPlansApi.listPlans,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePlanPayload }) => adminPlansApi.updatePlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      // Every vendor's Billing page / usage reads embed the Plan row
      // they're on — invalidate that cache key too so a Super Admin's
      // edit shows up immediately for anyone with the app open, not just
      // on their next hard refresh.
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-plan-usage'] });
      toast.success('Plan updated.');
      setEditingPlan(null);
    },
    onError: () => toast.error('Could not save this plan. Please try again.'),
  });

  const sortedPlans = [...plans].sort((a, b) => TIER_ORDER.indexOf(a.code) - TIER_ORDER.indexOf(b.code));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Manage Plans</h1>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-regantify-text-muted">
          Loading…
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-regantify-content text-left text-regantify-text-muted">
                  <th className="px-4 py-3 font-medium">PLAN</th>
                  <th className="px-4 py-3 font-medium">PRICE/MO</th>
                  <th className="px-4 py-3 font-medium">PRODUCTS</th>
                  <th className="px-4 py-3 font-medium">ORDERS/DAY</th>
                  <th className="px-4 py-3 font-medium">VISITS/MO</th>
                  <th className="px-4 py-3 font-medium">THEMES</th>
                  <th className="px-4 py-3 font-medium">STAFF</th>
                  <th className="px-4 py-3 font-medium">COD FEE</th>
                  <th className="px-4 py-3 font-medium">ONLINE FEE</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sortedPlans.map((plan) => (
                  <tr key={plan.id} className="border-t border-black/5">
                    <td className="px-4 py-3 font-medium text-regantify-text">{plan.name}</td>
                    <td className="px-4 py-3 text-regantify-text">৳{Number(plan.priceMonthly).toLocaleString('en-US')}</td>
                    <td className="px-4 py-3 text-regantify-text">{formatLimit(plan.productLimit)}</td>
                    <td className="px-4 py-3 text-regantify-text">{formatLimit(plan.orderLimitPerDay)}</td>
                    <td className="px-4 py-3 text-regantify-text">{formatLimit(plan.monthlyVisitLimit)}</td>
                    <td className="px-4 py-3 text-regantify-text">{formatLimit(plan.themeAllowance)}</td>
                    <td className="px-4 py-3 text-regantify-text">{formatLimit(plan.staffLimit)}</td>
                    <td className="px-4 py-3 text-regantify-text">
                      {formatFee(plan.codGatewayFeeBdt, plan.codGatewayFeeType, plan.codGatewayFeePayer)}
                    </td>
                    <td className="px-4 py-3 text-regantify-text">
                      {formatFee(plan.onlinePaymentGatewayFeeBdt, plan.onlinePaymentGatewayFeeType, plan.onlinePaymentGatewayFeePayer)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="px-3 py-1.5 rounded-lg border border-black/10 text-sm
                          text-regantify-text hover:bg-regantify-content"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EditPlanModal
        key={editingPlan?.id}
        plan={editingPlan}
        onOpenChange={(open) => !open && setEditingPlan(null)}
        submitting={updateMutation.isPending}
        onSave={(payload) => editingPlan && updateMutation.mutate({ id: editingPlan.id, payload })}
      />
    </div>
  );
}
