import { useQuery } from '@tanstack/react-query';
import { courierApi } from '../../../../lib/courierApi';
import { ConnectionCard, CourierPageShell, formatAgo, formatTaka, useCourierTab } from '../../../../components/courier/CourierKit';
import { SteadfastSettingsTab } from './SteadfastSettingsTab';
import { SteadfastParcelsTab } from './SteadfastParcelsTab';
import { SteadfastDashboardTab } from './SteadfastDashboardTab';

/**
 * Courier Integration > SteadFast — connection card, then Dashboard /
 * Parcels / Settings, the same shape as the Pathao and RedX pages. The
 * active tab lives in `?tab=`; connected vendors land on the Dashboard,
 * not-connected ones always on Settings (the other tabs have nothing to
 * show yet). SteadFast is free on every plan, booking included.
 */
export default function SteadfastPage() {
  const { data: overview, isLoading, isError, refetch } = useQuery({
    queryKey: ['steadfast-overview'],
    queryFn: courierApi.getSteadfastOverview,
  });
  const [tab, setTab] = useCourierTab(overview?.connected, 'dashboard');

  return (
    <CourierPageShell
      name="SteadFast"
      description="Send orders to SteadFast and follow every parcel. Free on every plan."
      tab={tab}
      onTabChange={setTab}
      connected={Boolean(overview?.connected)}
      loading={isLoading}
      error={isError || (!isLoading && !overview)}
      onRetry={() => refetch()}
      connection={
        overview && (
          <ConnectionCard
            connected={overview.connected}
            notConnectedText="Paste your SteadFast API key and secret key in Settings below to start booking."
            details={
              overview.connected
                ? [
                    { label: 'API key', value: overview.apiKeyMasked ?? '—' },
                    { label: 'Last update from SteadFast', value: formatAgo(overview.lastWebhookAt) },
                  ]
                : undefined
            }
            onTest={async () => {
              const { balance, error } = await courierApi.getSteadfastBalance();
              if (balance == null) throw new Error(error ?? 'SteadFast didn’t answer. Check your keys in Settings.');
              return `SteadFast answered. Your balance there is ${formatTaka(balance)}.`;
            }}
          />
        )
      }
    >
      {overview &&
        (tab === 'dashboard' ? (
          <SteadfastDashboardTab onOpenParcels={() => setTab('parcels')} />
        ) : tab === 'parcels' ? (
          <SteadfastParcelsTab />
        ) : (
          <SteadfastSettingsTab overview={overview} />
        ))}
    </CourierPageShell>
  );
}
