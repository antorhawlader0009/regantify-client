import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, MoreVertical, Truck } from 'lucide-react';
import { courierApi, type CourierAccount, type CourierAccountProvider } from '../../../lib/courierApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { PageHeader, iconBtn, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';

interface CourierInfo {
  provider: CourierAccountProvider;
  name: string;
  path: string;
  /** Who can use it, in a seller's words. */
  plan: string;
  /** What you get, one line. */
  pitch: string;
  /** Booking needs a pickup store chosen after connecting. */
  storeName?: (account: CourierAccount) => string | null;
}

const COURIERS: CourierInfo[] = [
  {
    provider: 'STEADFAST',
    name: 'SteadFast',
    path: '/vendor/courier/steadfast',
    plan: 'Free on every plan',
    pitch: 'Book parcels, follow them and see payouts. Also checks a customer’s delivery record.',
  },
  {
    provider: 'PATHAO',
    name: 'Pathao',
    path: '/vendor/courier/pathao',
    plan: 'Connect free, booking on paid plans',
    pitch: 'Book parcels, print labels and follow them. Also checks a customer’s delivery record.',
    storeName: (a) => a.pathaoStoreName,
  },
  {
    provider: 'REDX',
    name: 'RedX',
    path: '/vendor/courier/redx',
    plan: 'Paid plans',
    pitch: 'Book parcels and follow them, with delivery charge quotes before you send.',
    storeName: (a) => a.redxStoreName,
  },
];

function CourierCard({
  info,
  account,
  loading,
  onDisconnect,
}: {
  info: CourierInfo;
  account: CourierAccount | undefined;
  loading: boolean;
  onDisconnect: () => void;
}) {
  const store = account && info.storeName ? info.storeName(account) : null;
  const needsStore = Boolean(account && info.storeName && !store);

  return (
    <li className="flex flex-col rounded-xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600" aria-hidden>
          <Truck size={18} />
        </span>
        <div className="mr-auto min-w-0">
          <h2 className="text-[15px] font-semibold text-regantify-text">{info.name}</h2>
          <p className="text-xs text-neutral-500">{info.plan}</p>
        </div>
        {loading ? (
          <span className="h-5 w-20 animate-pulse rounded bg-neutral-100" />
        ) : account ? (
          <span className="inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Connected
          </span>
        ) : (
          <span className="rounded border border-line bg-neutral-50 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">Not connected</span>
        )}
      </div>

      <p className="mt-3 text-sm text-neutral-600">{info.pitch}</p>
      {account && store && <p className="mt-2 text-xs text-neutral-500">Pickup store: {store}</p>}
      {needsStore && <p className="mt-2 text-xs text-amber-700">Choose a pickup store to start booking.</p>}

      <div className="mt-auto flex items-center gap-2 pt-4">
        {account ? (
          <>
            <Link to={info.path} className={`${outlineBtn} h-10 flex-1`}>
              {needsStore ? 'Finish setup' : `Open ${info.name}`}
              <ChevronRight size={15} aria-hidden />
            </Link>
            <DropdownMenu
              trigger={
                <button aria-label={`More for ${info.name}`} className={`${iconBtn} h-10 w-10`}>
                  <MoreVertical size={15} />
                </button>
              }
            >
              <DropdownMenuItem onSelect={onDisconnect} danger>
                Disconnect {info.name}
              </DropdownMenuItem>
            </DropdownMenu>
          </>
        ) : (
          <Link to={`${info.path}?tab=settings`} className={`${primaryBtn} h-10 flex-1`} aria-disabled={loading}>
            Connect {info.name}
          </Link>
        )}
      </div>
    </li>
  );
}

/**
 * Courier Integration — the sidebar section's landing page: one card per
 * courier saying whether it's connected, who can use it and the one
 * button that matters (Connect, or Open). Each courier has its own page
 * (connection card + Dashboard / Parcels / Settings, see
 * pages/vendor/courier/{steadfast,pathao,redx}/); the Orders page's "not
 * connected" popup (CourierSetupModal) is the other way in.
 */
export default function CourierIntegrationPage() {
  const queryClient = useQueryClient();
  const [disconnecting, setDisconnecting] = useState<CourierInfo | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['courier-accounts'],
    queryFn: courierApi.getAccounts,
  });

  const disconnectMutation = useMutation({
    mutationFn: (provider: CourierAccountProvider) => courierApi.disconnect(provider),
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      queryClient.invalidateQueries({ queryKey: [`${provider.toLowerCase()}-overview`] });
      toast.success(`${COURIERS.find((c) => c.provider === provider)?.name ?? 'Courier'} disconnected`);
      setDisconnecting(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t disconnect. Try again in a minute.')),
  });

  const connectedCount = COURIERS.filter((c) => accounts.some((a) => a.provider === c.provider && a.isActive)).length;

  return (
    <div>
      <PageHeader
        className="mb-4"
        title="Courier integration"
        description={
          isLoading
            ? 'Connect your own courier accounts to send orders from the Orders page.'
            : connectedCount === 0
              ? 'Connect your own courier account to send orders from the Orders page. SteadFast is free on every plan.'
              : `${connectedCount} of ${COURIERS.length} couriers connected. Send orders from the Orders page.`
        }
      />

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {COURIERS.map((info) => (
          <CourierCard
            key={info.provider}
            info={info}
            account={accounts.find((a) => a.provider === info.provider && a.isActive)}
            loading={isLoading}
            onDisconnect={() => setDisconnecting(info)}
          />
        ))}
      </ul>

      <ConfirmDialog
        open={disconnecting != null}
        onOpenChange={(open) => !open && setDisconnecting(null)}
        title={disconnecting ? `Disconnect ${disconnecting.name}?` : ''}
        message={
          disconnecting &&
          `You won’t be able to send orders to ${disconnecting.name} until you connect again. Parcels already sent keep their tracking.`
        }
        confirmLabel="Disconnect"
        onConfirm={() => disconnecting && disconnectMutation.mutate(disconnecting.provider)}
        busy={disconnectMutation.isPending}
        danger
      />
    </div>
  );
}
