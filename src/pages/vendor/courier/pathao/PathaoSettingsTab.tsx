import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, Plus, RefreshCw, Store } from 'lucide-react';
import { courierApi, type PathaoAutoBookSettings, type PathaoOverview, type PathaoSettings, type PathaoStatusTarget } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { PathaoConnectForm } from '../../../../components/courier/PathaoConnectForm';
import { CreatePathaoStoreDialog } from './CreatePathaoStoreDialog';
import { LockedFeatureCard } from '../../../../components/ui/UpgradePrompt';

type ConnectedOverview = Extract<PathaoOverview, { connected: true }>;

function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-regantify-text">{title}</h2>
      {description && <p className="text-sm text-regantify-text-muted mt-1">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** API Information — connect form when not connected; connection summary + update/disconnect when connected. */
function ApiInformationCard({ overview }: { overview: PathaoOverview }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pathao-overview'] });
    queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['pathao-store-list'] });
  };

  const disconnectMutation = useMutation({
    mutationFn: () => courierApi.disconnect('PATHAO'),
    onSuccess: () => {
      invalidate();
      toast.success('Pathao disconnected.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect. Please try again.')),
  });

  const form = (
    <PathaoConnectForm
      onConnected={() => {
        setEditing(false);
        invalidate();
      }}
      footer={(submitting) => (
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
          >
            {submitting ? 'Verifying with Pathao…' : overview.connected ? 'Save' : 'Connect Pathao'}
          </button>
          {overview.connected && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-xl bg-regantify-content text-regantify-text text-sm font-medium hover:bg-black/10"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    />
  );

  if (!overview.connected) {
    return (
      <SettingsCard title="API Information" description="Connect your own Pathao merchant account to book deliveries from your orders.">
        <div className="max-w-md">{form}</div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title="API Information">
      {overview.needsReconnect && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            This connection uses an old login method. Update it with your Pathao <b>Client ID</b> and <b>Client Secret</b> so
            bookings keep working.
          </p>
        </div>
      )}

      {editing || overview.needsReconnect ? (
        <div className="max-w-md">{form}</div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 space-y-1.5 text-sm">
            <p className="flex items-center gap-2 text-regantify-text font-medium">
              <CheckCircle2 size={16} className="text-green-600" />
              {overview.merchantName ? `Connected as ${overview.merchantName}` : 'Connected'}
            </p>
            <p className="text-regantify-text-muted">
              Client ID: <span className="text-regantify-text">{overview.clientIdMasked ?? '—'}</span>
            </p>
            <p className="text-regantify-text-muted">
              Backup email login: <span className="text-regantify-text">{overview.hasBackupLogin ? 'Added' : 'Not added'}</span>
            </p>
            <p className="text-regantify-text-muted">
              Last updated: <span className="text-regantify-text">{formatDate(overview.updatedAt)}</span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-black/10 text-regantify-text hover:bg-regantify-content"
            >
              Update credentials
            </button>
            <button
              type="button"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

/** Pickup Store — which Pathao store parcels are picked up from, plus creating a new one. */
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
      toast.success('Pickup store saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save your pickup store. Please try again.')),
  });

  const selectedId = overview.pickupStore?.id ?? null;
  const selected = stores?.find((s) => s.id === selectedId);

  return (
    <SettingsCard title="Pickup Store" description="Pathao collects every parcel you book from this store.">
      {isLoading ? (
        <p className="text-sm text-regantify-text-muted">Loading your Pathao stores…</p>
      ) : isError || !stores ? (
        <p className="text-sm text-red-500">
          Could not load your Pathao stores.{' '}
          <button type="button" onClick={() => refetch()} className="underline">
            Try again
          </button>
        </p>
      ) : (
        <div className="max-w-md space-y-3">
          {stores.length === 0 ? (
            <p className="text-sm text-regantify-text-muted">No stores on your Pathao account yet. Create one below.</p>
          ) : (
            <select
              value={selectedId ?? ''}
              disabled={selectMutation.isPending}
              onChange={(e) => {
                const store = stores.find((s) => s.id === Number(e.target.value));
                if (store) selectMutation.mutate({ id: store.id, name: store.name });
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none disabled:opacity-60"
            >
              <option value="" disabled>
                Select a pickup store…
              </option>
              {stores.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.isActive}>
                  {s.name}
                  {s.isDefault ? ' (default)' : ''}
                  {!s.isActive ? ' — awaiting approval' : ''}
                </option>
              ))}
            </select>
          )}

          {selected ? (
            <div className="flex items-start gap-2 rounded-xl bg-regantify-search p-3 text-sm">
              <Store size={16} className="text-regantify-text-muted mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-regantify-text">{selected.name}</p>
                {selected.address && <p className="text-regantify-text-muted">{selected.address}</p>}
              </div>
            </div>
          ) : (
            selectedId == null &&
            stores.length > 0 && (
              <p className="text-xs text-amber-700">Select a pickup store — bookings can’t be made without one.</p>
            )
          )}

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-regantify-cta hover:underline"
          >
            <Plus size={14} /> Create new Pathao store
          </button>
        </div>
      )}

      <CreatePathaoStoreDialog open={creating} onOpenChange={setCreating} />
    </SettingsCard>
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none disabled:opacity-60';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-regantify-text mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-regantify-text-muted mt-1">{hint}</p>}
    </div>
  );
}

/**
 * Default Values — pathao-plan.md Step 3's vendor-editable booking
 * defaults (after-booking status, delivery/item type, weight fallback,
 * description template, instructions, COD rule). Local form state is
 * seeded from the loaded settings and only sent to the server on Save,
 * same pattern as the Delivery Charge form elsewhere in Settings.
 */
function DefaultValuesCard() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['pathao-settings'],
    queryFn: courierApi.getPathaoSettings,
  });

  const [form, setForm] = useState<PathaoSettings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (patch: Partial<PathaoSettings>) => courierApi.updatePathaoSettings(patch),
    onSuccess: (saved) => {
      setForm(saved);
      queryClient.setQueryData(['pathao-settings'], saved);
      toast.success('Default values saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save these settings. Please try again.')),
  });

  if (isLoading || !form) {
    return (
      <SettingsCard title="Default Values">
        <p className="text-sm text-regantify-text-muted">Loading…</p>
      </SettingsCard>
    );
  }

  function update<K extends keyof PathaoSettings>(key: K, value: PathaoSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <SettingsCard title="Default Values" description="Used for every new booking unless you change it in the booking window.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // statusMap / autoBook belong to their own cards — sending
          // this form's (possibly older) copy would undo that card's save.
          if (form) {
            const { statusMap: _statusMap, autoBook: _autoBook, ...defaults } = form;
            mutation.mutate(defaults);
          }
        }}
        className="space-y-4 max-w-xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Order status after booking">
            <select
              value={form.defaultBookingStatus}
              onChange={(e) => update('defaultBookingStatus', e.target.value as PathaoSettings['defaultBookingStatus'])}
              className={inputClass}
            >
              <option value="SHIPPING">Move to Shipping</option>
              <option value="NO_CHANGE">Don't change status</option>
            </select>
          </Field>
          <Field label="Delivery type">
            <select
              value={form.deliveryType}
              onChange={(e) => update('deliveryType', Number(e.target.value) as PathaoSettings['deliveryType'])}
              className={inputClass}
            >
              <option value={48}>Normal Delivery</option>
              <option value={12}>On Demand Delivery</option>
            </select>
          </Field>
        </div>

        <Field label="Default weight (kg)" hint="Used when a product has no weight set (or 'use product weight' is off). Pathao allows 0.5–10 kg.">
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.1}
            value={form.defaultWeightKg}
            onChange={(e) => update('defaultWeightKg', Number(e.target.value))}
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input
            type="checkbox"
            checked={form.useProductWeight}
            onChange={(e) => update('useProductWeight', e.target.checked)}
            className="rounded border-black/20"
          />
          Use each product's own weight when booking
        </label>

        <Field label="Item description" hint="Use {products} to insert a summary like 'T-shirt x2, Cap x1'.">
          <input
            value={form.itemDescriptionTemplate}
            onChange={(e) => update('itemDescriptionTemplate', e.target.value)}
            maxLength={200}
            className={inputClass}
          />
        </Field>

        <Field label="Special instruction" hint="Added to every booking's instructions to Pathao.">
          <input
            value={form.specialInstruction}
            onChange={(e) => update('specialInstruction', e.target.value)}
            maxLength={200}
            placeholder="e.g. Call before delivery"
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input
            type="checkbox"
            checked={form.sendStaffNoteAsInstruction}
            onChange={(e) => update('sendStaffNoteAsInstruction', e.target.checked)}
            className="rounded border-black/20"
          />
          Also send the order's staff note as part of the instruction
        </label>

        <label className="flex items-start gap-2 text-sm text-regantify-text">
          <input
            type="checkbox"
            checked={form.notifyCustomerOnBooking}
            onChange={(e) => update('notifyCustomerOnBooking', e.target.checked)}
            className="mt-0.5 rounded border-black/20"
          />
          <span>
            Text the customer their tracking ID after booking
            <span className="block text-xs text-regantify-text-muted">
              Uses 1 SMS credit per order. Skipped when you have no SMS credits left.
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : 'Save defaults'}
        </button>
      </form>
    </SettingsCard>
  );
}

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [shown, setShown] = useState(!secret);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error('Could not copy — select the text and copy it yourself.');
    }
  }
  return (
    <div>
      <label className="block text-xs font-medium text-regantify-text mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          readOnly
          value={shown ? value : '•'.repeat(24)}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-black/10 bg-regantify-content text-sm text-regantify-text font-mono focus:outline-none"
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? 'Hide' : 'Show'}
            className="px-2.5 rounded-lg border border-black/10 text-regantify-text-muted hover:bg-regantify-content"
          >
            {shown ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 rounded-lg border border-black/10 text-xs font-medium text-regantify-text hover:bg-regantify-content"
        >
          <Copy size={13} /> Copy
        </button>
      </div>
    </div>
  );
}

