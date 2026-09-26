import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { courierApi, type CourierAccount, type CourierAccountProvider } from '../../../lib/courierApi';
import { CourierSetupModal } from '../../../components/courier/CourierSetupModal';
import { RedxStorePicker } from '../../../components/courier/RedxStorePicker';
import { toast } from '../../../lib/toast';

interface CourierProviderCardProps {
  provider: CourierAccountProvider;
  label: string;
  account: CourierAccount | undefined;
  isLoading: boolean;
  /** Extra copy shown under the connected/not-connected line — e.g. RedX's pickup-store hint. */
  connectedNote?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
  /** Store picker or other follow-up UI, shown below the card once connected — e.g. RedxStorePicker, or Pathao's "Manage" link. */
  children?: ReactNode;
}

/**
 * One courier's card — extracted since SteadFast/Pathao/RedX are
 * otherwise near-identical blocks (connected/not-connected copy +
 * Connect/Disconnect button), differing only in whether they need a
 * follow-up store picker underneath.
 */
function CourierProviderCard({
  label,
  account,
  isLoading,
  connectedNote,
  onConnect,
  onDisconnect,
  disconnecting,
  children,
}: CourierProviderCardProps) {
  return (
    <div className="rounded-xl bg-regantify-search p-4">
      <div className="flex items-start gap-3">
        <Truck size={18} className="text-regantify-text-muted mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-regantify-text">{label}</p>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            {isLoading ? 'Loading…' : account ? (connectedNote ?? 'Connected.') : 'Not connected yet.'}
          </p>
        </div>
        {!isLoading &&
          (account ? (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-black/10 text-regantify-text hover:bg-regantify-content disabled:opacity-60"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-regantify-cta hover:bg-regantify-cta-dark text-white"
            >
              Connect
            </button>
          ))}
      </div>

      {account && children && <div className="mt-4 pt-4 border-t border-black/5">{children}</div>}
    </div>
  );
}

/**
 * Courier Integration — the sidebar section's landing page. Connecting
 * an account here is what lets the Orders page's "Book with {Provider}"
 * action actually call that courier's API. "Connect" opens the SAME
 * CourierSetupModal popup the Orders page's setup-popup flow uses (not
 * an inline expanding form) — one popup component, two entry points.
 *
 * Pathao has since moved to its own full page (Dashboard/Parcels/
 * Settings — see pages/vendor/courier/pathao/ and pathao-plan.md), so
 * its card here is just a summary + link there, same shape this page
 * used to live under Settings with. SteadFast/RedX stay here since
 * they're still a single connect-and-done card (RedX also needs a
 * pickup store, picked inline once connected).
 */
export default function CourierIntegrationPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [connectingProvider, setConnectingProvider] = useState<CourierAccountProvider | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['courier-accounts'],
    queryFn: courierApi.getAccounts,
  });

  const disconnectMutation = useMutation({
    mutationFn: (provider: CourierAccountProvider) => courierApi.disconnect(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success('Courier account disconnected.');
    },
    onError: () => toast.error('Could not disconnect. Please try again.'),
  });

  const steadfastAccount = accounts.find((a) => a.provider === 'STEADFAST' && a.isActive);
  const pathaoAccount = accounts.find((a) => a.provider === 'PATHAO' && a.isActive);
  const redxAccount = accounts.find((a) => a.provider === 'REDX' && a.isActive);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-regantify-black">Courier Integration</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Connect your own courier accounts so the Orders page can book real deliveries.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
        <div className="space-y-3">
          <CourierProviderCard
            provider="STEADFAST"
            label="SteadFast Courier"
            account={steadfastAccount}
            isLoading={isLoading}
            connectedNote="Connected — orders can be booked with SteadFast."
            onConnect={() => setConnectingProvider('STEADFAST')}
            onDisconnect={() => disconnectMutation.mutate('STEADFAST')}
            disconnecting={disconnectMutation.isPending}
          />

          <CourierProviderCard
            provider="PATHAO"
            label="Pathao Courier"
            account={pathaoAccount}
            isLoading={isLoading}
            connectedNote={
              pathaoAccount?.pathaoStoreName
                ? `Connected — booking as "${pathaoAccount.pathaoStoreName}".`
                : 'Connected — select a pickup store on the Pathao page to finish setup.'
            }
            onConnect={() => navigate('/vendor/courier/pathao')}
            onDisconnect={() => disconnectMutation.mutate('PATHAO')}
            disconnecting={disconnectMutation.isPending}
          >
            <Link to="/vendor/courier/pathao" className="text-sm font-medium text-regantify-cta hover:underline">
              Manage Pathao settings →
            </Link>
          </CourierProviderCard>

          <CourierProviderCard
            provider="REDX"
            label="RedX Courier"
            account={redxAccount}
            isLoading={isLoading}
            connectedNote={
              redxAccount?.redxStoreName
                ? `Connected — booking as "${redxAccount.redxStoreName}".`
                : 'Connected — select a pickup store below to finish setup.'
            }
            onConnect={() => setConnectingProvider('REDX')}
            onDisconnect={() => disconnectMutation.mutate('REDX')}
            disconnecting={disconnectMutation.isPending}
          >
            {redxAccount && <RedxStorePicker currentStoreId={redxAccount.redxStoreId} />}
          </CourierProviderCard>
        </div>

        <CourierSetupModal
          provider={connectingProvider}
          onOpenChange={(open) => !open && setConnectingProvider(null)}
          onConnected={() => setConnectingProvider(null)}
        />
      </div>
    </div>
  );
}
