import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import type { Plan } from '../../../lib/plansApi';
import type { UpdatePlanPayload } from '../../../lib/adminPlansApi';

interface EditPlanModalProps {
  plan: Plan | null;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: UpdatePlanPayload) => void;
  submitting?: boolean;
}

// Empty string in the input = "unlimited" (sends null); any other value
// = that number. Mirrors the server's own null-means-unlimited
// convention (see UpdatePlanDto) directly in the form's own UI, rather
// than a separate "unlimited" checkbox next to every field.
function LimitField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-regantify-text-muted mb-1">{label}</label>
      <input
        type="number"
        min={0}
        value={value === null ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder="Unlimited"
        className="w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text
          placeholder:text-regantify-text-muted/70 focus:outline-none"
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-regantify-text">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}

/**
 * Super Admin > Plans > Edit — every field from the Plan model (PLAN.md
 * Step 15). Initialized from the plan prop each time it opens (via
 * `key={plan.id}` on the caller's usage — see PlanManagement.tsx), so
 * switching which plan is being edited always starts from that plan's
 * own current values, not stale state left over from a previous edit.
 */
export function EditPlanModal({ plan, onOpenChange, onSave, submitting }: EditPlanModalProps) {
  const [name, setName] = useState(plan?.name ?? '');
  const [priceMonthly, setPriceMonthly] = useState(plan ? Number(plan.priceMonthly) : 0);
  const [productLimit, setProductLimit] = useState<number | null>(plan?.productLimit ?? null);
  const [orderLimitPerDay, setOrderLimitPerDay] = useState<number | null>(plan?.orderLimitPerDay ?? null);
  const [monthlyVisitLimit, setMonthlyVisitLimit] = useState<number | null>(plan?.monthlyVisitLimit ?? null);
  const [themeAllowance, setThemeAllowance] = useState<number | null>(plan?.themeAllowance ?? null);
  const [imageUploadLimit, setImageUploadLimit] = useState<number | null>(plan?.imageUploadLimit ?? null);
  const [aiChatMessageLimitPerDay, setAiChatMessageLimitPerDay] = useState<number | null>(
    plan?.aiChatMessageLimitPerDay ?? null,
  );
  const [staffLimit, setStaffLimit] = useState<number | null>(plan?.staffLimit ?? null);
  const [customDomainAllowed, setCustomDomainAllowed] = useState(plan?.customDomainAllowed ?? false);
  const [customPaymentGatewayAllowed, setCustomPaymentGatewayAllowed] = useState(
    plan?.customPaymentGatewayAllowed ?? false,
  );
  const [lmsEnabled, setLmsEnabled] = useState(plan?.lmsEnabled ?? false);
  const [posEnabled, setPosEnabled] = useState(plan?.posEnabled ?? false);
  const [paymentGatewayFeeBdt, setPaymentGatewayFeeBdt] = useState(plan ? Number(plan.paymentGatewayFeeBdt) : 0);

  const handleSave = () => {
    onSave({
      name,
      priceMonthly,
      productLimit,
      orderLimitPerDay,
      monthlyVisitLimit,
      themeAllowance,
      imageUploadLimit,
      aiChatMessageLimitPerDay,
      staffLimit,
      customDomainAllowed,
      customPaymentGatewayAllowed,
      lmsEnabled,
      posEnabled,
      paymentGatewayFeeBdt,
    });
  };

  return (
    <Dialog open={plan !== null} onOpenChange={onOpenChange} title={plan ? `Edit ${plan.name}` : ''} maxWidth="max-w-lg">
      {plan && (
        <div className="p-6 pt-4 space-y-5">
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Plan name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">Price / month (৳)</label>
              <input
                type="number"
                min={0}
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">
                Payment gateway fee (৳/txn)
              </label>
              <input
                type="number"
                min={0}
                value={paymentGatewayFeeBdt}
                onChange={(e) => setPaymentGatewayFeeBdt(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
              />
            </div>
          </div>

          <p className="text-xs text-regantify-text-muted -mb-2">Leave a limit field blank for unlimited.</p>
          <div className="grid grid-cols-2 gap-3">
            <LimitField label="Product limit" value={productLimit} onChange={setProductLimit} />
            <LimitField label="Orders / day" value={orderLimitPerDay} onChange={setOrderLimitPerDay} />
            <LimitField label="Monthly visits" value={monthlyVisitLimit} onChange={setMonthlyVisitLimit} />
            <LimitField label="Theme allowance" value={themeAllowance} onChange={setThemeAllowance} />
            <LimitField label="Image uploads" value={imageUploadLimit} onChange={setImageUploadLimit} />
            <LimitField label="AI chat msgs / day" value={aiChatMessageLimitPerDay} onChange={setAiChatMessageLimitPerDay} />
            <LimitField label="Staff limit" value={staffLimit} onChange={setStaffLimit} />
          </div>

          <div className="border-t border-black/5 pt-3">
            <ToggleField label="Custom domain allowed" checked={customDomainAllowed} onChange={setCustomDomainAllowed} />
            <ToggleField
              label="Custom payment gateway allowed"
              checked={customPaymentGatewayAllowed}
              onChange={setCustomPaymentGatewayAllowed}
            />
            <ToggleField label="LMS System enabled" checked={lmsEnabled} onChange={setLmsEnabled} />
            <ToggleField label="POS System enabled" checked={posEnabled} onChange={setPosEnabled} />
          </div>
        </div>
      )}

      <div className="border-t border-black/5 px-6 py-4 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
            transition-colors disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save Plan'}
        </button>
      </div>
    </Dialog>
  );
}
