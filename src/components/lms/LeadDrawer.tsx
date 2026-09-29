import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, X } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import {
  LMS_KIND_LABELS,
  LMS_SOURCE_LABELS,
  LMS_REMIND_DAYS,
  LMS_STAGES,
  lmsApi,
  type LmsActivity,
  type LmsFieldDef,
  type LmsLeadDetail,
  type LmsMe,
  type LmsStage,
  type UpdateLmsLead,
} from '../../lib/lmsApi';
import { BD_DISTRICTS, divisionOf } from '../../lib/bdDistricts';
import { DashboardLink } from './LmsLayout';
import { agoPhrase, formatDateTime, formatMoney, formatPhone } from './format';
import { MessageButtons } from './MessageComposer';
import { AgentSelect } from './Team';
import { FollowUps } from './FollowUps';
import { RemindPicker } from './DuePicker';
import { STAGE_RULE } from './stageStyles';
import { Field, LmsButton, LmsDrawer, LmsInput, LmsSelect, LmsTextarea, StageMark } from './ui';
import { changedExtraValues, ExtraFieldInputs, formatExtraValue, toExtraValues, useLmsFields } from './ExtraFields';

/**
 * LMS > Leads > one lead: contact keys on top, then the details, tags and
 * the actions, then the timeline (newest first). Everything that changes
 * the lead is written to the timeline by the server.
 */
export function LeadDrawer({ leadId, me, onClose }: { leadId: string | null; me: LmsMe; onClose: () => void }) {
  return (
    <LmsDrawer open={!!leadId} onOpenChange={(open) => !open && onClose()} title="Lead">
      {leadId && <LeadDrawerBody key={leadId} leadId={leadId} me={me} onGone={onClose} />}
    </LmsDrawer>
  );
}

type Panel = 'none' | 'edit' | 'lost' | 'notNow' | 'cancel' | 'merge';

/** "Not now": close the lead and pick when it reopens by itself. */
function NotNowPicker({ busy, onClose, onCancel }: { busy: boolean; onClose: (days: number | null) => void; onCancel: () => void }) {
  const [days, setDays] = useState<number | null>(7);
  return (
    <section className="space-y-3 border-b border-lms-line bg-lms-page px-5 py-4">
      <RemindPicker days={days} onChange={setDays} options={LMS_REMIND_DAYS} />
      <div className="flex gap-2">
        <LmsButton variant="primary" disabled={busy} onClick={() => onClose(days)}>
          {days ? `Close, remind in ${days} days` : 'Close without a reminder'}
        </LmsButton>
        <LmsButton variant="quiet" onClick={onCancel}>
          Cancel
        </LmsButton>
      </div>
    </section>
  );
}

