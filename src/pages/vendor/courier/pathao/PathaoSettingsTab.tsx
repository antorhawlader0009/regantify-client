import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Plus, Store } from 'lucide-react';
import { courierApi, type PathaoAutoBookSettings, type PathaoOverview, type PathaoSettings } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { formatDhakaDate } from '../../../../lib/dhakaDate';
import { PathaoConnectForm } from '../../../../components/courier/PathaoConnectForm';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { Field, productInputClass } from '../../../../components/product/ProductFormPieces';
import { CardSkeleton, CheckRow, CourierCard, PlanLockedCard, SaveRow, dangerOutlineBtn, formOutlineBtn, saveBtn } from '../../../../components/courier/CourierKit';
import { AutoBookCard, StatusMapCard, WebhookSettingsCard, useSavedFlash } from '../../../../components/courier/CourierSettingsCards';
import { CreatePathaoStoreDialog } from './CreatePathaoStoreDialog';

type ConnectedOverview = Extract<PathaoOverview, { connected: true }>;

/** Your Pathao account — connect form when not connected; keys summary + change/disconnect when connected. */
function AccountCard({ overview }: { overview: PathaoOverview }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pathao-overview'] });
    queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['pathao-store-list'] });
  };

  const disconnectMutation = useMutation({
    mutationFn: () => courierApi.disconnect('PATHAO'),
    onSuccess: () => {
      invalidate();
      setConfirmDisconnect(false);
      toast.success('Pathao disconnected');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t disconnect. Try again in a minute.')),
  });

  const form = (
    <PathaoConnectForm
      onConnected={() => {
        setEditing(false);
        invalidate();
      }}
      footer={(submitting) => (
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" disabled={submitting} className={saveBtn}>
            {submitting ? 'Checking with Pathao…' : overview.connected ? 'Save keys' : 'Connect Pathao'}
          </button>
          {overview.connected && !overview.needsReconnect && (
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
      <CourierCard title="Connect your Pathao account" description="Use your own Pathao merchant account. We check the keys with Pathao before saving.">
        <div className="max-w-md">{form}</div>
      </CourierCard>
    );
  }

  return (
    <CourierCard title="Your Pathao account">
      {overview.needsReconnect && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            This connection uses an old sign-in. Enter your Pathao <b>Client ID</b> and <b>Client Secret</b> below so booking keeps working.
          </p>
        </div>
      )}

      {editing || overview.needsReconnect ? (
        <div className="max-w-md">{form}</div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <dl className="flex-1 space-y-1.5 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-neutral-500">Account:</dt>
              <dd className="text-regantify-text">{overview.merchantName ?? 'Connected'}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-neutral-500">Client ID:</dt>
              <dd className="text-regantify-text">{overview.clientIdMasked ?? '—'}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-neutral-500">Email and password:</dt>
              <dd className="text-regantify-text">{overview.hasBackupLogin ? 'Added' : 'Not added'}</dd>
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
        title="Disconnect Pathao?"
        message="You won’t be able to send orders to Pathao until you connect again. Parcels already sent keep their tracking."
        confirmLabel="Disconnect"
        onConfirm={() => disconnectMutation.mutate()}
        busy={disconnectMutation.isPending}
        danger
      />
    </CourierCard>
  );
}

/** Pickup store — which Pathao store parcels are picked up from, plus making a new one. */
function PickupStoreCard({ overview }: { overview: ConnectedOverview }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: stores, isLoading, isError, refetch } = useQuery({
    queryKey: ['pathao-store-list'],
    queryFn: courierApi.getPathaoStoreList,
  });

  const selectMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => courierApi.selectPathaoStore(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pathao-overview'] });
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success('Pickup store saved');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save your pickup store. Try again in a minute.')),
  });

  const selectedId = overview.pickupStore?.id ?? null;
  const selected = stores?.find((s) => s.id === selectedId);

  if (isLoading) return <CardSkeleton title="Pickup store" />;

  return (
    <CourierCard title="Pickup store" description="Pathao’s rider collects every parcel from this store.">
      {isError || !stores ? (
        <p className="text-sm text-red-600">
          Pathao didn’t send your stores just now.{' '}
          <button type="button" onClick={() => refetch()} className="underline">
            Try again
          </button>
        </p>
      ) : (
        <div className="max-w-md space-y-3">
          {stores.length === 0 ? (
            <p className="text-sm text-neutral-500">No stores on your Pathao account yet. Make one below.</p>
          ) : (
            <select
              value={selectedId ?? ''}
              disabled={selectMutation.isPending}
              aria-label="Pickup store"
              onChange={(e) => {
                const store = stores.find((s) => s.id === Number(e.target.value));
                if (store) selectMutation.mutate({ id: store.id, name: store.name });
              }}
              className={productInputClass}
            >
              <option value="" disabled>
                Choose a pickup store
              </option>
              {stores.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.isActive}>
                  {s.name}
                  {s.isDefault ? ' (default)' : ''}
                  {!s.isActive ? ' (waiting for Pathao’s approval)' : ''}
                </option>
              ))}
            </select>
          )}

          {selected ? (
            <div className="flex items-start gap-2 rounded-lg border border-line bg-neutral-50 p-3 text-sm">
              <Store size={16} className="mt-0.5 shrink-0 text-neutral-500" aria-hidden />
              <div>
                <p className="font-medium text-regantify-text">{selected.name}</p>
                {selected.address && <p className="text-neutral-500">{selected.address}</p>}
              </div>
            </div>
          ) : (
            selectedId == null && stores.length > 0 && <p className="text-sm text-amber-700">Choose a pickup store. Pathao needs one before you can book.</p>
          )}

          <button type="button" onClick={() => setCreating(true)} className={formOutlineBtn}>
            <Plus size={15} aria-hidden /> New Pathao store
          </button>
        </div>
      )}

      <CreatePathaoStoreDialog open={creating} onOpenChange={setCreating} />
    </CourierCard>
  );
}

