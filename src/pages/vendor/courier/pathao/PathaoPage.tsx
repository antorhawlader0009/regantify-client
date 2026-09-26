import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { courierApi } from '../../../../lib/courierApi';
import { LockedFeatureCard } from '../../../../components/ui/UpgradePrompt';
import { PathaoSettingsTab } from './PathaoSettingsTab';
import { PathaoParcelsTab } from './PathaoParcelsTab';
import { PathaoDashboardTab } from './PathaoDashboardTab';

type Tab = 'dashboard' | 'parcels' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'parcels', label: 'Parcels' },
  { id: 'settings', label: 'Settings' },
];

/**
 * Courier Integration > Pathao — the dedicated Pathao addon page
 * (pathao-plan.md §3): Dashboard / Parcels / Settings tabs. The active
 * tab lives in `?tab=` so a link can open a specific one (e.g. the
 * Settings page's "Manage" link). Not-connected vendors always land on
 * Settings, since the other two tabs have nothing to show yet.
 */
export default function PathaoPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ['pathao-overview'],
    queryFn: courierApi.getPathaoOverview,
  });

  const requested = searchParams.get('tab') as Tab | null;
  const tab: Tab = overview && !overview.connected ? 'settings' : requested && TABS.some((t) => t.id === requested) ? requested : 'settings';

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-regantify-black">Pathao Courier</h1>
        <p className="text-sm text-regantify-text-muted mt-1">Book Pathao deliveries from your orders and track every parcel.</p>
      </div>

      <div className="flex items-center gap-5 mb-6 border-b border-black/5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSearchParams(t.id === 'settings' ? {} : { tab: t.id })}
            disabled={overview && !overview.connected && t.id !== 'settings'}
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
          Could not load your Pathao settings.{' '}
          <button type="button" onClick={() => refetch()} className="underline">
            Try again
          </button>
        </p>
      ) : !overview.planAllowed && tab !== 'settings' ? (
        <LockedFeatureCard
          title="Booking with Pathao is a paid-plan feature"
          message="Upgrade your plan to book parcels and use the Pathao dashboard. Connecting Pathao and the customer delivery check (Settings tab) are free on every plan."
        />
      ) : tab === 'dashboard' ? (
        <PathaoDashboardTab onOpenParcels={() => setSearchParams({ tab: 'parcels' })} />
      ) : tab === 'parcels' ? (
        <PathaoParcelsTab />
      ) : (
        <PathaoSettingsTab overview={overview} />
      )}
    </div>
  );
}