function LeadDrawerBody({ leadId, me, onGone }: { leadId: string; me: LmsMe; onGone: () => void }) {
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>('none');
  const fieldsQuery = useLmsFields();
  const fieldDefs = fieldsQuery.data ?? [];
  const leadQuery = useQuery({ queryKey: ['lms', 'lead', leadId], queryFn: () => lmsApi.getLead(leadId), retry: false });

  // Every change returns the fresh lead: show it, and refresh the list behind the drawer.
  const apply = (lead: LmsLeadDetail) => {
    queryClient.setQueryData(['lms', 'lead', leadId], lead);
    queryClient.invalidateQueries({ queryKey: ['lms', 'leads'] });
  };
  const onError = (fallback: string) => (err: unknown) => toast.error(apiErrorMessage(err, fallback));

  const update = useMutation({
    mutationFn: (body: UpdateLmsLead) => lmsApi.updateLead(leadId, body),
    onSuccess: apply,
    onError: onError("The change wasn't saved. Try again."),
  });
  const close = useMutation({
    mutationFn: ({ outcome, reason, remindInDays }: { outcome: 'WON' | 'LOST'; reason?: string; remindInDays?: number }) =>
      lmsApi.closeLead(leadId, outcome, reason, remindInDays),
    onSuccess: (lead, vars) => {
      apply(lead);
      setPanel('none');
      queryClient.invalidateQueries({ queryKey: ['lms', 'lead-tasks', leadId] });
      toast.success(
        lead.stage === 'WON' ? 'Marked as won' : vars.remindInDays ? `Closed. It reopens in ${vars.remindInDays} days.` : 'Marked as lost',
      );
    },
    onError: onError("The lead wasn't closed. Try again."),
  });
  const reopen = useMutation({
    mutationFn: () => lmsApi.reopenLead(leadId),
    onSuccess: (lead) => {
      apply(lead);
      toast.success('Lead reopened');
    },
    onError: onError("The lead wasn't reopened. Try again."),
  });
  // An order lead is confirmed or cancelled the same way as on the Call Desk: the order itself changes.
  const orderOutcome = useMutation({
    mutationFn: ({ outcome, reason }: { outcome: 'WIN' | 'LOSE'; reason?: string }) => lmsApi.recordContact(leadId, { outcome, reason }),
    onSuccess: ({ lead }) => {
      apply(lead);
      setPanel('none');
      toast.success(lead.stage === 'WON' ? `Order #${lead.order?.invoiceNumber} confirmed` : `Order #${lead.order?.invoiceNumber} cancelled`);
    },
    onError: onError("The order wasn't changed. Try again."),
  });
  const reassign = useMutation({
    mutationFn: (userId: string | null) => lmsApi.assignLead(leadId, userId),
    onSuccess: (lead) => {
      apply(lead);
      toast.success(lead.assignedTo ? `Assigned to ${lead.assignedTo.name}` : 'Moved to the unassigned pool');
    },
    onError: onError("The lead wasn't reassigned. Try again."),
  });
  const move = useMutation({
    mutationFn: (stage: 'NEW' | 'TRYING' | 'IN_TALKS') => lmsApi.moveStage(leadId, stage),
    onSuccess: apply,
    onError: onError("The stage wasn't changed. Try again."),
  });

  if (leadQuery.isPending) return <p className="p-6 text-sm text-lms-muted">Loading…</p>;
  if (leadQuery.isError) {
    return (
      <div className="p-6 pr-12">
        <p className="text-sm">{apiErrorMessage(leadQuery.error, "This lead couldn't load.")}</p>
        <LmsButton className="mt-4" onClick={onGone}>
          Close
        </LmsButton>
      </div>
    );
  }

  const lead = leadQuery.data;
  const isClosed = lead.stage === 'WON' || lead.stage === 'LOST';
  const isOrderLead = !!lead.order;

  // The old LMS's status dropdown, through the same rules as the board.
  const pickStage = (stage: LmsStage) => {
    if (stage === lead.stage) return;
    if (stage === 'WON') close.mutate({ outcome: 'WON' });
    else if (stage === 'LOST') setPanel('lost');
    else move.mutate(stage);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Who, and how to reach them */}
      <header className="border-b border-lms-line px-5 pb-4 pt-5 pr-12">
        <h2 className="text-lg font-semibold leading-tight">{lead.name}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-lms-muted">
          <StageMark stage={lead.stage} label={me.stageLabels[lead.stage]} />
          <span>{LMS_KIND_LABELS[lead.kind]}</span>
          {lead.isStale && <span className="font-medium text-lms-alert">stale</span>}
        </p>
        {lead.stage === 'LOST' && lead.lostReason && <p className="mt-1 text-sm">Lost: {lead.lostReason}</p>}

        <p className="mt-4 text-[22px] font-semibold tabular-nums tracking-wide">{formatPhone(lead.phone)}</p>
        {lead.doNotContact ? (
          <p className="mt-2 text-sm font-medium text-lms-alert">Do not contact this person.</p>
        ) : (
          <div className="mt-3 flex gap-2">
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-lms-call px-4 text-sm font-medium text-white hover:opacity-90"
            >
              <Phone size={16} /> Call
            </a>
            <MessageButtons lead={lead} me={me} onSent={apply} />
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Actions */}
        <section className="flex flex-wrap items-center gap-2 border-b border-lms-line px-5 py-3">
          {isOrderLead && lead.order ? (
            <>
              <p className="w-full text-sm text-lms-muted">
                This lead is{' '}
                {/* Opens the order in the dashboard, in a new tab so the LMS stays open. */}
                <DashboardLink to={`/vendor/orders/${lead.order.id}`} className="font-medium text-lms-ink underline">
                  order #{lead.order.invoiceNumber}
                </DashboardLink>
                {isClosed ? '.' : ', waiting for its confirmation call.'}
              </p>
              {!isClosed && (
                <>
                  <LmsButton variant="primary" disabled={orderOutcome.isPending} onClick={() => orderOutcome.mutate({ outcome: 'WIN' })}>
                    Confirm order
                  </LmsButton>
                  <LmsButton onClick={() => setPanel(panel === 'cancel' ? 'none' : 'cancel')}>Cancel order</LmsButton>
                </>
              )}
            </>
          ) : isClosed ? (
            <LmsButton onClick={() => reopen.mutate()} disabled={reopen.isPending}>
              Reopen
            </LmsButton>
          ) : (
            <>
              <DashboardLink
                to={`/vendor/orders/add?fromLead=${lead.id}`}
                className="inline-flex h-9 items-center rounded-md bg-lms-ink px-3.5 text-sm font-medium text-white hover:opacity-90"
              >
                Create order
              </DashboardLink>
              <LmsButton onClick={() => close.mutate({ outcome: 'WON' })} disabled={close.isPending}>
                Mark as won
              </LmsButton>
              <LmsButton onClick={() => setPanel(panel === 'lost' ? 'none' : 'lost')}>Mark as lost</LmsButton>
            </>
          )}
          {!(isOrderLead && isClosed) && (
            <LmsSelect
              aria-label="Stage"
              className="!w-auto"
              value={lead.stage}
              disabled={move.isPending || close.isPending}
              onChange={(e) => pickStage(e.target.value as LmsStage)}
            >
              {LMS_STAGES.filter((st) => !isOrderLead || st === lead.stage || (st !== 'WON' && st !== 'LOST')).map((st) => (
                <option key={st} value={st}>
                  {me.stageLabels[st]}
                </option>
              ))}
            </LmsSelect>
          )}
          <LmsButton variant="quiet" onClick={() => setPanel(panel === 'edit' ? 'none' : 'edit')}>
            Edit
          </LmsButton>
          <LmsButton variant="quiet" onClick={() => setPanel(panel === 'merge' ? 'none' : 'merge')}>
            Merge
          </LmsButton>
        </section>

        {panel === 'lost' && (
          <LostReasonPicker
            reasons={me.lostReasons}
            busy={close.isPending}
            onCancel={() => setPanel('none')}
            // "Not now" asks when to try again before closing.
            onPick={(reason) => (reason === 'Not now' ? setPanel('notNow') : close.mutate({ outcome: 'LOST', reason }))}
          />
        )}
        {panel === 'notNow' && <NotNowPicker busy={close.isPending} onCancel={() => setPanel('none')} onClose={(days) => close.mutate({ outcome: 'LOST', reason: 'Not now', remindInDays: days ?? undefined })} />}
        {panel === 'cancel' && (
          <LostReasonPicker
            title={`Why is order #${lead.order?.invoiceNumber} cancelled?`}
            reasons={me.lostReasons.filter((r) => r !== 'Not reachable')}
            busy={orderOutcome.isPending}
            onCancel={() => setPanel('none')}
            onPick={(reason) => orderOutcome.mutate({ outcome: 'LOSE', reason })}
          />
        )}
        {panel === 'edit' && (
          <EditLead lead={lead} fieldDefs={fieldDefs} busy={update.isPending} onCancel={() => setPanel('none')} onSave={(body) => update.mutate(body, { onSuccess: () => setPanel('none') })} />
        )}
        {panel === 'merge' && <MergePicker lead={lead} onCancel={() => setPanel('none')} onMerged={(merged) => { apply(merged); setPanel('none'); }} />}

        {/* Details */}
        <section className="border-b border-lms-line px-5 py-4">
          <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2 text-sm">
            <Detail label="Product">{lead.productSummary}</Detail>
            <Detail label="Quantity">{lead.quantity}</Detail>
            <Detail label="Value">{lead.value !== null ? <span className="tabular-nums">{formatMoney(lead.value)}</span> : null}</Detail>
            <Detail label="Second phone">{lead.phoneAlt ? <span className="tabular-nums">{formatPhone(lead.phoneAlt)}</span> : null}</Detail>
            <Detail label="Email">{lead.email}</Detail>
            <Detail label="Address">{lead.address}</Detail>
            <Detail label="District">{lead.district}</Detail>
            <Detail label="Division">{lead.division ?? divisionOf(lead.district)}</Detail>
            <Detail label="Area">{lead.area}</Detail>
            <Detail label="They wrote">{lead.message}</Detail>
            <Detail label="Assigned to">
              {me.isManager ? (
                <AgentSelect
                  me={me}
                  extra={['POOL']}
                  aria-label="Assigned to"
                  className="!h-8 !w-auto"
                  value={lead.assignedTo?.id ?? 'POOL'}
                  disabled={reassign.isPending}
                  onChange={(e) => reassign.mutate(e.target.value === 'POOL' ? null : e.target.value)}
                />
              ) : (
                (lead.assignedTo?.name ?? 'Nobody yet')
              )}
            </Detail>
            <Detail label="Came from">{`${LMS_SOURCE_LABELS[lead.source]}, ${agoPhrase(lead.createdAt)}`}</Detail>
            <Detail label="Tries">{lead.attemptCount ? String(lead.attemptCount) : null}</Detail>
          </dl>
        </section>

        {/* Extra fields: only the ones that have a value */}
        {fieldDefs.some((d) => formatExtraValue(d, lead.customFields?.[d.key])) && (
          <section className="border-b border-lms-line px-5 py-4">
            <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2 text-sm">
              {fieldDefs.map((d) => (
                <Detail key={d.key} label={d.label}>
                  {formatExtraValue(d, lead.customFields?.[d.key]) || null}
                </Detail>
              ))}
            </dl>
          </section>
        )}

        {/* Tags and contact permission */}
        <section className="space-y-4 border-b border-lms-line px-5 py-4">
          <TagEditor tags={lead.tags} busy={update.isPending} onChange={(tags) => update.mutate({ tags })} />
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--lms-ink)]"
              checked={lead.doNotContact}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ doNotContact: e.target.checked })}
            />
            <span>
              <span className="block font-medium">Do not contact</span>
              <span className="block text-lms-muted">Keeps this person out of calls, retries and SMS.</span>
            </span>
          </label>
        </section>

        <FollowUps lead={lead} me={me} onChanged={() => void leadQuery.refetch()} />
        <NoteBox leadId={leadId} onSaved={apply} />
        <Timeline activities={lead.activities} me={me} />
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <>
      <dt className="text-lms-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function LostReasonPicker({
  title = 'Why was it lost?',
  reasons,
  busy,
  onPick,
  onCancel,
}: {
  title?: string;
  reasons: string[];
  busy: boolean;
  onPick: (reason: string) => void;
  onCancel: () => void;
}) {
  return (
    <section className="border-b border-lms-line bg-lms-page px-5 py-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <LmsButton key={reason} disabled={busy} onClick={() => onPick(reason)}>
            {reason}
          </LmsButton>
        ))}
      </div>
      <LmsButton variant="quiet" className="mt-3" onClick={onCancel}>
        Cancel
      </LmsButton>
    </section>
  );
}