/**
 * Booking defaults — pathao-plan.md Step 3's vendor-editable defaults
 * (after-booking status, delivery type, weight fallback, description
 * template, instructions). Local form state is seeded from the loaded
 * settings and only sent to the server on Save.
 */
function BookingDefaultsCard() {
  const queryClient = useQueryClient();
  const [saved, flashSaved] = useSavedFlash();
  const { data: settings, isLoading } = useQuery({ queryKey: ['pathao-settings'], queryFn: courierApi.getPathaoSettings });

  const [form, setForm] = useState<PathaoSettings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (patch: Partial<PathaoSettings>) => courierApi.updatePathaoSettings(patch),
    onSuccess: (result) => {
      setForm(result);
      queryClient.setQueryData(['pathao-settings'], result);
      flashSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save. Check your connection and try again.')),
  });

  if (isLoading || !form) return <CardSkeleton title="Booking defaults" />;

  function update<K extends keyof PathaoSettings>(key: K, value: PathaoSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }
  const weightOk = form.defaultWeightKg >= 0.5 && form.defaultWeightKg <= 10;

  return (
    <CourierCard title="Booking defaults" description="Used for every new booking. You can still change them in the booking window.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!weightOk) return;
          // statusMap / autoBook belong to their own cards — sending
          // this form's (possibly older) copy would undo that card's save.
          const { statusMap: _statusMap, autoBook: _autoBook, ...defaults } = form;
          mutation.mutate(defaults);
        }}
      >
        <div className="max-w-xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Order status after booking">
              <select
                value={form.defaultBookingStatus}
                onChange={(e) => update('defaultBookingStatus', e.target.value as PathaoSettings['defaultBookingStatus'])}
                className={productInputClass}
              >
                <option value="SHIPPING">Move to Shipping</option>
                <option value="NO_CHANGE">Don’t change it</option>
              </select>
            </Field>
            <Field label="Delivery type">
              <select
                value={form.deliveryType}
                onChange={(e) => update('deliveryType', Number(e.target.value) as PathaoSettings['deliveryType'])}
                className={productInputClass}
              >
                <option value={48}>Normal delivery</option>
                <option value={12}>On-demand delivery</option>
              </select>
            </Field>
          </div>

          <Field
            label="Weight when a product has none (kg)"
            hint="Pathao takes 0.5 to 10 kg."
            error={weightOk ? null : 'Use a weight from 0.5 to 10 kg.'}
          >
            <input
              type="number"
              inputMode="decimal"
              min={0.5}
              max={10}
              step={0.1}
              value={form.defaultWeightKg}
              onChange={(e) => update('defaultWeightKg', Number(e.target.value))}
              className={productInputClass}
            />
          </Field>
          <CheckRow checked={form.useProductWeight} onChange={(v) => update('useProductWeight', v)} label="Use each product’s own weight when it has one" />

          <Field label="Item description" hint="{products} becomes a list like “T-shirt x2, Cap x1”.">
            <input value={form.itemDescriptionTemplate} onChange={(e) => update('itemDescriptionTemplate', e.target.value)} maxLength={200} className={productInputClass} />
          </Field>
          <Field label="Note for the rider" hint="Sent with every parcel.">
            <input
              value={form.specialInstruction}
              onChange={(e) => update('specialInstruction', e.target.value)}
              maxLength={200}
              placeholder="e.g. Call before delivery"
              className={productInputClass}
            />
          </Field>

          <div>
            <CheckRow checked={form.sendStaffNoteAsInstruction} onChange={(v) => update('sendStaffNoteAsInstruction', v)} label="Also send the order’s staff note to the rider" />
            <CheckRow
              checked={form.notifyCustomerOnBooking}
              onChange={(v) => update('notifyCustomerOnBooking', v)}
              label="Text the customer their tracking ID after booking"
              hint="Uses 1 SMS credit per order. Skipped when you have no SMS credits left."
            />
          </div>
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

