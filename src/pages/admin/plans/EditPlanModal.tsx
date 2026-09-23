import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import type { Plan, PaymentFeePayer } from '../../../lib/plansApi';
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

// A small number input with a fixed ৳/% suffix — the flat and percentage
// parts of FeeInputField below.
function FeePartInput({
  value,
  onChange,
  suffix,
  max,
}: {
  value: number;
  onChange: (next: number) => void;
  suffix: string;
  max?: number;
}) {
  return (
    <div className="relative flex-1 min-w-0">
      <input
        type="number"
        min={0}
        max={max}
        step="any"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full pl-3 pr-7 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-regantify-text-muted">
        {suffix}
      </span>
    </div>
  );
}

// Cash On Delivery fee / Online Payment fee — a flat ৳ part AND a % part
// side by side, both charged together (fee = flat + (order total + flat) × %; either
// can be 0 — see server's Plan.codGatewayFeeBdt/codGatewayFeePercent),
// plus a "Fee From" dropdown (see PaymentFeePayer) choosing who actually
// pays it: Customer (default — added to the order total, shown/folded per
// "Hide from checkout") or Vendor (never added to the order total or
// shown to the shopper anywhere — comes out of the vendor's own payout
// instead, shown only on the vendor's own invoice). "Hide from checkout"
// is hidden entirely when Fee From is Vendor since it's meaningless then.
// The % part is capped at 100 (mirrors UpdatePlanDto's own @Max(100)).
function FeeInputField({
  label,
  flat,
  onFlatChange,
  percent,
  onPercentChange,
  payer,
  onPayerChange,
  hidden,
  onHiddenChange,
}: {
  label: string;
  flat: number;
  onFlatChange: (next: number) => void;
  percent: number;
  onPercentChange: (next: number) => void;
  payer: PaymentFeePayer;
  onPayerChange: (next: PaymentFeePayer) => void;
  hidden: boolean;
  onHiddenChange: (v: boolean) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-regantify-text-muted mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <FeePartInput value={flat} onChange={onFlatChange} suffix="৳" />
        <span className="text-xs text-regantify-text-muted">+</span>
        <FeePartInput value={percent} onChange={onPercentChange} suffix="%" max={100} />
      </div>
      <div className="mt-1.5">
        <label className="block text-[11px] text-regantify-text-muted mb-0.5">Fee From</label>
        <select
          value={payer}
          onChange={(e) => onPayerChange(e.target.value as PaymentFeePayer)}
          className="w-full px-3 py-1.5 rounded-lg bg-regantify-search text-xs text-regantify-text focus:outline-none"
        >
          <option value="CUSTOMER">Customer</option>
          <option value="VENDOR">Vendor</option>
        </select>
      </div>
      {payer === 'CUSTOMER' ? (
        <label className="flex items-center gap-1.5 mt-1.5 text-xs text-regantify-text-muted">
          <input type="checkbox" checked={hidden} onChange={(e) => onHiddenChange(e.target.checked)} className="h-3.5 w-3.5" />
          Hide from checkout
        </label>
      ) : (
        <p className="mt-1.5 text-[11px] text-regantify-text-muted">
          Added to the vendor's product price — customer never sees this fee.
        </p>
      )}
    </div>
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
  const [codGatewayFeeBdt, setCodGatewayFeeBdt] = useState(plan ? Number(plan.codGatewayFeeBdt) : 0);
  const [codGatewayFeePercent, setCodGatewayFeePercent] = useState(plan ? Number(plan.codGatewayFeePercent) : 0);
  const [codGatewayFeePayer, setCodGatewayFeePayer] = useState<PaymentFeePayer>(plan?.codGatewayFeePayer ?? 'CUSTOMER');
  const [onlinePaymentGatewayFeeBdt, setOnlinePaymentGatewayFeeBdt] = useState(
    plan ? Number(plan.onlinePaymentGatewayFeeBdt) : 0,
  );
  const [onlinePaymentGatewayFeePercent, setOnlinePaymentGatewayFeePercent] = useState(
    plan ? Number(plan.onlinePaymentGatewayFeePercent) : 0,
  );
  const [onlinePaymentGatewayFeePayer, setOnlinePaymentGatewayFeePayer] = useState<PaymentFeePayer>(
    plan?.onlinePaymentGatewayFeePayer ?? 'CUSTOMER',
  );
  const [codFeeHidden, setCodFeeHidden] = useState(plan?.codFeeHidden ?? false);
  const [onlinePaymentFeeHidden, setOnlinePaymentFeeHidden] = useState(plan?.onlinePaymentFeeHidden ?? false);

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
      codGatewayFeeBdt,
      codGatewayFeePercent,
      codGatewayFeePayer,
      onlinePaymentGatewayFeeBdt,
      onlinePaymentGatewayFeePercent,
      onlinePaymentGatewayFeePayer,
      codFeeHidden,
      onlinePaymentFeeHidden,
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

          <div className="grid grid-cols-2 gap-3">
            <FeeInputField
              label="Cash On Delivery fee"
              flat={codGatewayFeeBdt}
              onFlatChange={setCodGatewayFeeBdt}
              percent={codGatewayFeePercent}
              onPercentChange={setCodGatewayFeePercent}
              payer={codGatewayFeePayer}
              onPayerChange={setCodGatewayFeePayer}
              hidden={codFeeHidden}
              onHiddenChange={setCodFeeHidden}
            />
            <FeeInputField
              label="Online Payment (Regantify) fee"
              flat={onlinePaymentGatewayFeeBdt}
              onFlatChange={setOnlinePaymentGatewayFeeBdt}
              percent={onlinePaymentGatewayFeePercent}
              onPercentChange={setOnlinePaymentGatewayFeePercent}
              payer={onlinePaymentGatewayFeePayer}
              onPayerChange={setOnlinePaymentGatewayFeePayer}
              hidden={onlinePaymentFeeHidden}
              onHiddenChange={setOnlinePaymentFeeHidden}
            />
          </div>
          <p className="text-xs text-regantify-text-muted -mt-3">
            Fee = flat ৳ + % of (product + delivery + VAT + the flat ৳). E.g. ৳100 + ৳50 delivery + ৳10 flat = ৳160,
            2% = ৳3.2, customer pays ৳163.2. Leave either at 0 to use only the other. Fee From Customer adds it to what the shopper pays (hidden fees are still charged —
            just folded into the total silently); Fee From Vendor never charges the shopper at all and comes out of
            the vendor's own payout instead.
          </p>

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
