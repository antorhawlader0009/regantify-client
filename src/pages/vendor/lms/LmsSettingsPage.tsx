import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { LmsPage, Panel } from '../../../components/lms/LmsPage';
import { Field, LmsButton, LmsInput, LmsSelect, LmsTextarea } from '../../../components/lms/ui';
import { useLmsFields } from '../../../components/lms/ExtraFields';
import { STAGE_RULE } from '../../../components/lms/stageStyles';
import { LandingBacklogNotice } from '../../../components/lms/LandingBacklog';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import {
  LMS_FIELD_TYPE_LABELS,
  LMS_STAGES,
  lmsApi,
  type LmsFieldDef,
  type LmsFieldType,
  type LmsMe,
  type LmsSettings,
  type LmsStaleStage,
  type UpdateLmsSettings,
} from '../../../lib/lmsApi';

/** LMS > Settings. Everything works with the defaults; this page only adjusts. */
export default function LmsSettingsPage() {
  return <LmsPage title="Settings">{(me) => <SettingsBody me={me} />}</LmsPage>;
}

function SettingsBody({ me }: { me: LmsMe }) {
  const settingsQuery = useQuery({ queryKey: ['lms', 'settings'], queryFn: lmsApi.getSettings });

  return (
    <div className="max-w-3xl space-y-5">
      <OnOffSection me={me} />
      {!me.isManager ? (
        <p className="text-sm text-lms-muted">Only the store owner or a lead manager can change the other LMS settings.</p>
      ) : settingsQuery.isPending ? (
        <p className="text-sm text-lms-muted">Loading…</p>
      ) : settingsQuery.isError ? (
        <p className="text-sm">{apiErrorMessage(settingsQuery.error, "Settings couldn't load. Refresh the page to try again.")}</p>
      ) : (
        <>
          <SourcesSection me={me} settings={settingsQuery.data} />
          <StagesSection settings={settingsQuery.data} />
          <LostReasonsSection settings={settingsQuery.data} />
          <ExtraFieldsSection />
        </>
      )}
    </div>
  );
}

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <Panel>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-xl text-sm leading-6 text-lms-muted">{text}</p>
      <div className="mt-5">{children}</div>
    </Panel>
  );
}

/** Saves part of the settings, then refreshes everything that shows them (stage names are on every page). */
function useSaveSettings(successMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLmsSettings) => lmsApi.updateSettings(body),
    onSuccess: () => {
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ['lms'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The settings weren't saved. Try again.")),
  });
}

function OnOffSection({ me }: { me: LmsMe }) {
  const save = useSaveSettings('LMS turned off');
  return (
    <Panel>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">LMS is on</h2>
          <p className="mt-1 text-sm leading-6 text-lms-muted">
            New orders, abandoned checkouts and form requests come in by themselves. If you turn LMS off, nothing new
            comes in, and the leads you already have stay here for when you turn it back on.
          </p>
        </div>
        {me.isOwner && (
          <LmsButton className="h-10 shrink-0 px-4" disabled={save.isPending} onClick={() => save.mutate({ enabled: false })}>
            {save.isPending ? 'Turning off…' : 'Turn off LMS'}
          </LmsButton>
        )}
      </div>
    </Panel>
  );
}

// ----------------------------------------------------------------- sources

// Only the sources that exist so far; store forms and the API arrive in later steps.
const SOURCES: { key: 'ORDER' | 'ABANDONED_CHECKOUT' | 'LANDING_FORM'; label: string; text: string }[] = [
  { key: 'ORDER', label: 'New orders from your store', text: 'Cash on delivery orders waiting for a confirmation call.' },
  {
    key: 'ABANDONED_CHECKOUT',
    label: 'Abandoned checkouts',
    text: "People who filled in checkout with their phone number but didn't order.",
  },
  { key: 'LANDING_FORM', label: 'Landing page forms', text: 'People who asked you to contact them from a landing page.' },
];

