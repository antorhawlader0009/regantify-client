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
import { UsageBar } from '../../components/dashboard/SideCards';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PayFromWalletButton } from '../../components/PayFromWalletButton';
import { PageHeader, PillTabs, outlineBtn, primaryBtn } from '../../components/ui/PageKit';
import { formatTaka } from '../../components/analytics/format';
import { useAuthStore } from '../../store/authStore';
import { SmsPackBuyer, perSms } from './sms/BuySmsDialog';
import { AiCreditPackBuyer } from './ai-automation/BuyChatBotDialog';
import { AddMoneyDialog } from './finance/AddMoneyDialog';
import Receipts from './finance/Receipts';
import { DailyLimitBanner, UnlimitedBadge } from '../../components/DailyLimitBanner';

/*
 * Billing: everything the store pays the platform for, in one place (2026-10-16, after vendors said buying the
 * plan, SMS and AI credits on three different pages was a hassle). On top, one strip with the four balances a
 * store runs on (plan, wallet, SMS, AI Credits), each with its one "get more" action and an amber edge when it is
 * running low. Below, a tab per thing to buy, plus the receipts. `?tab=plan|sms|ai|wallet|receipts` opens a tab,
 * so the SMS page, the AI Chat Bot page, the Dashboard and the payment return page can send the owner straight to
 * the right one. The SMS and AI pages keep their own "Buy" buttons as shortcuts (same pack pickers, in a dialog).
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

/** One feature line on a plan card: a tick (or a dash for "no") and the words. */
/** "Unlimited products": the word highlighted, as everywhere products, orders and image uploads are listed. */
function Unlimited({ children }: { children: ReactNode }) {
  return (
    <>
      <strong className="font-semibold text-emerald-700">Unlimited</strong> {children}
    </>
  );
}

