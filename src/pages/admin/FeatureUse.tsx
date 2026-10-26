import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MousePointerClick } from 'lucide-react';
import { adminAnalyticsApi } from '../../lib/adminAnalyticsApi';
import { RangeTabs } from '../../components/admin/ui/RangeTabs';

const panel = 'rounded-2xl bg-white shadow-[var(--console-card-shadow)]';
const DAY_OPTIONS = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
] as const;
const th = 'px-4 py-2 font-normal';
const thR = 'px-4 py-2 text-right font-normal';
const td = 'px-4 py-2.5';
const tdR = 'px-4 py-2.5 text-right tabular-nums';
const num = (n: number) => n.toLocaleString('en-US');

/**
 * Super Admin > Overview > Feature use (IDEA-30): how often shoppers use each storefront feature, and in how many stores. Counts only; no shopper
 * is named. A feature with nothing is listed with 0 so it can be hidden or dropped on evidence. Read it after a month or two, and keep in mind that
 * a feature a store has turned off, or that only suits some stores (gift cards, size guides), will always look quiet.
 */
export default function FeatureUse() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isFetching } = useQuery({ queryKey: ['admin-feature-use', days], queryFn: () => adminAnalyticsApi.featureUse(days) });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <MousePointerClick className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">Feature use</h1>
            <p className="max-w-3xl text-sm text-regantify-text-muted">
              How many times shoppers used each storefront feature, and in how many stores, against the same number of days before. Counts only: nothing about
              the shopper is kept.
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
          <div className={`${panel} px-5 py-4 text-sm text-regantify-text-muted`}>
            {data.since ? (
              <>
                Counting since <span className="font-medium text-regantify-text">{data.since}</span>. In the last {data.days} days,{' '}
                <span className="font-medium text-regantify-text">{num(data.activeStores)}</span> stores had at least one use of any feature below. If counting
                started recently, a short history is not low use.
              </>
            ) : (
              'Nothing has been counted yet. It starts when the storefront with this feature is deployed and shoppers visit.'
            )}
          </div>

          <div className={`${panel} overflow-x-auto`}>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-regantify-text-muted">
                <tr>
                  <th className={th}>Feature</th>
                  <th className={th}>Where</th>
                  <th className={thR}>Uses</th>
                  <th className={thR}>Stores</th>
                  <th className={thR}>Before</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.features.map((f) => {
                  const change = f.before > 0 ? Math.round(((f.uses - f.before) / f.before) * 100) : null;
                  return (
                    <tr key={f.key} className={f.uses === 0 ? 'text-regantify-text-muted' : ''}>
                      <td className={td}>{f.label}</td>
                      <td className={td}>{f.group}</td>
                      <td className={tdR}>{f.uses === 0 ? '0' : num(f.uses)}</td>
                      <td className={tdR}>{num(f.stores)}</td>
                      <td className={tdR}>
                        {num(f.before)}
                        {change !== null && f.uses > 0 && (
                          <span className={`ml-2 text-xs ${change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {change >= 0 ? '+' : ''}
                            {change}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