function SourcesSection({ me, settings }: { me: LmsMe; settings: LmsSettings }) {
  const save = useSaveSettings('Sources saved');
  const [sources, setSources] = useState(() => Object.fromEntries(SOURCES.map((s) => [s.key, settings.sources[s.key]])));
  const [callPrepaid, setCallPrepaid] = useState(settings.callPrepaidOrders);
  const [abandonedAfter, setAbandonedAfter] = useState(String(settings.abandonedAfterMinutes));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minutes = Number(abandonedAfter);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
      toast.error('Abandoned checkouts: pick between 5 and 1440 minutes.');
      return;
    }
    save.mutate({ sources, callPrepaidOrders: callPrepaid, abandonedAfterMinutes: minutes });
  };

  return (
    <Section title="Where leads come from" text="These come into the LMS by themselves. Turn off any you don't want your team to follow up.">
      <LandingBacklogNotice me={me} className="mb-4" />
      <form onSubmit={submit}>
        <ul className="divide-y divide-lms-line border-y border-lms-line">
          {SOURCES.map((s) => (
            <li key={s.key} className="py-3">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--lms-ink)]"
                  checked={sources[s.key]}
                  onChange={(e) => setSources((v) => ({ ...v, [s.key]: e.target.checked }))}
                />
                <span>
                  <span className="block font-medium">{s.label}</span>
                  <span className="block text-lms-muted">{s.text}</span>
                </span>
              </label>
              {s.key === 'ORDER' && sources.ORDER && (
                <label className="ml-7 mt-2 flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--lms-ink)]" checked={callPrepaid} onChange={(e) => setCallPrepaid(e.target.checked)} />
                  Also call orders that were paid online
                </label>
              )}
              {s.key === 'ABANDONED_CHECKOUT' && sources.ABANDONED_CHECKOUT && (
                <label className="ml-7 mt-2 flex flex-wrap items-center gap-2 text-sm">
                  Add it as a lead after
                  <LmsInput
                    type="number"
                    min={5}
                    max={1440}
                    className="!w-20 tabular-nums"
                    value={abandonedAfter}
                    onChange={(e) => setAbandonedAfter(e.target.value)}
                    aria-label="Minutes before an abandoned checkout becomes a lead"
                  />
                  minutes without an order
                </label>
              )}
            </li>
          ))}
        </ul>
        <LmsButton type="submit" variant="primary" className="mt-4" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save sources'}
        </LmsButton>
      </form>
    </Section>
  );
}

// ------------------------------------------------------------------ stages

const DEFAULT_LABELS = { NEW: 'New', TRYING: 'Trying to reach', IN_TALKS: 'In talks', WON: 'Won', LOST: 'Lost' } as const;
const STALE_STAGES: LmsStaleStage[] = ['NEW', 'TRYING', 'IN_TALKS'];
type Unit = 'minutes' | 'hours' | 'days';
const UNIT_MINUTES: Record<Unit, number> = { minutes: 1, hours: 60, days: 1440 };

/** 1440 → { 1, days }, 90 → { 90, minutes }: the biggest unit that divides evenly. */
function splitMinutes(total: number): { amount: string; unit: Unit } {
  if (total % 1440 === 0) return { amount: String(total / 1440), unit: 'days' };
  if (total % 60 === 0) return { amount: String(total / 60), unit: 'hours' };
  return { amount: String(total), unit: 'minutes' };
}

function StagesSection({ settings }: { settings: LmsSettings }) {
  const save = useSaveSettings('Stages saved');
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(LMS_STAGES.map((s) => [s, settings.stageLabels[s] === DEFAULT_LABELS[s] ? '' : settings.stageLabels[s]])),
  );
  const [stale, setStale] = useState(() => Object.fromEntries(STALE_STAGES.map((s) => [s, splitMinutes(settings.staleMinutes[s])])));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const staleMinutes: Partial<Record<LmsStaleStage, number>> = {};
    for (const s of STALE_STAGES) {
      const minutes = Math.round(Number(stale[s].amount) * UNIT_MINUTES[stale[s].unit]);
      if (!Number.isFinite(minutes) || minutes < 5 || minutes > 43200) {
        toast.error(`${labels[s] || DEFAULT_LABELS[s]}: pick between 5 minutes and 30 days.`);
        return;
      }
      staleMinutes[s] = minutes;
    }
    // A blank name goes back to the default one.
    save.mutate({ stageLabels: Object.fromEntries(LMS_STAGES.map((s) => [s, labels[s].trim()])), staleMinutes });
  };

  return (
    <Section
      title="Stages"
      text="Every lead moves through these five stages. You can rename them, for example Won to Confirmed. A lead is marked stale when it waits in a stage longer than the time you set."
    >
      <form onSubmit={submit}>
        <div className="divide-y divide-lms-line border-y border-lms-line">
          {LMS_STAGES.map((s) => {
            const staleStage = STALE_STAGES.includes(s as LmsStaleStage) ? (s as LmsStaleStage) : null;
            return (
              <div key={s} className="grid grid-cols-1 items-center gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_18rem]">
                <label className="flex items-center gap-3">
                  <span aria-hidden className={`h-7 w-1 shrink-0 rounded-full ${STAGE_RULE[s]}`} />
                  <LmsInput
                    aria-label={`Name for ${DEFAULT_LABELS[s]}`}
                    value={labels[s]}
                    placeholder={DEFAULT_LABELS[s]}
                    maxLength={30}
                    onChange={(e) => setLabels((l) => ({ ...l, [s]: e.target.value }))}
                  />
                </label>
                {staleStage ? (
                  <div className="flex items-center gap-2 pl-4 text-sm sm:pl-0">
                    <span className="whitespace-nowrap text-lms-muted">Stale after</span>
                    <LmsInput
                      aria-label={`Stale after, for ${DEFAULT_LABELS[s]}`}
                      type="number"
                      min={1}
                      className="!w-20 tabular-nums"
                      value={stale[staleStage].amount}
                      onChange={(e) => setStale((st) => ({ ...st, [staleStage]: { ...st[staleStage], amount: e.target.value } }))}
                    />
                    <LmsSelect
                      aria-label="Unit"
                      className="!w-32"
                      value={stale[staleStage].unit}
                      onChange={(e) => setStale((st) => ({ ...st, [staleStage]: { ...st[staleStage], unit: e.target.value as Unit } }))}
                    >
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </LmsSelect>
                  </div>
                ) : (
                  <span className="pl-4 text-sm text-lms-muted sm:pl-0">Closed, never stale</span>
                )}
              </div>
            );
          })}
        </div>
        <LmsButton type="submit" variant="primary" className="mt-4" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save stages'}
        </LmsButton>
      </form>
    </Section>
  );
}

