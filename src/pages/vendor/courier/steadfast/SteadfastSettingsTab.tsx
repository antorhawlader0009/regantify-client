import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { courierApi, type SteadfastAutoBookSettings, type SteadfastOverview, type SteadfastSettings } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { formatDhakaDate } from '../../../../lib/dhakaDate';
import { SteadfastConnectForm } from '../../../../components/courier/SteadfastConnectForm';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { Field, productInputClass } from '../../../../components/product/ProductFormPieces';
import { CardSkeleton, CheckRow, CourierCard, SaveRow, dangerOutlineBtn, formOutlineBtn, saveBtn } from '../../../../components/courier/CourierKit';
import { AutoBookCard, StatusMapCard, WebhookSettingsCard, useSavedFlash } from '../../../../components/courier/CourierSettingsCards';

const STEADFAST_PANEL_URL = 'https://steadfast.com.bd/login';

/** Your SteadFast account — connect form when not connected; key summary + change/disconnect when connected. */
function AccountCard({ overview }: { overview: SteadfastOverview }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const disconnectMutation = useMutation({
    mutationFn: () => courierApi.disconnect('STEADFAST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steadfast-overview'] });
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      setConfirmDisconnect(false);
      toast.success('SteadFast disconnected');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t disconnect. Try again in a minute.')),
  });

  const form = (
    <SteadfastConnectForm
      onConnected={() => setEditing(false)}
      footer={(submitting) => (
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" disabled={submitting} className={saveBtn}>
            {submitting ? 'Checking with SteadFast…' : overview.connected ? 'Save keys' : 'Connect SteadFast'}
          </button>
          {overview.connected && (
            <button type="button" onClick={() => setEditing(false)} className={formOutlineBtn}>
              Cancel
            </button>
          )}
        </div>
      )}
    />
  );

  if (!overview.connected) {
    return (
      <CourierCard
        title="Connect your SteadFast account"
        description="Use your own SteadFast merchant account. We check the keys with SteadFast before saving. Free on every plan."
      >
        <div className="max-w-md">{form}</div>
      </CourierCard>
    );
  }

  return (
    <CourierCard title="Your SteadFast account">
      {editing ? (
        <div className="max-w-md">{form}</div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <dl className="flex-1 space-y-1.5 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-neutral-500">API key:</dt>
              <dd className="text-regantify-text">{overview.apiKeyMasked ?? '—'}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-neutral-500">Last changed:</dt>
              <dd className="text-regantify-text">{formatDhakaDate(overview.updatedAt)}</dd>
            </div>
          </dl>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => setEditing(true)} className={formOutlineBtn}>
              Change keys
            </button>
            <button type="button" onClick={() => setConfirmDisconnect(true)} className={dangerOutlineBtn}>
              Disconnect
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Disconnect SteadFast?"
        message="You won’t be able to send orders to SteadFast until you connect again. Parcels already sent keep their tracking."
        confirmLabel="Disconnect"
        onConfirm={() => disconnectMutation.mutate()}
        busy={disconnectMutation.isPending}
        danger
      />
    </CourierCard>
  );
}

