import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { carrybeeApi, type CarrybeeAutoBook, type CarrybeeOverview, type CarrybeeSettings } from '../../../../lib/carrybeeApi';
import { apiErrorMessage } from '../../../../lib/api';
import { formatDhakaDateTime } from '../../../../lib/dhakaDate';
import { toast } from '../../../../lib/toast';
import { CarrybeeConnectForm } from '../../../../components/courier/CarrybeeConnectForm';
import { CheckRow } from '../../../../components/courier/CourierKit';

const card = 'rounded-xl border border-line bg-white p-4';
const select = 'h-10 w-full rounded-xl border border-line bg-white px-3 text-sm';

/**
 * Courier Integration > CarryBee > Settings: connect, pickup store, booking defaults, automatic booking and the webhook
 * card. Each card saves on its own (auto-booking only sends `autoBook`, the defaults card only its three fields).
 */
export function CarrybeeSettingsTab({ overview: o }: { overview: CarrybeeOverview }) {
  const qc = useQueryClient();
  const connected = !!o.connected;
  const { data: stores } = useQuery({ queryKey: ['carrybee-stores'], queryFn: carrybeeApi.stores, enabled: connected, retry: false });
  const { data: settings } = useQuery({ queryKey: ['carrybee-settings'], queryFn: carrybeeApi.settings, enabled: connected });
  const { data: webhook } = useQuery({ queryKey: ['carrybee-webhook'], queryFn: carrybeeApi.webhook, enabled: connected });
  const [draft, setDraft] = useState<Partial<Omit<CarrybeeSettings, 'autoBook'>>>({});
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
  const saveAuto = useMutation({
    mutationFn: (autoBook: Partial<CarrybeeAutoBook>) => carrybeeApi.saveSettings({ autoBook }),
    onSuccess: (next) => {
      qc.setQueryData(['carrybee-settings'], next);
      toast.success(next.autoBook.enabled ? 'Automatic booking is on.' : 'Automatic booking saved.');
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

  if (!connected) {
    return (
      <div className={`${card} max-w-3xl`}>
        {!o.planAllowed && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Booking with CarryBee needs a paid plan.</p>}
        <CarrybeeConnectForm onConnected={refresh} />
      </div>
    );
  }

  const auto = settings?.autoBook;

  return (
    <div className="max-w-3xl space-y-4">
      <div className={card}>
        <h2 className="text-sm font-semibold text-regantify-text">Pickup store</h2>
        <p className="mb-2 text-xs text-regantify-text-muted">Where CarryBee collects your parcels. Add stores in your CarryBee panel; only approved ones can be used.</p>
        <select value={o.pickupStore?.id ?? ''} onChange={(e) => e.target.value && store.mutate(e.target.value)} className={select}>
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
          <p className="text-xs text-regantify-text-muted">
            The weight is used when no product in the order has one. Cash to collect is the order’s due amount. City and zone are matched from the
            order’s district and thana, else found by CarryBee from the address; when neither works you pick them when booking.
          </p>
          <button
            type="button"
            disabled={Object.keys(draft).length === 0 || save.isPending}
            onClick={() => save.mutate()}
            className="rounded-xl bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      {auto && (
        <div className={`${card} space-y-3`}>
          <div>
            <h2 className="text-sm font-semibold text-regantify-text">Automatic booking</h2>
            <p className="text-xs text-regantify-text-muted">Books an order with CarryBee as soon as it moves to Processing, with the defaults above.</p>
          </div>
          <CheckRow
            strong
            checked={auto.enabled}
            onChange={(v) => saveAuto.mutate({ enabled: v })}
            label="Book automatically when an order moves to Processing"
            hint={!o.pickupStore ? 'Choose a pickup store first, or nothing will be booked.' : undefined}
          />
          {auto.enabled && (
            <div className="space-y-2 border-t border-line pt-3">
              <CheckRow
                checked={auto.assignUnassigned}
                onChange={(v) => saveAuto.mutate({ assignUnassigned: v })}
                label="Also orders with no courier chosen"
                hint={
                  <>
                    A{' '}
                    <Link to="/vendor/courier/rules" className="underline">
                      courier rule
                    </Link>{' '}
                    naming another courier for the order’s area still keeps CarryBee off it.
                  </>
                }
              />
              <CheckRow
                checked={auto.includeManualOrders}
                onChange={(v) => saveAuto.mutate({ includeManualOrders: v })}
                label="Also orders you entered yourself (Add Order)"
              />
              <p className="text-xs text-regantify-text-muted">
                Never booked automatically: counter sales, express and store pickup orders, orders waiting for the customer’s delivery day or COD
                code, and mobile payments you haven’t checked. A booking that fails shows on the Dashboard under “Needs attention”.
              </p>
            </div>
          )}
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

      <div className={`${card} flex flex-wrap items-center gap-3`}>
        <p className="mr-auto text-sm text-regantify-text-muted">
          Connected {o.sandbox ? '(sandbox)' : '(live)'}
          {o.connectedAt ? ` since ${formatDhakaDateTime(o.connectedAt)}` : ''}
        </p>
        <button type="button" onClick={() => disconnect.mutate()} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600">
          Disconnect
        </button>
      </div>
    </div>
  );
}
