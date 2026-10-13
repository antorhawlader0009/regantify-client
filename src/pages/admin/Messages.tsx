import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { adminMessagesApi, type MessageAudience, type MessageContent, type MessagePreview } from '../../lib/adminMessagesApi';
import type { PlanCode } from '../../lib/plansApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { formatTaka } from '../../components/analytics/format';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const label = 'mb-1.5 block text-sm font-medium text-regantify-text';
const PLAN_CODES: PlanCode[] = ['FREE', 'BASIC', 'STARTER', 'ADVANCE'];
const WORDS = '{store} {name} {plan} {ends}';

/** What other pages hand over: ticked stores, or the filters of the list that was on screen. */
interface Handed {
  vendorIds?: string[];
  filter?: Record<string, string>;
  label?: string;
}

function History() {
  const { data } = useQuery({ queryKey: ['admin-messages'], queryFn: adminMessagesApi.history, refetchInterval: 10_000 });
  if (!data) return null;
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="mb-2 text-sm font-semibold text-regantify-text">Sent messages</h2>
      {data.length === 0 ? <p className="text-sm text-regantify-text-muted">Nothing sent yet.</p> : data.map((m) => (
        <div key={m.id} className="border-t border-black/5 py-2.5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-regantify-text">{m.title}</p>
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${m.status === 'DONE' ? 'bg-green-100 text-green-700' : m.status === 'SENDING' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'}`}>
              {m.status === 'DONE' ? 'Sent' : m.status === 'SENDING' ? 'Sending…' : 'Stopped part way'}
            </span>
          </div>
          <p className="text-xs text-regantify-text-muted">
            {m.by} · {formatDhakaDateTime(m.createdAt)} · {m.recipients} {m.recipients === 1 ? 'store' : 'stores'}, {m.bellSent} bell notes
            {m.sms ? `, ${m.smsSent} texts sent (${m.smsParts} parts)${m.smsFailed ? `, ${m.smsFailed} failed` : ''}` : ''}
          </p>
        </div>
      ))}
    </section>
  );
}

function Templates({ onPick }: { onPick: (t: { title: string; body: string; sms: string | null }) => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-message-templates'], queryFn: adminMessagesApi.templates });
  const del = useMutation({
    mutationFn: (id: string) => adminMessagesApi.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-message-templates'] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete it.')),
  });
  return (
    <div className="flex flex-wrap gap-2">
      {(data ?? []).map((t) => (
        <span key={t.id} className="inline-flex items-center overflow-hidden rounded-full border border-black/10 bg-white text-xs">
          <button type="button" onClick={() => onPick(t)} className="px-3 py-1.5 hover:bg-regantify-content">{t.name}</button>
          <button type="button" aria-label={`Delete ${t.name}`} onClick={() => window.confirm(`Delete the template “${t.name}”?`) && del.mutate(t.id)} className="border-l border-black/10 px-2 py-1.5 text-neutral-400 hover:text-red-600">×</button>
        </span>
      ))}
    </div>
  );
}