/** Booking defaults — what every booking sends to SteadFast. Only sent to the server on Save. */
function BookingDefaultsCard() {
  const queryClient = useQueryClient();
  const [saved, flashSaved] = useSavedFlash();
  const { data: settings, isLoading } = useQuery({ queryKey: ['steadfast-settings'], queryFn: courierApi.getSteadfastSettings });

  const [form, setForm] = useState<SteadfastSettings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (patch: Partial<SteadfastSettings>) => courierApi.updateSteadfastSettings(patch),
    onSuccess: (result) => {
      setForm(result);
      queryClient.setQueryData(['steadfast-settings'], result);
      flashSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save. Check your connection and try again.')),
  });

  if (isLoading || !form) return <CardSkeleton title="Booking defaults" />;

  function update<K extends keyof SteadfastSettings>(key: K, value: SteadfastSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <CourierCard title="Booking defaults" description="Used for every parcel you send to SteadFast, one at a time or many at once.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // statusMap / autoBook belong to their own cards — sending this
          // form's (possibly older) copy would undo that card's save.
          const { statusMap: _statusMap, autoBook: _autoBook, ...defaults } = form;
          mutation.mutate(defaults);
        }}
      >
        <div className="max-w-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Order status after booking">
              <select
                value={form.defaultBookingStatus}
                onChange={(e) => update('defaultBookingStatus', e.target.value as SteadfastSettings['defaultBookingStatus'])}
                className={productInputClass}
              >
                <option value="SHIPPING">Move to Shipping</option>
                <option value="NO_CHANGE">Don’t change it</option>
              </select>
            </Field>
            <Field label="Delivery type">
              <select
                value={form.deliveryType}
                onChange={(e) => update('deliveryType', Number(e.target.value) as SteadfastSettings['deliveryType'])}
                className={productInputClass}
              >
                <option value={0}>Home delivery</option>
                <option value={1}>Point delivery (customer collects from the hub)</option>
              </select>
            </Field>
          </div>

          <Field label="Item description" hint="{products} becomes a list like “T-shirt x2, Cap x1”.">
            <input value={form.itemDescriptionTemplate} onChange={(e) => update('itemDescriptionTemplate', e.target.value)} maxLength={200} className={productInputClass} />
          </Field>
          <Field label="Note for the rider" hint="Sent with every parcel.">
            <input value={form.note} onChange={(e) => update('note', e.target.value)} maxLength={300} placeholder="e.g. Call before delivery" className={productInputClass} />
          </Field>

          <div>
            <CheckRow checked={form.sendCustomerNoteAsNote} onChange={(v) => update('sendCustomerNoteAsNote', v)} label="Also send the customer’s own order note" />
            <CheckRow checked={form.sendStaffNoteAsNote} onChange={(v) => update('sendStaffNoteAsNote', v)} label="Also send the order’s staff note" />
            <CheckRow
              checked={form.sendCustomerEmail}
              onChange={(v) => update('sendCustomerEmail', v)}
              label="Send the customer’s email to SteadFast"
              hint="Only when the order has one."
            />
            <CheckRow
              checked={form.notifyCustomerOnBooking}
              onChange={(v) => update('notifyCustomerOnBooking', v)}
              label="Text the customer their tracking code after booking"
              hint="Uses 1 SMS credit per order. Skipped when you have no SMS credits left."
            />
          </div>

          <p className="text-xs text-neutral-500">
            SteadFast collects the order total on cash-on-delivery orders and nothing on orders already paid online. It works out weight and area
            itself.
          </p>
        </div>

        <SaveRow saved={saved}>
          <button type="submit" disabled={mutation.isPending} className={saveBtn}>
            {mutation.isPending ? 'Saving…' : 'Save defaults'}
          </button>
        </SaveRow>
      </form>
    </CourierCard>
  );
}

/** Customer delivery check — SteadFast's fraud check under each phone on the Orders page. */
function DeliveryCheckCard({ overview }: { overview: SteadfastOverview }) {
  return (
    <CourierCard
      title="Customer delivery check"
      description="Each customer’s record with SteadFast (delivered and cancelled across all SteadFast sellers, plus fraud reports) shows under their phone number on the Orders page, so risky cash-on-delivery customers stand out before you ship."
    >
      {overview.connected ? (
        <p className="flex items-start gap-2 text-sm text-emerald-700">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden /> On. Each number is checked once, then again only when the record is over a
          month old and a new order comes in.
        </p>
      ) : (
        <p className="text-sm text-neutral-500">Connect your SteadFast account above to turn it on.</p>
      )}
    </CourierCard>
  );
}

export function SteadfastSettingsTab({ overview }: { overview: SteadfastOverview }) {
  return (
    <div className="space-y-4">
      <AccountCard overview={overview} />
      {overview.connected && (
        <>
          <BookingDefaultsCard />
          <AutoBookCard<SteadfastAutoBookSettings>
            courier="SteadFast"
            settingsKey="steadfast-settings"
            getSettings={courierApi.getSteadfastSettings}
            save={(autoBook) => courierApi.updateSteadfastSettings({ autoBook })}
          />
          <StatusMapCard
            courier="SteadFast"
            settingsKey="steadfast-settings"
            getSettings={courierApi.getSteadfastSettings}
            statusesKey="steadfast-statuses"
            getStatuses={courierApi.getSteadfastStatuses}
            save={(statusMap) => courierApi.updateSteadfastSettings({ statusMap })}
            rowNote={(row) =>
              row.key.endsWith('_approval_pending') ? <p className="text-xs text-neutral-500">The rider’s word only. SteadFast hasn’t confirmed it yet.</p> : null
            }
            extraNote="A return step set to “Don’t change” follows what its main status (e.g. Cancelled) is set to."
          />
          <WebhookSettingsCard
            courier="SteadFast"
            queryKey="steadfast-webhook"
            fetch={courierApi.getSteadfastWebhook}
            regenerate={courierApi.regenerateSteadfastWebhook}
            renewWhat="token"
            fields={(w) => [
              { label: 'Webhook URL (callback URL)', value: w.url },
              { label: 'Auth token (Bearer)', value: w.secret, secret: true },
            ]}
            steps={
              <>
                <li>
                  Open your{' '}
                  <a href={STEADFAST_PANEL_URL} target="_blank" rel="noreferrer" className="text-regantify-text underline">
                    SteadFast merchant panel
                  </a>{' '}
                  and go to More, then API guide, then Webhooks.
                </li>
                <li>Paste the webhook URL as the callback URL and the auth token as its Bearer token.</li>
                <li>Save. “Last update from SteadFast” below fills in when SteadFast sends its first update.</li>
              </>
            }
          />
        </>
      )}
      <DeliveryCheckCard overview={overview} />
    </div>
  );
}
