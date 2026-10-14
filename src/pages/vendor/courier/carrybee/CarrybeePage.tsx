import { useQuery } from '@tanstack/react-query';
import { carrybeeApi } from '../../../../lib/carrybeeApi';
import { ConnectionCard, CourierPageShell, PlanLockedCard, formatAgo, useCourierTab } from '../../../../components/courier/CourierKit';
import { CarrybeeSettingsTab } from './CarrybeeSettingsTab';
import { CarrybeeParcelsTab } from './CarrybeeParcelsTab';
import { CarrybeeDashboardTab } from './CarrybeeDashboardTab';

/**
 * Courier Integration > CarryBee (Add-ons > CarryBee Courier): connection card, then Dashboard / Parcels / Settings,
 * the same shape as the RedX page. The active tab lives in `?tab=`; connected stores land on the Dashboard, the rest on
 * Settings. CarryBee is a paid-plan courier.
 */
export default function CarrybeePage() {
  const { data: overview, isLoading, isError, refetch } = useQuery({ queryKey: ['carrybee-overview'], queryFn: carrybeeApi.overview });
  const [tab, setTab] = useCourierTab(overview?.connected, overview?.planAllowed === false ? 'settings' : 'dashboard');
  const connected = overview?.connected ? overview : null;

  return (
    <CourierPageShell
      name="CarryBee"
      description="Send orders to CarryBee and follow every parcel."
      badge={
        connected?.sandbox && <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Test mode</span>
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
            notConnectedText="Add your CarryBee Client ID, Secret and Context in Settings below. CarryBee needs a paid plan."
            warning={
              connected && !connected.pickupStore
                ? 'Choose a pickup store in Settings. CarryBee needs it before you can book.'
                : connected?.sandbox
                  ? 'Test mode: parcels go to CarryBee’s sandbox, and no rider will come.'
                  : undefined
            }
            details={
              connected
                ? [
                    { label: 'Client ID', value: connected.clientIdMasked ?? '—' },
                    { label: 'Pickup store', value: connected.pickupStore?.name ?? 'Not chosen' },
                    { label: 'Last update from CarryBee', value: formatAgo(connected.lastWebhookAt) },
                  ]
                : undefined
            }
            onTest={async () => {
              const stores = await carrybeeApi.stores();
              return `CarryBee answered. ${stores.length} pickup store${stores.length === 1 ? '' : 's'} on your account.`;
            }}
          />
        )
      }
    >
      {overview &&
        (!overview.planAllowed && tab !== 'settings' ? (
          <PlanLockedCard title="CarryBee needs a paid plan" message="Upgrade to book parcels and see the CarryBee dashboard. SteadFast is free on every plan." />
        ) : tab === 'dashboard' ? (
          <CarrybeeDashboardTab onOpenParcels={() => setTab('parcels')} />
        ) : tab === 'parcels' ? (
          <CarrybeeParcelsTab />
        ) : (
          <CarrybeeSettingsTab overview={overview} />
        ))}
    </CourierPageShell>
  );
}
