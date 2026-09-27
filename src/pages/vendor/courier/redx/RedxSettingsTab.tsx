import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, Plus, RefreshCw } from 'lucide-react';
import { courierApi, type RedxAutoBookSettings, type RedxOverview, type RedxSettings, type RedxStatusTarget } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { LockedFeatureCard } from '../../../../components/ui/UpgradePrompt';
import { RedxConnectForm } from '../../../../components/courier/RedxConnectForm';
import { RedxStorePicker } from '../../../../components/courier/RedxStorePicker';
import { CreateRedxStoreDialog } from './CreateRedxStoreDialog';

const REDX_PANEL_URL = 'https://redx.com.bd/developer-api/';

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

function Checkbox({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-regantify-text">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 rounded border-black/20" />
      <span>
        {label}
        {hint && <span className="block text-xs text-regantify-text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** API Information — connect form when not connected; token summary + update/disconnect when connected. */
function ApiInformationCard({ overview }: { overview: RedxOverview }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const disconnectMutation = useMutation({
    mutationFn: () => courierApi.disconnect('REDX'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redx-overview'] });
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success('RedX disconnected.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect. Please try again.')),
  });

  const form = (
    <RedxConnectForm
      onConnected={() => setEditing(false)}
      footer={(submitting) => (
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
          >
            {submitting ? 'Checking with RedX…' : overview.connected ? 'Save' : 'Connect RedX'}
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
      <SettingsCard title="API Information" description="Connect your own RedX merchant account to book deliveries from your orders.">
        <div className="max-w-md">{form}</div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title="API Information">
      {editing ? (
        <div className="max-w-md">{form}</div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 space-y-1.5 text-sm">
            <p className="flex items-center gap-2 text-regantify-text font-medium">
              <CheckCircle2 size={16} className="text-green-600" /> Connected
              {overview.sandbox && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium">Sandbox</span>}
            </p>
            <p className="text-regantify-text-muted">
              Access token: <span className="text-regantify-text">{overview.tokenMasked ?? '—'}</span>
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
              Update token
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

/** Pickup Store — where RedX collects every parcel from. Pick one of the account's stores, or add a new one. */
function PickupStoreCard({ overview }: { overview: Extract<RedxOverview, { connected: true }> }) {
  const [creating, setCreating] = useState(false);
  return (
    <SettingsCard title="Pickup Store" description="RedX's rider collects every parcel you book from this store.">
      <div className="max-w-md space-y-3">
        {!overview.pickupStore && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Choose a pickup store before booking with RedX.
          </p>
        )}
        <RedxStorePicker currentStoreId={overview.pickupStore?.id ?? null} />
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 text-xs font-medium text-regantify-text hover:bg-regantify-content"
        >
          <Plus size={13} /> Add pickup store
        </button>
      </div>
      <CreateRedxStoreDialog open={creating} onClose={() => setCreating(false)} />
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

/** Webhook Configuration — the callback URL (with its token built in) to paste into RedX, so status changes arrive within seconds. */
function WebhookCard() {
  const queryClient = useQueryClient();
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  const { data: webhook, isLoading, isError } = useQuery({
    queryKey: ['redx-webhook'],
    queryFn: courierApi.getRedxWebhook,
  });

  const regenerateMutation = useMutation({
    mutationFn: courierApi.regenerateRedxWebhook,
    onSuccess: (data) => {
      queryClient.setQueryData(['redx-webhook'], data);
      setConfirmingRegenerate(false);
      toast.success('New callback URL created. Update it in RedX’s panel.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not create a new callback URL. Please try again.')),
  });

  return (
    <SettingsCard
      title="Webhook Configuration"
      description="Let RedX tell us about every status change right away. Without it, statuses still update automatically every 20 minutes."
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
                RedX can only send webhooks to a public <strong>https://</strong> address, and this server isn’t on one yet. You can copy the
                URL now; it will start working once the site is live on its domain.
              </p>
            </div>
          )}
          <CopyField label="Callback URL" value={webhook.url} secret />
          <p className="text-xs text-regantify-text-muted">The URL carries its own secret token, so keep it private.</p>

          <ol className="list-decimal pl-5 space-y-1 text-sm text-regantify-text-muted">
            <li>
              Open your{' '}
              <a href={REDX_PANEL_URL} target="_blank" rel="noreferrer" className="underline text-regantify-text">
                RedX merchant panel
              </a>{' '}
              → Developer APIs → Webhook.
            </li>
            <li>Paste the whole Callback URL into “Enter your callback URL” and click Save Link.</li>
            <li>The “last received” time below updates when RedX sends its first update.</li>
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
                <RefreshCw size={13} /> Generate new URL
              </button>
            )}
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

/** Default Values — what every booking sends to RedX. Only sent to the server on Save. */
function DefaultValuesCard() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['redx-settings'], queryFn: courierApi.getRedxSettings });

  const [form, setForm] = useState<RedxSettings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (patch: Partial<RedxSettings>) => courierApi.updateRedxSettings(patch),
    onSuccess: (saved) => {
      setForm(saved);
      queryClient.setQueryData(['redx-settings'], saved);
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

  function update<K extends keyof RedxSettings>(key: K, value: RedxSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <SettingsCard title="Default Values" description="Used for every parcel you book with RedX, one at a time or in bulk.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // statusMap / autoBook belong to their own cards — sending this
          // form's (possibly older) copy would undo that card's save.
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
              onChange={(e) => update('defaultBookingStatus', e.target.value as RedxSettings['defaultBookingStatus'])}
              className={inputClass}
            >
              <option value="SHIPPING">Move to Shipping</option>
              <option value="NO_CHANGE">Don't change status</option>
            </select>
          </Field>
          <Field label="Declared value" hint="What RedX compensates if the parcel is lost or damaged.">
            <select
              value={form.declaredValue}
              onChange={(e) => update('declaredValue', e.target.value as RedxSettings['declaredValue'])}
              className={inputClass}
            >
              <option value="SUBTOTAL">Products' price (order subtotal)</option>
              <option value="ZERO">Don't declare a value</option>
            </select>
          </Field>
          <Field label="Default weight per item (grams)" hint="Used for items whose product has no weight set.">
            <input
              type="number"
              min={1}
              max={50000}
              value={form.defaultWeightGrams}
              onChange={(e) => update('defaultWeightGrams', Math.max(1, Math.round(Number(e.target.value) || 0)))}
              className={inputClass}
            />
          </Field>
          <Field label="Item category" hint="RedX asks for a category for every item.">
            <input value={form.itemCategory} onChange={(e) => update('itemCategory', e.target.value)} maxLength={60} className={inputClass} />
          </Field>
        </div>

        <Field label="Instruction for the rider" hint="Sent with every parcel.">
          <input
            value={form.instruction}
            onChange={(e) => update('instruction', e.target.value)}
            maxLength={300}
            placeholder="e.g. Call before delivery"
            className={inputClass}
          />
        </Field>

        <div className="space-y-2.5">
          <Checkbox
            checked={form.autoDetectArea}
            onChange={(v) => update('autoDetectArea', v)}
            label="Find the delivery area from the address"
            hint="When an order has no RedX area set, we match one from its ZIP code and address. If we're not sure, the booking stops and asks you to pick the area."
          />
          <Checkbox checked={form.useProductWeight} onChange={(v) => update('useProductWeight', v)} label="Use each product's own weight when it has one" />
          <Checkbox checked={form.sendItemDetails} onChange={(v) => update('sendItemDetails', v)} label="Send the item list (name and price of each product)" />
          <Checkbox
            checked={form.closedBox}
            onChange={(v) => update('closedBox', v)}
            label="Closed box"
            hint="Ask RedX not to let the customer open the parcel before paying."
          />
          <Checkbox checked={form.sendCustomerNoteAsInstruction} onChange={(v) => update('sendCustomerNoteAsInstruction', v)} label="Also send the customer's own order note" />
          <Checkbox checked={form.sendStaffNoteAsInstruction} onChange={(v) => update('sendStaffNoteAsInstruction', v)} label="Also send the order's staff note" />
          <Checkbox
            checked={form.notifyCustomerOnBooking}
            onChange={(v) => update('notifyCustomerOnBooking', v)}
            label="Text the customer their tracking ID after booking"
            hint="Uses 1 SMS credit per order. Skipped when you have no SMS credits left."
          />
        </div>

        <p className="text-xs text-regantify-text-muted">
          Cash on delivery: RedX collects the order total for COD orders and nothing for orders already paid online.
        </p>

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

/** Automation — book with RedX automatically when an order is confirmed. */
function AutomationCard() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['redx-settings'], queryFn: courierApi.getRedxSettings });
  const [form, setForm] = useState<RedxAutoBookSettings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings.autoBook);
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (autoBook: RedxAutoBookSettings) => courierApi.updateRedxSettings({ autoBook }),
    onSuccess: (saved) => {
      setForm(saved.autoBook);
      queryClient.setQueryData(['redx-settings'], saved);
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

  const set = <K extends keyof RedxAutoBookSettings>(key: K, value: RedxAutoBookSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  const dirty = JSON.stringify(form) !== JSON.stringify(settings.autoBook);

  return (
    <SettingsCard title="Automation" description="Book orders with RedX by themselves as soon as you confirm them, using your Default Values.">
      <div className="space-y-3">
        <label className="flex items-start gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="mt-0.5 rounded border-black/20" />
          <span>
            <span className="font-medium">Auto-book when an order moves to Processing</span>
            <span className="block text-xs text-regantify-text-muted">
              Runs in the background. If RedX refuses an order, it shows up as a failed booking under Dashboard › Needs attention.
            </span>
          </span>
        </label>

        <div className={`pl-6 space-y-3 ${form.enabled ? '' : 'opacity-50 pointer-events-none'}`} aria-disabled={!form.enabled}>
          <Checkbox
            checked={form.assignUnassigned}
            onChange={(v) => set('assignUnassigned', v)}
            label="Also book orders that have no courier yet"
            hint="Off = only orders you’ve already set to RedX. If another courier's auto-booking also takes these, whichever gets the order first books it."
          />
          <Checkbox
            checked={form.includeManualOrders}
            onChange={(v) => set('includeManualOrders', v)}
            label="Include orders you add yourself (Add Order)"
            hint="Off = only orders placed on your store."
          />
          <Checkbox
            checked={form.requireArea}
            onChange={(v) => set('requireArea', v)}
            label="Only orders whose RedX delivery area you've set"
            hint="Off = also book with the area found from the address."
          />
          <p className="text-xs text-regantify-text-muted">Orders waiting for the customer’s COD verification are never auto-booked.</p>
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

const TARGET_LABELS: Record<RedxStatusTarget, string> = {
  NO_CHANGE: 'No change',
  SHIPPING: 'Shipping',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  RETURN: 'Return',
  CANCELLED: 'Cancelled',
};
const TARGET_ORDER: RedxStatusTarget[] = ['NO_CHANGE', 'SHIPPING', 'COMPLETED', 'ON_HOLD', 'RETURN', 'CANCELLED'];

function sameMap(a: Record<string, RedxStatusTarget>, b: Record<string, RedxStatusTarget>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key] === b[key]);
}

/** Auto Status Update — which order status each RedX status moves the order to. Used by polling and webhooks alike. */
function AutoStatusCard() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['redx-settings'], queryFn: courierApi.getRedxSettings });
  const { data: statuses } = useQuery({ queryKey: ['redx-statuses'], queryFn: courierApi.getRedxStatuses, staleTime: Infinity });

  const [map, setMap] = useState<Record<string, RedxStatusTarget> | null>(null);
  useEffect(() => {
    if (settings && !map) setMap(settings.statusMap);
  }, [settings, map]);

  const mutation = useMutation({
    mutationFn: (statusMap: Record<string, RedxStatusTarget>) => courierApi.updateRedxSettings({ statusMap }),
    onSuccess: (saved) => {
      setMap(saved.statusMap);
      queryClient.setQueryData(['redx-settings'], saved);
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
    <SettingsCard title="Auto Status Update" description="When RedX reports a new status for a parcel, your order moves to the status you pick here.">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-regantify-text-muted">
              <th className="px-1 pb-2 font-medium">RedX status</th>
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
                    {row.paid && <p className="text-xs text-regantify-text-muted">Also marks the parcel's COD as paid out.</p>}
                    {row.cancelsBooking && <p className="text-xs text-regantify-text-muted">The booking is cancelled, so the order can be booked again.</p>}
                  </td>
                  <td className="px-1 py-2 align-top w-48">
                    <select
                      value={value}
                      onChange={(e) => setMap((prev) => ({ ...(prev ?? {}), [row.key]: e.target.value as RedxStatusTarget }))}
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
        already Completed, Cancelled or Refunded are never changed. “COD paid by RedX” set to “No change” still completes an order the
        way “Delivered” is set to, in case the delivered update was missed.
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

export function RedxSettingsTab({ overview }: { overview: RedxOverview }) {
  if (!overview.planAllowed && !overview.connected) {
    return (
      <LockedFeatureCard
        title="RedX is a paid-plan courier"
        message="Upgrade your plan to connect RedX and book parcels with it. SteadFast is free on every plan."
      />
    );
  }
  return (
    <div className="space-y-4">
      <ApiInformationCard overview={overview} />
      {!overview.planAllowed ? (
        <LockedFeatureCard
          title="RedX is a paid-plan courier"
          message="Your plan no longer includes RedX. Upgrade to book parcels again; parcels already booked keep updating."
        />
      ) : (
        overview.connected && (
          <>
            <PickupStoreCard overview={overview} />
            <WebhookCard />
            <DefaultValuesCard />
            <AutomationCard />
            <AutoStatusCard />
          </>
        )
      )}
    </div>
  );
}
