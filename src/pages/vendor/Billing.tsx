import { useState, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, Minus } from 'lucide-react';
import {
  getPlans,
  getVendorPlanUsage,
  formatFeeParts,
  getOwnPlanRequests,
  requestPlanUpgrade,
  type Plan,
  type PlanCode,
  type PaymentFeePayer,
} from '../../lib/plansApi';
import { paymentsApi } from '../../lib/paymentsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { UsageBar } from '../../components/dashboard/SideCards';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageKit';

const TIER_ORDER: PlanCode[] = ['FREE', 'BASIC', 'STARTER', 'ADVANCE'];

function limitText(value: number | null, suffix = '') {
  return value === null ? 'Unlimited' : `${value.toLocaleString('en-US')}${suffix}`;
}

function priceText(plan: Plan) {
  const price = Number(plan.priceMonthly);
  return price <= 0 ? 'Free' : `৳${price.toLocaleString('en-US')}`;
}

/** The plan's per-order charge on cash-on-delivery orders and who pays it. */
function feeText(flat: string, percent: string, payer: PaymentFeePayer) {
  return `${formatFeeParts(flat, percent)} per COD order${payer === 'VENDOR' ? ', paid by you' : ''}`;
}

/** One feature line on a plan card: a tick (or a dash for "no") and the words. */
function Feature({ on = true, children }: { on?: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-start gap-2 ${on ? 'text-regantify-text' : 'text-neutral-400'}`}>
      {on ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden /> : <Minus size={14} className="mt-0.5 shrink-0" aria-hidden />}
      <span>{children}</span>
    </li>
  );
}

/**
 * Billing: your plan on top (price, the per-order charge, and the same
 * usage bars as the Dashboard), then every plan side by side with yours
 * highlighted. Two ways to move: pay with PayStation (upgrades at once on
 * payment — see PaymentsService's PLAN_UPGRADE purpose), or ask us to
 * set it up by hand (a PlanUpgradeRequest a Super Admin reviews). Free
 * has no payment, so moving to it is always a request.
 */
export default function Billing() {
  const queryClient = useQueryClient();
  const [payingPlan, setPayingPlan] = useState<PlanCode | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<Plan | null>(null);

  const { data: usage, isLoading: usageLoading } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage });
  const { data: plans = [], isLoading: plansLoading } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
  const { data: requests = [] } = useQuery({ queryKey: ['own-plan-requests'], queryFn: getOwnPlanRequests });
  const pendingRequest = requests.find((r) => r.status === 'PENDING');

  const requestMutation = useMutation({
    mutationFn: (planCode: PlanCode) => requestPlanUpgrade(planCode),
    onSuccess: (_, planCode) => {
      queryClient.invalidateQueries({ queryKey: ['own-plan-requests'] });
      setConfirmRequest(null);
      toast.success(`Request sent to move to ${plans.find((p) => p.code === planCode)?.name ?? planCode}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t send the request. Try again in a minute.')),
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
      toast.error(apiErrorMessage(err, 'Couldn’t open PayStation. Check your connection and try again.'));
      setPayingPlan(null);
    },
  });

  const loading = usageLoading || plansLoading;
  const sortedPlans = [...plans].sort((a, b) => TIER_ORDER.indexOf(a.code) - TIER_ORDER.indexOf(b.code));
  const currentIndex = usage ? TIER_ORDER.indexOf(usage.plan.code) : -1;

  if (loading) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="h-12 w-48 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-64 animate-pulse rounded-xl bg-neutral-100" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader className="" title="Billing" description="Your plan, what you’ve used of it, and the other plans." />

      {usage && (
        <section className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="rounded-lg bg-brand p-4 text-white">
            <p className="text-sm text-white/75">Your plan</p>
            <p className="mt-0.5 text-2xl font-semibold">{usage.plan.name}</p>
            <p className="mt-1 text-sm">
              {priceText(usage.plan)}
              {Number(usage.plan.priceMonthly) > 0 && <span className="text-white/75"> a month</span>}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-white/75">
              {feeText(usage.plan.codGatewayFeeBdt, usage.plan.codGatewayFeePercent, usage.plan.codGatewayFeePayer)}.
            </p>
          </div>
          <div className="space-y-3">
            <UsageBar label="Products" used={usage.usage.products.used} limit={usage.usage.products.limit} />
            <UsageBar label="Orders today" used={usage.usage.ordersToday.used} limit={usage.usage.ordersToday.limit} />
            <UsageBar label="Staff" used={usage.usage.staff.used} limit={usage.usage.staff.limit} />
            <UsageBar label="AI chat messages today" used={usage.usage.aiChatMessagesToday.used} limit={usage.usage.aiChatMessagesToday.limit} />
            <UsageBar label="Store visits this month" used={usage.usage.monthlyVisits.used} limit={usage.usage.monthlyVisits.limit} />
            <p className="text-xs text-neutral-500">Visits are for your information: your store keeps working for shoppers past the number.</p>
          </div>
        </section>
      )}

      {pendingRequest && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
          <Clock size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
          <p>
            Your request to move to <strong>{pendingRequest.requestedPlan.name}</strong> is waiting for our team. We’ll set it up and let you
            know.
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-regantify-text">Compare plans</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sortedPlans.map((plan) => {
            const isCurrent = usage?.plan.code === plan.code;
            const isFree = Number(plan.priceMonthly) <= 0;
            const higher = TIER_ORDER.indexOf(plan.code) > currentIndex;
            const isPendingTarget = pendingRequest?.requestedPlan.code === plan.code;
            return (
              <li key={plan.id} className={`flex flex-col rounded-xl border bg-white p-4 ${isCurrent ? 'border-brand ring-1 ring-brand' : 'border-line'}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-regantify-text">{plan.name}</h3>
                  {isCurrent && <span className="rounded border border-brand/30 bg-brand-lime px-1.5 py-0.5 text-[11px] font-medium text-regantify-text">Your plan</span>}
                </div>
                <p className="mt-1 text-xl font-semibold tabular-nums text-regantify-text">
                  {priceText(plan)}
                  {!isFree && <span className="text-xs font-normal text-neutral-500"> /month</span>}
                </p>

                <ul className="my-4 flex-1 space-y-1.5 text-sm">
                  <Feature>{limitText(plan.productLimit)} products</Feature>
                  <Feature>{limitText(plan.orderLimitPerDay)} orders a day</Feature>
                  <Feature>{limitText(plan.staffLimit)} staff</Feature>
                  <Feature>
                    {plan.themeAllowance === null ? 'All themes' : `${plan.themeAllowance} ${plan.themeAllowance === 1 ? 'theme' : 'themes'}`}
                  </Feature>
                  <Feature>{limitText(plan.imageUploadLimit)} image uploads</Feature>
                  <Feature>{limitText(plan.aiChatMessageLimitPerDay)} AI chat messages a day</Feature>
                  <Feature on={plan.customDomainAllowed}>Your own domain</Feature>
                  <Feature on={plan.customPaymentGatewayAllowed}>Your own payment gateway</Feature>
                  <Feature on={plan.lmsEnabled}>LMS (calls and follow-ups)</Feature>
                  <li className="mt-2 border-t border-line pt-2 text-xs text-neutral-600">
                    {feeText(plan.codGatewayFeeBdt, plan.codGatewayFeePercent, plan.codGatewayFeePayer)}
                  </li>
                </ul>

                {isCurrent ? (
                  <p className="flex h-10 items-center justify-center rounded-lg bg-neutral-50 text-sm text-neutral-500">You’re on this plan</p>
                ) : (
                  <div className="space-y-1.5">
                    {!isFree && (
                      <button
                        type="button"
                        disabled={payMutation.isPending}
                        onClick={() => payMutation.mutate(plan.code)}
                        className={`inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-60 ${
                          higher ? 'bg-brand text-white hover:bg-brand-dark' : 'border border-line bg-white text-regantify-text hover:bg-neutral-50'
                        }`}
                      >
                        {payMutation.isPending && payingPlan === plan.code ? 'Opening PayStation…' : `${higher ? 'Upgrade' : 'Switch'} and pay ${priceText(plan)}`}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={requestMutation.isPending || Boolean(pendingRequest)}
                      onClick={() => setConfirmRequest(plan)}
                      className="h-9 w-full rounded-lg text-xs text-neutral-600 underline-offset-2 hover:text-regantify-text hover:underline disabled:no-underline disabled:opacity-60"
                    >
                      {isPendingTarget ? 'Request sent' : pendingRequest ? 'A request is already waiting' : isFree ? 'Ask to move to Free' : 'Or ask us to set it up by hand'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-neutral-500">Paying with PayStation changes your plan as soon as the payment goes through.</p>
      </section>

      <ConfirmDialog
        open={confirmRequest != null}
        onOpenChange={(open) => !open && setConfirmRequest(null)}
        title={confirmRequest ? `Ask to move to ${confirmRequest.name}?` : ''}
        message={
          confirmRequest && Number(confirmRequest.priceMonthly) <= 0
            ? 'Our team moves you to Free. You keep what you have, but you can’t add more than Free allows, and your store shows the StorePal theme.'
            : 'Our team contacts you to arrange payment (e.g. bank transfer), then changes your plan. To change it right away, pay with PayStation instead.'
        }
        confirmLabel="Send request"
        onConfirm={() => confirmRequest && requestMutation.mutate(confirmRequest.code)}
        busy={requestMutation.isPending}
      />
    </div>
  );
}
