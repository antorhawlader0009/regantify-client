import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Loader2, Route } from 'lucide-react';
import { adminAnalyticsApi, type ActivationStepKey } from '../../lib/adminAnalyticsApi';
import { RangeTabs } from '../../components/admin/ui/RangeTabs';

const panel = 'rounded-2xl bg-white shadow-[var(--console-card-shadow)]';
const DAY_OPTIONS = [
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: '180', label: '180 days' },
  { id: '365', label: '1 year' },
] as const;
const th = 'px-4 py-2 font-normal';
const td = 'px-4 py-2.5';

/**
 * Super Admin > Overview > Activation (IDEA-37): where new stores get stuck. The stores opened in the chosen window, and how many reached each of the first
 * steps (product, a courier or own payment connected, a first real order, a first delivery), with the median days it took. Press a step to see the stores
 * that have not reached it yet, oldest first, and whether they still sign in (a store that left is not the same as one that is stuck). Each step shows
 * whether an automatic nudge for it is switched on.
 */
export default function Activation() {
  const [days, setDays] = useState(90);
  const [step, setStep] = useState<ActivationStepKey>('PRODUCT');
  const { data, isLoading, isFetching } = useQuery({ queryKey: ['admin-activation', days], queryFn: () => adminAnalyticsApi.activation(days) });
  const stuck = useQuery({ queryKey: ['admin-activation-stuck', step, days], queryFn: () => adminAnalyticsApi.activationStuck(step, days) });
  const stepLabel = data?.steps.find((s) => s.key === step)?.label.toLowerCase() ?? '';

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Route className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">Activation</h1>
            <p className="max-w-3xl text-sm text-regantify-text-muted">
              Where new stores get stuck. Counts the active stores opened in the chosen time, and how many reached each step. A store that does not get its first
              order in the first weeks is the one most likely to leave.
            </p>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto rounded-full bg-white px-1.5 py-1 shadow-[var(--console-card-shadow)]">
          <RangeTabs options={DAY_OPTIONS} value={String(days) as (typeof DAY_OPTIONS)[number]['id']} onChange={(id) => setDays(Number(id))} />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className={`space-y-4 ${isFetching ? 'opacity-60' : ''}`}>
          <div className={`${panel} space-y-4 p-5`}>
            <p className="text-sm text-regantify-text-muted">
              <span className="font-medium text-regantify-text">{data.total}</span> active stores opened in the last {data.days} days.
            </p>
            {data.steps.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(s.key)}
                className={`block w-full rounded-xl border p-3 text-left transition-colors ${step === s.key ? 'border-brand bg-neutral-50' : 'border-transparent hover:bg-neutral-50'}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-regantify-text">{s.label}</span>
                  <span className="tabular-nums text-regantify-text-muted">
                    {s.reached} of {data.total} · <span className="font-semibold text-regantify-text">{Math.round(s.share * 100)}%</span>
                    {s.medianDays !== null && <> · median {s.medianDays} {s.medianDays === 1 ? 'day' : 'days'}</>}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(s.share * 100, s.reached > 0 ? 2 : 0)}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-regantify-text-muted">
                  {s.nudge === null ? (
                    'No automatic nudge for this step.'
                  ) : s.nudge.name && s.nudge.enabled ? (
                    <>Nudge “{s.nudge.name}” is <span className="font-medium text-emerald-700">on</span>.</>
                  ) : s.nudge.name ? (
                    <>
                      Nudge “{s.nudge.name}” is <span className="font-medium text-amber-700">off</span>. <Link to="/admin/automations" className="text-brand underline">Turn it on</Link>
                    </>
                  ) : (
                    <>
                      No nudge set up yet. <Link to="/admin/automations" className="text-brand underline">Open Automations</Link>
                    </>
                  )}
                </p>
              </button>
            ))}
          </div>

          <div className={`${panel} overflow-x-auto`}>
            <div className="px-5 pt-4">
              <h2 className="text-sm font-semibold text-regantify-text">Stores that have not yet {stepLabel}</h2>
              <p className="mt-0.5 text-xs text-regantify-text-muted">
                Oldest first, at most 50. Stores younger than 3 days are left out (no time yet). “Last sign-in” tells a store that left from one that is stuck.
              </p>
            </div>
            {stuck.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-neutral-400" />
              </div>
            ) : (stuck.data ?? []).length === 0 ? (
              <p className="px-5 py-8 text-sm text-regantify-text-muted">No store is waiting on this step.</p>
            ) : (
              <table className="mt-2 w-full text-left text-sm">
                <thead className="text-xs text-regantify-text-muted">
                  <tr>
                    <th className={th}>Store</th>
                    <th className={th}>Owner</th>
                    <th className={th}>Opened</th>
                    <th className={th}>Last sign-in</th>
                    <th className={th}>Done so far</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {(stuck.data ?? []).map((v) => (
                    <tr key={v.vendorId}>
                      <td className={td}>
                        <Link to={`/admin/vendors/${v.vendorId}`} className="font-medium text-brand hover:underline">
                          {v.storeName}
                        </Link>
                      </td>
                      <td className={td}>
                        {v.ownerName ?? '-'}
                        {v.phone && <span className="block text-xs text-regantify-text-muted">{v.phone}</span>}
                      </td>
                      <td className={td}>{v.daysSinceSignup} days ago</td>
                      <td className={td}>
                        {v.daysSinceSignIn === null ? 'never' : v.daysSinceSignIn === 0 ? 'today' : `${v.daysSinceSignIn} days ago`}
                        {v.daysSinceSignIn !== null && v.daysSinceSignIn >= 14 && <span className="ml-1.5 rounded bg-red-50 px-1.5 py-0.5 text-[11px] text-red-700">left?</span>}
                      </td>
                      <td className={td}>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                          {data.steps.map((s) => (
                            <span key={s.key} className={`inline-flex items-center gap-1 ${v.done[s.key] ? 'text-emerald-700' : 'text-neutral-400'}`}>
                              {v.done[s.key] ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                              {s.key === 'PRODUCT' ? 'product' : s.key === 'CONNECT' ? 'connected' : s.key === 'ORDER' ? 'order' : 'delivered'}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="px-5 pb-4 pt-2 text-xs text-regantify-text-muted">
              An order the owner placed to test the store counts as a first order; the report cannot tell. Counter (POS) sales, cancelled orders and unpaid online
              payments do not count.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
