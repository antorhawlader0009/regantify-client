import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Package, Truck, Wallet } from 'lucide-react';
import type { DashboardSummary } from '../../lib/dashboardApi';
import type { VendorPlanUsage } from '../../lib/plansApi';
import { formatValue } from '../analytics/format';

// Dashboard > right-hand column (dashboard-plan.md Step 8): money, delivery,
// top products and plan usage. Money figures carry the `dash-money` class
// so the page's "Hide numbers" switch can mask them (Step 9).

const money = (n: number) => formatValue(n, 'money');

function SideCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-regantify-text">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
      {children}
      <ArrowRight size={14} aria-hidden />
    </Link>
  );
}

/** Owner only: wallet balance (masked until tapped, like the topbar), COD the couriers hold, cash-outs in progress. */
export function MoneyCard({ money: m }: { money: NonNullable<DashboardSummary['money']> }) {
  const [shown, setShown] = useState(false);
  return (
    <SideCard title="Money" action={<MoreLink to="/vendor/finance/wallet">Wallet</MoreLink>}>
      <div className="rounded-lg bg-brand p-3.5 text-white">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-white/70">Wallet balance</p>
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Hide balance' : 'Show balance'}
            title={shown ? 'Hide balance' : 'Show balance'}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            {shown ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className="dash-money mt-0.5 text-2xl font-semibold tabular-nums">{shown ? money(m.balance) : '৳ ••••••'}</p>
      </div>

      <dl className="mt-3 space-y-2.5 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-neutral-600">
            COD collected by couriers
            <span className="block text-xs text-neutral-400">
              {m.codWithCouriers.count} delivered {m.codWithCouriers.count === 1 ? 'parcel' : 'parcels'}, not paid to you yet
            </span>
          </dt>
          <dd className="dash-money shrink-0 font-semibold tabular-nums text-regantify-text">{money(m.codWithCouriers.amount)}</dd>
        </div>
        {m.withdrawInProgress.count > 0 && (
          <div className="flex items-start justify-between gap-3">
            <dt className="text-neutral-600">
              Withdrawals in progress
              <span className="block text-xs text-neutral-400">
                {m.withdrawInProgress.count} {m.withdrawInProgress.count === 1 ? 'request' : 'requests'}
              </span>
            </dt>
            <dd className="dash-money shrink-0 font-semibold tabular-nums text-regantify-text">{money(m.withdrawInProgress.amount)}</dd>
          </div>
        )}
      </dl>

      <Link
        to="/vendor/finance/withdraw"
        className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm text-regantify-text transition-colors hover:bg-neutral-50"
      >
        <Wallet size={15} aria-hidden />
        Withdraw
      </Link>
    </SideCard>
  );
}

/** Delivery success over 30 days, with the usual Bangladesh range as a guide. Hidden with no courier connected. */
export function DeliveryCard({ delivery }: { delivery: DashboardSummary['delivery'] }) {
  if (!delivery.courierConnected) return null;
  const rate = delivery.successRate;
  const verdict =
    rate == null ? null : rate >= 90 ? { text: 'Good', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' } : rate >= 80 ? { text: 'Normal', cls: 'text-amber-700 bg-amber-50 border-amber-200' } : { text: 'Needs work', cls: 'text-red-700 bg-red-50 border-red-200' };

  return (
    <SideCard
      title={`Delivery, last ${delivery.days} days`}
      action={<MoreLink to="/vendor/analytics?tab=orders&preset=last30">Details</MoreLink>}
    >
      {rate == null ? (
        <div className="flex items-center gap-3 py-2 text-sm text-neutral-500">
          <Truck size={18} className="shrink-0 text-neutral-400" aria-hidden />
          No parcels delivered or returned in the last {delivery.days} days.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-neutral-500">Delivered</p>
              <p className="text-2xl font-semibold tabular-nums text-regantify-text">{rate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Returned</p>
              <p className="text-2xl font-semibold tabular-nums text-regantify-text">{(delivery.returnRate ?? 0).toFixed(1)}%</p>
            </div>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-red-100" aria-hidden>
            <div className="h-full rounded-full bg-brand" style={{ width: `${rate}%` }} />
          </div>
          <p className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            {verdict && <span className={`rounded border px-1.5 py-0.5 font-medium ${verdict.cls}`}>{verdict.text}</span>}
            80-85% is normal for COD in Bangladesh, 90%+ is good.
          </p>
        </>
      )}
    </SideCard>
  );
}

/** Best sellers of the last 7 days. */
export function TopProductsCard({ products }: { products: DashboardSummary['topProducts'] }) {
  return (
    <SideCard title="Top products, last 7 days" action={<MoreLink to="/vendor/analytics?tab=products&preset=last7">All</MoreLink>}>
      {products.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">No products sold in the last 7 days.</p>
      ) : (
        <ol className="space-y-2.5">
          {products.map((p, i) => (
            <li key={p.productId ?? p.name} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-center text-xs font-medium text-neutral-400">{i + 1}</span>
              {p.image ? (
                <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded border border-line bg-neutral-100 object-cover" loading="lazy" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-neutral-100 text-neutral-400">
                  <Package size={15} aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-regantify-text">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {p.units} sold · {p.orders} {p.orders === 1 ? 'order' : 'orders'}
                </p>
              </div>
              <span className="dash-money shrink-0 text-sm font-semibold tabular-nums text-regantify-text">{money(p.revenue)}</span>
            </li>
          ))}
        </ol>
      )}
    </SideCard>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const tone = limit && pct >= 100 ? 'bg-red-500' : limit && pct >= 80 ? 'bg-amber-500' : 'bg-brand';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className="tabular-nums text-regantify-text">
          {used.toLocaleString()} / {limit == null ? 'Unlimited' : limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
        <div className={`h-full rounded-full ${tone}`} style={{ width: limit == null ? '100%' : `${Math.max(pct, used > 0 ? 3 : 0)}%`, opacity: limit == null ? 0.25 : 1 }} />
      </div>
    </div>
  );
}

/** The plan and how much of it is used; an upgrade nudge once a limit is 80% used. */
export function PlanCard({ usage, isOwner }: { usage: VendorPlanUsage; isOwner: boolean }) {
  const rows = [
    { label: 'Products', ...usage.usage.products },
    { label: 'Orders today', ...usage.usage.ordersToday },
    { label: 'Staff', ...usage.usage.staff },
  ];
  const nearLimit = rows.some((r) => r.limit != null && r.used >= r.limit * 0.8);

  return (
    <SideCard
      title="Plan"
      action={
        <span className="rounded-full bg-gradient-to-r from-brand to-emerald-600 px-2 py-0.5 text-xs font-medium text-white">{usage.plan.name}</span>
      }
    >
      <div className="space-y-3">
        {rows.map((r) => (
          <UsageBar key={r.label} label={r.label} used={r.used} limit={r.limit} />
        ))}
      </div>
      {isOwner && (
        <Link
          to="/vendor/billing"
          className={`mt-3.5 flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm transition-colors ${
            nearLimit ? 'bg-brand text-white hover:bg-brand-dark' : 'border border-line text-regantify-text hover:bg-neutral-50'
          }`}
        >
          {nearLimit ? 'Upgrade your plan' : 'See plans'}
          <ArrowRight size={14} aria-hidden />
        </Link>
      )}
    </SideCard>
  );
}
