import { useQuery } from '@tanstack/react-query';
import { courierApi } from '../../../../lib/courierApi';
import { ConnectionCard, CourierPageShell, PlanLockedCard, formatAgo, useCourierTab } from '../../../../components/courier/CourierKit';
import { PathaoSettingsTab } from './PathaoSettingsTab';
import { PathaoParcelsTab } from './PathaoParcelsTab';
import { PathaoDashboardTab } from './PathaoDashboardTab';

/**
 * Courier Integration > Pathao (pathao-plan.md §3) — connection card,
 * then Dashboard / Parcels / Settings, the same shape as the SteadFast
 * and RedX pages. The active tab lives in `?tab=` so a link can open a
 * specific one. Not-connected vendors always land on Settings; on a plan
 * without Pathao booking, Settings is the landing tab too (connecting
 * and the customer delivery check are free on every plan).
 */
export default function PathaoPage() {
  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ['pathao-overview'],
    queryFn: courierApi.getPathaoOverview,
  });
  const [tab, setTab] = useCourierTab(overview?.connected, overview?.planAllowed ? 'dashboard' : 'settings');

  const connected = overview?.connected ? overview : null;
  const warning = connected?.needsReconnect
    ? 'Pathao changed how stores connect. Reconnect with your own Client ID and Client Secret in Settings to keep booking.'
    : connected && !connected.pickupStore
      ? 'Choose a pickup store in Settings. Pathao needs it before you can book.'
      : undefined;

  return (
    <CourierPageShell
      name="Pathao"
      description="Send orders to Pathao, print labels and follow every parcel."
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
            notConnectedText="Paste your Pathao Client ID and Client Secret in Settings below. Connecting is free on every plan."
            warning={warning}
            details={
              connected
                ? [
                    ...(connected.merchantName ? [{ label: 'Account', value: connected.merchantName }] : []),
                    { label: 'Client ID', value: connected.clientIdMasked ?? '—' },
                    { label: 'Pickup store', value: connected.pickupStore?.name ?? 'Not chosen' },
                    { label: 'Last update from Pathao', value: formatAgo(connected.lastWebhookAt) },
                  ]
                : undefined
            }
            onTest={async () => {
              const stores = await courierApi.getPathaoStoreList();
              return `Pathao answered. ${stores.length} pickup store${stores.length === 1 ? '' : 's'} on your account.`;
            }}
          />
        )
      }
    >
      {overview &&
        (!overview.planAllowed && tab !== 'settings' ? (
          <PlanLockedCard
            title="Booking with Pathao needs a paid plan"
            message="Upgrade to book parcels and see the Pathao dashboard. Connecting Pathao and the customer delivery check (Settings) are free on every plan."
          />
        ) : tab === 'dashboard' ? (
          <PathaoDashboardTab onOpenParcels={() => setTab('parcels')} />
        ) : tab === 'parcels' ? (
          <PathaoParcelsTab />
        ) : (
          <PathaoSettingsTab overview={overview} />
        ))}
    </CourierPageShell>
  );
}
