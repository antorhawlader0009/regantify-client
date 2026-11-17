import { useRef, useState, type ReactNode } from 'react';
import { useDashboardView } from '../../lib/useDashboardView';
import { Link, useSearchParams } from 'react-router-dom';
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
  type VendorPlanUsage,
} from '../../lib/plansApi';
import { paymentsApi, type PromoQuote } from '../../lib/paymentsApi';
import { smsApi } from '../../lib/smsApi';
import { aiChatBotApi } from '../../lib/aiChatBotApi';
import { financeApi } from '../../lib/financeApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PayFromWalletButton } from '../../components/PayFromWalletButton';
import { PillTabs } from '../../components/ui/PageKit';
import { formatTaka } from '../../components/analytics/format';
import { useAuthStore } from '../../store/authStore';
import { SmsPackBuyer, perSms } from './sms/BuySmsDialog';
import { AiCreditPackBuyer } from './ai-automation/BuyChatBotDialog';
import { AddMoneyDialog } from './finance/AddMoneyDialog';
import Receipts from './finance/Receipts';
import { DailyLimitBanner, UnlimitedBadge } from '../../components/DailyLimitBanner';
import './billing/billing-theme.css';

/*
 * Billing: everything the store pays the platform for, in one place (2026-10-16, after vendors said buying the
 * plan, SMS and AI credits on three different pages was a hassle). On top, one statement with the four balances a
 * store runs on (plan, wallet, SMS, AI Credits), each with its one "get more" action and a red line when it is
 * running out. Below, a tab per thing to buy, plus the receipts. `?tab=plan|sms|ai|wallet|receipts` opens a tab,
 * so the SMS page, the AI Chat Bot page, the Dashboard and the payment return page can send the owner straight to
 * the right one. The SMS and AI pages keep their own "Buy" buttons as shortcuts (same pack pickers, in a dialog).
 *
 * Look (Hallmark redesign, Coral, 2026-11-17): warm paper, ink actions, figures in Geist Mono, the plans as one
 * ruled table instead of four cards; styles in ./billing/billing-theme.css, scoped to .billing-root.
 */

type Tab = 'plan' | 'sms' | 'ai' | 'wallet' | 'receipts';
const TABS: Tab[] = ['plan', 'sms', 'ai', 'wallet', 'receipts'];

const TIER_ORDER: PlanCode[] = ['FREE', 'BASIC', 'STARTER', 'ADVANCE'];

function limitText(value: number | null, suffix = '') {
  return value === null ? 'Unlimited' : `${value.toLocaleString('en-US')}${suffix}`;
}

/** "5,000 AI Credits included (one time)"; Free gets its credits once, at sign-up. */
function aiCreditsText(plan: Plan) {
  if (!plan.aiCreditGrant) return 'No AI Credits included';
  const n = plan.aiCreditGrant.toLocaleString('en-US');
  return plan.code === 'FREE' ? `${n} AI Credits when you sign up (one time)` : `${n} AI Credits included (one time)`;
}

function priceText(plan: Plan) {
  const price = Number(plan.priceMonthly);
  return price <= 0 ? 'Free' : `৳${price.toLocaleString('en-US')}`;
}

/** The plan's per-order charge on cash-on-delivery orders and who pays it. */
function feeText(flat: string, percent: string, payer: PaymentFeePayer) {
  return `${formatFeeParts(flat, percent)} per COD order${payer === 'VENDOR' ? ', paid by you' : ''}`;
}

/** A yes / no cell of the plan table: the words stay, a tick or a dash says which. */
function YesNo({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span className={`flex items-start gap-2 ${on ? 'bl-yes' : 'bl-no'}`}>
      {on ? <Check size={15} className="mt-0.5 shrink-0" aria-hidden /> : <Minus size={15} className="mt-0.5 shrink-0" aria-hidden />}
      <span>
        {children}
        {!on && <span className="sr-only"> (not included)</span>}
      </span>
    </span>
  );
}

/** The end date as shown to the vendor, whole days left (a part day counts as one), and whether it's close (7 days or less). */
function describePlanEnd(iso: string) {
  const end = new Date(iso);
  const daysLeft = Math.max(1, Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  return {
    date: end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }),
    daysLeft,
    soon: daysLeft <= 7,
  };
}

// ---------------------------------------------------------------- the statement

type Tone = 'ok' | 'low' | 'empty';

/**
 * One of the four balances. The statement is one cotton sheet split by rules (not four cards), so it reads as one
 * account. A balance that is low or used up says what happens next in red; the one whose tab is open is underlined.
 */
