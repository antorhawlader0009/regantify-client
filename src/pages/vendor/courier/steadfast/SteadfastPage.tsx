import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { courierApi } from '../../../../lib/courierApi';
import { SteadfastSettingsTab } from './SteadfastSettingsTab';
import { SteadfastParcelsTab } from './SteadfastParcelsTab';
import { SteadfastDashboardTab } from './SteadfastDashboardTab';

type Tab = 'dashboard' | 'parcels' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'parcels', label: 'Parcels' },
  { id: 'settings', label: 'Settings' },
];

/**
 * Courier Integration > SteadFast — Dashboard / Parcels / Settings, the
 * same layout as the Pathao page. The active tab lives in `?tab=`;
 * connected vendors land on the Dashboard, not-connected ones always on
 * Settings (the other tabs have nothing to show yet). SteadFast is free
 * on every plan, booking included.
 */
export default function SteadfastPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ['steadfast-overview'],
    queryFn: courierApi.getSteadfastOverview,
  });

  const requested = searchParams.get('tab') as Tab | null;
  const tab: Tab = !overview?.connected
    ? 'settings'
    : requested && TABS.some((t) => t.id === requested)
      ? requested
      : 'dashboard';

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-regantify-black">SteadFast Courier</h1>
        <p className="text-sm text-regantify-text-muted mt-1">Book SteadFast deliveries from your orders and track every parcel.</p>
      </div>

      <div className="flex items-center gap-5 mb-6 border-b border-black/5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSearchParams({ tab: t.id })}
            disabled={!overview?.connected && t.id !== 'settings'}
            className={`-mb-px pb-2.5 text-sm font-medium border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              tab === t.id
                ? 'border-regantify-cta text-regantify-text'
                : 'border-transparent text-regantify-text-muted hover:text-regantify-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-regantify-text-muted">Loading…</p>
      ) : isError || !overview ? (
        <p className="text-sm text-red-500">
          Could not load your SteadFast settings.{' '}
          <button type="button" onClick={() => refetch()} className="underline">
            Try again
          </button>
        </p>
      ) : tab === 'dashboard' ? (
        <SteadfastDashboardTab onOpenParcels={() => setSearchParams({ tab: 'parcels' })} />
      ) : tab === 'parcels' ? (
        <SteadfastParcelsTab />
      ) : (
        <SteadfastSettingsTab overview={overview} />
      )}
    </div>
  );
}
