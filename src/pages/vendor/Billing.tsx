import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, CreditCard } from 'lucide-react';
import {
  getPlans,
  getVendorPlanUsage,
  getOwnPlanRequests,
  requestPlanUpgrade,
  type Plan,
  type PlanCode,
  type PaymentFeeType,
  type PaymentFeePayer,
} from '../../lib/plansApi';
import { paymentsApi } from '../../lib/paymentsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const atLimit = limit !== null && used >= limit;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-regantify-text-muted">{label}</span>
        <span className={atLimit ? 'text-amber-600 font-medium' : 'text-regantify-text'}>
          {used} / {limit ?? '∞'}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 rounded-full bg-regantify-content overflow-hidden">
          <div
            className={`h-full rounded-full ${atLimit ? 'bg-amber-500' : 'bg-regantify-cta'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

const TIER_ORDER: PlanCode[] = ['FREE', 'BASIC', 'STARTER', 'ADVANCE'];

/**
 * Vendor dashboard's Billing page — a 4-tier comparison with two ways
 * to move plans: "Pay with PayStation" (self-serve, upgrades
 * immediately on payment — see PaymentsService's PLAN_UPGRADE purpose)
 * as the primary action, and "Request Upgrade" underneath it as a
 * fallback for a vendor who'd rather arrange payment manually with
 * support (creates a PlanUpgradeRequest a Super Admin reviews — Plan
 * Requests page). Free has no payment button since it never costs
 * anything.
 */
export default function Billing() {
  const queryClient = useQueryClient();
  const [payingPlan, setPayingPlan] = useState<PlanCode | null>(null);

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['vendor-plan-usage'],
    queryFn: getVendorPlanUsage,
  });
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
  });
  const { data: requests = [] } = useQuery({
    queryKey: ['own-plan-requests'],
    queryFn: getOwnPlanRequests,
  });

  const pendingRequest = requests.find((r) => r.status === 'PENDING');

  const requestMutation = useMutation({
    mutationFn: (planCode: PlanCode) => requestPlanUpgrade(planCode),
    onSuccess: (_, planCode) => {
      queryClient.invalidateQueries({ queryKey: ['own-plan-requests'] });
      const plan = plans.find((p) => p.code === planCode);
      toast.success(`Request sent — we'll review your request to move to ${plan?.name ?? planCode}.`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the request. Please try again.')),
  });

  const payMutation = useMutation({
    mutationFn: (planCode: PlanCode) => {
      setPayingPlan(planCode);
      return paymentsApi.initiate({ purpose: 'PLAN_UPGRADE', packageId: planCode });
    },
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not start the payment. Please try again.'));
      setPayingPlan(null);
    },
  });

  const loading = usageLoading || plansLoading;
  const sortedPlans = [...plans].sort((a, b) => TIER_ORDER.indexOf(a.code) - TIER_ORDER.indexOf(b.code));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Billing &amp; Plan</h1>
        <p className="text-sm text-regantify-text-muted mt-1">Your current plan, usage, and upgrade options.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-regantify-text-muted">
          Loading…
        </div>
      ) : (
        <>
          {usage && (
            <div className="bg-white rounded-2xl border border-black/5 p-6 mb-6 max-w-xl">
              <div className="flex items-center gap-2 text-regantify-text-muted text-sm font-medium mb-1">
                <CreditCard size={16} />
                Current plan: <span className="text-regantify-text font-semibold">{usage.plan.name}</span>
              </div>
              <p className="text-xs text-regantify-text-muted mb-4">
                COD fee:{' '}
                {formatFee(usage.plan.codGatewayFeeBdt, usage.plan.codGatewayFeeType, usage.plan.codGatewayFeePayer, usage.plan.codFeeHidden)}
                {' · '}Online Payment fee:{' '}
                {formatFee(
                  usage.plan.onlinePaymentGatewayFeeBdt,
                  usage.plan.onlinePaymentGatewayFeeType,
                  usage.plan.onlinePaymentGatewayFeePayer,
                  usage.plan.onlinePaymentFeeHidden,
                )}
              </p>
              <div className="space-y-4">
                <UsageBar label="Products" used={usage.usage.products.used} limit={usage.usage.products.limit} />
                <UsageBar label="Staff" used={usage.usage.staff.used} limit={usage.usage.staff.limit} />
                <UsageBar label="Orders today" used={usage.usage.ordersToday.used} limit={usage.usage.ordersToday.limit} />
                <UsageBar
                  label="Monthly visits"
                  used={usage.usage.monthlyVisits.used}
                  limit={usage.usage.monthlyVisits.limit}
                />
                <UsageBar
                  label="AI chat messages today"
                  used={usage.usage.aiChatMessagesToday.used}
                  limit={usage.usage.aiChatMessagesToday.limit}
                />
              </div>
            </div>
          )}

          {pendingRequest && (
            <div className="max-w-xl mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <Clock size={16} className="text-amber-700 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-900">
                You have a pending request to move to <strong>{pendingRequest.requestedPlan.name}</strong>. We'll
                review it and get back to you.
              </p>
            </div>
          )}

          <h2 className="text-lg font-medium text-regantify-text mb-4">Compare plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {sortedPlans.map((plan) => {
              const isCurrent = usage?.plan.code === plan.code;
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={isCurrent}
                  pending={pendingRequest}
                  onRequest={requestMutation.mutate}
                  requesting={requestMutation.isPending}
                  onPay={payMutation.mutate}
                  paying={payMutation.isPending && payingPlan === plan.code}
                  payDisabled={payMutation.isPending}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function formatLimit(value: number | null, suffix = '') {
  return value === null ? 'Unlimited' : `${value.toLocaleString('en-US')}${suffix}`;
}

// Store > Payment Gateway's per-plan COD/Online Payment fee — same
// formatting convention as Finance > Fee Summary/Manage Plans (Super
// Admin), surfaced here too so a vendor comparing plans can see exactly
// what each tier charges and who pays it before upgrading, not just
// after (Fee Summary only ever shows the vendor's OWN current plan's
// fee in that kind of full-page format).
function formatFee(amount: string, type: PaymentFeeType, payer: PaymentFeePayer, hidden: boolean) {
  const value = type === 'PERCENTAGE' ? `${Number(amount)}%` : `৳${Number(amount)}`;
  if (payer === 'VENDOR') return `${value} (you pay, hidden from customer)`;
  return hidden ? `${value} (hidden from customer)` : value;
}

function PlanCard({
  plan,
  isCurrent,
  pending,
  onRequest,
  requesting,
  onPay,
  paying,
  payDisabled,
}: {
  plan: Plan;
  isCurrent: boolean;
  pending: { requestedPlan: Plan } | undefined;
  onRequest: (code: PlanCode) => void;
  requesting: boolean;
  onPay: (code: PlanCode) => void;
  paying: boolean;
  payDisabled: boolean;
}) {
  const isPendingTarget = pending?.requestedPlan.code === plan.code;
  const price = Number(plan.priceMonthly);
  const isFree = price <= 0;

  return (
    <div
      className={`bg-white rounded-2xl border p-5 flex flex-col ${
        isCurrent ? 'border-regantify-cta ring-1 ring-regantify-cta' : 'border-black/5'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-base font-semibold text-regantify-text">{plan.name}</h3>
        {isCurrent && (
          <span className="flex items-center gap-1 text-xs font-medium text-regantify-cta bg-regantify-cta/10 px-2 py-0.5 rounded-full">
            <Check size={12} />
            Current
          </span>
        )}
      </div>

      <p className="text-lg font-semibold text-regantify-text mt-1">
        {isFree ? 'Free' : `৳${price.toLocaleString('en-US')}`}
        {!isFree && <span className="text-xs font-normal text-regantify-text-muted">/month</span>}
      </p>

      <ul className="text-xs text-regantify-text-muted space-y-1.5 my-4 flex-1">
        <li>Products: {formatLimit(plan.productLimit)}</li>
        <li>Orders: {formatLimit(plan.orderLimitPerDay, '/day')}</li>
        <li>Monthly visits: {formatLimit(plan.monthlyVisitLimit)}</li>
        <li>Themes: {formatLimit(plan.themeAllowance)}</li>
        <li>Image uploads: {formatLimit(plan.imageUploadLimit)}</li>
        <li>AI chat: {formatLimit(plan.aiChatMessageLimitPerDay, '/day')}</li>
        <li>Staff: {formatLimit(plan.staffLimit)}</li>
        <li>Custom domain: {plan.customDomainAllowed ? 'Yes' : 'No'}</li>
        <li className="pt-1.5 mt-1.5 border-t border-black/5 text-regantify-text">
          COD fee: {formatFee(plan.codGatewayFeeBdt, plan.codGatewayFeeType, plan.codGatewayFeePayer, plan.codFeeHidden)}
        </li>
        <li>
          Online Payment fee:{' '}
          {formatFee(
            plan.onlinePaymentGatewayFeeBdt,
            plan.onlinePaymentGatewayFeeType,
            plan.onlinePaymentGatewayFeePayer,
            plan.onlinePaymentFeeHidden,
          )}
        </li>
      </ul>

      {isCurrent ? (
        <button
          type="button"
          disabled
          className="px-4 py-2 rounded-xl text-sm font-medium bg-regantify-content text-regantify-text-muted cursor-default"
        >
          Current Plan
        </button>
      ) : (
        <div className="space-y-2">
          {!isFree && (
            <button
              type="button"
              disabled={payDisabled}
              onClick={() => onPay(plan.code)}
              className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-regantify-cta hover:bg-regantify-cta-dark text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {paying ? 'Redirecting…' : 'Pay with PayStation'}
            </button>
          )}
          <button
            type="button"
            disabled={requesting || Boolean(pending) || payDisabled}
            onClick={() => onRequest(plan.code)}
            className="w-full px-4 py-2 rounded-xl text-sm font-medium border border-regantify-cta text-regantify-cta hover:bg-regantify-cta hover:text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isPendingTarget ? 'Requested' : pending ? 'Request Pending' : isFree ? 'Request Downgrade' : 'Request Manually'}
          </button>
        </div>
      )}
    </div>
  );
}
