import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import {
  courierApi,
  type SteadfastAutoBookSettings,
  type SteadfastOverview,
  type SteadfastSettings,
  type SteadfastStatusTarget,
} from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { SteadfastConnectForm } from '../../../../components/courier/SteadfastConnectForm';

const STEADFAST_PANEL_URL = 'https://steadfast.com.bd/login';

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

/** API Information — connect form when not connected; key summary + update/disconnect when connected. */
function ApiInformationCard({ overview }: { overview: SteadfastOverview }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const disconnectMutation = useMutation({
    mutationFn: () => courierApi.disconnect('STEADFAST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steadfast-overview'] });
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success('SteadFast disconnected.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect. Please try again.')),
  });

  const form = (
    <SteadfastConnectForm
      onConnected={() => setEditing(false)}
      footer={(submitting) => (
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
          >
            {submitting ? 'Checking with SteadFast…' : overview.connected ? 'Save' : 'Connect SteadFast'}
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
      <SettingsCard title="API Information" description="Connect your own SteadFast merchant account to book deliveries from your orders. Free on every plan.">
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
            </p>
            <p className="text-regantify-text-muted">
              API Key: <span className="text-regantify-text">{overview.apiKeyMasked ?? '—'}</span>
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
              Update keys
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

/** Webhook Configuration — our URL + the Bearer token to paste into SteadFast, so status changes arrive within seconds. */
function WebhookCard() {
  const queryClient = useQueryClient();
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);

  const { data: webhook, isLoading, isError } = useQuery({
    queryKey: ['steadfast-webhook'],
    queryFn: courierApi.getSteadfastWebhook,
  });

  const regenerateMutation = useMutation({
    mutationFn: courierApi.regenerateSteadfastWebhook,
    onSuccess: (data) => {
      queryClient.setQueryData(['steadfast-webhook'], data);
      setConfirmingRegenerate(false);
      toast.success('New webhook URL and token created. Update them in SteadFast’s panel.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not create a new webhook token. Please try again.')),
  });

  return (
    <SettingsCard
      title="Webhook Configuration"
      description="Let SteadFast tell us about every status change right away. Without it, statuses still update automatically every 20 minutes."
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
                SteadFast can only send webhooks to a public <strong>https://</strong> address, and this server isn’t on one yet. You can
                copy the details now; they’ll start working once the site is live on its domain.
              </p>
            </div>
          )}
          <CopyField label="Webhook URL (Callback URL)" value={webhook.url} />
          <CopyField label="Auth Token (Bearer)" value={webhook.secret} secret />

          <ol className="list-decimal pl-5 space-y-1 text-sm text-regantify-text-muted">
            <li>
              Open your{' '}
              <a href={STEADFAST_PANEL_URL} target="_blank" rel="noreferrer" className="underline text-regantify-text">
                SteadFast merchant panel
              </a>{' '}
              → More → API guide → Webhooks.
            </li>
            <li>Paste the Webhook URL as the callback URL and the Auth Token as its Bearer token.</li>
            <li>Save. The “last received” time below updates when SteadFast sends its first update.</li>
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
                <span className="text-xs text-regantify-text-muted">The current URL and token will stop working.</span>
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
                <RefreshCw size={13} /> Generate new token
              </button>
            )}
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

