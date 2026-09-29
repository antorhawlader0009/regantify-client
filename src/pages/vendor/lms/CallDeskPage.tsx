import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { EmptyState, LmsPage, Panel } from '../../../components/lms/LmsPage';
import { DashboardLink } from '../../../components/lms/LmsLayout';
import { LeadDrawer } from '../../../components/lms/LeadDrawer';
import { MessageButtons } from '../../../components/lms/MessageComposer';
import { CustomerPanel } from '../../../components/lms/CustomerPanel';
import { ShiftSwitch } from '../../../components/lms/Team';
import { DuePicker, RemindPicker } from '../../../components/lms/DuePicker';
import { LmsButton, LmsInput, StageMark } from '../../../components/lms/ui';
import { fillTemplate, formatDateTime, formatMoney, formatPhone, leadTemplateVars, minutesSince, timeAgo } from '../../../components/lms/format';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import {
  LMS_KIND_LABELS,
  LMS_REMIND_DAYS,
  lmsApi,
  type LmsDeskFilter,
  type LmsDeskNext,
  type LmsDeskOutcome,
  type LmsLeadDetail,
  type LmsMe,
} from '../../../lib/lmsApi';

/*
 * LMS > Call Desk (LMS-plan.md Step 5, "The one memorable thing"): one lead
 * at a time, the phone number big, and the outcome keypad laid out like a
 * phone dialer. Keys sit in the same place for every lead; only 1 and 6
 * change their words (order leads confirm / cancel the order, everything
 * else creates an order / is not interested). The keyboard matches the
 * keys: 1-7, * or S to skip, # or Enter to save, Esc to clear.
 */

type Tone = 'won' | 'talks' | 'trying' | 'lost' | 'alert';

interface OutcomeKey {
  digit: string;
  outcome: LmsDeskOutcome;
  tone: Tone;
  label: (isOrder: boolean) => string;
}

const OUTCOME_KEYS: OutcomeKey[] = [
  { digit: '1', outcome: 'WIN', tone: 'won', label: (o) => (o ? 'Confirm order' : 'Create order') },
  { digit: '2', outcome: 'CALL_LATER', tone: 'talks', label: () => 'Call later' },
  { digit: '3', outcome: 'NO_ANSWER', tone: 'trying', label: () => 'No answer' },
  { digit: '4', outcome: 'BUSY', tone: 'trying', label: () => 'Busy' },
  { digit: '5', outcome: 'SWITCHED_OFF', tone: 'trying', label: () => 'Switched off' },
  { digit: '6', outcome: 'LOSE', tone: 'lost', label: (o) => (o ? 'Cancel order' : 'Not interested') },
  { digit: '7', outcome: 'WRONG_NUMBER', tone: 'alert', label: () => 'Wrong number / fake' },
];

// A picked key fills with the colour of the stage it leads to.
const PICKED: Record<Tone, string> = {
  won: 'bg-lms-stage-won border-lms-stage-won text-white',
  talks: 'bg-lms-stage-talks border-lms-stage-talks text-white',
  trying: 'bg-lms-stage-trying border-lms-stage-trying text-white',
  lost: 'bg-lms-stage-lost border-lms-stage-lost text-white',
  alert: 'bg-lms-alert border-lms-alert text-white',
};

const FILTERS: { value: LmsDeskFilter | undefined; label: string }[] = [
  { value: undefined, label: 'Everything' },
  { value: 'ORDERS', label: 'Orders' },
  { value: 'OTHERS', label: 'Other leads' },
];

export default function CallDeskPage() {
  return <LmsPage title="Call Desk">{(me) => <Desk me={me} />}</LmsPage>;
}