function BalanceSlot({
  label,
  value,
  status,
  tone = 'ok',
  action,
  onAction,
  active,
  figure = true,
}: {
  /** False when the value is a word (the plan name): figures are set in Geist Mono, words in the body face. */
  figure?: boolean;
  label: string;
  value: ReactNode;
  status: ReactNode;
  tone?: Tone;
  action: string;
  onAction: () => void;
  active: boolean;
}) {
  return (
    <div className="bl-slot" data-tone={tone} data-active={active}>
      <p className="bl-slot__label">{label}</p>
      <p className={`bl-slot__value ${figure ? 'bl-fig' : ''}`}>{value}</p>
      <p className="bl-slot__status">{status}</p>
      <button type="button" onClick={onAction} className={`bl-btn bl-btn--block mt-3 ${tone === 'ok' ? 'bl-btn--card' : 'bl-btn--ink'}`} aria-pressed={active}>
        {action}
      </button>
    </div>
  );
}

/** One row of "What you've used": the figure, then the limit or Unlimited, with a meter only when there is a limit. */
function UsageRow({ label, used, limit, note }: { label: string; used: number; limit: number | null; note?: string }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <tr>
      <th scope="row">
        {label}
        {limit != null && (
          <span className="bl-meter" data-tone={pct >= 100 ? 'full' : 'ok'} aria-hidden>
            <span style={{ transform: `scaleX(${Math.max(pct, used > 0 ? 3 : 0) / 100})` }} />
          </span>
        )}
        {note && <span className="bl-note mt-1 block">{note}</span>}
      </th>
      <td className="bl-fig">{used.toLocaleString()}</td>
      <td className="bl-ledger__limit">{limit == null ? <UnlimitedBadge /> : <span className="bl-fig">of {limit.toLocaleString()}</span>}</td>
    </tr>
  );
}

// ---------------------------------------------------------------- plan tab