/** Default Values — what every booking sends to SteadFast. Only sent to the server on Save. */
function DefaultValuesCard() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({ queryKey: ['steadfast-settings'], queryFn: courierApi.getSteadfastSettings });

  const [form, setForm] = useState<SteadfastSettings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (patch: Partial<SteadfastSettings>) => courierApi.updateSteadfastSettings(patch),
    onSuccess: (saved) => {
      setForm(saved);
      queryClient.setQueryData(['steadfast-settings'], saved);
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

  function update<K extends keyof SteadfastSettings>(key: K, value: SteadfastSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <SettingsCard title="Default Values" description="Used for every parcel you book with SteadFast, one at a time or in bulk.">
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
              onChange={(e) => update('defaultBookingStatus', e.target.value as SteadfastSettings['defaultBookingStatus'])}
              className={inputClass}
            >
              <option value="SHIPPING">Move to Shipping</option>
              <option value="NO_CHANGE">Don't change status</option>
            </select>
          </Field>
          <Field label="Delivery type">
            <select
              value={form.deliveryType}
              onChange={(e) => update('deliveryType', Number(e.target.value) as SteadfastSettings['deliveryType'])}
              className={inputClass}
            >
              <option value={0}>Home delivery</option>
              <option value={1}>Point delivery (customer collects from the hub)</option>
            </select>
          </Field>
        </div>

        <Field label="Item description" hint="Use {products} to insert a summary like 'T-shirt x2, Cap x1'.">
          <input
            value={form.itemDescriptionTemplate}
            onChange={(e) => update('itemDescriptionTemplate', e.target.value)}
            maxLength={200}
            className={inputClass}
          />
        </Field>

        <Field label="Note for the rider" hint="Sent with every parcel (SteadFast allows up to 480 characters in all).">
          <input
            value={form.note}
            onChange={(e) => update('note', e.target.value)}
            maxLength={300}
            placeholder="e.g. Call before delivery"
            className={inputClass}
          />
        </Field>

        <div className="space-y-2.5">
          <Checkbox checked={form.sendCustomerNoteAsNote} onChange={(v) => update('sendCustomerNoteAsNote', v)} label="Also send the customer's own order note" />
          <Checkbox checked={form.sendStaffNoteAsNote} onChange={(v) => update('sendStaffNoteAsNote', v)} label="Also send the order's staff note" />
          <Checkbox
            checked={form.sendCustomerEmail}
            onChange={(v) => update('sendCustomerEmail', v)}
            label="Send the customer's email to SteadFast"
            hint="Only when the order has one."
          />
          <Checkbox
            checked={form.notifyCustomerOnBooking}
            onChange={(v) => update('notifyCustomerOnBooking', v)}
            label="Text the customer their tracking code after booking"
            hint="Uses 1 SMS credit per order. Skipped when you have no SMS credits left."
          />
        </div>

        <p className="text-xs text-regantify-text-muted">
          Cash on delivery: SteadFast collects the order total for COD orders and nothing for orders already paid online. SteadFast works
          out weight and area itself, so there's nothing to set for those.
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

/** Automation — book with SteadFast automatically when an order is confirmed. */
function AutomationCard() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['steadfast-settings'], queryFn: courierApi.getSteadfastSettings });
  const [form, setForm] = useState<SteadfastAutoBookSettings | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings.autoBook);
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: (autoBook: SteadfastAutoBookSettings) => courierApi.updateSteadfastSettings({ autoBook }),
    onSuccess: (saved) => {
      setForm(saved.autoBook);
      queryClient.setQueryData(['steadfast-settings'], saved);
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

  const set = <K extends keyof SteadfastAutoBookSettings>(key: K, value: SteadfastAutoBookSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  const dirty = JSON.stringify(form) !== JSON.stringify(settings.autoBook);

  return (
    <SettingsCard title="Automation" description="Book orders with SteadFast by themselves as soon as you confirm them, using your Default Values.">
      <div className="space-y-3">
        <label className="flex items-start gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} className="mt-0.5 rounded border-black/20" />
          <span>
            <span className="font-medium">Auto-book when an order moves to Processing</span>
            <span className="block text-xs text-regantify-text-muted">
              Runs in the background. If SteadFast refuses an order, it shows up as a failed booking under Dashboard › Needs attention.
            </span>
          </span>
        </label>

        <div className={`pl-6 space-y-3 ${form.enabled ? '' : 'opacity-50 pointer-events-none'}`} aria-disabled={!form.enabled}>
          <Checkbox
            checked={form.assignUnassigned}
            onChange={(v) => set('assignUnassigned', v)}
            label="Also book orders that have no courier yet"
            hint="Off = only orders you’ve already set to SteadFast. If Pathao auto-booking also takes these, whichever gets the order first books it."
          />
          <Checkbox
            checked={form.includeManualOrders}
            onChange={(v) => set('includeManualOrders', v)}
            label="Include orders you add yourself (Add Order)"
            hint="Off = only orders placed on your store."
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

const TARGET_LABELS: Record<SteadfastStatusTarget, string> = {
  NO_CHANGE: 'No change',
  SHIPPING: 'Shipping',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  RETURN: 'Return',
  CANCELLED: 'Cancelled',
};
const TARGET_ORDER: SteadfastStatusTarget[] = ['NO_CHANGE', 'SHIPPING', 'COMPLETED', 'ON_HOLD', 'RETURN', 'CANCELLED'];

function sameMap(a: Record<string, SteadfastStatusTarget>, b: Record<string, SteadfastStatusTarget>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key] === b[key]);
}

/** Auto Status Update — which order status each SteadFast status moves the order to. Used by polling and webhooks alike. */
function AutoStatusCard() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['steadfast-settings'], queryFn: courierApi.getSteadfastSettings });
  const { data: statuses } = useQuery({ queryKey: ['steadfast-statuses'], queryFn: courierApi.getSteadfastStatuses, staleTime: Infinity });

  const [map, setMap] = useState<Record<string, SteadfastStatusTarget> | null>(null);
  useEffect(() => {
    if (settings && !map) setMap(settings.statusMap);
  }, [settings, map]);

  const mutation = useMutation({
    mutationFn: (statusMap: Record<string, SteadfastStatusTarget>) => courierApi.updateSteadfastSettings({ statusMap }),
    onSuccess: (saved) => {
      setMap(saved.statusMap);
      queryClient.setQueryData(['steadfast-settings'], saved);
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
    <SettingsCard title="Auto Status Update" description="When SteadFast reports a new status for a parcel, your order moves to the status you pick here.">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-regantify-text-muted">
              <th className="px-1 pb-2 font-medium">SteadFast status</th>
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
                    {row.key.endsWith('_approval_pending') && (
                      <p className="text-xs text-regantify-text-muted">The rider's word only — SteadFast hasn't confirmed it yet.</p>
                    )}
                  </td>
                  <td className="px-1 py-2 align-top w-48">
                    <select
                      value={value}
                      onChange={(e) => setMap((prev) => ({ ...(prev ?? {}), [row.key]: e.target.value as SteadfastStatusTarget }))}
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
        already Completed, Cancelled or Refunded are never changed. A return step that's set to “No change” falls back to what its
        parent status (e.g. Cancelled) is set to.
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

/** Customer delivery check — SteadFast's fraud check under each phone on the Orders page. */
function DeliveryCheckCard({ overview }: { overview: SteadfastOverview }) {
  return (
    <SettingsCard
      title="Customer delivery check"
      description="See each customer's record with SteadFast (delivered vs cancelled across all SteadFast merchants, plus fraud reports) under their phone number on the Orders page, so risky COD customers stand out before you ship."
    >
      {overview.connected ? (
        <p className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 size={15} /> On. Each number is checked once, then again only when it's over a month old and a new order comes in.
        </p>
      ) : (
        <p className="text-sm text-regantify-text-muted">Connect your SteadFast account above to turn it on.</p>
      )}
    </SettingsCard>
  );
}

export function SteadfastSettingsTab({ overview }: { overview: SteadfastOverview }) {
  return (
    <div className="space-y-4">
      <ApiInformationCard overview={overview} />
      {overview.connected && (
        <>
          <WebhookCard />
          <DefaultValuesCard />
          <AutomationCard />
          <AutoStatusCard />
        </>
      )}
      <DeliveryCheckCard overview={overview} />
    </div>
  );
}
