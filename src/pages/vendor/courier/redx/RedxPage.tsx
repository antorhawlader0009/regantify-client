import { useQuery } from '@tanstack/react-query';
import { courierApi } from '../../../../lib/courierApi';
import { ConnectionCard, CourierPageShell, PlanLockedCard, formatAgo, useCourierTab } from '../../../../components/courier/CourierKit';
import { RedxSettingsTab } from './RedxSettingsTab';
import { RedxParcelsTab } from './RedxParcelsTab';
import { RedxDashboardTab } from './RedxDashboardTab';

/**
 * Courier Integration > RedX — connection card, then Dashboard / Parcels
 * / Settings, the same shape as the Pathao and SteadFast pages. The
 * active tab lives in `?tab=`; connected vendors land on the Dashboard,
 * not-connected ones always on Settings. RedX is a paid-plan courier.
 */
export default function RedxPage() {
  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ['redx-overview'],
    queryFn: courierApi.getRedxOverview,
  });
  const [tab, setTab] = useCourierTab(overview?.connected, overview?.planAllowed === false ? 'settings' : 'dashboard');
  const connected = overview?.connected ? overview : null;

  return (
    <CourierPageShell
      name="RedX"
      description="Send orders to RedX and follow every parcel."
      badge={
        connected?.sandbox && (
          <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Test mode</span>
        )
      }
      tab={tab}
      onTabChange={setTab}
      connected={Boolean(connected)}
      loading={isLoading}
      error={isError || (!isLoading && !overview)}
      onRetry={() => refetch()}
      connection={
        overview && (
          <ConnectionCard
            connected={overview.connected}
            notConnectedText="Paste your RedX access token in Settings below. RedX needs a paid plan."
            warning={
              connected && !connected.pickupStore
                ? 'Choose a pickup store in Settings. RedX needs it before you can book.'
                : connected?.sandbox
                  ? 'Test mode: parcels go to RedX’s sandbox, and no rider will come.'
                  : undefined
            }
            details={
              connected
                ? [
                    { label: 'Access token', value: connected.tokenMasked ?? '—' },
                    { label: 'Pickup store', value: connected.pickupStore?.name ?? 'Not chosen' },
                    { label: 'Last update from RedX', value: formatAgo(connected.lastWebhookAt) },
                  ]
                : undefined
            }
            onTest={async () => {
              const stores = await courierApi.getRedxStores();
              return `RedX answered. ${stores.length} pickup store${stores.length === 1 ? '' : 's'} on your account.`;
            }}
          />
        )
      }
    >
      {overview &&
        (!overview.planAllowed && tab !== 'settings' ? (
          <PlanLockedCard title="RedX needs a paid plan" message="Upgrade to book parcels and see the RedX dashboard. SteadFast is free on every plan." />
        ) : tab === 'dashboard' ? (
          <RedxDashboardTab onOpenParcels={() => setTab('parcels')} />
        ) : tab === 'parcels' ? (
          <RedxParcelsTab />
        ) : (
          <RedxSettingsTab overview={overview} />
        ))}
    </CourierPageShell>
  );
}
