import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { getPlans, getVendorPlanUsage, formatFeeParts, type Plan, type PaymentFeePayer } from '../../../lib/plansApi';
import { EmptyState, PageHeader, StackedList, TableFrame, td, th, theadRow, trClass } from '../../../components/ui/PageKit';
import { formatTaka } from './financeUi';

const EXAMPLE_ORDER = 1000;

/**
 * The charge on an example order, the way the server works it out: a
 * flat part plus a % of (order total + the flat part). See server's
 * Plan.codGatewayFeeBdt comment.
 */
function exampleFee(plan: Pick<Plan, 'codGatewayFeeBdt' | 'codGatewayFeePercent'>) {
  const flat = Number(plan.codGatewayFeeBdt);
  const percent = Number(plan.codGatewayFeePercent);
  return Math.round((flat + (percent / 100) * (EXAMPLE_ORDER + flat)) * 100) / 100;
}

function payerText(payer: PaymentFeePayer) {
  return payer === 'VENDOR' ? 'Taken from your earnings' : 'Added to what the customer pays';
}

function CurrentBadge() {
  return <span className="ml-2 rounded border border-brand/30 bg-brand-lime/40 px-1.5 py-0.5 text-[11px] font-medium text-regantify-text">Your plan</span>;
}

/**
 * Finance > Fee Summary — PLAN.md Step 12. The per-order platform charge
 * on cash-on-delivery orders for each plan (Plan.codGatewayFee*; the
 * Online Payment fee is hidden from vendors, so it's never shown here),
 * with an example order so the number means something, and who pays it.
 * Read-only: the charge is worked out at checkout by OrdersService.
 */
export default function FeeSummary() {
  const { data: usage, isLoading: usageLoading } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage });
  const { data: plans = [], isLoading: plansLoading } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
  const loading = usageLoading || plansLoading;
  const current = usage?.plan;

  return (
    <div className="space-y-4">
      <PageHeader
        className=""
        title="Fee summary"
        description="The platform charge on each cash-on-delivery order. Higher plans pay less."
      />

      {loading ? (
        <div className="space-y-4" aria-busy>
          <div className="h-36 animate-pulse rounded-xl bg-neutral-100 sm:w-96" />
          <div className="h-56 animate-pulse rounded-xl bg-neutral-100" />
        </div>
      ) : (
        <>
          {current && (
            <section className="rounded-xl bg-brand p-4 text-white sm:max-w-md">
              <p className="text-sm text-white/75">Your charge per cash-on-delivery order</p>
              <p className="mt-0.5 text-3xl font-semibold tabular-nums">{formatFeeParts(current.codGatewayFeeBdt, current.codGatewayFeePercent)}</p>
              <p className="mt-2 text-xs leading-relaxed text-white/75">
                On a {formatTaka(EXAMPLE_ORDER)} order that’s {formatTaka(exampleFee(current))}. {payerText(current.codGatewayFeePayer)}, on your{' '}
                {current.name} plan.
              </p>
            </section>
          )}

          <section className="rounded-xl border border-line bg-white p-3.5">
            <h2 className="mb-3 px-0.5 text-[15px] font-semibold text-regantify-text">Every plan</h2>
            {plans.length === 0 ? (
              <div className="rounded-lg border border-line">
                <EmptyState icon={Receipt} title="Couldn’t load the plans" hint="Refresh the page to try again." />
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <TableFrame minWidth="min-w-[640px]">
                    <thead>
                      <tr className={theadRow}>
                        <th className={th}>Plan</th>
                        <th className={th}>Charge per COD order</th>
                        <th className={th}>On a {formatTaka(EXAMPLE_ORDER)} order</th>
                        <th className={th}>Your own payment gateway</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((plan) => {
                        const isCurrent = current?.code === plan.code;
                        return (
                          <tr key={plan.id} className={trClass(isCurrent)}>
                            <td className={td}>
                              <span className="font-medium">{plan.name}</span>
                              {isCurrent && <CurrentBadge />}
                            </td>
                            <td className={td}>
                              <span className="tabular-nums">{formatFeeParts(plan.codGatewayFeeBdt, plan.codGatewayFeePercent)}</span>
                              <span className="block text-xs text-neutral-500">{payerText(plan.codGatewayFeePayer)}</span>
                            </td>
                            <td className={`${td} tabular-nums`}>{formatTaka(exampleFee(plan))}</td>
                            <td className={`${td} text-neutral-600`}>{plan.customPaymentGatewayAllowed ? 'Included' : 'Not included'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </TableFrame>
                </div>

                <StackedList className="md:hidden">
                  {plans.map((plan) => {
                    const isCurrent = current?.code === plan.code;
                    return (
                      <li key={plan.id} className={`px-3 py-3 ${isCurrent ? 'bg-brand-lime/20' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-regantify-text">
                            {plan.name}
                            {isCurrent && <CurrentBadge />}
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-regantify-text">{formatFeeParts(plan.codGatewayFeeBdt, plan.codGatewayFeePercent)}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {formatTaka(exampleFee(plan))} on a {formatTaka(EXAMPLE_ORDER)} order · {payerText(plan.codGatewayFeePayer).toLowerCase()}
                        </p>
                        <p className="text-xs text-neutral-500">Your own payment gateway: {plan.customPaymentGatewayAllowed ? 'included' : 'not included'}</p>
                      </li>
                    );
                  })}
                </StackedList>
              </>
            )}
            <p className="mt-3 px-0.5 text-xs text-neutral-500">
              Turn payment methods on or off under{' '}
              <Link to="/vendor/store/payment-gateway" className="text-brand hover:underline">
                Store › Payment gateway
              </Link>
              . To pay less per order,{' '}
              <Link to="/vendor/billing" className="text-brand hover:underline">
                compare plans
              </Link>
              .
            </p>
          </section>
        </>
      )}
    </div>
  );
}