function EditLead({
  lead,
  fieldDefs,
  busy,
  onSave,
  onCancel,
}: {
  lead: LmsLeadDetail;
  fieldDefs: LmsFieldDef[];
  busy: boolean;
  onSave: (body: UpdateLmsLead) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: lead.name,
    phone: lead.phone,
    phoneAlt: lead.phoneAlt ?? '',
    email: lead.email ?? '',
    productSummary: lead.productSummary ?? '',
    quantity: lead.quantity?.toString() ?? '',
    value: lead.value?.toString() ?? '',
    address: lead.address ?? '',
    district: lead.district ?? '',
    area: lead.area ?? '',
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  // An order lead's contact changes are saved on the order too (before it ships); its email stays the order's.
  const onOrder = !!lead.order;
  const extraBefore = toExtraValues(fieldDefs, lead.customFields);
  const [extra, setExtra] = useState(extraBefore);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = (v: string) => v.trim() || null;
    const num = (v: string) => (v.trim() === '' ? null : Number(v));
    const body: UpdateLmsLead = { productSummary: text(form.productSummary), quantity: num(form.quantity), value: num(form.value) };
    Object.assign(body, {
      name: form.name.trim(),
      phone: form.phone.trim(),
      phoneAlt: text(form.phoneAlt),
      ...(onOrder ? {} : { email: text(form.email) }),
      address: text(form.address),
      district: form.district || null,
      area: text(form.area),
    });
    const changedExtra = changedExtraValues(extraBefore, extra);
    if (Object.keys(changedExtra).length) body.customFields = changedExtra;
    onSave(body);
  };

  return (
    <form onSubmit={submit} className="space-y-3 border-b border-lms-line bg-lms-page px-5 py-4">
      {onOrder && (
        <p className="text-sm text-lms-muted">Contact changes are saved on order #{lead.order?.invoiceNumber} too, until it ships.</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <LmsInput value={form.name} onChange={set('name')} required maxLength={120} />
        </Field>
        <Field label="Phone">
          <LmsInput value={form.phone} onChange={set('phone')} required inputMode="tel" className="tabular-nums" />
        </Field>
        <Field label="Second phone">
          <LmsInput value={form.phoneAlt} onChange={set('phoneAlt')} inputMode="tel" className="tabular-nums" />
        </Field>
        {!onOrder && (
          <Field label="Email">
            <LmsInput type="email" value={form.email} onChange={set('email')} />
          </Field>
        )}
      </div>
      <Field label="Address">
        <LmsInput value={form.address} onChange={set('address')} maxLength={1000} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="District" hint={form.district ? `Division: ${divisionOf(form.district) ?? 'not known'}` : undefined}>
          <LmsSelect value={form.district} onChange={set('district')}>
            <option value="">Not known yet</option>
            {BD_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </LmsSelect>
        </Field>
        <Field label="Area">
          <LmsInput value={form.area} onChange={set('area')} maxLength={120} />
        </Field>
      </div>
      <ExtraFieldInputs defs={fieldDefs} values={extra} onChange={(key, value) => setExtra((x) => ({ ...x, [key]: value }))} />
      <Field label="Product or interest">
        <LmsInput value={form.productSummary} onChange={set('productSummary')} maxLength={500} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity">
          <LmsInput type="number" min={1} value={form.quantity} onChange={set('quantity')} className="tabular-nums" />
        </Field>
        <Field label="Value (৳)">
          <LmsInput type="number" min={0} step="0.01" value={form.value} onChange={set('value')} className="tabular-nums" />
        </Field>
      </div>
      <div className="flex gap-2 pt-1">
        <LmsButton type="submit" variant="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </LmsButton>
        <LmsButton variant="quiet" onClick={onCancel}>
          Cancel
        </LmsButton>
      </div>
    </form>
  );
}

function TagEditor({ tags, busy, onChange }: { tags: string[]; busy: boolean; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const tag = draft.trim().toLowerCase();
    setDraft('');
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
  };
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">Tags</p>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex h-7 items-center gap-1 rounded-md border border-lms-line pl-2.5 pr-1 text-sm">
            {tag}
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="rounded p-0.5 text-lms-muted hover:text-lms-ink"
              aria-label={`Remove tag ${tag}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        <LmsInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          maxLength={40}
          placeholder="Add a tag"
          className="!h-7 !w-32"
          disabled={busy || tags.length >= 20}
        />
      </div>
    </div>
  );
}

function MergePicker({ lead, onMerged, onCancel }: { lead: LmsLeadDetail; onMerged: (lead: LmsLeadDetail) => void; onCancel: () => void }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<{ id: string; name: string; phone: string } | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const results = useQuery({
    queryKey: ['lms', 'leads', 'merge-search', debounced],
    queryFn: () => lmsApi.listLeads({ q: debounced, perPage: '30' }, 1),
    enabled: debounced.length >= 2,
  });
  const merge = useMutation({
    mutationFn: (otherId: string) => lmsApi.mergeLead(lead.id, otherId),
    onSuccess: (merged) => {
      toast.success('Leads merged');
      onMerged(merged);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The leads weren't merged. Try again.")),
  });

  const options = (results.data?.leads ?? []).filter((l) => l.id !== lead.id);

  return (
    <section className="border-b border-lms-line bg-lms-page px-5 py-4">
      <p className="text-sm font-medium">Merge another lead into this one</p>
      <p className="mt-1 text-sm text-lms-muted">Its history moves here, and it's removed. This lead's details stay.</p>
      {picked ? (
        <div className="mt-3">
          <p className="text-sm">
            Merge <span className="font-medium">{picked.name}</span> ({formatPhone(picked.phone)}) into {lead.name}?
          </p>
          <div className="mt-3 flex gap-2">
            <LmsButton variant="primary" disabled={merge.isPending} onClick={() => merge.mutate(picked.id)}>
              {merge.isPending ? 'Merging…' : 'Merge'}
            </LmsButton>
            <LmsButton variant="quiet" onClick={() => setPicked(null)}>
              Back
            </LmsButton>
          </div>
        </div>
      ) : (
        <>
          <LmsInput className="mt-3" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" autoFocus />
          {debounced.length >= 2 && (
            <ul className="mt-2 divide-y divide-lms-line rounded-md border border-lms-line bg-lms-surface">
              {results.isPending ? (
                <li className="px-3 py-2 text-sm text-lms-muted">Searching…</li>
              ) : options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-lms-muted">No other lead matches.</li>
              ) : (
                options.slice(0, 8).map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(o)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-lms-page"
                    >
                      <span className="truncate font-medium">{o.name}</span>
                      <span className="shrink-0 tabular-nums text-lms-muted">{formatPhone(o.phone)}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          <LmsButton variant="quiet" className="mt-3" onClick={onCancel}>
            Cancel
          </LmsButton>
        </>
      )}
    </section>
  );
}

function NoteBox({ leadId, onSaved }: { leadId: string; onSaved: (lead: LmsLeadDetail) => void }) {
  const [text, setText] = useState('');
  const add = useMutation({
    mutationFn: () => lmsApi.addNote(leadId, text.trim()),
    onSuccess: (lead) => {
      setText('');
      onSaved(lead);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The note wasn't saved. Try again.")),
  });
  return (
    <section className="border-b border-lms-line px-5 py-4">
      <LmsTextarea rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Add a note for the team" />
      <LmsButton className="mt-2" disabled={!text.trim() || add.isPending} onClick={() => add.mutate()}>
        {add.isPending ? 'Saving…' : 'Add note'}
      </LmsButton>
    </section>
  );
}

const TIMELINE_DOT: Record<string, string> = {
  NOTE: 'bg-lms-ink',
  SYSTEM: 'bg-lms-muted',
  ASSIGN: 'bg-lms-muted',
};

function Timeline({ activities, me }: { activities: LmsActivity[]; me: LmsMe }) {
  if (!activities.length) return null;
  return (
    <section className="px-5 py-4">
      <h3 className="mb-3 text-[13px] font-medium">History</h3>
      <ol className="relative ml-1 border-l border-lms-line">
        {activities.map((a) => {
          const dot = a.toStage ? STAGE_RULE[a.toStage] : (TIMELINE_DOT[a.type] ?? 'bg-lms-muted');
          return (
            <li key={a.id} className="relative pb-4 pl-5 last:pb-0">
              <span aria-hidden className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--lms-surface)] ${dot}`} />
              <p className={`text-sm ${a.type === 'NOTE' ? 'whitespace-pre-wrap' : ''}`}>
                {a.type === 'STAGE' && a.toStage && !a.text ? `Moved to ${me.stageLabels[a.toStage]}` : a.text}
              </p>
              <p className="mt-0.5 text-xs text-lms-muted">
                {a.actorName ? `${a.actorName}, ` : ''}
                {formatDateTime(a.createdAt)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