// ------------------------------------------------------------ lost reasons

function LostReasonsSection({ settings }: { settings: LmsSettings }) {
  const save = useSaveSettings('Lost reasons saved');
  const [reasons, setReasons] = useState(settings.lostReasons);
  const [draft, setDraft] = useState('');
  const dirty = JSON.stringify(reasons) !== JSON.stringify(settings.lostReasons);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const reason = draft.trim();
    if (!reason) return;
    if (reasons.some((r) => r.toLowerCase() === reason.toLowerCase())) {
      toast.error('That reason is already in the list.');
      return;
    }
    setReasons((r) => [...r, reason]);
    setDraft('');
  };

  return (
    <Section
      title="Lost reasons"
      text="The list your team picks from when a lead is lost. Reports use it to show why sales slip away. Leads already lost keep their reason even if you remove it here."
    >
      <ul className="flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <li key={reason} className="inline-flex h-8 items-center gap-1 rounded-md border border-lms-line pl-3 pr-1 text-sm">
            {reason}
            <button
              type="button"
              onClick={() => setReasons((r) => r.filter((x) => x !== reason))}
              disabled={reasons.length <= 1}
              className="rounded p-1 text-lms-muted hover:text-lms-ink disabled:opacity-40"
              aria-label={`Remove ${reason}`}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 flex max-w-md gap-2">
        <LmsInput value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={60} placeholder="Add a reason" disabled={reasons.length >= 20} />
        <LmsButton type="submit" disabled={!draft.trim()}>
          Add
        </LmsButton>
      </form>
      <LmsButton variant="primary" className="mt-4" disabled={!dirty || save.isPending} onClick={() => save.mutate({ lostReasons: reasons })}>
        {save.isPending ? 'Saving…' : 'Save lost reasons'}
      </LmsButton>
    </Section>
  );
}

// ------------------------------------------------------------ extra fields

