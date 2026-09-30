import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { LmsPage, Panel } from '../../../components/lms/LmsPage';
import { Field, LmsButton, LmsInput, LmsSelect, LmsTextarea } from '../../../components/lms/ui';
import { useLmsFields } from '../../../components/lms/ExtraFields';
import { STAGE_RULE } from '../../../components/lms/stageStyles';
import { LandingBacklogNotice } from '../../../components/lms/LandingBacklog';
import { LMS_TEMPLATES_KEY } from '../../../components/lms/MessageComposer';
import { AttendanceSection, TeamSection } from '../../../components/lms/TeamSettings';
import { AutomationsSection } from '../../../components/lms/Automations';
import { PrivacySection } from '../../../components/lms/PrivacySettings';
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
  type LmsTemplate,
  type LmsTemplateChannel,
  type UpdateLmsSettings,
} from '../../../lib/lmsApi';

/** LMS > Settings. Everything works with the defaults; this page only adjusts. */
export default function LmsSettingsPage() {
  return <LmsPage title="Settings">{(me) => <SettingsBody me={me} />}</LmsPage>;
}

// The shell has no sidebar, so Settings lists its own sections on the left (large screens).
const SECTIONS = [
  { id: 'status', label: 'LMS status' },
  { id: 'team', label: 'Team' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'sources', label: 'Where leads come from' },
  { id: 'retries', label: 'Retry rules' },
  { id: 'stages', label: 'Stages' },
  { id: 'lost-reasons', label: 'Lost reasons' },
  { id: 'templates', label: 'Message templates' },
  { id: 'script', label: 'Call script' },
  { id: 'extra-fields', label: 'Extra fields' },
  { id: 'automations', label: 'Automations' },
  { id: 'privacy', label: 'Privacy' },
];

