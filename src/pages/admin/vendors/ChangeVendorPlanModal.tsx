import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import type { PlanCode } from '../../../lib/plansApi';

interface ChangeVendorPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  currentPlanCode: PlanCode;
  onConfirm: (next: PlanCode) => void;
  submitting?: boolean;
}

const PLAN_OPTIONS: { value: PlanCode; label: string }[] = [
  { value: 'FREE', label: 'Free' },
  { value: 'BASIC', label: 'Basic' },
  { value: 'STARTER', label: 'Starter' },
  { value: 'ADVANCE', label: 'Advance' },
];

/**
 * Super Admin > All Vendors > Change Plan (PLAN.md Step 15) — direct
 * manual assignment, same "select + explicit confirm" shape as
 * ChangeVendorStatusModal. Independent of the Plan Requests approve/
 * reject flow (Step 14/15's request-to-admin stopgap) — an admin can
 * always just set a vendor's plan directly, whether or not that vendor
 * ever asked.
 */
export function ChangeVendorPlanModal({
  open,
  onOpenChange,
  storeName,
  currentPlanCode,
  onConfirm,
  submitting,
}: ChangeVendorPlanModalProps) {
  const [planCode, setPlanCode] = useState<PlanCode>(currentPlanCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-md">
      <div className="p-6 space-y-5">
        <h2 className="font-semibold text-regantify-text">Change Plan for {storeName}</h2>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Plan</label>
          <select
            value={planCode}
            onChange={(e) => setPlanCode(e.target.value as PlanCode)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-regantify-search text-regantify-text text-sm focus:outline-none"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-black/5 px-6 py-4 flex justify-end">
        <button
          type="button"
          onClick={() => onConfirm(planCode)}
          disabled={submitting || planCode === currentPlanCode}
          className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
            transition-colors disabled:opacity-60"
        >
          {submitting ? 'Changing…' : 'Change Plan'}
        </button>
      </div>
    </Dialog>
  );
}