function ExtraFieldsSection() {
  const queryClient = useQueryClient();
  const fieldsQuery = useLmsFields();
  const fields = fieldsQuery.data ?? [];
  const [editing, setEditing] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['lms', 'fields'] });
  const onError = (err: unknown) => toast.error(apiErrorMessage(err, "That didn't save. Try again."));

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { label?: string; options?: string[]; showInTable?: boolean } }) => lmsApi.updateField(id, body),
    onSuccess: () => {
      setEditing(null);
      refresh();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => lmsApi.deleteField(id),
    onSuccess: () => {
      toast.success('Field deleted');
      refresh();
    },
    onError,
  });
  const reorder = useMutation({ mutationFn: (ids: string[]) => lmsApi.reorderFields(ids), onSuccess: refresh, onError });

  const moveBy = (index: number, delta: number) => {
    const ids = fields.map((f) => f.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id!);
    reorder.mutate(ids);
  };

  return (
    <Section
      title="Extra fields"
      text="Optional. Add details your business needs on every lead, like Company, Size or Preferred date. They show on the lead, in Add lead, and as table columns if you want."
    >
      {fields.length > 0 && (
        <ul className="mb-5 divide-y divide-lms-line border-y border-lms-line">
          {fields.map((f, i) =>
            editing === f.id ? (
              <li key={f.id} className="py-3">
                <FieldForm
                  initial={f}
                  busy={update.isPending}
                  onCancel={() => setEditing(null)}
                  onSubmit={(body) => update.mutate({ id: f.id, body: { label: body.label, options: body.type === 'SELECT' ? body.options : undefined, showInTable: body.showInTable } })}
                />
              </li>
            ) : (
              <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
                <span className="min-w-[8rem] flex-1">
                  <span className="font-medium">{f.label}</span>
                  <span className="ml-2 text-lms-muted">
                    {LMS_FIELD_TYPE_LABELS[f.type]}
                    {f.type === 'SELECT' ? `: ${f.options.join(', ')}` : ''}
                  </span>
                </span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--lms-ink)]"
                    checked={f.showInTable}
                    onChange={(e) => update.mutate({ id: f.id, body: { showInTable: e.target.checked } })}
                  />
                  Table column
                </label>
                <span className="flex items-center gap-1">
                  <button type="button" aria-label={`Move ${f.label} up`} disabled={i === 0 || reorder.isPending} onClick={() => moveBy(i, -1)} className="rounded p-1.5 text-lms-muted hover:bg-lms-page hover:text-lms-ink disabled:opacity-30">
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" aria-label={`Move ${f.label} down`} disabled={i === fields.length - 1 || reorder.isPending} onClick={() => moveBy(i, 1)} className="rounded p-1.5 text-lms-muted hover:bg-lms-page hover:text-lms-ink disabled:opacity-30">
                    <ArrowDown size={15} />
                  </button>
                  <LmsButton variant="quiet" onClick={() => setEditing(f.id)}>
                    Edit
                  </LmsButton>
                  <LmsButton variant="quiet" className="!text-lms-alert" disabled={remove.isPending} onClick={() => remove.mutate(f.id)}>
                    Delete
                  </LmsButton>
                </span>
              </li>
            ),
          )}
        </ul>
      )}
      {fields.length < 20 ? <AddField onAdded={refresh} /> : <p className="text-sm text-lms-muted">You've reached the 20 field limit.</p>}
    </Section>
  );
}

interface FieldFormValue {
  label: string;
  type: LmsFieldType;
  options: string[];
  showInTable: boolean;
}

function AddField({ onAdded }: { onAdded: () => void }) {
  const [key, setKey] = useState(0);
  const create = useMutation({
    mutationFn: (body: FieldFormValue) => lmsApi.createField(body),
    onSuccess: (field) => {
      toast.success(`${field.label} added`);
      setKey((k) => k + 1); // fresh, empty form
      onAdded();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The field wasn't added. Try again.")),
  });
  return <FieldForm key={key} busy={create.isPending} onSubmit={(body) => create.mutate(body)} />;
}

/** Add or edit one field. The type is fixed once a field exists, since stored values must keep matching it. */
function FieldForm({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: LmsFieldDef;
  busy: boolean;
  onSubmit: (value: FieldFormValue) => void;
  onCancel?: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [type, setType] = useState<LmsFieldType>(initial?.type ?? 'TEXT');
  const [options, setOptions] = useState((initial?.options ?? []).join('\n'));
  const [showInTable, setShowInTable] = useState(initial?.showInTable ?? false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      label: label.trim(),
      type,
      options: options.split('\n').map((o) => o.trim()).filter(Boolean),
      showInTable,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Field name">
          <LmsInput value={label} onChange={(e) => setLabel(e.target.value)} required maxLength={40} placeholder="e.g. Company" />
        </Field>
        <Field label="Kind of answer" hint={initial ? "Can't change once the field exists." : undefined}>
          <LmsSelect value={type} onChange={(e) => setType(e.target.value as LmsFieldType)} disabled={!!initial}>
            {Object.entries(LMS_FIELD_TYPE_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </LmsSelect>
        </Field>
      </div>
      {type === 'SELECT' && (
        <Field label="Choices" hint="One per line, at least two.">
          <LmsTextarea rows={3} value={options} onChange={(e) => setOptions(e.target.value)} placeholder={'Small\nMedium\nLarge'} />
        </Field>
      )}
      {!initial && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--lms-ink)]" checked={showInTable} onChange={(e) => setShowInTable(e.target.checked)} />
          Show as a column in the leads table
        </label>
      )}
      <div className="flex gap-2">
        <LmsButton type="submit" variant="primary" disabled={busy || !label.trim()}>
          {busy ? 'Saving…' : initial ? 'Save field' : 'Add field'}
        </LmsButton>
        {onCancel && (
          <LmsButton variant="quiet" onClick={onCancel}>
            Cancel
          </LmsButton>
        )}
      </div>
    </form>
  );
}
