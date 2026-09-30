import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { productsApi } from '../../lib/productsApi';
import { BD_DISTRICTS } from '../../lib/bdDistricts';
import {
  LMS_KIND_LABELS,
  LMS_SOURCE_LABELS,
  LMS_STAGES,
  LMS_TASK_TYPE_LABELS,
  lmsApi,
  type LmsAutomation,
  type LmsAutomationAction,
  type LmsAutomationConditions,
  type LmsAutomationInput,
  type LmsAutomationTrigger,
  type LmsMe,
  type LmsTaskType,
  type LmsTemplate,
} from '../../lib/lmsApi';
import { Field, LmsButton, LmsDialog, LmsInput, LmsSelect } from './ui';
import { useLmsAgents } from './Team';
import { LMS_TEMPLATES_KEY } from './MessageComposer';

/*
 * LMS > Settings > Automations (LMS-plan.md Step 13): "When … and … then …"
 * rules, written as a sentence, with three ready-made recipes. Stages
 * never move by automation; that stays with what agents record.
 */

const AUTOMATIONS_KEY = ['lms', 'automations'] as const;
const MAX_AUTOMATIONS = 20;

const TRIGGER_WORDS: Record<LmsAutomationTrigger, string> = {
  LEAD_CREATED: 'a new lead comes in',
  STAGE_CHANGED: 'a lead moves to a stage',
  WON: 'a lead is won',
  LOST: 'a lead is lost',
  NO_ACTIVITY: 'an open lead has no activity for',
  TASK_OVERDUE: 'a task is overdue by',
};

type ConditionKey = keyof LmsAutomationConditions;
const CONDITION_WORDS: Record<ConditionKey, string> = {
  kind: 'kind is',
  source: 'it came from',
  stage: 'stage is',
  productId: 'product is',
  tag: 'it has the tag',
  valueAtLeast: 'value is at least ৳',
  district: 'district is',
  lostReason: 'lost reason is',
};

const ACTION_WORDS: Record<LmsAutomationAction['type'], string> = {
  ASSIGN: 'assign it to',
  ADD_TAG: 'add the tag',
  CREATE_TASK: 'create a task',
  SEND_SMS: 'send the SMS',
  NOTIFY: 'notify',
};

const DISCOUNT_TEMPLATE = {
  channel: 'SMS' as const,
  name: 'Checkout discount',
  body: 'Hi {name}, you left {product} in your cart at {store}. Order today and get a special discount. Call or reply to us. Thank you.',
};

function blank(): LmsAutomationInput {
  return { name: '', trigger: 'LEAD_CREATED', conditions: {}, actions: [{ type: 'ADD_TAG', tag: '' }] };
}

/** "in 2 hours", "in 1 day" for a task's due time. */
function minutesWords(min: number): string {
  if (min === 0) return 'due right away';
  if (min % 1440 === 0) return `due in ${min / 1440} day${min === 1440 ? '' : 's'}`;
  if (min % 60 === 0) return `due in ${min / 60} hour${min === 60 ? '' : 's'}`;
  return `due in ${min} min`;
}

