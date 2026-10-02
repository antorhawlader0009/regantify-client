import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { PathaoStatusTarget, PathaoWebhookInfo } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { outlineBtn } from '../ui/PageKit';
import { CardSkeleton, CheckRow, CopyField, CourierCard, SaveRow, formOutlineBtn, saveBtn } from './CourierKit';

// The Settings cards SteadFast, Pathao and RedX share word for word
// (theme-update-plan.md Step 5): instant status updates (webhook),
// which order status each courier status moves to, and auto-booking.
// Each courier only says what differs: its name, its API calls and a
// few lines of its own.

/** Shows "Saved" next to the button for a moment after a save. */
export function useSavedFlash(): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(t);
  }, [saved]);
  return [saved, () => setSaved(true)];
}

// ------------------------------------------------------------------ webhook

/**
 * "Instant status updates": our URL (+ secret) to paste into the
 * courier's panel so status changes arrive within seconds. Without it,
 * statuses still update by themselves every 20 minutes.
 */
export function WebhookSettingsCard({
  courier,
  queryKey,
  fetch,
  regenerate,
  fields,
  note,
  steps,
  renewWhat,
}: {
  courier: string;
  queryKey: string;
  fetch: () => Promise<PathaoWebhookInfo>;
  regenerate: () => Promise<PathaoWebhookInfo>;
  fields: (webhook: PathaoWebhookInfo) => { label: string; value: string; secret?: boolean }[];
  note?: ReactNode;
  /** The numbered steps in the courier's panel, as <li>s. */
  steps: ReactNode;
  /** What "Make a new …" replaces: 'secret', 'token' or 'URL'. */
  renewWhat: string;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const { data: webhook, isLoading, isError } = useQuery({ queryKey: [queryKey], queryFn: fetch });

  const regenerateMutation = useMutation({
    mutationFn: regenerate,
    onSuccess: (data) => {
      queryClient.setQueryData([queryKey], data);
      setConfirming(false);
      toast.success(`New ${renewWhat} made. Paste it into ${courier}’s panel again.`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, `Couldn’t make a new ${renewWhat}. Try again in a minute.`)),
  });

  if (isLoading) return <CardSkeleton title="Instant status updates" />;

  return (
    <CourierCard
      title="Instant status updates"
      description={`Let ${courier} tell us the moment a parcel moves. Without this, statuses still update by themselves every 20 minutes.`}
    >
      {isError || !webhook ? (
        <p className="text-sm text-red-600">Couldn’t load these details. Refresh the page to try again.</p>
      ) : (
        <div className="space-y-4">
          {!webhook.reachable && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
              <p>
                {courier} can only send updates to a public <strong>https://</strong> address, and this server isn’t on one yet. You can copy
                the details now; they start working once the site is live on its domain.
              </p>
            </div>
          )}
          {fields(webhook).map((f) => (
            <CopyField key={f.label} label={f.label} value={f.value} secret={f.secret} />
          ))}
          {note}

          <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-600">{steps}</ol>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm">
              {webhook.lastWebhookAt ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 size={15} aria-hidden /> Last update from {courier}: {formatDhakaDateTime(webhook.lastWebhookAt)}
                </span>
              ) : (
                <span className="text-neutral-500">No update from {courier} yet.</span>
              )}
            </p>
            <button type="button" onClick={() => setConfirming(true)} className={outlineBtn}>
              <RefreshCw size={14} aria-hidden /> Make a new {renewWhat}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Make a new ${renewWhat}?`}
        message={`The current one stops working right away. Until you paste the new one into ${courier}’s panel, statuses update every 20 minutes instead.`}
        confirmLabel={`Make a new ${renewWhat}`}
        onConfirm={() => regenerateMutation.mutate()}
        busy={regenerateMutation.isPending}
        danger
      />
    </CourierCard>
  );
}

// ------------------------------------------------------------------ status map

const TARGET_LABELS: Record<PathaoStatusTarget, string> = {
  NO_CHANGE: 'Don’t change',
  SHIPPING: 'Shipping',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
  RETURN: 'Return',
  CANCELLED: 'Cancelled',
};
const TARGET_ORDER: PathaoStatusTarget[] = ['NO_CHANGE', 'SHIPPING', 'COMPLETED', 'ON_HOLD', 'RETURN', 'CANCELLED'];

function sameMap(a: Record<string, PathaoStatusTarget>, b: Record<string, PathaoStatusTarget>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key] === b[key]);
}

interface StatusRowBase {
  key: string;
  label: string;
  defaultTarget: PathaoStatusTarget;
}

/**
 * "Order status from {courier}": which order status each courier status
 * moves the order to. Used by the poll and the webhook alike; only rows
 * that differ from the default are stored.
 */
export function StatusMapCard<R extends StatusRowBase>({
  courier,
  settingsKey,
  getSettings,
  statusesKey,
  getStatuses,
  save,
  rowNote,
  extraNote,
}: {
  courier: string;
  settingsKey: string;
  getSettings: () => Promise<{ statusMap: Record<string, PathaoStatusTarget> }>;
  statusesKey: string;
  getStatuses: () => Promise<R[]>;
  save: (statusMap: Record<string, PathaoStatusTarget>) => Promise<{ statusMap: Record<string, PathaoStatusTarget> }>;
  rowNote?: (row: R) => ReactNode;
  extraNote?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [saved, flashSaved] = useSavedFlash();
  const { data: settings } = useQuery({ queryKey: [settingsKey], queryFn: getSettings });
  const { data: statuses } = useQuery({ queryKey: [statusesKey], queryFn: getStatuses, staleTime: Infinity });

  const [map, setMap] = useState<Record<string, PathaoStatusTarget> | null>(null);
  useEffect(() => {
    if (settings && !map) setMap(settings.statusMap);
  }, [settings, map]);

  const mutation = useMutation({
    mutationFn: save,
    onSuccess: (result) => {
      setMap(result.statusMap);
      queryClient.setQueryData([settingsKey], result);
      flashSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save. Check your connection and try again.')),
  });

  const title = `Order status from ${courier}`;
  if (!settings || !statuses || !map) return <CardSkeleton title={title} />;

  const defaults = Object.fromEntries(statuses.map((s) => [s.key, s.defaultTarget]));
  const dirty = !sameMap(map, settings.statusMap);
  const isDefault = sameMap(map, defaults);

  return (
    <CourierCard title={title} description={`When ${courier} reports a new status for a parcel, the order moves to the status you pick here.`}>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
        <li className="hidden grid-cols-[minmax(0,1fr)_200px] gap-3 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 sm:grid">
          <span>{courier} says</span>
          <span>Move the order to</span>
        </li>
        {statuses.map((row) => {
          const value = map[row.key] ?? row.defaultTarget;
          const changed = value !== row.defaultTarget;
          return (
            <li key={row.key} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center sm:gap-3">
              <div className="min-w-0">
                <p className="text-sm text-regantify-text">{row.label}</p>
                {rowNote?.(row)}
              </div>
              <select
                value={value}
                onChange={(e) => setMap((prev) => ({ ...(prev ?? {}), [row.key]: e.target.value as PathaoStatusTarget }))}
                aria-label={`Order status when ${courier} says ${row.label}`}
                className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-regantify-text outline-none focus:ring-2 focus:ring-brand/15 ${
                  changed ? 'border-brand bg-brand-lime/15' : 'border-line focus:border-brand'
                }`}
              >
                {TARGET_ORDER.map((target) => (
                  <option key={target} value={target}>
                    {TARGET_LABELS[target]}
                    {target === row.defaultTarget ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-neutral-500">
        Moving an order to Completed adds its money to Finance, the same as completing it yourself. Orders already Completed, Cancelled or
        Refunded never change.
        {extraNote && <> {extraNote}</>}
      </p>

      <SaveRow saved={saved}>
        <button type="button" onClick={() => setMap(defaults)} disabled={isDefault} className={formOutlineBtn}>
          Reset to default
        </button>
        <button type="button" onClick={() => mutation.mutate(map)} disabled={!dirty || mutation.isPending} className={saveBtn}>
          {mutation.isPending ? 'Saving…' : 'Save statuses'}
        </button>
      </SaveRow>
    </CourierCard>
  );
}

// ------------------------------------------------------------------ auto-book

interface AutoBookBase {
  enabled: boolean;
  assignUnassigned: boolean;
  includeManualOrders: boolean;
}

/** "Book automatically": send confirmed orders to the courier by themselves, using the booking defaults. */
export function AutoBookCard<A extends AutoBookBase>({
  courier,
  settingsKey,
  getSettings,
  save,
  extraOptions = [],
}: {
  courier: string;
  settingsKey: string;
  getSettings: () => Promise<{ autoBook: A }>;
  save: (autoBook: A) => Promise<{ autoBook: A }>;
  /** Options beyond the shared two, e.g. "only when the area is set". */
  extraOptions?: { key: keyof A & string; label: string; hint: string }[];
}) {
  const queryClient = useQueryClient();
  const [saved, flashSaved] = useSavedFlash();
  const { data: settings } = useQuery({ queryKey: [settingsKey], queryFn: getSettings });
  const [form, setForm] = useState<A | null>(null);
  useEffect(() => {
    if (settings && !form) setForm(settings.autoBook);
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: save,
    onSuccess: (result) => {
      setForm(result.autoBook);
      queryClient.setQueryData([settingsKey], result);
      flashSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save. Check your connection and try again.')),
  });

  if (!settings || !form) return <CardSkeleton title="Book automatically" />;

  const set = (key: keyof A, value: boolean) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  const dirty = JSON.stringify(form) !== JSON.stringify(settings.autoBook);
  const options: { key: keyof A & string; label: string; hint: string }[] = [
    {
      key: 'assignUnassigned',
      label: 'Also book orders that have no courier yet',
      hint: `Off: only orders you already set to ${courier}. If another courier also books these by itself, whichever is first takes the order.`,
    },
    { key: 'includeManualOrders', label: 'Include orders you add yourself (Add order)', hint: 'Off: only orders placed on your store.' },
    ...extraOptions,
  ];

  return (
    <CourierCard title="Book automatically" description={`Send orders to ${courier} by themselves as soon as you confirm them, using your booking defaults.`}>
      <CheckRow
        strong
        checked={form.enabled}
        onChange={(v) => set('enabled', v)}
        label="Book when an order moves to Processing"
        hint={`Runs in the background. If ${courier} refuses an order, it shows under Dashboard > Needs attention.`}
      />
      <div className={`mt-1 space-y-1 border-l border-line pl-4 sm:ml-1.5 ${form.enabled ? '' : 'pointer-events-none opacity-50'}`} aria-disabled={!form.enabled}>
        {options.map((o) => (
          <CheckRow key={o.key} checked={Boolean(form[o.key])} onChange={(v) => set(o.key, v)} label={o.label} hint={o.hint} />
        ))}
        <p className="pt-1 text-xs text-neutral-500">Orders waiting for the customer’s COD verification are never booked by themselves.</p>
      </div>

      <SaveRow saved={saved}>
        <button type="button" onClick={() => mutation.mutate(form)} disabled={!dirty || mutation.isPending} className={saveBtn}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </SaveRow>
    </CourierCard>
  );
}