/** Customer delivery check (pathao-plan.md Step 15) — free on every plan once Pathao is connected. */
function DeliveryCheckCard({ overview }: { overview: PathaoOverview }) {
  return (
    <CourierCard
      title="Customer delivery check"
      description="Each customer’s record with Pathao (across all Pathao sellers) shows under their phone number on the Orders page, so customers who often refuse parcels stand out before you ship. Free on every plan."
    >
      {!overview.connected ? (
        <p className="text-sm text-neutral-500">Connect your Pathao account above to turn it on.</p>
      ) : overview.hasBackupLogin ? (
        <p className="flex items-start gap-2 text-sm text-emerald-700">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden /> On. Each number is checked once, then again only when the record is over a
          month old and a new order comes in.
        </p>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            This check signs in to Pathao with your Pathao <strong>email and password</strong>. Add them under Your Pathao account above (Change
            keys) to turn it on.
          </p>
        </div>
      )}
    </CourierCard>
  );
}

export function PathaoSettingsTab({ overview }: { overview: PathaoOverview }) {
  // Connecting + the delivery check are free on every plan (Step 15);
  // everything about booking parcels is paid-only.
  return (
    <div className="space-y-4">
      <AccountCard overview={overview} />
      <DeliveryCheckCard overview={overview} />
      {!overview.planAllowed ? (
        <PlanLockedCard
          title="Booking with Pathao needs a paid plan"
          message="Upgrade to book parcels, print labels and follow deliveries with Pathao. The customer delivery check above stays free."
        />
      ) : (
        overview.connected &&
        !overview.needsReconnect && (
          <>
            <PickupStoreCard overview={overview} />
            <BookingDefaultsCard />
            <AutoBookCard<PathaoAutoBookSettings>
              courier="Pathao"
              settingsKey="pathao-settings"
              getSettings={courierApi.getPathaoSettings}
              save={(autoBook) => courierApi.updatePathaoSettings({ autoBook })}
              extraOptions={[
                {
                  key: 'requireLocation',
                  label: 'Only when the Pathao city and zone are set',
                  hint: 'Off: Pathao works the location out from the address.',
                },
              ]}
            />
            <StatusMapCard
              courier="Pathao"
              settingsKey="pathao-settings"
              getSettings={courierApi.getPathaoSettings}
              statusesKey="pathao-statuses"
              getStatuses={courierApi.getPathaoStatuses}
              save={(statusMap) => courierApi.updatePathaoSettings({ statusMap })}
              rowNote={(row) =>
                row.cancelsBooking ? (
                  <p className="text-xs text-neutral-500">Always lets you book the order again.</p>
                ) : row.paid ? (
                  <p className="text-xs text-neutral-500">Always records Pathao’s COD payout.</p>
                ) : null
              }
            />
            <WebhookSettingsCard
              courier="Pathao"
              queryKey="pathao-webhook"
              fetch={courierApi.getPathaoWebhook}
              regenerate={courierApi.regeneratePathaoWebhook}
              renewWhat="secret"
              fields={(w) => [
                { label: 'Webhook URL', value: w.url },
                { label: 'Webhook secret', value: w.secret, secret: true },
              ]}
              steps={
                <>
                  <li>
                    Open{' '}
                    <a href="https://merchant.pathao.com" target="_blank" rel="noreferrer" className="text-regantify-text underline">
                      merchant.pathao.com
                    </a>{' '}
                    and go to Developer API, then Webhook Integration.
                  </li>
                  <li>Paste the webhook URL and the webhook secret.</li>
                  <li>Save. Pathao checks the URL at once, and “Last update from Pathao” below fills in when it works.</li>
                </>
              }
            />
          </>
        )
      )}
    </div>
  );
}