/** Webhook Configuration (pathao-plan.md Step 7) — the URL + secret to paste into Pathao so status changes arrive within seconds. */
function WebhookCard() {
  const queryClient = useQueryClient();
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  const { data: webhook, isLoading, isError } = useQuery({
    queryKey: ['pathao-webhook'],
    queryFn: courierApi.getPathaoWebhook,
  });

  const regenerateMutation = useMutation({
    mutationFn: courierApi.regeneratePathaoWebhook,
    onSuccess: (data) => {
      queryClient.setQueryData(['pathao-webhook'], data);
      setConfirmingRegenerate(false);
      toast.success('New webhook URL and secret created. Update them in Pathao’s panel.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not create a new webhook secret. Please try again.')),
  });

  return (
    <SettingsCard
      title="Webhook Configuration"
      description="Let Pathao tell us about every status change right away. Without it, statuses still update automatically every 20 minutes."
    >
      {isLoading ? (
        <p className="text-sm text-regantify-text-muted">Loading…</p>
      ) : isError || !webhook ? (
        <p className="text-sm text-red-500">Could not load your webhook details. Please refresh the page.</p>
      ) : (
        <div className="space-y-4">
          {!webhook.reachable && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <p>
                Pathao can only send webhooks to a public <strong>https://</strong> address, and this server isn’t on one yet. You can
                copy the details now, but Pathao won’t accept them until the site is live on its domain.
              </p>
            </div>
          )}
          <CopyField label="Webhook URL" value={webhook.url} />
          <CopyField label="Webhook Secret" value={webhook.secret} secret />

          <ol className="list-decimal pl-5 space-y-1 text-sm text-regantify-text-muted">
            <li>
              Open{' '}
              <a href="https://merchant.pathao.com" target="_blank" rel="noreferrer" className="underline text-regantify-text">
                merchant.pathao.com
              </a>{' '}
              → Developer API → Webhook Integration.
            </li>
            <li>Paste the Webhook URL and the Webhook Secret above.</li>
            <li>Save. Pathao checks the URL straight away — the “last received” time below updates when it works.</li>
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/5">
            <p className="text-xs text-regantify-text-muted">
              {webhook.lastWebhookAt ? (
                <span className="inline-flex items-center gap-1.5 text-green-700">
                  <CheckCircle2 size={13} /> Last webhook received{' '}
                  {new Date(webhook.lastWebhookAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              ) : (
                'No webhook received yet.'
              )}
            </p>
            {confirmingRegenerate ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-regantify-text-muted">The current URL will stop working.</span>
                <button
                  type="button"
                  onClick={() => regenerateMutation.mutate()}
                  disabled={regenerateMutation.isPending}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-60"
                >
                  {regenerateMutation.isPending ? 'Creating…' : 'Yes, create new'}
                </button>
                <button type="button" onClick={() => setConfirmingRegenerate(false)} className="text-xs text-regantify-text-muted underline">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingRegenerate(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 text-xs font-medium text-regantify-text hover:bg-regantify-content"
              >
                <RefreshCw size={13} /> Generate new secret
              </button>
            )}
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

const TARGET_LABELS: Record<PathaoStatusTarget, string> = {
  NO_CHANGE: 'No change',
  SHIPPING: 'Shipping',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  RETURN: 'Return',
  CANCELLED: 'Cancelled',
};
const TARGET_ORDER: PathaoStatusTarget[] = ['NO_CHANGE', 'SHIPPING', 'COMPLETED', 'ON_HOLD', 'RETURN', 'CANCELLED'];

function sameMap(a: Record<string, PathaoStatusTarget>, b: Record<string, PathaoStatusTarget>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key] === b[key]);
}

/** Auto Status Update (pathao-plan.md Step 8) — which order status each Pathao status moves the order to. Used by polling and webhooks alike. */
function AutoStatusCard() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['pathao-settings'], queryFn: courierApi.getPathaoSettings });
  const { data: statuses } = useQuery({ queryKey: ['pathao-statuses'], queryFn: courierApi.getPathaoStatuses, staleTime: Infinity });

  const [map, setMap] = useState<Record<string, PathaoStatusTarget> | null>(null);
  useEffect(() => {
    if (settings && !map) setMap(settings.statusMap);
  }, [settings, map]);

  const mutation = useMutation({
    mutationFn: (statusMap: Record<string, PathaoStatusTarget>) => courierApi.updatePathaoSettings({ statusMap }),
    onSuccess: (saved) => {
      setMap(saved.statusMap);
      queryClient.setQueryData(['pathao-settings'], saved);
      toast.success('Auto status update saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save these settings. Please try again.')),
  });

  if (!settings || !statuses || !map) {
    return (
      <SettingsCard title="Auto Status Update">
        <p className="text-sm text-regantify-text-muted">Loading…</p>
      </SettingsCard>
    );
  }

  const defaults = Object.fromEntries(statuses.map((s) => [s.key, s.defaultTarget]));
  const dirty = !sameMap(map, settings.statusMap);
  const isDefault = sameMap(map, defaults);

  return (
    <SettingsCard
      title="Auto Status Update"
      description="When Pathao reports a new status for a parcel, your order moves to the status you pick here."
    >
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-regantify-text-muted">
              <th className="px-1 pb-2 font-medium">Pathao status</th>
              <th className="px-1 pb-2 font-medium">Move the order to</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((row) => {
              const value = map[row.key] ?? row.defaultTarget;
              const changed = value !== row.defaultTarget;
              return (
                <tr key={row.key} className="border-t border-black/5">
                  <td className="px-1 py-2 align-top">
                    <p className="text-regantify-text">{row.label}</p>
                    {row.cancelsBooking && <p className="text-xs text-regantify-text-muted">Always lets you book the order again.</p>}
                    {row.paid && <p className="text-xs text-regantify-text-muted">Always records Pathao’s COD payout.</p>}
                  </td>
                  <td className="px-1 py-2 align-top w-48">
                    <select
                      value={value}
                      onChange={(e) => setMap((prev) => ({ ...(prev ?? {}), [row.key]: e.target.value as PathaoStatusTarget }))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-sm text-regantify-text focus:outline-none ${
                        changed ? 'border-regantify-cta' : 'border-black/10'
                      }`}
                    >
                      {TARGET_ORDER.map((target) => (
                        <option key={target} value={target}>
                          {TARGET_LABELS[target]}
                          {target === row.defaultTarget ? ' (default)' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-regantify-text-muted mt-3">
        Moving an order to Completed posts its earnings and fees in Finance, exactly as if you completed it yourself. Orders that are
        already Completed, Cancelled or Refunded are never changed.
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={() => setMap(defaults)}
          disabled={isDefault}
          className="px-3 py-2 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-50"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate(map)}
          disabled={!dirty || mutation.isPending}
          className="px-4 py-2 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </SettingsCard>
  );
}

/** Automation (pathao-plan.md Step 14) — book with Pathao automatically when an order is confirmed. */
function AutomationCard() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['pathao-settings'], queryFn: courierApi.getPathaoSettings });
  const [form, setForm] = useState<PathaoAutoBookSettings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings.autoBook);
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (autoBook: PathaoAutoBookSettings) => courierApi.updatePathaoSettings({ autoBook }),
    onSuccess: (saved) => {
      setForm(saved.autoBook);
      queryClient.setQueryData(['pathao-settings'], saved);
      toast.success(saved.autoBook.enabled ? 'Auto-booking is on.' : 'Automation settings saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save these settings. Please try again.')),
  });

  if (!settings || !form) {
    return (
      <SettingsCard title="Automation">
        <p className="text-sm text-regantify-text-muted">Loading…</p>
      </SettingsCard>
    );
  }

  const set = <K extends keyof PathaoAutoBookSettings>(key: K, value: PathaoAutoBookSettings[K]) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  const dirty = JSON.stringify(form) !== JSON.stringify(settings.autoBook);

  return (
    <SettingsCard
      title="Automation"
      description="Book orders with Pathao by themselves as soon as you confirm them, using your Default Values."
    >
      <div className="space-y-3">
        <label className="flex items-start gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="mt-0.5 rounded border-black/20" />
          <span>
            <span className="font-medium">Auto-book when an order moves to Processing</span>
            <span className="block text-xs text-regantify-text-muted">
              Runs in the background. If Pathao refuses an order, it shows up as a failed booking under Dashboard › Needs attention.
            </span>
          </span>
        </label>

        <div className={`pl-6 space-y-3 ${form.enabled ? '' : 'opacity-50 pointer-events-none'}`} aria-disabled={!form.enabled}>
          <label className="flex items-start gap-2 text-sm text-regantify-text">
            <input
              type="checkbox"
              checked={form.assignUnassigned}
              onChange={(e) => set('assignUnassigned', e.target.checked)}
              className="mt-0.5 rounded border-black/20"
            />
            <span>
              Also book orders that have no courier yet
              <span className="block text-xs text-regantify-text-muted">Off = only orders you’ve already set to Pathao.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-regantify-text">
            <input
              type="checkbox"
              checked={form.includeManualOrders}
              onChange={(e) => set('includeManualOrders', e.target.checked)}
              className="mt-0.5 rounded border-black/20"
            />
            <span>
              Include orders you add yourself (Add Order)
              <span className="block text-xs text-regantify-text-muted">Off = only orders placed on your store.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-regantify-text">
            <input
              type="checkbox"
              checked={form.requireLocation}
              onChange={(e) => set('requireLocation', e.target.checked)}
              className="mt-0.5 rounded border-black/20"
            />
            <span>
              Only when the Pathao location (city and zone) is set
              <span className="block text-xs text-regantify-text-muted">Off = let Pathao work the location out from the address.</span>
            </span>
          </label>
          <p className="text-xs text-regantify-text-muted">
            Orders waiting for the customer’s COD verification are never auto-booked.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => mutation.mutate(form)}
            disabled={!dirty || mutation.isPending}
            className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </SettingsCard>
  );
}

/** Customer delivery check (pathao-plan.md Step 15) — free on every plan once Pathao is connected. */
function DeliveryCheckCard({ overview }: { overview: PathaoOverview }) {
  return (
    <SettingsCard
      title="Customer delivery check"
      description="See each customer's delivery record with Pathao (across all Pathao merchants) under their phone number on the Orders page, so fake or often-returning customers stand out before you ship. Free on every plan."
    >
      {!overview.connected ? (
        <p className="text-sm text-regantify-text-muted">Connect your Pathao account above to turn it on.</p>
      ) : overview.hasBackupLogin ? (
        <p className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 size={15} /> On. Each number is checked once, then again only when it's over a month old and a new order comes in.
        </p>
      ) : (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <p>
            Pathao's delivery lookup signs in with your Pathao <strong>email and password</strong>. Add them as the backup login in API
            Information above (Update credentials) to make sure it works.
          </p>
        </div>
      )}
    </SettingsCard>
  );
}

export function PathaoSettingsTab({ overview }: { overview: PathaoOverview }) {
  // Connecting + the delivery check are free on every plan (Step 15);
  // everything about booking parcels is paid-only.
  return (
    <div className="space-y-4">
      <ApiInformationCard overview={overview} />
      <DeliveryCheckCard overview={overview} />
      {!overview.planAllowed ? (
        <LockedFeatureCard
          title="Booking with Pathao is a paid-plan feature"
          message="Upgrade your plan to book parcels, print labels and track deliveries with Pathao. The customer delivery check above stays free."
        />
      ) : overview.connected && !overview.needsReconnect && (
        <>
          <PickupStoreCard overview={overview} />
          <WebhookCard />
          <DefaultValuesCard />
          <AutomationCard />
          <AutoStatusCard />
        </>
      )}
    </div>
  );
}