function Desk({ me }: { me: LmsMe }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<LmsDeskFilter | undefined>(undefined);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [desk, setDesk] = useState<LmsDeskNext | null>(null);
  // An enquiry the agent is turning into an order: wait on it until they move on.
  const [creatingOrder, setCreatingOrder] = useState<LmsLeadDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [turn, setTurn] = useState(0);

  // One request at a time: each one can claim a lead from the pool, so a double click
  // (or React running the first load twice in development) must not claim two.
  const inFlight = useRef(false);
  const next = useMutation({
    mutationFn: (skip: string[]) => lmsApi.deskNext({ filter, skip }),
    onSuccess: (data) => {
      setDesk(data);
      setTurn((t) => t + 1);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The next lead didn't load. Try again.")),
    onSettled: () => {
      inFlight.current = false;
    },
  });
  const loadNext = useCallback(
    (skip: string[]) => {
      if (inFlight.current) return;
      inFlight.current = true;
      next.mutate(skip);
    },
    [next],
  );

  // First load, and again whenever the filter changes (the skipped list starts over).
  useEffect(() => {
    setSkipped([]);
    setCreatingOrder(null);
    loadNext([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const skip = () => {
    if (!desk?.lead) return;
    const list = [...skipped, desk.lead.id];
    setSkipped(list);
    loadNext(list);
  };

  const onSaved = (lead: LmsLeadDetail, createOrder: boolean) => {
    queryClient.invalidateQueries({ queryKey: ['lms', 'leads'] });
    queryClient.invalidateQueries({ queryKey: ['lms', 'notifications'] });
    if (createOrder) {
      setCreatingOrder(lead);
      return;
    }
    loadNext(skipped);
  };

  const refreshCurrent = async () => {
    if (!desk?.lead) return;
    try {
      const fresh = await lmsApi.getLead(desk.lead.id);
      setDesk((d) => (d ? { ...d, lead: fresh } : d));
    } catch {
      // The drawer shows its own errors.
    }
  };

  const queue = desk?.queue;
  const lead = desk?.lead ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-lms-muted tabular-nums" aria-live="polite">
          {queue
            ? `${queue.waiting} waiting, ${queue.callbacksDue} callback${queue.callbacksDue === 1 ? '' : 's'} due`
            : 'Loading the queue…'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ShiftSwitch me={me} />
          <div role="group" aria-label="Which leads" className="inline-flex rounded-md border border-lms-line bg-lms-surface p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`h-9 rounded px-3 text-sm font-medium ${filter === f.value ? 'bg-lms-ink text-white' : 'text-lms-muted hover:text-lms-ink'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {!me.available && (
        <p className="text-sm text-lms-muted">
          You're away, so new leads aren't shared to you. You can still call your own leads and take ones from the pool here.
        </p>
      )}

      {creatingOrder ? (
        <CreatingOrder lead={creatingOrder} onNext={() => { setCreatingOrder(null); loadNext(skipped); }} />
      ) : !desk ? (
        <Panel>
          <p className="text-sm text-lms-muted">Loading…</p>
        </Panel>
      ) : !lead ? (
        <Panel>
          <EmptyState
            title="You're all caught up"
            text={
              skipped.length
                ? `You skipped ${skipped.length} lead${skipped.length === 1 ? '' : 's'}. Start over to see them again.`
                : 'New leads will appear here, one at a time, ready to call.'
            }
          />
          <div className="-mt-6 flex flex-wrap gap-2 pb-4">
            <LmsButton disabled={next.isPending} onClick={() => loadNext(skipped)}>
              Check again
            </LmsButton>
            {skipped.length > 0 && (
              <LmsButton variant="quiet" onClick={() => { setSkipped([]); loadNext([]); }}>
                Start over
              </LmsButton>
            )}
          </div>
        </Panel>
      ) : (
        <div key={`${lead.id}-${turn}`} className="lms-slide-in grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <CallSheet
            desk={desk as LmsDeskNext & { lead: LmsLeadDetail }}
            me={me}
            busy={next.isPending}
            onSkip={skip}
            onSaved={onSaved}
            onOpenLead={() => setDrawerOpen(true)}
            onLeadChanged={(fresh) => setDesk((d) => (d ? { ...d, lead: fresh } : d))}
          />
          <aside className="space-y-5">
            <SidePanel title="This customer">
              <CustomerPanel leadId={lead.id} />
            </SidePanel>
            {desk.script && (
              <SidePanel title="Script">
                <p className="whitespace-pre-wrap text-sm leading-6">{fillTemplate(desk.script, leadTemplateVars(lead, me))}</p>
              </SidePanel>
            )}
          </aside>
        </div>
      )}

      <LeadDrawer
        leadId={drawerOpen && lead ? lead.id : null}
        me={me}
        onClose={() => {
          setDrawerOpen(false);
          void refreshCurrent();
        }}
      />
    </div>
  );
}

/** A right-column panel; on a phone it folds into a disclosure under the keypad. */
function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Panel className="hidden lg:block">
        <h2 className="mb-3 text-sm font-semibold">{title}</h2>
        {children}
      </Panel>
      <details className="rounded-[10px] border border-lms-line bg-lms-surface lg:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center px-5 text-sm font-semibold">{title}</summary>
        <div className="px-5 pb-5">{children}</div>
      </details>
    </>
  );
}

// ------------------------------------------------------------------ the sheet

function reasonLine(desk: LmsDeskNext): string {
  switch (desk.reason) {
    case 'CALLBACK':
      return desk.task ? `Callback due ${formatDateTime(desk.task.dueAt)}` : 'Callback due';
    case 'RETRY':
      return desk.lead ? `Try again: attempt ${desk.lead.attemptCount + 1}` : 'Try again';
    case 'POOL':
      return 'New, picked up for you';
    default:
      return 'New';
  }
}

function CallSheet({
  desk,
  me,
  busy,
  onSkip,
  onSaved,
  onOpenLead,
  onLeadChanged,
}: {
  desk: LmsDeskNext & { lead: LmsLeadDetail };
  me: LmsMe;
  busy: boolean;
  onSkip: () => void;
  onSaved: (lead: LmsLeadDetail, createOrder: boolean) => void;
  onOpenLead: () => void;
  onLeadChanged: (lead: LmsLeadDetail) => void;
}) {
  const lead = desk.lead;
  const isOrder = lead.kind === 'ORDER' && !!lead.order;
  const [picked, setPicked] = useState<OutcomeKey | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  // "Not now": the lead closes and reopens by itself after these days (not for order leads: their order is cancelled).
  const [remindDays, setRemindDays] = useState<number | null>(null);
  const [callbackAt, setCallbackAt] = useState<string>('');
  const [note, setNote] = useState('');
  const noteRef = useRef<HTMLInputElement>(null);

  const pick = (key: OutcomeKey | null) => {
    setPicked(key);
    setReason(null);
    setRemindDays(null);
    if (key?.outcome !== 'CALL_LATER') setCallbackAt('');
  };

  const save = useMutation({
    mutationFn: () =>
      lmsApi.recordContact(lead.id, {
        outcome: picked!.outcome,
        note: note.trim() || undefined,
        reason: picked!.outcome === 'LOSE' ? (reason ?? undefined) : undefined,
        remindInDays: picked!.outcome === 'LOSE' && !isOrder && remindDays ? remindDays : undefined,
        callbackAt: picked!.outcome === 'CALL_LATER' && callbackAt ? new Date(callbackAt).toISOString() : undefined,
      }),
    onSuccess: ({ lead: fresh, createOrder }) => {
      toast.success(savedMessage(picked!, fresh, isOrder));
      onSaved(fresh, createOrder);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "That wasn't saved. Try again.")),
  });

  const missing =
    !picked
      ? 'Pick what happened'
      : picked.outcome === 'LOSE' && !reason
        ? 'Pick a reason'
        : picked.outcome === 'CALL_LATER' && !callbackAt
          ? 'Pick when to call back'
          : null;
  const canSave = !missing && !save.isPending && !busy;

  // The keypad on the keyboard. Typing in a field never triggers it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
      if (typing) {
        if (e.key === 'Enter' && el === noteRef.current && canSave) {
          e.preventDefault();
          save.mutate();
        }
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      const key = OUTCOME_KEYS.find((k) => k.digit === e.key);
      if (key) {
        e.preventDefault();
        pick(key);
      } else if (e.key === '*' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSkip();
      } else if ((e.key === '#' || e.key === 'Enter') && canSave) {
        e.preventDefault();
        save.mutate();
      } else if (e.key === 'Escape') {
        pick(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const waited = minutesSince(lead.createdAt);
  const waitTone = lead.stage === 'NEW' ? (waited >= 60 ? 'text-lms-alert' : waited >= 15 ? 'text-lms-stage-trying' : 'text-lms-muted') : 'text-lms-muted';
  const place = [lead.address, lead.area, lead.district].filter(Boolean).join(', ');

  return (
    <Panel className="!p-0">
      {/* Who */}
      <div className="border-b border-lms-line px-5 py-5 sm:px-6">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-lms-muted">
          <span className="font-medium text-lms-ink">{reasonLine(desk)}</span>
          <StageMark stage={lead.stage} label={me.stageLabels[lead.stage]} />
          <span>{LMS_KIND_LABELS[lead.kind]}</span>
          <span className={`tabular-nums ${waitTone}`}>waiting {timeAgo(lead.createdAt)}</span>
        </p>
        <h2 className="mt-2 text-base font-semibold">{lead.name}</h2>
        <p className="mt-1 text-[32px] font-semibold leading-tight tracking-wide tabular-nums sm:text-[40px]">{formatPhone(lead.phone)}</p>
        {lead.phoneAlt && <p className="mt-0.5 text-sm text-lms-muted tabular-nums">Also {formatPhone(lead.phoneAlt)}</p>}

        {lead.doNotContact ? (
          <p className="mt-3 text-sm font-medium text-lms-alert">This person asked not to be contacted.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-lms-call px-5 text-sm font-semibold text-white hover:opacity-90"
            >
              <Phone size={17} /> Call
            </a>
            <MessageButtons lead={lead} me={me} onSent={onLeadChanged} size="lg" />
          </div>
        )}

        <dl className="mt-5 grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
          {lead.order && (
            <>
              <dt className="text-lms-muted">Order</dt>
              <dd>
                <DashboardLink to={`/vendor/orders/${lead.order.id}`} className="font-medium underline-offset-2 hover:underline">
                  #{lead.order.invoiceNumber}
                </DashboardLink>
                {lead.value !== null && <span className="ml-2 tabular-nums">{formatMoney(lead.value)}</span>}
              </dd>
            </>
          )}
          {lead.productSummary && (
            <>
              <dt className="text-lms-muted">{isOrder ? 'Items' : 'Interested in'}</dt>
              <dd className="min-w-0 break-words">
                {lead.productSummary}
                {!isOrder && lead.quantity ? ` × ${lead.quantity}` : ''}
                {!lead.order && lead.value !== null && <span className="ml-2 tabular-nums text-lms-muted">{formatMoney(lead.value)}</span>}
              </dd>
            </>
          )}
          {place && (
            <>
              <dt className="text-lms-muted">Address</dt>
              <dd className="min-w-0 break-words">{place}</dd>
            </>
          )}
          {lead.message && (
            <>
              <dt className="text-lms-muted">They wrote</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words">{lead.message}</dd>
            </>
          )}
          {desk.task?.note && (
            <>
              <dt className="text-lms-muted">Callback note</dt>
              <dd className="min-w-0 break-words">{desk.task.note}</dd>
            </>
          )}
        </dl>
        <LmsButton variant="quiet" className="-ml-3.5 mt-3" onClick={onOpenLead}>
          Edit contact and see history
        </LmsButton>
      </div>

      {/* What happened */}
      <div className="px-5 py-5 sm:px-6">
        <h3 id="desk-keypad" className="text-sm font-semibold">
          What happened?
        </h3>
        <div role="group" aria-labelledby="desk-keypad" className="mt-3 grid max-w-md grid-cols-3 gap-2 max-lg:max-w-none">
          {OUTCOME_KEYS.map((k) => {
            const on = picked?.digit === k.digit;
            return (
              <button
                key={k.digit}
                type="button"
                aria-pressed={on}
                aria-keyshortcuts={k.digit}
                onClick={() => pick(on ? null : k)}
                className={`flex min-h-16 flex-col items-start justify-between rounded-[14px] border px-3 py-2.5 text-left ${
                  on ? PICKED[k.tone] : 'border-lms-line bg-lms-surface hover:bg-lms-page'
                }`}
              >
                <span className={`text-xl font-semibold leading-none tabular-nums ${on ? '' : 'text-lms-muted'}`}>{k.digit}</span>
                <span className="mt-2 text-[13px] font-medium leading-tight">{k.label(isOrder)}</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-keyshortcuts="* S"
            onClick={onSkip}
            disabled={busy || save.isPending}
            className="flex min-h-16 flex-col items-start justify-between rounded-[14px] border border-lms-line bg-lms-surface px-3 py-2.5 text-left hover:bg-lms-page disabled:opacity-50"
          >
            <span className="text-xl font-semibold leading-none text-lms-muted">*</span>
            <span className="mt-2 text-[13px] font-medium leading-tight">Skip</span>
          </button>
          <button
            type="button"
            aria-keyshortcuts="# Enter"
            onClick={() => save.mutate()}
            disabled={!canSave}
            className="flex min-h-16 flex-col items-start justify-between rounded-[14px] border border-lms-ink bg-lms-ink px-3 py-2.5 text-left text-white disabled:border-lms-line disabled:bg-lms-surface disabled:text-lms-muted"
          >
            <span className="text-xl font-semibold leading-none">#</span>
            <span className="mt-2 text-[13px] font-medium leading-tight">{save.isPending ? 'Saving…' : 'Save'}</span>
          </button>
        </div>

        {/* What the picked key needs, and what it will do */}
        {picked && (
          <div className="mt-4 max-w-2xl">
            {picked.outcome === 'CALL_LATER' && (
              <DuePicker
                label="When should we call back?"
                value={callbackAt}
                onChange={setCallbackAt}
                pickedClass="border-lms-stage-talks bg-lms-stage-talks text-white"
              />
            )}
            {picked.outcome === 'LOSE' && (
              <div>
                <p className="mb-2 text-[13px] font-medium">Why?</p>
                <div className="flex flex-wrap gap-2">
                  {me.lostReasons
                    .filter((r) => r !== 'Fake / spam' && r !== 'Not reachable')
                    .map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={reason === r}
                        onClick={() => {
                          setReason(r);
                          setRemindDays(r === 'Not now' && !isOrder ? 7 : null);
                        }}
                        className={`h-9 rounded-md border px-3 text-sm ${
                          reason === r ? 'border-lms-stage-lost bg-lms-stage-lost text-white' : 'border-lms-line bg-lms-surface hover:bg-lms-page'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                </div>
              </div>
            )}
            {picked.outcome === 'LOSE' && reason === 'Not now' && !isOrder && (
              <div className="mt-4">
                <RemindPicker days={remindDays} onChange={setRemindDays} options={LMS_REMIND_DAYS} />
              </div>
            )}
            <p className="mt-3 text-sm text-lms-muted">{consequence(picked, lead, isOrder)}</p>
          </div>
        )}

        <label className="mt-4 block max-w-2xl">
          <span className="mb-1 block text-[13px] font-medium">Note</span>
          <LmsInput
            ref={noteRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder="Anything the next person should know (optional)"
          />
        </label>
        {missing && picked && <p className="mt-2 text-sm text-lms-muted">{missing}, then save.</p>}
      </div>
    </Panel>
  );
}

/** What saving the picked key will do, in plain words. */
function consequence(key: OutcomeKey, lead: LmsLeadDetail, isOrder: boolean): string {
  const order = lead.order ? `order #${lead.order.invoiceNumber}` : 'the order';
  switch (key.outcome) {
    case 'WIN':
      return isOrder
        ? `Moves ${order} to Processing. If courier auto-booking is on, it's booked right away.`
        : 'Opens Add Order with their details filled in. The lead closes as won when you save the order.';
    case 'LOSE':
      return isOrder ? `Cancels ${order} and closes the lead.` : 'Closes the lead as lost.';
    case 'WRONG_NUMBER':
      return isOrder ? `Cancels ${order} and closes the lead as fake.` : 'Closes the lead as fake.';
    case 'CALL_LATER':
      return 'Moves the lead to In talks and puts the callback on your list.';
    default:
      return 'Counts a try and brings the lead back for another call later.';
  }
}

function savedMessage(key: OutcomeKey, lead: LmsLeadDetail, isOrder: boolean): string {
  if (key.outcome === 'WIN' && isOrder) return `Order #${lead.order?.invoiceNumber} confirmed`;
  if (key.outcome === 'WIN') return 'Now create the order';
  if (key.outcome === 'CALL_LATER') return 'Callback saved';
  if (lead.stage === 'LOST') return lead.lostReason === 'Not reachable' ? 'Closed: not reachable after the last try' : 'Closed as lost';
  return 'Saved';
}

// --------------------------------------------------------------- create order

function CreatingOrder({ lead, onNext }: { lead: LmsLeadDetail; onNext: () => void }) {
  return (
    <Panel>
      <h2 className="text-base font-semibold">Create the order for {lead.name}</h2>
      <p className="mt-1 max-w-xl text-sm leading-6 text-lms-muted">
        Add Order opens in the dashboard with their details and products filled in. Check the cart and delivery, then save it. This lead
        closes as won by itself.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <DashboardLink
          to={`/vendor/orders/add?fromLead=${lead.id}`}
          className="inline-flex h-10 items-center rounded-md bg-lms-ink px-4 text-sm font-medium text-white hover:opacity-90"
        >
          Open Add Order
        </DashboardLink>
        <LmsButton className="!h-10" onClick={onNext}>
          Next lead
        </LmsButton>
      </div>
    </Panel>
  );
}
