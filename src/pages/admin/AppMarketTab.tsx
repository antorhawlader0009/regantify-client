import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { appPushAdminApi } from '../../lib/appPushAdminApi';
import AppPushTab from './AppPushTab';

const panel = 'rounded-xl border border-line bg-white';
const taka = (n: number) => `৳${Math.round(n).toLocaleString('en-US')}`;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs text-regantify-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-regantify-text">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-regantify-text-muted">{hint}</p>}
    </div>
  );
}

/**
 * Super Admin > Platform > Shop > App (MARKETPLACE-APP-plan.md Step 14): the app's marketplace at a glance. The on/off switch itself lives in
 * Settings > Switches (owner only), the app's banners and collections are made in the Home page tab (each has a "Shown in" choice), and the
 * plan-by-plan limit is the "Shown in the Regantify app marketplace" toggle of a plan in Plans.
 */
export default function AppMarketTab() {
  const stats = useQuery({ queryKey: ['admin-app-market-stats'], queryFn: appPushAdminApi.stats });
  const s = stats.data;

  return (
    <div className="space-y-5">
      <section className={`${panel} space-y-2 p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-regantify-text">Marketplace in the app</h2>
          {s && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.marketOn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{s.marketOn ? 'On' : 'Paused'}</span>
          )}
        </div>
        <p className="text-xs text-regantify-text-muted">
          Turn it off or on in <Link className="underline" to="/admin/settings?tab=switches">Settings &gt; Switches</Link> (owner only). Banners and collections for the app are made in the{' '}
          <Link className="underline" to="/admin/shop?tab=home">Home page tab</Link>: choose "App only" to keep them off the website. To keep the stores of one plan out of the app, switch off "Shown in the
          Regantify app marketplace" in <Link className="underline" to="/admin/plans">Plans</Link>. Every change is in the admin log.
        </p>
      </section>

      {stats.isLoading || !s ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="App orders, last 7 days" value={String(s.last7.orders)} hint={taka(s.last7.sales)} />
          <Stat label="App orders, last 30 days" value={String(s.last30.orders)} hint={taka(s.last30.sales)} />
          <Stat label="Shoppers with the app" value={String(s.shoppersWithApp)} hint="Phones seen in the last 30 days" />
          <Stat label="Shoppers with a cart" value={String(s.shoppersWithCart)} hint="Items waiting in the app cart" />
          <Stat label="Stores in the Shop" value={String(s.storesListed)} hint="Opted in and not blocked" />
          <Stat label="Stores kept out by plan" value={String(s.storesBlockedByPlan)} hint="Plans with the app marketplace switched off" />
        </div>
      )}

      <AppPushTab />
    </div>
  );
}
