import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus } from 'lucide-react';
import { courierApi, type RedxAutoBookSettings, type RedxOverview, type RedxSettings } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { formatDhakaDate } from '../../../../lib/dhakaDate';
import { RedxConnectForm } from '../../../../components/courier/RedxConnectForm';
import { RedxStorePicker } from '../../../../components/courier/RedxStorePicker';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { Field, productInputClass } from '../../../../components/product/ProductFormPieces';
import { CardSkeleton, CheckRow, CourierCard, PlanLockedCard, SaveRow, dangerOutlineBtn, formOutlineBtn, saveBtn } from '../../../../components/courier/CourierKit';
import { AutoBookCard, StatusMapCard, WebhookSettingsCard, useSavedFlash } from '../../../../components/courier/CourierSettingsCards';
import { CreateRedxStoreDialog } from './CreateRedxStoreDialog';

const REDX_PANEL_URL = 'https://redx.com.bd/developer-api/';

/** Your RedX account — connect form when not connected; token summary + change/disconnect when connected. */
function AccountCard({ overview }: { overview: RedxOverview }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const disconnectMutation = useMutation({
    mutationFn: () => courierApi.disconnect('REDX'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redx-overview'] });
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      setConfirmDisconnect(false);
      toast.success('RedX disconnected');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t disconnect. Try again in a minute.')),
  });

  const form = (
    <RedxConnectForm
      onConnected={() => setEditing(false)}
      footer={(submitting) => (
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" disabled={submitting} className={saveBtn}>
            {submitting ? 'Checking with RedX…' : overview.connected ? 'Save token' : 'Connect RedX'}
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
      <CourierCard title="Connect your RedX account" description="Use your own RedX merchant account. We check the token with RedX before saving.">
        <div className="max-w-md">{form}</div>
      </CourierCard>
    );
  }

  return (
    <CourierCard title="Your RedX account">
      {editing ? (
        <div className="max-w-md">{form}</div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <dl className="flex-1 space-y-1.5 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-neutral-500">Access token:</dt>
              <dd className="text-regantify-text">{overview.tokenMasked ?? '—'}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-neutral-500">Last changed:</dt>
              <dd className="text-regantify-text">{formatDhakaDate(overview.updatedAt)}</dd>
            </div>
          </dl>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => setEditing(true)} className={formOutlineBtn}>
              Change token
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
        title="Disconnect RedX?"
        message="You won’t be able to send orders to RedX until you connect again. Parcels already sent keep their tracking."
        confirmLabel="Disconnect"
        onConfirm={() => disconnectMutation.mutate()}
        busy={disconnectMutation.isPending}
        danger
      />
    </CourierCard>
  );
}

/** Pickup store — where RedX collects every parcel from. Pick one of the account's stores, or add a new one. */
function PickupStoreCard({ overview }: { overview: Extract<RedxOverview, { connected: true }> }) {
  const [creating, setCreating] = useState(false);
  return (
    <CourierCard title="Pickup store" description="RedX’s rider collects every parcel from this store.">
      <div className="max-w-md space-y-3">
        {!overview.pickupStore && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden /> Choose a pickup store. RedX needs one before you can book.
          </p>
        )}
        <RedxStorePicker currentStoreId={overview.pickupStore?.id ?? null} />
        <button type="button" onClick={() => setCreating(true)} className={formOutlineBtn}>
          <Plus size={15} aria-hidden /> New pickup store
        </button>
      </div>
      <CreateRedxStoreDialog open={creating} onClose={() => setCreating(false)} />
    </CourierCard>
  );
}

/** Booking defaults — what every booking sends to RedX. Only sent to the server on Save. */
function BookingDefaultsCard() {
  const queryClient = useQueryClient();
  const [saved, flashSaved] = useSavedFlash();
  const { data: settings, isLoading } = useQuery({ queryKey: ['redx-settings'], queryFn: courierApi.getRedxSettings });

  const [form, setForm] = useState<RedxSettings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (patch: Partial<RedxSettings>) => courierApi.updateRedxSettings(patch),
    onSuccess: (result) => {
      setForm(result);
      queryClient.setQueryData(['redx-settings'], result);
      flashSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save. Check your connection and try again.')),
  });

  if (isLoading || !form) return <CardSkeleton title="Booking defaults" />;

  function update<K extends keyof RedxSettings>(key: K, value: RedxSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }
  const categoryMissing = !form.itemCategory.trim();

  return (
    <CourierCard title="Booking defaults" description="Used for every parcel you send to RedX, one at a time or many at once.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (categoryMissing) return;
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
                onChange={(e) => update('defaultBookingStatus', e.target.value as RedxSettings['defaultBookingStatus'])}
                className={productInputClass}
              >
                <option value="SHIPPING">Move to Shipping</option>
                <option value="NO_CHANGE">Don’t change it</option>
              </select>
            </Field>
            <Field label="Declared value" hint="What RedX pays back if the parcel is lost or damaged.">
              <select
                value={form.declaredValue}
                onChange={(e) => update('declaredValue', e.target.value as RedxSettings['declaredValue'])}
                className={productInputClass}
              >
                <option value="SUBTOTAL">The products’ price (order subtotal)</option>
                <option value="ZERO">Don’t declare a value</option>
              </select>
            </Field>
            <Field label="Weight per item when a product has none (grams)">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={50000}
                value={form.defaultWeightGrams}
                onChange={(e) => update('defaultWeightGrams', Math.max(1, Math.round(Number(e.target.value) || 0)))}
                className={productInputClass}
              />
            </Field>
            <Field label="Item category" hint="RedX asks for one on every item." error={categoryMissing ? 'Type a category, e.g. Clothing.' : null}>
              <input value={form.itemCategory} onChange={(e) => update('itemCategory', e.target.value)} maxLength={60} className={productInputClass} />
            </Field>
          </div>

          <Field label="Note for the rider" hint="Sent with every parcel.">
            <input
              value={form.instruction}
              onChange={(e) => update('instruction', e.target.value)}
              maxLength={300}
              placeholder="e.g. Call before delivery"
              className={productInputClass}
            />
          </Field>

          <div>
            <CheckRow
              checked={form.autoDetectArea}
              onChange={(v) => update('autoDetectArea', v)}
              label="Find the delivery area from the address"
              hint="When an order has no RedX area, we match one from its zip code and address. If we’re not sure, booking stops and asks you to pick it."
            />
            <CheckRow checked={form.useProductWeight} onChange={(v) => update('useProductWeight', v)} label="Use each product’s own weight when it has one" />
            <CheckRow checked={form.sendItemDetails} onChange={(v) => update('sendItemDetails', v)} label="Send the item list (name and price of each product)" />
            <CheckRow checked={form.closedBox} onChange={(v) => update('closedBox', v)} label="Closed box" hint="The customer can’t open the parcel before paying." />
            <CheckRow checked={form.sendCustomerNoteAsInstruction} onChange={(v) => update('sendCustomerNoteAsInstruction', v)} label="Also send the customer’s own order note" />
            <CheckRow checked={form.sendStaffNoteAsInstruction} onChange={(v) => update('sendStaffNoteAsInstruction', v)} label="Also send the order’s staff note" />
            <CheckRow
              checked={form.notifyCustomerOnBooking}
              onChange={(v) => update('notifyCustomerOnBooking', v)}
              label="Text the customer their tracking ID after booking"
              hint="Uses 1 SMS credit per order. Skipped when you have no SMS credits left."
            />
          </div>

          <p className="text-xs text-neutral-500">RedX collects the order total on cash-on-delivery orders and nothing on orders already paid online.</p>
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

export function RedxSettingsTab({ overview }: { overview: RedxOverview }) {
  if (!overview.planAllowed && !overview.connected) {
    return <PlanLockedCard title="RedX needs a paid plan" message="Upgrade to connect RedX and send parcels with it. SteadFast is free on every plan." />;
  }
  return (
    <div className="space-y-4">
      <AccountCard overview={overview} />
      {!overview.planAllowed ? (
        <PlanLockedCard
          title="Your plan no longer includes RedX"
          message="Upgrade to send parcels with RedX again. Parcels already sent keep updating."
        />
      ) : (
        overview.connected && (
          <>
            <PickupStoreCard overview={overview} />
            <BookingDefaultsCard />
            <AutoBookCard<RedxAutoBookSettings>
              courier="RedX"
              settingsKey="redx-settings"
              getSettings={courierApi.getRedxSettings}
              save={(autoBook) => courierApi.updateRedxSettings({ autoBook })}
              extraOptions={[
                {
                  key: 'requireArea',
                  label: 'Only orders whose RedX delivery area is set',
                  hint: 'Off: also book with the area found from the address.',
                },
              ]}
            />
            <StatusMapCard
              courier="RedX"
              settingsKey="redx-settings"
              getSettings={courierApi.getRedxSettings}
              statusesKey="redx-statuses"
              getStatuses={courierApi.getRedxStatuses}
              save={(statusMap) => courierApi.updateRedxSettings({ statusMap })}
              rowNote={(row) => (
                <>
                  {row.paid && <p className="text-xs text-neutral-500">Also marks the parcel’s COD as paid to you.</p>}
                  {row.cancelsBooking && <p className="text-xs text-neutral-500">Cancels the booking, so you can send the order again.</p>}
                </>
              )}
              extraNote="“COD paid by RedX” set to “Don’t change” still completes an order the way “Delivered” is set to, in case the delivered update was missed."
            />
            <WebhookSettingsCard
              courier="RedX"
              queryKey="redx-webhook"
              fetch={courierApi.getRedxWebhook}
              regenerate={courierApi.regenerateRedxWebhook}
              renewWhat="URL"
              fields={(w) => [{ label: 'Callback URL', value: w.url, secret: true }]}
              note={<p className="text-xs text-neutral-500">The URL has its own secret token in it, so keep it private.</p>}
              steps={
                <>
                  <li>
                    Open your{' '}
                    <a href={REDX_PANEL_URL} target="_blank" rel="noreferrer" className="text-regantify-text underline">
                      RedX merchant panel
                    </a>{' '}
                    and go to Developer APIs, then Webhook.
                  </li>
                  <li>Paste the whole callback URL into “Enter your callback URL” and click Save Link.</li>
                  <li>“Last update from RedX” below fills in when RedX sends its first update.</li>
                </>
              }
            />
          </>
        )
      )}
    </div>
  );
}