function SettingsBody({ me }: { me: LmsMe }) {
  const settingsQuery = useQuery({ queryKey: ['lms', 'settings'], queryFn: lmsApi.getSettings });
  const showAll = me.isManager && settingsQuery.isSuccess;

  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,48rem)] lg:gap-10">
      {showAll && <SectionNav />}
      <div className="space-y-5">
        <OnOffSection me={me} />
        {!me.isManager ? (
          <p className="text-sm text-lms-muted">Only the store owner or a lead manager can change the other LMS settings.</p>
        ) : settingsQuery.isPending ? (
          <p className="text-sm text-lms-muted">Loading…</p>
        ) : settingsQuery.isError ? (
          <p className="text-sm">{apiErrorMessage(settingsQuery.error, "Settings couldn't load. Refresh the page to try again.")}</p>
        ) : (
          <>
            <TeamSection me={me} settings={settingsQuery.data} />
            <AttendanceSection />
            <SourcesSection me={me} settings={settingsQuery.data} />
            <RetrySection settings={settingsQuery.data} />
            <StagesSection settings={settingsQuery.data} />
            <LostReasonsSection settings={settingsQuery.data} />
            <TemplatesSection />
            <ScriptSection settings={settingsQuery.data} />
            <ExtraFieldsSection />
            <Section
              id="automations"
              title="Automations"
              text="Simple rules that run by themselves: when something happens to a lead that matches, assign it, tag it, plan a task, send an SMS or tell someone. They never move a lead's stage."
            >
              <AutomationsSection me={me} />
            </Section>
            <Section id="privacy" title="Privacy" text="What the LMS keeps, for how long, and erasing one person's leads when they ask.">
              <PrivacySection settings={settingsQuery.data} />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

/** The section list, marking the one in view. */
function SectionNav() {
  const [current, setCurrent] = useState(SECTIONS[0].id);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    // A section counts as "in view" once it reaches the band just under the top bar.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: '-72px 0px -60% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Settings sections" className="hidden lg:block">
      <ul className="sticky top-[5.5rem] space-y-0.5 border-l border-lms-line">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(s.id)?.scrollIntoView({
                  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                  block: 'start',
                });
                setCurrent(s.id);
              }}
              aria-current={current === s.id ? 'true' : undefined}
              className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm ${
                current === s.id ? 'border-lms-ink font-medium text-lms-ink' : 'border-transparent text-lms-muted hover:text-lms-ink'
              }`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Section({ id, title, text, children }: { id: string; title: string; text: string; children: ReactNode }) {
  return (
    <Panel id={id} className="scroll-mt-20">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-xl text-sm leading-6 text-lms-muted">{text}</p>
      <div className="mt-5">{children}</div>
    </Panel>
  );
}

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
    <Panel id="status" className="scroll-mt-20">
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

const SOURCES: { key: 'ORDER' | 'ABANDONED_CHECKOUT' | 'LANDING_FORM' | 'STORE_FORM' | 'API'; label: string; text: string }[] = [
  { key: 'ORDER', label: 'New orders from your store', text: 'Cash on delivery orders waiting for a confirmation call.' },
  {
    key: 'ABANDONED_CHECKOUT',
    label: 'Abandoned checkouts',
    text: "People who filled in checkout with their phone number but didn't order.",
  },
  { key: 'LANDING_FORM', label: 'Landing page forms', text: 'People who asked you to contact them from a landing page.' },
  {
    key: 'STORE_FORM',
    label: 'Product page forms (StorePal theme)',
    text: 'Requests from your product pages. Products you set to "Price on request" always show a Request a price form.',
  },
  {
    key: 'API',
    label: 'The API (Zapier, Make, Pabbly)',
    text: 'Leads your other tools send with an API key, e.g. Facebook Lead Ads or Google Forms. See Store > Integrations > External API.',
  },
];

function SourcesSection({ me, settings }: { me: LmsMe; settings: LmsSettings }) {
  const save = useSaveSettings('Sources saved');
  const [sources, setSources] = useState(() => Object.fromEntries(SOURCES.map((s) => [s.key, settings.sources[s.key]])));
  const [callPrepaid, setCallPrepaid] = useState(settings.callPrepaidOrders);
  const [abandonedAfter, setAbandonedAfter] = useState(String(settings.abandonedAfterMinutes));
  const [storeForms, setStoreForms] = useState(settings.storeForms);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minutes = Number(abandonedAfter);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
      toast.error('Abandoned checkouts: pick between 5 and 1440 minutes.');
      return;
    }
    save.mutate({ sources, callPrepaidOrders: callPrepaid, abandonedAfterMinutes: minutes, storeForms });
  };

  return (
    <Section id="sources" title="Where leads come from" text="These come into the LMS by themselves. Turn off any you don't want your team to follow up.">
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
              {s.key === 'STORE_FORM' && sources.STORE_FORM && (
                <div className="ml-7 mt-2 space-y-2 text-sm">
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-[var(--lms-ink)]"
                      checked={storeForms.notifyMe}
                      onChange={(e) => setStoreForms((f) => ({ ...f, notifyMe: e.target.checked }))}
                    />
                    <span>
                      "Notify me when it's back" on sold-out products
                      <span className="block text-lms-muted">When it's back in stock you get a task, and you can text everyone waiting in one go from Leads.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-[var(--lms-ink)]"
                      checked={storeForms.callMeBack}
                      onChange={(e) => setStoreForms((f) => ({ ...f, callMeBack: e.target.checked }))}
                    />
                    <span>"Ask us to call you back" on every product</span>
                  </label>
                </div>
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

// ------------------------------------------------------------- retry rules

const MISSED_CALL_DEFAULT =
  'Assalamu alaikum {name}, we tried to call you from {store} about {product}. Please call us back when you can. Thank you.';

/**
 * How unreached calls are retried (LMS-plan.md Step 7). With N tries there
 * are N-1 waits: after a miss, the lead comes back to the same person
 * after the next wait. The last miss closes it as "Not reachable" if on.
 */
function RetrySection({ settings }: { settings: LmsSettings }) {
  const save = useSaveSettings('Retry rules saved');
  const [tries, setTries] = useState(settings.maxAttempts);
  const [gaps, setGaps] = useState(() =>
    Array.from({ length: 9 }, (_, i) => splitMinutes(settings.retryMinutes[Math.min(i, settings.retryMinutes.length - 1)] ?? 60)),
  );
  const [autoClose, setAutoClose] = useState(settings.autoCloseUnreachable);
  const [smsOn, setSmsOn] = useState(settings.missedCallSmsAfter !== null);
  const [smsAfter, setSmsAfter] = useState(settings.missedCallSmsAfter ?? 1);
  const [smsText, setSmsText] = useState(settings.missedCallSmsText ?? '');
  const waits = Math.max(1, tries - 1);

  const submit = () => {
    const retryMinutes: number[] = [];
    for (let i = 0; i < waits; i++) {
      const minutes = Math.round(Number(gaps[i].amount) * UNIT_MINUTES[gaps[i].unit]);
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 43200) {
        toast.error(`Wait ${i + 1}: pick between 1 minute and 30 days.`);
        return;
      }
      retryMinutes.push(minutes);
    }
    save.mutate({
      maxAttempts: tries,
      retryMinutes,
      autoCloseUnreachable: autoClose,
      missedCallSmsAfter: smsOn ? Math.min(smsAfter, tries) : null,
      missedCallSmsText: smsText.trim() || null,
    });
  };

  return (
    <Section
      id="retries"
      title="Retry rules"
      text="When nobody picks up, the lead comes back to the same person after a wait, as a task on their list and the Call Desk."
    >
      <div className="space-y-4">
        <label className="flex flex-wrap items-center gap-2 text-sm">
          Try each person up to
          <LmsSelect value={tries} onChange={(e) => setTries(Number(e.target.value))} className="!w-auto tabular-nums">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </LmsSelect>
          times
        </label>

        {tries > 1 && (
          <ul className="space-y-2">
            {Array.from({ length: waits }, (_, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-32 text-lms-muted">After try {i + 1}, wait</span>
                <LmsInput
                  type="number"
                  min={1}
                  aria-label={`Wait after try ${i + 1}`}
                  value={gaps[i].amount}
                  onChange={(e) => setGaps((g) => g.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                  className="!w-20 tabular-nums"
                />
                <LmsSelect
                  aria-label={`Unit for try ${i + 1}`}
                  value={gaps[i].unit}
                  onChange={(e) => setGaps((g) => g.map((x, j) => (j === i ? { ...x, unit: e.target.value as Unit } : x)))}
                  className="!w-auto"
                >
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </LmsSelect>
              </li>
            ))}
          </ul>
        )}

        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--lms-ink)]" checked={autoClose} onChange={(e) => setAutoClose(e.target.checked)} />
          <span>
            <span className="block font-medium">Close as "Not reachable" after the last try</span>
            <span className="block text-lms-muted">Off: the lead stays in Trying to reach for someone to decide. An order is never cancelled by this.</span>
          </span>
        </label>

        <div className="rounded-md bg-lms-page p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--lms-ink)]" checked={smsOn} onChange={(e) => setSmsOn(e.target.checked)} />
            <span>
              <span className="block font-medium">Send a "We tried to call you" SMS</span>
              <span className="block text-lms-muted">Goes out by itself after a missed call and uses your SMS credits. Never to people marked do not contact.</span>
            </span>
          </label>
          {smsOn && (
            <div className="mt-3 space-y-3 pl-7">
              <label className="flex flex-wrap items-center gap-2 text-sm">
                After try
                <LmsSelect value={Math.min(smsAfter, tries)} onChange={(e) => setSmsAfter(Number(e.target.value))} className="!w-auto tabular-nums">
                  {Array.from({ length: tries }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </LmsSelect>
              </label>
              <Field label="Message" hint="Leave it empty to use this one. You can use {name} {product} {total} {order} {store} {agent}.">
                <LmsTextarea rows={3} value={smsText} onChange={(e) => setSmsText(e.target.value)} maxLength={500} placeholder={MISSED_CALL_DEFAULT} />
              </Field>
            </div>
          )}
        </div>

        <LmsButton variant="primary" disabled={save.isPending} onClick={submit}>
          {save.isPending ? 'Saving…' : 'Save retry rules'}
        </LmsButton>
      </div>
    </Section>
  );
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
      id="stages"
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
      id="lost-reasons"
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

// ----------------------------------------------------------- templates

const VARIABLES = '{name} {product} {total} {order} {store} {agent}';
const CHANNEL_LABEL: Record<LmsTemplateChannel, string> = { WHATSAPP: 'WhatsApp', SMS: 'SMS' };

function TemplatesSection() {
  const templates = useQuery({ queryKey: LMS_TEMPLATES_KEY, queryFn: lmsApi.templates });
  const [editing, setEditing] = useState<LmsTemplate | 'new' | null>(null);

  return (
    <Section
      id="templates"
      title="Message templates"
      text={`Ready-made WhatsApp and SMS messages for the lead's message keys. Your team picks one, the lead's details fill in, and they can still edit it before it goes. You can use ${VARIABLES}.`}
    >
      {templates.isPending ? (
        <p className="text-sm text-lms-muted">Loading…</p>
      ) : templates.isError ? (
        <p className="text-sm">{apiErrorMessage(templates.error, "The templates couldn't load.")}</p>
      ) : (
        <ul className="divide-y divide-lms-line border-y border-lms-line">
          {templates.data.map((t) => (
            <li key={t.id} className="py-3">
              {editing !== 'new' && editing?.id === t.id ? (
                <TemplateForm template={t} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 text-sm">
                    <p>
                      <span className="font-medium">{t.name}</span>
                      <span className="ml-2 text-lms-muted">{CHANNEL_LABEL[t.channel]}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-lms-muted">{t.body}</p>
                  </div>
                  <LmsButton variant="quiet" onClick={() => setEditing(t)}>
                    Edit
                  </LmsButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing === 'new' ? (
        <div className="mt-4">
          <TemplateForm onDone={() => setEditing(null)} />
        </div>
      ) : (
        <LmsButton className="mt-4" onClick={() => setEditing('new')}>
          Add a template
        </LmsButton>
      )}
    </Section>
  );
}

function TemplateForm({ template, onDone }: { template?: LmsTemplate; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<LmsTemplateChannel>(template?.channel ?? 'WHATSAPP');
  const [name, setName] = useState(template?.name ?? '');
  const [body, setBody] = useState(template?.body ?? '');
  const done = (message: string) => {
    toast.success(message);
    queryClient.invalidateQueries({ queryKey: LMS_TEMPLATES_KEY });
    onDone();
  };
  const save = useMutation({
    mutationFn: () => {
      const payload = { channel, name: name.trim(), body: body.trim() };
      return template ? lmsApi.updateTemplate(template.id, payload) : lmsApi.createTemplate(payload);
    },
    onSuccess: () => done('Template saved'),
    onError: (err) => toast.error(apiErrorMessage(err, "The template wasn't saved. Try again.")),
  });
  const remove = useMutation({
    mutationFn: () => lmsApi.deleteTemplate(template!.id),
    onSuccess: () => done('Template deleted'),
    onError: (err) => toast.error(apiErrorMessage(err, "The template wasn't deleted. Try again.")),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-3 rounded-md bg-lms-page p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <Field label="Name">
          <LmsInput value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="e.g. Delivery date" />
        </Field>
        <Field label="Sent by">
          <LmsSelect value={channel} onChange={(e) => setChannel(e.target.value as LmsTemplateChannel)}>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
          </LmsSelect>
        </Field>
      </div>
      <Field
        label="Message"
        hint={channel === 'SMS' ? `Write "Tk" instead of the taka sign, and English letters: Bangla letters make each SMS cost more. You can use ${VARIABLES}.` : `You can use ${VARIABLES}.`}
      >
        <LmsTextarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} required />
      </Field>
      <div className="flex flex-wrap gap-2">
        <LmsButton type="submit" variant="primary" disabled={save.isPending || !name.trim() || !body.trim()}>
          {save.isPending ? 'Saving…' : 'Save template'}
        </LmsButton>
        <LmsButton variant="quiet" onClick={onDone}>
          Cancel
        </LmsButton>
        {template && (
          <LmsButton variant="danger" className="ml-auto" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Delete
          </LmsButton>
        )}
      </div>
    </form>
  );
}

// -------------------------------------------------------------- script

const DEFAULT_SCRIPT_HINT =
  'Leave it empty to use ours: an order confirmation script for order leads and a helpful one for everyone else.';

function ScriptSection({ settings }: { settings: LmsSettings }) {
  const save = useSaveSettings('Call script saved');
  const [script, setScript] = useState(settings.callScript ?? '');
  const dirty = script.trim() !== (settings.callScript ?? '');

  return (
    <Section
      id="script"
      title="Call script"
      text={`What your team says on the call, shown next to the keypad on the Call Desk with the lead's details filled in. You can use ${VARIABLES}.`}
    >
      <LmsTextarea
        rows={6}
        value={script}
        onChange={(e) => setScript(e.target.value)}
        maxLength={5000}
        placeholder={'Assalamu alaikum, am I speaking with {name}?\nI\'m {agent}, calling from {store} about your order {order}…'}
      />
      <p className="mt-1 text-xs text-lms-muted">{DEFAULT_SCRIPT_HINT}</p>
      <LmsButton variant="primary" className="mt-4" disabled={!dirty || save.isPending} onClick={() => save.mutate({ callScript: script.trim() || null })}>
        {save.isPending ? 'Saving…' : 'Save call script'}
      </LmsButton>
    </Section>
  );
}

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
      id="extra-fields"
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