function Feature({ on = true, children }: { on?: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-start gap-2 ${on ? 'text-regantify-text' : 'text-neutral-400'}`}>
      {on ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden /> : <Minus size={14} className="mt-0.5 shrink-0" aria-hidden />}
      <span>{children}</span>
    </li>
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

// ---------------------------------------------------------------- the balance strip

type Tone = 'ok' | 'low' | 'empty';

/**
 * One of the four balances. The strip is a single panel split by hairlines (not four cards), so it reads as one
 * account. A low or empty balance gets an amber/red edge on top and says what happens next, before it runs out.
 */
function BalanceSlot({
  label,
  value,
  status,
  tone = 'ok',
  action,
  onAction,
  active,
}: {
  label: string;
  value: ReactNode;
  status: ReactNode;
  tone?: Tone;
  action: string;
  onAction: () => void;
  active: boolean;
}) {
  const edge = tone === 'empty' ? 'shadow-[inset_0_3px_0_#dc2626]' : tone === 'low' ? 'shadow-[inset_0_3px_0_#f59e0b]' : '';
  const statusColor = tone === 'empty' ? 'text-red-700' : tone === 'low' ? 'text-amber-800' : 'text-neutral-500';
  return (
    <div className={`flex flex-col p-4 ${edge} ${active ? 'bg-brand-lime/20' : 'bg-white'}`}>
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tabular-nums text-regantify-text">{value}</p>
      <p className={`mt-1 min-h-[2.5rem] text-xs leading-relaxed ${statusColor}`}>{status}</p>
      <button
        type="button"
        onClick={onAction}
        className={`${tone === 'ok' ? outlineBtn : primaryBtn} mt-3 h-9 w-full justify-center`}
        aria-pressed={active}
      >
        {action}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- plan tab

function PlanTab({ usage, plans, isOwner }: { usage: VendorPlanUsage | undefined; plans: Plan[]; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const [payingPlan, setPayingPlan] = useState<PlanCode | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<Plan | null>(null);
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

  return (
    <div className="space-y-4">
      {usage && (
        <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-regantify-text">What you’ve used of {usage.plan.name}</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {feeText(usage.plan.codGatewayFeeBdt, usage.plan.codGatewayFeePercent, usage.plan.codGatewayFeePayer)}.
          </p>
          <div className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
            <UsageBar label="Products" used={usage.usage.products.used} limit={usage.usage.products.limit} />
            <UsageBar label="Orders today" used={usage.usage.ordersToday.used} limit={usage.usage.ordersToday.limit} />
            <UsageBar label="Staff" used={usage.usage.staff.used} limit={usage.usage.staff.limit} />
            <div>
              <UsageBar label="Store visits this month" used={usage.usage.monthlyVisits.used} limit={usage.usage.monthlyVisits.limit} />
              <p className="mt-1 text-xs text-neutral-500">For your information: your store keeps working for shoppers past the number.</p>
            </div>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
            <UnlimitedBadge /> Products, orders and image uploads are unlimited on every plan.
          </p>
          <DailyLimitBanner daily={usage.daily} kinds={['products', 'orders', 'images']} className="mt-3" />
        </section>
      )}

      {pendingRequest && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
          <Clock size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
          <p>
            Your request to move to <strong>{pendingRequest.requestedPlan.name}</strong> is waiting for our team. We’ll set it up and let you know.
          </p>
        </div>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-regantify-text">Compare plans</h2>
          {isOwner && (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (promoInput.trim().length >= 3) applyPromo.mutate();
              }}
            >
              <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Promo code" maxLength={24} aria-label="Promo code" className="h-9 w-40 rounded-lg border border-line bg-white px-3 text-sm uppercase placeholder:normal-case focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40" />
              <button type="submit" disabled={applyPromo.isPending || promoInput.trim().length < 3} className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60">
                {applyPromo.isPending ? 'Checking…' : 'Apply'}
              </button>
            </form>
          )}
        </div>
        {promo && <p className="mb-3 text-xs text-green-700">Code {promo.code.toUpperCase()} applied. The prices below include it.</p>}
        {promoError && <p className="mb-3 text-xs text-red-600">{promoError}</p>}
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
                  {isCurrent ? <span className="rounded border border-brand/30 bg-brand-lime px-1.5 py-0.5 text-[11px] font-medium text-regantify-text">Your plan</span> : plan.mostPopular ? <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Most popular</span> : null}
                </div>
                <p className="mt-1 text-xl font-semibold tabular-nums text-regantify-text">
                  {promo?.quotes[plan.code] && <s className="mr-1.5 text-sm font-normal text-neutral-400">{priceText(plan)}</s>}
                  {payPrice(plan)}
                  {!isFree && <span className="text-xs font-normal text-neutral-500"> /month</span>}
                </p>

                <ul className="my-4 flex-1 space-y-1.5 text-sm">
                  <Feature><Unlimited>products</Unlimited></Feature>
                  <Feature><Unlimited>orders</Unlimited></Feature>
                  <Feature><Unlimited>image uploads</Unlimited></Feature>
                  <Feature>{limitText(plan.staffLimit)} staff</Feature>
                  <Feature>{plan.themeAllowance === null ? 'All themes' : `${plan.themeAllowance} ${plan.themeAllowance === 1 ? 'theme' : 'themes'}`}</Feature>
                  <Feature on={!!plan.aiCreditGrant}>{aiCreditsText(plan)}</Feature>
                  <Feature on={plan.customDomainAllowed}>Your own domain</Feature>
                  <Feature on={plan.customPaymentGatewayAllowed}>Your own payment gateway</Feature>
                  <Feature on={plan.lmsEnabled}>LMS (calls and follow-ups)</Feature>
                  <li className="mt-2 border-t border-line pt-2 text-xs text-neutral-600">{feeText(plan.codGatewayFeeBdt, plan.codGatewayFeePercent, plan.codGatewayFeePayer)}</li>
                </ul>

                {isCurrent && !isFree && planEnd ? (
                  <div>
                    <button
                      type="button"
                      disabled={payMutation.isPending}
                      onClick={() => payMutation.mutate(plan.code)}
                      className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
                    >
                      {payMutation.isPending && payingPlan === plan.code ? 'Opening PayStation…' : `Renew for 30 days, pay ${payPrice(plan)}`}
                    </button>
                    <PayFromWalletButton purpose="PLAN_UPGRADE" packageId={plan.code} promoCode={promo?.quotes[plan.code] ? promo.code : undefined} price={promo?.quotes[plan.code]?.finalPrice ?? Number(plan.priceMonthly)} onPaid={() => undefined} className="mt-2" />
                  </div>
                ) : isCurrent ? (
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
                        {payMutation.isPending && payingPlan === plan.code ? 'Opening PayStation…' : `${higher ? 'Upgrade' : 'Switch'} and pay ${payPrice(plan)}`}
                      </button>
                    )}
                    {!isFree && (
                      <PayFromWalletButton purpose="PLAN_UPGRADE" packageId={plan.code} promoCode={promo?.quotes[plan.code] ? promo.code : undefined} price={promo?.quotes[plan.code]?.finalPrice ?? Number(plan.priceMonthly)} onPaid={() => undefined} />
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

// ---------------------------------------------------------------- the page

function TabIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-[15px] font-semibold text-regantify-text">{title}</h2>
      <p className="mt-0.5 max-w-prose text-sm text-neutral-600">{children}</p>
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
    // On a phone the tabs are below the strip: bring them into view so the tap visibly did something.
    tabsRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  if (usageLoading || plansLoading) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="h-12 w-48 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-44 animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-80 animate-pulse rounded-xl bg-neutral-100" />
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
    <div className="space-y-4">
      <PageHeader className="" title="Billing" description="Your plan, wallet, SMS and AI Credits in one place. Buy what you need here." />

      <section aria-label="Your balances" className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <BalanceSlot
          label="Plan"
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
        <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <TabIntro title="Buy SMS">
            Your store texts customers about their orders, sends sign-in and COD codes, and runs your SMS campaigns. A long message can use 2 or more SMS.{' '}
            <Link to="/vendor/sms" className="font-medium text-brand hover:underline">
              See sent messages
            </Link>
          </TabIntro>
          {isOwner ? <SmsPackBuyer /> : <p className="text-sm text-neutral-600">Only the store owner can buy SMS.</p>}
        </section>
      )}

      {tab === 'ai' && (
        <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <TabIntro title="Buy AI Credits">
            The store chat and Ask AI use these. Credits never expire.{' '}
            <Link to="/vendor/ai-usage" className="font-medium text-brand hover:underline">
              See where they went
            </Link>
          </TabIntro>
          {isOwner ? <AiCreditPackBuyer creditsPerReply={ai?.creditsPerReply} /> : <p className="text-sm text-neutral-600">Only the store owner can buy AI Credits.</p>}
        </section>
      )}

      {tab === 'wallet' && (
        <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <TabIntro title="Wallet">
            Money from online orders lands here, and you can pay for your plan, SMS and AI Credits from it. Add money with bKash, Nagad or a card.
          </TabIntro>
          <div className="flex flex-wrap items-center gap-3">
            <p className={`mr-auto text-3xl font-semibold tabular-nums ${balance < 0 ? 'text-red-700' : 'text-regantify-text'}`}>{formatTaka(balance)}</p>
            {isOwner && (
              <button type="button" onClick={() => setAddMoneyOpen(true)} className={`${primaryBtn} h-10 px-4`}>
                Add money
              </button>
            )}
            <Link to="/vendor/finance/wallet" className={`${outlineBtn} h-10 px-4`}>
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