/** Super Admin > Messages (super-admin-plan.md Step 11): write to stores by bell and SMS, with a preview of who and what it costs first. */
export default function Messages() {
  const qc = useQueryClient();
  const handed = (useLocation().state ?? {}) as Handed;
  const [mode, setMode] = useState<'handed' | 'custom'>(handed.vendorIds || handed.filter ? 'handed' : 'custom');
  const [plans, setPlans] = useState<PlanCode[]>([]);
  const [feature, setFeature] = useState('');
  const [endingIn, setEndingIn] = useState('');
  const [inactive, setInactive] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sms, setSms] = useState('');
  const [link, setLink] = useState('');
  const [preview, setPreview] = useState<MessagePreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const audience = (): MessageAudience => {
    if (mode === 'handed') return { vendorIds: handed.vendorIds, filter: handed.filter };
    const filter: Record<string, string> = {};
    if (endingIn) filter.endingInDays = endingIn;
    if (inactive) filter.inactiveDays = inactive;
    return { planCodes: plans.length ? plans : undefined, feature: (feature || undefined) as MessageAudience['feature'], filter: Object.keys(filter).length ? filter : undefined };
  };
  const content = (): MessageContent => ({ title: title.trim(), body: body.trim(), sms: sms.trim() || undefined, link: link.trim() || undefined, audience: audience() });
  const reset = () => {
    setPreview(null);
    setConfirmed(false);
  };

  const rate = useQuery({ queryKey: ['admin-sms-rate'], queryFn: adminMessagesApi.smsRate });
  const [rateInput, setRateInput] = useState('');
  const saveRate = useMutation({
    mutationFn: () => adminMessagesApi.setSmsRate(rateInput === '' ? null : Number(rateInput)),
    onSuccess: (r) => {
      qc.setQueryData(['admin-sms-rate'], r);
      setRateInput('');
      toast.success('Saved.');
      if (preview) previewM.mutate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });

  const previewM = useMutation({
    mutationFn: () => adminMessagesApi.preview(content()),
    onSuccess: (p) => {
      setPreview(p);
      setConfirmed(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not work out who this reaches.')),
  });
  const sendM = useMutation({
    mutationFn: () => adminMessagesApi.send(content(), preview!.recipients),
    onSuccess: (r) => {
      toast.success(`Sending to ${r.recipients} ${r.recipients === 1 ? 'store' : 'stores'}. Follow it in Sent messages.`);
      setTitle('');
      setBody('');
      setSms('');
      setLink('');
      reset();
      qc.invalidateQueries({ queryKey: ['admin-messages'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send.')),
  });
  const saveTemplate = useMutation({
    mutationFn: () => adminMessagesApi.saveTemplate(null, { name: templateName.trim(), title: title.trim(), body: body.trim(), sms: sms.trim() || null }),
    onSuccess: () => {
      toast.success('Template saved.');
      setTemplateName('');
      qc.invalidateQueries({ queryKey: ['admin-message-templates'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the template.')),
  });

  const ready = title.trim().length >= 2 && body.trim().length >= 2;
  const needsTypedCount = (preview?.sms?.texts ?? 0) > 50;
  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-regantify-text">Messages</h1>
        <p className="mt-1 text-sm text-regantify-text-muted">Write to stores: a bell note, and a text from the platform’s own SMS if you add one. You always see who it reaches and what the texts cost before it goes.</p>
      </div>

      <section className="space-y-4 rounded-2xl border border-black/5 bg-white p-5">
        <div>
          <p className={label}>Who gets it</p>
          <div className="space-y-2 text-sm">
            {(handed.vendorIds || handed.filter) && (
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === 'handed'} onChange={() => { setMode('handed'); reset(); }} /> {handed.label ?? (handed.vendorIds ? `${handed.vendorIds.length} chosen ${handed.vendorIds.length === 1 ? 'store' : 'stores'}` : 'The stores of the list you were looking at')}
              </label>
            )}
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === 'custom'} onChange={() => { setMode('custom'); reset(); }} /> Pick by plan or feature
            </label>
          </div>
          {mode === 'custom' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {PLAN_CODES.map((p) => (
                  <label key={p} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={plans.includes(p)} onChange={() => { setPlans((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p])); reset(); }} /> {p.charAt(0) + p.slice(1).toLowerCase()}
                  </label>
                ))}
                <span className="text-xs text-regantify-text-muted">{plans.length === 0 ? 'none ticked = every plan' : ''}</span>
              </div>
              <select value={feature} onChange={(e) => { setFeature(e.target.value); reset(); }} className={field}>
                <option value="">Any feature</option>
                <option value="POS">Stores that can use the POS</option>
                <option value="LMS">Stores that can use the LMS</option>
                <option value="CUSTOM_DOMAIN">Stores that can use their own domain</option>
              </select>
              <select value={endingIn} onChange={(e) => { setEndingIn(e.target.value); reset(); }} className={field}>
                <option value="">Plan ends: any time</option>
                {[3, 7, 14, 30].map((d) => <option key={d} value={d}>Plan ends within {d} days</option>)}
              </select>
              <select value={inactive} onChange={(e) => { setInactive(e.target.value); reset(); }} className={field}>
                <option value="">Last sign-in: any</option>
                {[7, 14, 30, 60].map((d) => <option key={d} value={d}>Not signed in for {d} days</option>)}
              </select>
            </div>
          )}
          <p className="mt-2 text-xs text-regantify-text-muted">Suspended and closed stores are left out of a group message.</p>
        </div>

        <div>
          <p className={label}>Start from a template</p>
          <Templates onPick={(t) => { setTitle(t.title); setBody(t.body); setSms(t.sms ?? ''); reset(); }} />
        </div>

        <div>
          <label className={label}>Title (shown in the bell)</label>
          <input value={title} onChange={(e) => { setTitle(e.target.value); reset(); }} maxLength={80} className={field} />
        </div>
        <div>
          <label className={label}>Message</label>
          <textarea value={body} onChange={(e) => { setBody(e.target.value); reset(); }} maxLength={1000} rows={4} className={field} />
          <p className="mt-1 text-xs text-regantify-text-muted">Words filled in for each store: {WORDS}</p>
        </div>
        <div>
          <label className={label}>Text message (optional, leave empty for the bell only)</label>
          <textarea value={sms} onChange={(e) => { setSms(e.target.value); reset(); }} maxLength={300} rows={2} className={field} />
        </div>
        <div>
          <label className={label}>Link the bell note opens (optional)</label>
          <input value={link} onChange={(e) => { setLink(e.target.value); reset(); }} placeholder="/vendor/billing" className={field} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!ready || previewM.isPending} onClick={() => previewM.mutate()} className="rounded-xl bg-regantify-cta px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {previewM.isPending ? 'Checking…' : 'Preview who it reaches'}
          </button>
          <span className="ml-auto flex items-center gap-2">
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Save as template…" maxLength={60} className="w-44 rounded-lg border border-black/10 px-3 py-2 text-xs focus:outline-none" />
            <button type="button" disabled={!ready || templateName.trim().length < 2 || saveTemplate.isPending} onClick={() => saveTemplate.mutate()} className="rounded-lg border border-black/10 px-3 py-2 text-xs disabled:opacity-50">Save</button>
          </span>
        </div>
      </section>

      {preview && (
        <section className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 text-sm">
          <p className="text-base font-semibold text-regantify-text">
            This reaches {preview.recipients} {preview.recipients === 1 ? 'store' : 'stores'}
          </p>
          {preview.sample.length > 0 && <p className="text-xs text-regantify-text-muted">For example: {preview.sample.join(', ')}{preview.recipients > preview.sample.length ? '…' : ''}</p>}
          {preview.example && (
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-regantify-text-muted">How the first store sees it</p>
              <p className="font-medium">{preview.example.title}</p>
              <p>{preview.example.body}</p>
              {preview.example.sms && <p className="mt-1 text-xs text-regantify-text-muted">Text: {preview.example.sms}</p>}
            </div>
          )}
          {preview.sms ? (
            <div className="rounded-xl bg-white p-3">
              <p>
                <strong>{preview.sms.texts}</strong> texts ({preview.sms.parts} SMS parts){preview.sms.noPhone > 0 && `, ${preview.sms.noPhone} stores have no phone`}.
                {preview.sms.cost !== null ? ` About ${formatTaka(preview.sms.cost)} at ৳${preview.sms.rate} a part.` : ' Set the price of one text below to see the cost.'}
                {preview.sms.balance !== null && ` Platform SMS balance: ${formatTaka(preview.sms.balance)}.`}
              </p>
              {preview.sms.tooMany && <p className="mt-1 text-red-700">That is more than 1,000 texts. Narrow the list first.</p>}
              <div className="mt-2 flex items-center gap-2 text-xs text-regantify-text-muted">
                Price of one SMS part (৳):
                <input value={rateInput} onChange={(e) => setRateInput(e.target.value)} placeholder={rate.data?.rate ? String(rate.data.rate) : 'e.g. 0.35'} className="w-24 rounded-lg border border-black/10 px-2 py-1 focus:outline-none" />
                <button type="button" onClick={() => saveRate.mutate()} disabled={saveRate.isPending} className="rounded-lg border border-black/10 px-2 py-1">Save</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-regantify-text-muted">Bell note only. No text goes out, so it costs nothing.</p>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            I checked the list and the message{needsTypedCount ? `. This sends ${preview.sms?.texts} texts.` : '.'}
          </label>
          <button type="button" disabled={!confirmed || sendM.isPending || preview.recipients === 0 || !!preview.sms?.tooMany} onClick={() => sendM.mutate()} className="inline-flex items-center gap-2 rounded-xl bg-regantify-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40">
            {sendM.isPending && <Loader2 size={14} className="animate-spin" />} Send to {preview.recipients} {preview.recipients === 1 ? 'store' : 'stores'}
          </button>
        </section>
      )}

      <History />
    </div>
  );
}
