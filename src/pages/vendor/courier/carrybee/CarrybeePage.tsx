import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { carrybeeApi, type CarrybeeSettings } from '../../../../lib/carrybeeApi';
import { apiErrorMessage } from '../../../../lib/api';
import { formatDhakaDateTime } from '../../../../lib/dhakaDate';
import { toast } from '../../../../lib/toast';
import { PageHeader } from '../../../../components/ui/PageKit';
import { CarrybeeConnectForm } from '../../../../components/courier/CarrybeeConnectForm';

const card = 'rounded-xl border border-line bg-white p-4';
const select = 'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm';

/**
 * Courier Integration > CarryBee (Add-ons > CarryBee Courier): connect, pickup store, booking defaults and the webhook
 * card. Orders are booked from the Orders list and Order detail like the other couriers; the city and zone are found
 * from the order's address by CarryBee itself.
 */
export default function CarrybeePage() {
  const qc = useQueryClient();
  const { data: o, isLoading } = useQuery({ queryKey: ['carrybee-overview'], queryFn: carrybeeApi.overview });
  const connected = !!o?.connected;
  const { data: stores } = useQuery({ queryKey: ['carrybee-stores'], queryFn: carrybeeApi.stores, enabled: connected, retry: false });
  const { data: settings } = useQuery({ queryKey: ['carrybee-settings'], queryFn: carrybeeApi.settings, enabled: connected });
  const { data: webhook } = useQuery({ queryKey: ['carrybee-webhook'], queryFn: carrybeeApi.webhook, enabled: connected });
  const [draft, setDraft] = useState<Partial<CarrybeeSettings>>({});
  const s = { ...settings, ...draft } as CarrybeeSettings;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['carrybee-overview'] });
    qc.invalidateQueries({ queryKey: ['courier-accounts'] });
  };
  const store = useMutation({
    mutationFn: (id: string) => carrybeeApi.selectStore(id, stores?.find((x) => x.id === id)?.name ?? ''),
    onSuccess: () => {
      toast.success('Pickup store saved.');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the store.')),
  });
  const save = useMutation({
    mutationFn: () => carrybeeApi.saveSettings(draft),
    onSuccess: () => {
      toast.success('Defaults saved.');
      setDraft({});
      qc.invalidateQueries({ queryKey: ['carrybee-settings'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  const regen = useMutation({
    mutationFn: carrybeeApi.regenerateWebhook,
    onSuccess: () => {
      toast.success('New webhook URL and secret made. Paste them into CarryBee again.');
      qc.invalidateQueries({ queryKey: ['carrybee-webhook'] });
    },
  });
  const disconnect = useMutation({
    mutationFn: carrybeeApi.disconnect,
    onSuccess: () => {
      toast.success('CarryBee disconnected.');
      refresh();
    },
  });
  const copy = (text: string) => void navigator.clipboard?.writeText(text).then(() => toast.success('Copied.'));

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader title="CarryBee" description="Book parcels with CarryBee and follow them. City and zone are found from the order’s address." />
      {isLoading ? (
        <p className="text-sm text-regantify-text-muted">Loading…</p>
      ) : !connected ? (
        <div className={card}>
          {o && !o.planAllowed && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Booking with CarryBee needs a paid plan.</p>}
          <CarrybeeConnectForm onConnected={refresh} />
        </div>
      ) : (
        <>
          <div className={`${card} flex flex-wrap items-center gap-3`}>
            <div className="mr-auto text-sm">
              <p className="font-medium text-regantify-text">
                Connected {o?.sandbox ? '(sandbox)' : '(live)'} · Client ID {o?.clientIdMasked}
              </p>
              <p className="text-xs text-regantify-text-muted">{o?.connectedAt ? `Since ${formatDhakaDateTime(o.connectedAt)}` : ''}</p>
            </div>
            <button type="button" onClick={() => disconnect.mutate()} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600">
              Disconnect
            </button>
          </div>

          <div className={card}>
            <h2 className="text-sm font-semibold text-regantify-text">Pickup store</h2>
            <p className="mb-2 text-xs text-regantify-text-muted">Where CarryBee collects your parcels. Add stores in your CarryBee panel; only approved ones can be used.</p>
            <select value={o?.pickupStore?.id ?? ''} onChange={(e) => e.target.value && store.mutate(e.target.value)} className={select}>
              <option value="">Choose a store</option>
              {(stores ?? []).map((x) => (
                <option key={x.id} value={x.id} disabled={!x.approved}>
                  {x.name}
                  {x.approved ? '' : ' (not approved yet)'}
                </option>
              ))}
            </select>
          </div>

          {settings && (
            <div className={`${card} space-y-3`}>
              <h2 className="text-sm font-semibold text-regantify-text">Booking defaults</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs text-regantify-text-muted">
                  Delivery type
                  <select value={s.deliveryType} onChange={(e) => setDraft((d) => ({ ...d, deliveryType: Number(e.target.value) as 1 | 2 }))} className={`${select} mt-1`}>
                    <option value={1}>Normal</option>
                    <option value={2}>Express</option>
                  </select>
                </label>
                <label className="text-xs text-regantify-text-muted">
                  Product type
                  <select value={s.productType} onChange={(e) => setDraft((d) => ({ ...d, productType: Number(e.target.value) as 1 | 2 | 3 }))} className={`${select} mt-1`}>
                    <option value={1}>Parcel</option>
                    <option value={2}>Book</option>
                    <option value={3}>Document</option>
                  </select>
                </label>
                <label className="text-xs text-regantify-text-muted">
                  Default weight (grams)
                  <input
                    type="number"
                    min={50}
                    max={25000}
                    value={s.defaultWeightGrams}
                    onChange={(e) => setDraft((d) => ({ ...d, defaultWeightGrams: Number(e.target.value) }))}
                    className={`${select} mt-1`}
                  />
                </label>
              </div>
              <p className="text-xs text-regantify-text-muted">The weight is used when no product in the order has one. Cash to collect is the order’s due amount.</p>
              <button type="button" disabled={Object.keys(draft).length === 0 || save.isPending} onClick={() => save.mutate()} className="rounded-xl bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                Save
              </button>
            </div>
          )}

          {webhook && (
            <div className={`${card} space-y-2`}>
              <h2 className="text-sm font-semibold text-regantify-text">Webhook (automatic status updates)</h2>
              <p className="text-xs text-regantify-text-muted">Paste this URL and secret into your CarryBee panel’s webhook settings. Without it, statuses are checked every 20 minutes instead.</p>
              {[
                ['URL', webhook.url],
                ['Secret', webhook.secret],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-14 text-xs text-regantify-text-muted">{label}</span>
                  <code className="min-w-0 flex-1 truncate rounded bg-neutral-50 px-2 py-1 text-xs">{value}</code>
                  <button type="button" onClick={() => copy(value)} aria-label={`Copy ${label}`} className="text-regantify-text-muted">
                    <Copy size={14} />
                  </button>
                </div>
              ))}
              {!webhook.reachable && <p className="text-xs text-amber-800">This server isn’t on a public HTTPS address yet, so CarryBee can’t reach it.</p>}
              <p className="text-xs text-regantify-text-muted">{webhook.lastWebhookAt ? `Last update received ${formatDhakaDateTime(webhook.lastWebhookAt)}` : 'No update received yet.'}</p>
              <button type="button" onClick={() => regen.mutate()} className="text-xs font-medium text-red-600">
                Make a new URL and secret
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