function PlanTab({ usage, plans, isOwner }: { usage: VendorPlanUsage | undefined; plans: Plan[]; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const [payingPlan, setPayingPlan] = useState<PlanCode | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<Plan | null>(null);
  const { data: requests = [] } = useQuery({ queryKey: ['own-plan-requests'], queryFn: getOwnPlanRequests });
  // What paying for each plan gives right now (renewal end date, a switch's extra days); the payment uses the same rule.
  const { data: terms } = useQuery({ queryKey: ['plan-terms'], queryFn: paymentsApi.planTerms, enabled: isOwner });
  const termLine = (code: string): string | null => {
    const t = terms?.[code];
    if (!t) return null;
    const until = new Date(t.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' });
    if (t.tooFar) return 'Already paid about a year ahead. You can renew again later.';
    if (t.kind === 'RENEW_EARLY') return `Adds 30 days after your current end date: runs until ${until}. No days are lost.`;
    if (t.kind === 'RENEW_GRACE') return `Continues your plan from its end date: runs until ${until}.`;
    if (t.kind === 'SWITCH') return `Runs until ${until}, including ${t.creditDays} extra ${t.creditDays === 1 ? 'day' : 'days'} for the unused part of your current plan.`;
    return `Runs for 30 days, until ${until}.`;
  };
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

  // A promo code: "Apply" asks the server what each paid plan would cost with it; paying sends the same code.
  // ?promo=CODE (a churn offer) fills the box; the owner still presses Apply.
  const [promoInput, setPromoInput] = useState(() => new URLSearchParams(window.location.search).get('promo')?.toUpperCase().slice(0, 24) ?? '');
  const [promo, setPromo] = useState<{ code: string; quotes: Partial<Record<PlanCode, PromoQuote>> } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const applyPromo = useMutation({
    mutationFn: async () => {
      const code = promoInput.trim();
      const paid = plans.filter((p) => Number(p.priceMonthly) > 0);
      const results = await Promise.allSettled(paid.map((p) => paymentsApi.promoCheck(p.code, code)));
      const quotes: Partial<Record<PlanCode, PromoQuote>> = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') quotes[paid[i].code] = r.value;
      });
      if (Object.keys(quotes).length === 0) {
        const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
        throw failed?.reason ?? new Error('This promo code isn’t valid.');
      }
      return { code, quotes };
    },
    onSuccess: (r) => {
      setPromo(r);
      setPromoError(null);
    },
    onError: (err) => {
      setPromo(null);
      setPromoError(apiErrorMessage(err, 'This promo code isn’t valid.'));
    },
  });

  const payMutation = useMutation({
    mutationFn: (planCode: PlanCode) => {
      setPayingPlan(planCode);
      return paymentsApi.initiate({ purpose: 'PLAN_UPGRADE', packageId: planCode, ...(promo?.quotes[planCode] ? { promoCode: promo.code } : {}) });
    },
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Couldn’t open PayStation. Check your connection and try again.'));
      setPayingPlan(null);
    },
  });

  const payPrice = (plan: Plan) => (promo?.quotes[plan.code] ? `৳${promo.quotes[plan.code]!.finalPrice.toLocaleString('en-US')}` : priceText(plan));
  // A plan Super Admin hid from sign-up shows only to the store that is on it.
  const sortedPlans = [...plans]
    .filter((p) => !p.hiddenFromSignup || p.code === usage?.plan.code)
    .sort((a, b) => TIER_ORDER.indexOf(a.code) - TIER_ORDER.indexOf(b.code));
  const currentIndex = usage ? TIER_ORDER.indexOf(usage.plan.code) : -1;
  const planEnd = usage?.planExpiresAt ? describePlanEnd(usage.planExpiresAt) : null;
  const colClass = (plan: Plan) => (usage?.plan.code === plan.code ? 'bl-col-current' : '');

  // The rows of the comparison, each one fact per plan. "Unlimited" stays highlighted, as everywhere products, orders
  // and image uploads are listed.
  const rows: { label: string; cell: (plan: Plan) => ReactNode }[] = [
    { label: 'Products, orders and image uploads', cell: () => <UnlimitedBadge /> },
    { label: 'Staff', cell: (plan) => (plan.staffLimit === null ? 'Unlimited' : <span className="bl-fig">{limitText(plan.staffLimit)}</span>) },
    {
      label: 'Themes',
      cell: (plan) => (plan.themeAllowance === null ? 'All themes' : <span><span className="bl-fig">{plan.themeAllowance}</span> {plan.themeAllowance === 1 ? 'theme' : 'themes'}</span>),
    },
    { label: 'AI Credits', cell: (plan) => <YesNo on={!!plan.aiCreditGrant}>{aiCreditsText(plan)}</YesNo> },
    { label: 'Your own domain', cell: (plan) => <YesNo on={plan.customDomainAllowed}>{plan.customDomainAllowed ? 'Included' : 'Not included'}</YesNo> },
    { label: 'Your own payment gateway', cell: (plan) => <YesNo on={plan.customPaymentGatewayAllowed}>{plan.customPaymentGatewayAllowed ? 'Included' : 'Not included'}</YesNo> },
    { label: 'LMS (calls and follow-ups)', cell: (plan) => <YesNo on={plan.lmsEnabled}>{plan.lmsEnabled ? 'Included' : 'Not included'}</YesNo> },
    { label: 'Cash on delivery charge', cell: (plan) => <span className="bl-note">{feeText(plan.codGatewayFeeBdt, plan.codGatewayFeePercent, plan.codGatewayFeePayer)}</span> },
  ];

  return (
    <div className="space-y-5">
      {usage && (
        <section className="bl-sheet p-5">
          <h2 className="bl-title">What you’ve used of {usage.plan.name}</h2>
          <p className="bl-note mt-0.5">{feeText(usage.plan.codGatewayFeeBdt, usage.plan.codGatewayFeePercent, usage.plan.codGatewayFeePayer)}.</p>
          <div className="mt-3 grid gap-x-10 md:grid-cols-2">
            <table className="bl-ledger">
              <tbody>
                <UsageRow label="Products" used={usage.usage.products.used} limit={usage.usage.products.limit} />
                <UsageRow label="Orders this month" used={(usage.usage.ordersThisMonth ?? usage.usage.ordersToday).used} limit={(usage.usage.ordersThisMonth ?? usage.usage.ordersToday).limit} />
              </tbody>
            </table>
            <table className="bl-ledger">
              <tbody>
                <UsageRow label="Staff" used={usage.usage.staff.used} limit={usage.usage.staff.limit} />
                <UsageRow
                  label="Store visits this month"
                  used={usage.usage.monthlyVisits.used}
                  limit={usage.usage.monthlyVisits.limit}
                  note="For your information: your store keeps working for shoppers past the number."
                />
              </tbody>
            </table>
          </div>
          <p className="bl-note mt-3 flex flex-wrap items-center gap-1.5">
            <UnlimitedBadge /> Products, orders and image uploads are unlimited on every plan.
          </p>
          <DailyLimitBanner daily={usage.daily} kinds={['products', 'orders', 'images']} className="mt-3" />
        </section>
      )}

      {pendingRequest && (
        <div className="bl-notice">
          <Clock size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            Your request to move to <strong>{pendingRequest.requestedPlan.name}</strong> is waiting for our team. We’ll set it up and let you know.
          </p>
        </div>
      )}

      <section className="bl-sheet p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="bl-title">Compare plans</h2>
          {isOwner && (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (promoInput.trim().length >= 3) applyPromo.mutate();
              }}
            >
              <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Promo code" maxLength={24} aria-label="Promo code" className="bl-input" />
              <button type="submit" disabled={applyPromo.isPending || promoInput.trim().length < 3} aria-busy={applyPromo.isPending} className="bl-btn bl-btn--card">
                {applyPromo.isPending ? 'Checking…' : 'Apply'}
              </button>
            </form>
          )}
        </div>
        {promo && <p className="bl-ok-line mt-3">Code {promo.code.toUpperCase()} applied. The prices below include it.</p>}
        {promoError && <p className="bl-error-strip mt-3">{promoError}</p>}

        <div className="bl-plans-wrap mt-4">
          <table className="bl-plans">
            <caption className="sr-only">Plans compared</caption>
            <thead>
              <tr>
                <td aria-hidden />
                {sortedPlans.map((plan) => {
                  const isCurrent = usage?.plan.code === plan.code;
                  const isFree = Number(plan.priceMonthly) <= 0;
                  return (
                    <th key={plan.id} scope="col" className={colClass(plan)}>
                      <p className="bl-plan-name">{plan.name}</p>
                      <p className={`bl-plan-price ${isFree && !promo?.quotes[plan.code] ? '' : 'bl-fig'}`}>
                        {promo?.quotes[plan.code] && <s>{priceText(plan)}</s>}
                        {payPrice(plan)}
                        {!isFree && <span className="bl-plan-unit"> /month</span>}
                      </p>
                      {isCurrent ? <span className="bl-pressed">Your plan</span> : plan.mostPopular ? <span className="bl-plan-tag">Most popular</span> : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {sortedPlans.map((plan) => (
                    <td key={plan.id} className={colClass(plan)}>
                      {row.cell(plan)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td aria-hidden />
                {sortedPlans.map((plan) => {
                  const isCurrent = usage?.plan.code === plan.code;
                  const isFree = Number(plan.priceMonthly) <= 0;
                  const higher = TIER_ORDER.indexOf(plan.code) > currentIndex;
                  const isPendingTarget = pendingRequest?.requestedPlan.code === plan.code;
                  return (
                    <td key={plan.id} className={colClass(plan)}>
                      {isCurrent && !isFree && planEnd ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            disabled={payMutation.isPending || !!terms?.[plan.code]?.tooFar}
                            aria-busy={payMutation.isPending && payingPlan === plan.code}
                            onClick={() => payMutation.mutate(plan.code)}
                            className="bl-btn bl-btn--ink bl-btn--block"
                          >
                            {payMutation.isPending && payingPlan === plan.code ? 'Opening PayStation…' : `Renew for 30 days, pay ${payPrice(plan)}`}
                          </button>
                          {!terms?.[plan.code]?.tooFar && (
                            <PayFromWalletButton purpose="PLAN_UPGRADE" packageId={plan.code} promoCode={promo?.quotes[plan.code] ? promo.code : undefined} price={promo?.quotes[plan.code]?.finalPrice ?? Number(plan.priceMonthly)} onPaid={() => undefined} />
                          )}
                          {termLine(plan.code) && <p className="bl-note">{termLine(plan.code)}</p>}
                        </div>
                      ) : isCurrent ? (
                        <p className="bl-note py-2">You’re on this plan</p>
                      ) : (
                        <div className="space-y-2">
                          {!isFree && (
                            <button
                              type="button"
                              disabled={payMutation.isPending}
                              aria-busy={payMutation.isPending && payingPlan === plan.code}
                              onClick={() => payMutation.mutate(plan.code)}
                              className={`bl-btn bl-btn--block ${higher ? 'bl-btn--ink' : 'bl-btn--card'}`}
                            >
                              {payMutation.isPending && payingPlan === plan.code ? 'Opening PayStation…' : `${higher ? 'Upgrade' : 'Switch'} and pay ${payPrice(plan)}`}
                            </button>
                          )}
                          {!isFree && (
                            <PayFromWalletButton purpose="PLAN_UPGRADE" packageId={plan.code} promoCode={promo?.quotes[plan.code] ? promo.code : undefined} price={promo?.quotes[plan.code]?.finalPrice ?? Number(plan.priceMonthly)} onPaid={() => undefined} />
                          )}
                          {!isFree && termLine(plan.code) && <p className="bl-note">{termLine(plan.code)}</p>}
                          <button
                            type="button"
                            disabled={requestMutation.isPending || Boolean(pendingRequest)}
                            onClick={() => setConfirmRequest(plan)}
                            className="bl-btn bl-btn--quiet bl-btn--block"
                          >
                            {isPendingTarget ? 'Request sent' : pendingRequest ? 'A request is already waiting' : isFree ? 'Ask to move to Free' : 'Or ask us to set it up by hand'}
                          </button>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="bl-note mt-3">Paying with PayStation changes your plan as soon as the payment goes through.</p>
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

// ---------------------------------------------------------------- the page

function TabIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="bl-title">{title}</h2>
      <p className="bl-lead mt-1">{children}</p>
    </div>
  );
}

export default function Billing() {
  const isOwner = useAuthStore((s) => s.user?.role === 'VENDOR');
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = searchParams.get('tab') as Tab | null;
  const tab: Tab = asked && TABS.includes(asked) ? asked : 'plan';
  const { isSimple } = useDashboardView();
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const { data: usage, isLoading: usageLoading } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage });
  const { data: plans = [], isLoading: plansLoading } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
  const { data: sms } = useQuery({ queryKey: ['sms-credits'], queryFn: () => smsApi.getCredits() });
  const { data: smsPackages } = useQuery({ queryKey: ['sms-packages'], queryFn: () => smsApi.getPackages() });
  const { data: ai } = useQuery({ queryKey: ['chatbot-credits'], queryFn: () => aiChatBotApi.getCredits() });
  const { data: wallet } = useQuery({ queryKey: ['finance', 'wallet'], queryFn: () => financeApi.getWallet() });

  const openTab = (next: Tab) => {
    setSearchParams(next === 'plan' ? {} : { tab: next }, { replace: true });
    // On a phone the tabs are below the statement: bring them into view so the tap visibly did something.
    tabsRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  if (usageLoading || plansLoading) {
    return (
      <div data-theme="billing" className="billing-root space-y-4" aria-busy>
        <div className="bl-skeleton h-40" />
        <div className="bl-skeleton h-10 w-72" />
        <div className="bl-skeleton h-80" />
      </div>
    );
  }

  // ---- the four balances
  const planEnd = usage?.planExpiresAt ? describePlanEnd(usage.planExpiresAt) : null;
  const planPaid = usage ? Number(usage.plan.priceMonthly) > 0 : false;
  const planTone: Tone = planEnd?.soon ? 'low' : 'ok';
  const planStatus = !usage
    ? ''
    : planEnd
      ? `Ends ${planEnd.date}, ${planEnd.daysLeft} ${planEnd.daysLeft === 1 ? 'day' : 'days'} left. Then your store goes back to Free.`
      : planPaid
        ? `${priceText(usage.plan)} a month.`
        : 'Free forever. Upgrade for more products, orders and staff.';

  const balance = Number(wallet?.balance ?? 0);
  const walletTone: Tone = balance < 0 ? 'empty' : 'ok';
  const walletStatus =
    balance < 0 ? `You owe ${formatTaka(-balance)}. It is taken from your next payment.` : 'Order money comes in here. Add money with bKash, Nagad or a card.';

  const smsLeft = sms?.smsCredits ?? 0;
  const cheapestSms = smsPackages?.reduce<(typeof smsPackages)[number] | null>((b, p) => (!b || p.price / p.smsCount < b.price / b.smsCount ? p : b), null);
  const smsTone: Tone = sms?.ownGateway ? 'ok' : smsLeft <= 0 ? 'empty' : smsLeft < 50 ? 'low' : 'ok';
  const smsStatus = sms?.ownGateway
    ? `Your own ${sms.ownGateway === 'ISMSPLUS' ? 'iSMSplus' : 'MIM SMS'} account sends your texts, so these aren’t used.`
    : smsTone === 'empty'
      ? 'Used up: order texts and codes stop until you buy more.'
      : smsTone === 'low'
        ? 'Running low: texts stop when this reaches 0.'
        : cheapestSms
          ? `From ${perSms(cheapestSms)} per SMS.`
          : 'Order updates, codes and campaigns use these.';

  const aiTone: Tone = !ai ? 'ok' : !ai.canReply ? 'empty' : ai.lowBalance ? 'low' : 'ok';
  const aiStatus = !ai
    ? ''
    : !ai.canReply
      ? 'Used up: the chat is hidden on your store.'
      : `About ${ai.repliesLeft.toLocaleString()} chat replies left${ai.lowBalance ? '. Running low.' : '.'}`;

  return (
    <div data-theme="billing" className="billing-root space-y-5">
      <section aria-label="Your balances" className="bl-sheet bl-statement">
        <BalanceSlot
          label="Plan"
          figure={false}
          value={usage?.plan.name ?? '–'}
          status={planStatus}
          tone={planTone}
          action={planEnd ? 'Renew or change' : planPaid ? 'Change plan' : 'Upgrade'}
          onAction={() => openTab('plan')}
          active={tab === 'plan'}
        />
        <BalanceSlot
          label="Wallet"
          value={formatTaka(balance)}
          status={walletStatus}
          tone={walletTone}
          action="Add money"
          onAction={() => {
            openTab('wallet');
            if (isOwner) setAddMoneyOpen(true);
          }}
          active={tab === 'wallet'}
        />
        <BalanceSlot
          label="SMS left"
          value={smsLeft.toLocaleString()}
          status={smsStatus}
          tone={smsTone}
          action="Buy SMS"
          onAction={() => openTab('sms')}
          active={tab === 'sms'}
        />
        <BalanceSlot
          label="AI Credits"
          value={(ai?.available ?? 0).toLocaleString()}
          status={aiStatus}
          tone={aiTone}
          action="Buy AI Credits"
          onAction={() => openTab('ai')}
          active={tab === 'ai'}
        />
      </section>

      <div ref={tabsRef} className="scroll-mt-4">
        <PillTabs<Tab>
          value={tab}
          onChange={openTab}
          tabs={[
            { id: 'plan', label: 'Plan' },
            { id: 'sms', label: 'SMS' },
            { id: 'ai', label: 'AI Credits' },
            { id: 'wallet', label: 'Wallet' },
            // Receipts are Full mode (SIMPLE-VIEW-plan.md Step 9), unless a link opened that tab.
            ...(!isSimple || tab === 'receipts' ? [{ id: 'receipts' as const, label: 'Receipts' }] : []),
          ]}
        />
      </div>

      {tab === 'plan' && <PlanTab usage={usage} plans={plans} isOwner={isOwner} />}

      {tab === 'sms' && (
        <section className="bl-sheet p-5">
          <TabIntro title="Buy SMS">
            Your store texts customers about their orders, sends sign-in and COD codes, and runs your SMS campaigns. A long message can use 2 or more SMS.{' '}
            <Link to="/vendor/sms" className="bl-link">
              See sent messages
            </Link>
          </TabIntro>
          {isOwner ? <SmsPackBuyer /> : <p className="bl-lead">Only the store owner can buy SMS.</p>}
        </section>
      )}

      {tab === 'ai' && (
        <section className="bl-sheet p-5">
          <TabIntro title="Buy AI Credits">
            The store chat and Ask AI use these. Credits never expire.{' '}
            <Link to="/vendor/ai-usage" className="bl-link">
              See where they went
            </Link>
          </TabIntro>
          {isOwner ? <AiCreditPackBuyer creditsPerReply={ai?.creditsPerReply} /> : <p className="bl-lead">Only the store owner can buy AI Credits.</p>}
        </section>
      )}

      {tab === 'wallet' && (
        <section className="bl-sheet p-5">
          <TabIntro title="Wallet">
            Money from online orders lands here, and you can pay for your plan, SMS and AI Credits from it. Add money with bKash, Nagad or a card.
          </TabIntro>
          <div className="flex flex-wrap items-center gap-3">
            <p className="bl-fig mr-auto text-3xl" style={balance < 0 ? { color: 'var(--color-error)' } : undefined}>
              {formatTaka(balance)}
            </p>
            {isOwner && (
              <button type="button" onClick={() => setAddMoneyOpen(true)} className="bl-btn bl-btn--ink">
                Add money
              </button>
            )}
            <Link to="/vendor/finance/wallet" className="bl-btn bl-btn--card">
              See transactions
            </Link>
          </div>
        </section>
      )}

      {tab === 'receipts' && <Receipts embedded />}

      <AddMoneyDialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen} currentBalance={balance} />
    </div>
  );
}
