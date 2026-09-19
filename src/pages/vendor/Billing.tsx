import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, CreditCard } from 'lucide-react';
import {
  getPlans,
  getVendorPlanUsage,
  getOwnPlanRequests,
  requestPlanUpgrade,
  type Plan,
  type PlanCode,
} from '../../lib/plansApi';
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
 * Vendor dashboard's Billing page — PLAN.md Step 14. Current plan +
 * usage (reusing GET /v1/plans/usage from Step 5), and a 4-tier
 * comparison with a "Request Upgrade" action per tier. No self-serve
 * payment: since no real payment gateway exists yet (see PLAN.md's own
 * note), clicking "Request Upgrade" creates a PlanUpgradeRequest a
 * Super Admin manually approves (Step 15's Plan Requests page) — the
 * confirmed stopgap flow, not a placeholder for a future one.
 */
export default function Billing() {
  const queryClient = useQueryClient();

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
              <div className="flex items-center gap-2 text-regantify-text-muted text-sm font-medium mb-4">
                <CreditCard size={16} />
                Current plan: <span className="text-regantify-text font-semibold">{usage.plan.name}</span>
              </div>
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
              return <PlanCard key={plan.id} plan={plan} isCurrent={isCurrent} pending={pendingRequest} onRequest={requestMutation.mutate} requesting={requestMutation.isPending} />;
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

function PlanCard({
  plan,
  isCurrent,
  pending,
  onRequest,
  requesting,
}: {
  plan: Plan;
  isCurrent: boolean;
  pending: { requestedPlan: Plan } | undefined;
  onRequest: (code: PlanCode) => void;
  requesting: boolean;
}) {
  const isPendingTarget = pending?.requestedPlan.code === plan.code;

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

      <ul className="text-xs text-regantify-text-muted space-y-1.5 my-4 flex-1">
        <li>Products: {formatLimit(plan.productLimit)}</li>
        <li>Orders: {formatLimit(plan.orderLimitPerDay, '/day')}</li>
        <li>Monthly visits: {formatLimit(plan.monthlyVisitLimit)}</li>
        <li>Themes: {formatLimit(plan.themeAllowance)}</li>
        <li>Image uploads: {formatLimit(plan.imageUploadLimit)}</li>
        <li>AI chat: {formatLimit(plan.aiChatMessageLimitPerDay, '/day')}</li>
        <li>Staff: {formatLimit(plan.staffLimit)}</li>
        <li>Custom domain: {plan.customDomainAllowed ? 'Yes' : 'No'}</li>
      </ul>

      <button
        type="button"
        disabled={isCurrent || requesting || Boolean(pending)}
        onClick={() => onRequest(plan.code)}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          isCurrent
            ? 'bg-regantify-content text-regantify-text-muted cursor-default'
            : 'bg-regantify-cta hover:bg-regantify-cta-dark text-white disabled:opacity-60 disabled:cursor-not-allowed'
        }`}
      >
        {isCurrent ? 'Current Plan' : isPendingTarget ? 'Requested' : pending ? 'Request Pending' : 'Request Upgrade'}
      </button>
    </div>
  );
}