export function AutomationsSection({ me }: { me: LmsMe }) {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: AUTOMATIONS_KEY, queryFn: lmsApi.automations });
  const templates = useQuery({ queryKey: LMS_TEMPLATES_KEY, queryFn: lmsApi.templates, staleTime: 60_000 });
  const agents = useLmsAgents();
  const [editing, setEditing] = useState<{ id: string | null; draft: LmsAutomationInput } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: AUTOMATIONS_KEY });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => lmsApi.toggleAutomation(id, enabled),
    onSuccess: (a) => {
      toast.success(a.enabled ? 'Automation on' : 'Automation off');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "That didn't work. Try again.")),
  });
  const remove = useMutation({
    mutationFn: (id: string) => lmsApi.deleteAutomation(id),
    onSuccess: () => {
      toast.success('Automation deleted');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The automation wasn't deleted. Try again.")),
  });

  /** A recipe opens the builder filled in, to check and save. The discount SMS recipe makes its template if the store has none. */
  const applyRecipe = async (recipe: 'discount' | 'quiet' | 'price') => {
    if (recipe === 'discount') {
      try {
        let template = (templates.data ?? []).find((t) => t.channel === 'SMS' && t.name === DISCOUNT_TEMPLATE.name);
        if (!template) {
          template = await lmsApi.createTemplate(DISCOUNT_TEMPLATE);
          queryClient.invalidateQueries({ queryKey: LMS_TEMPLATES_KEY });
          toast.success('Added the SMS template "Checkout discount". Edit its text in Message templates.');
        }
        setEditing({
          id: null,
          draft: {
            name: 'Abandoned checkout: discount SMS after 1 hour',
            trigger: 'NO_ACTIVITY',
            hours: 1,
            conditions: { source: 'ABANDONED_CHECKOUT' },
            actions: [{ type: 'SEND_SMS', templateId: template.id }],
          },
        });
      } catch (err) {
        toast.error(apiErrorMessage(err, "The SMS template couldn't be made. Try again."));
      }
    } else if (recipe === 'quiet') {
      setEditing({
        id: null,
        draft: {
          name: 'In talks, no reply for 2 days: call task',
          trigger: 'NO_ACTIVITY',
          hours: 48,
          conditions: { stage: 'IN_TALKS' },
          actions: [{ type: 'CREATE_TASK', taskType: 'CALL', inMinutes: 0, person: 'LEAD_AGENT', note: 'No reply for 2 days: follow up' }],
        },
      });
    } else {
      const reason = me.lostReasons.find((r) => r.toLowerCase() === 'price too high') ?? me.lostReasons[0];
      setEditing({
        id: null,
        draft: {
          name: 'Lost as "Price too high": tag price-sensitive',
          trigger: 'LOST',
          conditions: { lostReason: reason },
          actions: [{ type: 'ADD_TAG', tag: 'price-sensitive' }],
        },
      });
    }
  };

  const rows = list.data ?? [];
  const full = rows.length >= MAX_AUTOMATIONS;
  const names = new Map((agents.data ?? []).map((a) => [a.userId, a.name]));

  return (
    <>
      {list.isPending ? (
        <p className="text-sm text-lms-muted">Loading…</p>
      ) : list.isError ? (
        <p className="text-sm">{apiErrorMessage(list.error, "Automations couldn't load. Refresh the page to try again.")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-lms-muted">No automations yet. Start from a recipe below, or build your own.</p>
      ) : (
        <ul className="divide-y divide-lms-line rounded-md border border-lms-line">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-3 px-3 py-3">
              <label className="mt-0.5 flex items-center" title={a.enabled ? 'On' : 'Off'}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--lms-ink)]"
                  checked={a.enabled}
                  aria-label={`${a.name}: ${a.enabled ? 'on' : 'off'}`}
                  disabled={toggle.isPending}
                  onChange={(e) => toggle.mutate({ id: a.id, enabled: e.target.checked })}
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${a.enabled ? '' : 'text-lms-muted'}`}>{a.name}</p>
                <p className="mt-0.5 text-sm text-lms-muted">{describe(a, me, names, templates.data ?? [])}</p>
                <p className="mt-0.5 text-xs text-lms-muted tabular-nums">
                  {a.enabled ? 'On' : 'Off'} · ran {a.runCount} time{a.runCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex gap-1">
                <LmsButton variant="quiet" onClick={() => setEditing({ id: a.id, draft: toInput(a) })}>
                  Edit
                </LmsButton>
                <LmsButton variant="quiet" className="text-lms-alert" disabled={remove.isPending} onClick={() => remove.mutate(a.id)}>
                  Delete
                </LmsButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <LmsButton variant="primary" disabled={full} onClick={() => setEditing({ id: null, draft: blank() })}>
          <Plus size={15} />
          New automation
        </LmsButton>
        {full && <span className="self-center text-sm text-lms-muted">A store can have up to {MAX_AUTOMATIONS}.</span>}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[13px] font-medium">Recipes</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Recipe disabled={full} onClick={() => applyRecipe('discount')} title="Abandoned checkout" text="Send a discount SMS after 1 hour" />
          <Recipe disabled={full} onClick={() => applyRecipe('quiet')} title="In talks, no reply for 2 days" text="Make a call task for their agent" />
          <Recipe disabled={full} onClick={() => applyRecipe('price')} title='Lost as "Price too high"' text="Tag them price-sensitive" />
        </div>
      </div>

      {editing && (
        <Builder
          me={me}
          id={editing.id}
          initial={editing.draft}
          templates={(templates.data ?? []).filter((t) => t.channel === 'SMS')}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </>
  );
}

function Recipe({ title, text, onClick, disabled }: { title: string; text: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-lms-line bg-lms-surface px-3 py-2 text-left hover:bg-lms-page disabled:opacity-50"
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="block text-xs text-lms-muted">{text}</span>
    </button>
  );
}

function toInput(a: LmsAutomation): LmsAutomationInput {
  return {
    name: a.name,
    enabled: a.enabled,
    trigger: a.trigger,
    hours: a.hours ?? undefined,
    toStage: a.toStage ?? undefined,
    conditions: a.conditions,
    actions: a.actions,
  };
}

/** The rule as one sentence, for the list. */
function describe(a: LmsAutomation, me: LmsMe, names: Map<string, string>, templates: LmsTemplate[]): string {
  const person = (id: string) => (id === 'LEAD_AGENT' ? 'their agent' : id === 'AUTO' ? 'the next person in turn' : (names.get(id) ?? 'someone'));
  let when = `When ${TRIGGER_WORDS[a.trigger]}`;
  if (a.trigger === 'NO_ACTIVITY' || a.trigger === 'TASK_OVERDUE') when += ` ${a.hours} hour${a.hours === 1 ? '' : 's'}`;
  if (a.trigger === 'STAGE_CHANGED') when += `: ${a.toStage ? me.stageLabels[a.toStage] : 'any'}`;
  const c = a.conditions;
  const ands = (Object.keys(c) as ConditionKey[]).map((k) => {
    const v = c[k];
    const shown =
      k === 'kind' ? LMS_KIND_LABELS[v as keyof typeof LMS_KIND_LABELS]
      : k === 'source' ? LMS_SOURCE_LABELS[v as keyof typeof LMS_SOURCE_LABELS]
      : k === 'stage' ? me.stageLabels[v as keyof LmsMe['stageLabels']]
      : k === 'productId' ? 'the chosen product'
      : String(v);
    return `${CONDITION_WORDS[k]} ${shown}`;
  });
  const thens = a.actions.map((x) => {
    switch (x.type) {
      case 'ASSIGN':
        return `assign it to ${person(x.to)}`;
      case 'ADD_TAG':
        return `add the tag "${x.tag}"`;
      case 'CREATE_TASK':
        return `create a ${LMS_TASK_TYPE_LABELS[x.taskType].toLowerCase()} task for ${person(x.person)}, ${minutesWords(x.inMinutes)}`;
      case 'SEND_SMS':
        return `send the "${templates.find((t) => t.id === x.templateId)?.name ?? 'deleted'}" SMS`;
      case 'NOTIFY':
        return `notify ${person(x.person)}`;
    }
  });
  return `${when}${ands.length ? `, and ${ands.join(' and ')}` : ''}, then ${thens.join(', ')}.`;
}

// ------------------------------------------------------------------ builder

function Builder({
  me,
  id,
  initial,
  templates,
  onClose,
  onSaved,
}: {
  me: LmsMe;
  id: string | null;
  initial: LmsAutomationInput;
  templates: LmsTemplate[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<LmsAutomationInput>(initial);
  const set = (patch: Partial<LmsAutomationInput>) => setDraft((d) => ({ ...d, ...patch }));
  const agents = useLmsAgents().data ?? [];

  const save = useMutation({
    mutationFn: () => {
      const body: LmsAutomationInput = {
        ...draft,
        name: draft.name.trim() || 'Untitled automation',
        hours: draft.trigger === 'NO_ACTIVITY' || draft.trigger === 'TASK_OVERDUE' ? draft.hours : undefined,
        toStage: draft.trigger === 'STAGE_CHANGED' ? draft.toStage : undefined,
      };
      return id ? lmsApi.updateAutomation(id, body) : lmsApi.createAutomation(body);
    },
    onSuccess: () => {
      toast.success(id ? 'Automation saved' : 'Automation added');
      onSaved();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The automation wasn't saved. Try again.")),
  });

  const usedConditions = Object.keys(draft.conditions) as ConditionKey[];
  const freeConditions = (Object.keys(CONDITION_WORDS) as ConditionKey[]).filter((k) => !usedConditions.includes(k));
  const setCondition = (key: ConditionKey, value: unknown) =>
    set({ conditions: { ...draft.conditions, [key]: value === '' || value === undefined ? undefined : value } });
  const dropCondition = (key: ConditionKey) => {
    const next = { ...draft.conditions };
    delete next[key];
    set({ conditions: next });
  };
  const setAction = (i: number, action: LmsAutomationAction) => set({ actions: draft.actions.map((a, n) => (n === i ? action : a)) });

  const personOptions = (withAuto: boolean, withAgent: boolean) => (
    <>
      {withAuto && <option value="AUTO">the next person in turn</option>}
      {withAgent && <option value="LEAD_AGENT">the lead's agent</option>}
      {agents.map((a) => (
        <option key={a.userId} value={a.userId}>
          {a.name}
        </option>
      ))}
    </>
  );

  return (
    <LmsDialog open onOpenChange={(open) => !open && onClose()} title={id ? 'Edit automation' : 'New automation'} width="max-w-2xl">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Name">
          <LmsInput value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} placeholder="e.g. Big orders go to Karim" />
        </Field>

        <Sentence word="When">
          <LmsSelect className="!w-auto" value={draft.trigger} onChange={(e) => set({ trigger: e.target.value as LmsAutomationTrigger })}>
            {(Object.keys(TRIGGER_WORDS) as LmsAutomationTrigger[]).map((t) => (
              <option key={t} value={t}>
                {TRIGGER_WORDS[t]}
              </option>
            ))}
          </LmsSelect>
          {(draft.trigger === 'NO_ACTIVITY' || draft.trigger === 'TASK_OVERDUE') && (
            <>
              <LmsInput
                type="number"
                min={draft.trigger === 'NO_ACTIVITY' ? 1 : 0}
                max={720}
                className="!w-20 tabular-nums"
                aria-label="Hours"
                value={draft.hours ?? ''}
                onChange={(e) => set({ hours: e.target.value === '' ? undefined : Number(e.target.value) })}
                required
              />
              <span className="text-sm">hours</span>
            </>
          )}
          {draft.trigger === 'STAGE_CHANGED' && (
            <LmsSelect
              className="!w-auto"
              aria-label="Stage"
              value={draft.toStage ?? ''}
              onChange={(e) => set({ toStage: (e.target.value || undefined) as LmsAutomationInput['toStage'] })}
            >
              <option value="">any stage</option>
              {LMS_STAGES.map((s) => (
                <option key={s} value={s}>
                  {me.stageLabels[s]}
                </option>
              ))}
            </LmsSelect>
          )}
        </Sentence>

        <div>
          <Sentence word="and only if">
            {usedConditions.length === 0 && <span className="text-sm text-lms-muted">every lead</span>}
          </Sentence>
          <ul className="mt-2 space-y-2">
            {usedConditions.map((key) => (
              <li key={key} className="flex flex-wrap items-center gap-2 pl-4">
                <span className="text-sm">{CONDITION_WORDS[key]}</span>
                <ConditionValue me={me} field={key} value={draft.conditions[key]} onChange={(v) => setCondition(key, v)} />
                <button type="button" aria-label="Remove this condition" onClick={() => dropCondition(key)} className="rounded p-1 text-lms-muted hover:text-lms-ink">
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
          {freeConditions.length > 0 && (
            <LmsSelect
              className="!w-auto mt-2 ml-4"
              aria-label="Add a condition"
              value=""
              onChange={(e) => {
                const key = e.target.value as ConditionKey;
                if (!key) return;
                const first: Record<ConditionKey, unknown> = {
                  kind: 'ORDER',
                  source: 'ORDER',
                  stage: 'NEW',
                  productId: undefined,
                  tag: '',
                  valueAtLeast: 1000,
                  district: BD_DISTRICTS[0],
                  lostReason: me.lostReasons[0],
                };
                set({ conditions: { ...draft.conditions, [key]: first[key] ?? '' } });
              }}
            >
              <option value="">+ Add a condition</option>
              {freeConditions.map((k) => (
                <option key={k} value={k}>
                  {CONDITION_WORDS[k].replace(/ ৳$/, '')}
                </option>
              ))}
            </LmsSelect>
          )}
        </div>

        <div>
          <Sentence word="then" />
          <ul className="mt-2 space-y-2">
            {draft.actions.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 pl-4">
                <LmsSelect
                  className="!w-auto"
                  aria-label="What to do"
                  value={a.type}
                  onChange={(e) => {
                    const type = e.target.value as LmsAutomationAction['type'];
                    const fresh: Record<LmsAutomationAction['type'], LmsAutomationAction> = {
                      ASSIGN: { type: 'ASSIGN', to: 'AUTO' },
                      ADD_TAG: { type: 'ADD_TAG', tag: '' },
                      CREATE_TASK: { type: 'CREATE_TASK', taskType: 'CALL', inMinutes: 60, person: 'LEAD_AGENT' },
                      SEND_SMS: { type: 'SEND_SMS', templateId: templates[0]?.id ?? '' },
                      NOTIFY: { type: 'NOTIFY', person: 'LEAD_AGENT' },
                    };
                    setAction(i, fresh[type]);
                  }}
                >
                  {(Object.keys(ACTION_WORDS) as LmsAutomationAction['type'][]).map((t) => (
                    <option key={t} value={t}>
                      {ACTION_WORDS[t]}
                    </option>
                  ))}
                </LmsSelect>
                {a.type === 'ASSIGN' && (
                  <LmsSelect className="!w-auto" aria-label="Who" value={a.to} onChange={(e) => setAction(i, { ...a, to: e.target.value })}>
                    {personOptions(true, false)}
                  </LmsSelect>
                )}
                {a.type === 'ADD_TAG' && (
                  <LmsInput className="!w-40" aria-label="Tag" required maxLength={40} value={a.tag} onChange={(e) => setAction(i, { ...a, tag: e.target.value })} />
                )}
                {a.type === 'CREATE_TASK' && (
                  <>
                    <LmsSelect className="!w-auto" aria-label="Task type" value={a.taskType} onChange={(e) => setAction(i, { ...a, taskType: e.target.value as LmsTaskType })}>
                      {(Object.keys(LMS_TASK_TYPE_LABELS) as LmsTaskType[]).map((t) => (
                        <option key={t} value={t}>
                          {LMS_TASK_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </LmsSelect>
                    <span className="text-sm">for</span>
                    <LmsSelect className="!w-auto" aria-label="For whom" value={a.person} onChange={(e) => setAction(i, { ...a, person: e.target.value })}>
                      {personOptions(false, true)}
                    </LmsSelect>
                    <LmsSelect className="!w-auto" aria-label="Due" value={a.inMinutes} onChange={(e) => setAction(i, { ...a, inMinutes: Number(e.target.value) })}>
                      {[0, 15, 60, 180, 1440, 4320].map((m) => (
                        <option key={m} value={m}>
                          {minutesWords(m)}
                        </option>
                      ))}
                    </LmsSelect>
                  </>
                )}
                {a.type === 'SEND_SMS' &&
                  (templates.length ? (
                    <LmsSelect className="!w-auto" aria-label="SMS template" value={a.templateId} onChange={(e) => setAction(i, { ...a, templateId: e.target.value })}>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </LmsSelect>
                  ) : (
                    <span className="text-sm text-lms-alert">Add an SMS template in Message templates first.</span>
                  ))}
                {a.type === 'NOTIFY' && (
                  <LmsSelect className="!w-auto" aria-label="Who" value={a.person} onChange={(e) => setAction(i, { ...a, person: e.target.value })}>
                    {personOptions(false, true)}
                  </LmsSelect>
                )}
                {draft.actions.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove this step"
                    onClick={() => set({ actions: draft.actions.filter((_, n) => n !== i) })}
                    className="rounded p-1 text-lms-muted hover:text-lms-ink"
                  >
                    <X size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {draft.actions.length < 5 && (
            <LmsButton variant="quiet" className="mt-1 ml-1" onClick={() => set({ actions: [...draft.actions, { type: 'ADD_TAG', tag: '' }] })}>
              <Plus size={15} />
              And also…
            </LmsButton>
          )}
          {draft.actions.some((a) => a.type === 'SEND_SMS') && (
            <p className="mt-2 pl-4 text-xs text-lms-muted">SMS uses your SMS credits. Leads marked do not contact never get one.</p>
          )}
        </div>

        <p className="text-xs text-lms-muted">
          It only acts on what happens after you save it. Automations never move a lead's stage: that stays with what your team records.
        </p>
        <div className="flex justify-end gap-2 border-t border-lms-line pt-4">
          <LmsButton onClick={onClose}>Cancel</LmsButton>
          <LmsButton type="submit" variant="primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : id ? 'Save' : 'Add automation'}
          </LmsButton>
        </div>
      </form>
    </LmsDialog>
  );
}

function Sentence({ word, children }: { word: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 shrink-0 text-sm font-semibold">{word}</span>
      {children}
    </div>
  );
}

function ConditionValue({ me, field, value, onChange }: { me: LmsMe; field: ConditionKey; value: unknown; onChange: (value: unknown) => void }) {
  switch (field) {
    case 'kind':
      return (
        <LmsSelect className="!w-auto" aria-label="Kind" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {Object.entries(LMS_KIND_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </LmsSelect>
      );
    case 'source':
      return (
        <LmsSelect className="!w-auto" aria-label="Came from" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {Object.entries(LMS_SOURCE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </LmsSelect>
      );
    case 'stage':
      return (
        <LmsSelect className="!w-auto" aria-label="Stage" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {LMS_STAGES.map((s) => (
            <option key={s} value={s}>
              {me.stageLabels[s]}
            </option>
          ))}
        </LmsSelect>
      );
    case 'lostReason':
      return (
        <LmsSelect className="!w-auto" aria-label="Lost reason" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {me.lostReasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </LmsSelect>
      );
    case 'district':
      return (
        <LmsSelect className="!w-auto" aria-label="District" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {BD_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </LmsSelect>
      );
    case 'valueAtLeast':
      return (
        <LmsInput
          type="number"
          min={0}
          className="!w-32 tabular-nums"
          aria-label="Value at least"
          required
          value={value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      );
    case 'tag':
      return (
        <LmsInput
          className="!w-40"
          aria-label="Tag"
          required
          maxLength={40}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value.trim().toLowerCase())}
        />
      );
    case 'productId':
      return <ProductPicker value={value as string | undefined} onChange={onChange} />;
  }
}

/** Search the store's products by name and pick one. */
function ProductPicker({ value, onChange }: { value: string | undefined; onChange: (id: string | undefined) => void }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const products = useQuery({
    queryKey: ['lms', 'automation-products', debounced],
    queryFn: () => productsApi.list({ search: debounced || undefined, perPage: 50 }),
    staleTime: 60_000,
  });
  const list = products.data?.products ?? [];
  return (
    <>
      <LmsInput className="!w-40" aria-label="Search products" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
      <LmsSelect className="!w-auto max-w-[16rem]" aria-label="Product" required value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">Pick a product</option>
        {list.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </LmsSelect>
    </>
  );
}
