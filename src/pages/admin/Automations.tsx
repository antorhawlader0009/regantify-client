import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2, Mail, MessageSquareText, Plus, Workflow } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { LIFECYCLE_TRIGGERS, lifecycleApi, TRIGGER_LABEL, type LifecycleRule, type RuleInput } from '../../lib/lifecycleApi';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';

/**
 * Super Admin > Reach > Automations (super-admin-new.md Step 4): messages that go to a store on their own when it gets stuck (no product,
 * no order, gone quiet) or reaches a first (first order). Each store gets each one once. Switching a rule on only counts stores from then on.
 */
export default function Automations() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['lifecycle'], queryFn: lifecycleApi.list });
  const [editing, setEditing] = useState<LifecycleRule | 'new' | null>(null);
  const toggle = useMutation({
    mutationFn: (r: LifecycleRule) => lifecycleApi.update(r.id, { enabled: !r.enabled }),
    onSuccess: (r) => {
      toast.success(r.enabled ? `"${r.name}" is on. Stores that get stuck from now on will get it.` : `"${r.name}" is off.`);
      qc.invalidateQueries({ queryKey: ['lifecycle'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work.')),
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Workflow className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">Automations</h1>
            <p className="max-w-2xl text-sm text-regantify-text-muted">
              Messages that go to a store on their own when it gets stuck or reaches a first. Each store gets each message once. Turning one on never messages old stores:
              only stores that get stuck from that moment count. Texts go out 9 AM to 8 PM from the platform's SMS balance.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="flex items-center gap-1.5 rounded-xl bg-regantify-cta px-3.5 py-2 text-sm font-medium text-white">
          <Plus size={16} /> New automation
        </button>
      </div>

      {data?.paused && (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          All automations are paused by the "Automatic nudges to stores" switch in{' '}
          <Link to="/admin/settings?tab=switches" className="underline">
            Settings
          </Link>
          . Nothing is sent until it is turned back on.
        </p>
      )}

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {data.rules.map((r) => {
            const t = TRIGGER_LABEL[r.trigger];
            const rate = r.converted != null && r.sent ? Math.round((r.converted / r.sent) * 100) : null;
            return (
              <div key={r.id} className="rounded-2xl border border-black/5 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button type="button" onClick={() => setEditing(r)} className="min-w-0 text-left">
                    <p className="text-sm font-medium text-regantify-text hover:underline">{r.name}</p>
                    <p className="text-xs text-regantify-text-muted">{t.when(r.delayDays)}</p>
                  </button>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                    <span className={r.enabled ? 'font-medium text-green-700' : 'text-regantify-text-muted'}>{r.enabled ? 'On' : 'Off'}</span>
                    <input type="checkbox" role="switch" checked={r.enabled} disabled={toggle.isPending} onChange={() => toggle.mutate(r)} className="h-4 w-4 accent-regantify-cta" />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-regantify-text-muted">
                  <span className="flex items-center gap-1">
                    <Bell size={12} /> "{r.title}"
                  </span>
                  {r.smsText && (
                    <span className="flex items-center gap-1">
                      <MessageSquareText size={12} /> also a text
                    </span>
                  )}
                  {r.sendEmail && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} /> also an email
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 border-t border-black/5 pt-3 text-sm sm:max-w-md">
                  <Stat label="Sent" value={r.sent ?? 0} hint={`${r.sent30d ?? 0} in 30 days`} />
                  <Stat label="Texts" value={r.smsSent ?? 0} hint="from the platform" />
                  <Stat label={t.converted ? `Then ${t.converted}` : 'Then acted'} value={rate === null ? '-' : `${rate}%`} hint={r.converted != null ? `${r.converted} within 7 days` : 'nothing to measure'} />
                </div>
                {r.enabledAt && r.enabled && <p className="mt-2 text-[11px] text-regantify-text-muted">On since {formatDhakaDateTime(r.enabledAt)}</p>}
              </div>
            );
          })}
        </div>
      )}

      <RuleDialog rule={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint: string }) {
  return (
    <div>
      <p className="text-xs text-regantify-text-muted">{label}</p>
      <p className="font-semibold tabular-nums text-regantify-text">{value}</p>
      <p className="text-[11px] text-regantify-text-muted">{hint}</p>
    </div>
  );
}

const EMPTY: RuleInput = { name: '', trigger: 'NO_PRODUCT', delayDays: 2, title: '', body: '', smsText: '', sendEmail: false, link: '' };

function RuleDialog({ rule, onClose }: { rule: LifecycleRule | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const existing = rule && rule !== 'new' ? rule : null;
  const [form, setForm] = useState<RuleInput>(EMPTY);
  const [withSms, setWithSms] = useState(false);
  useEffect(() => {
    if (!rule) return;
    if (rule === 'new') {
      setForm(EMPTY);
      setWithSms(false);
    } else {
      setForm({ name: rule.name, trigger: rule.trigger, delayDays: rule.delayDays, title: rule.title, body: rule.body, smsText: rule.smsText ?? '', sendEmail: rule.sendEmail, link: rule.link ?? '' });
      setWithSms(Boolean(rule.smsText));
    }
  }, [rule]);
  const set = <K extends keyof RuleInput>(k: K, v: RuleInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const { data: preview } = useQuery({ queryKey: ['lifecycle-preview', existing?.id, existing?.updatedAt], queryFn: () => lifecycleApi.preview(existing!.id), enabled: Boolean(existing) });
  const { data: runs } = useQuery({ queryKey: ['lifecycle-runs', existing?.id], queryFn: () => lifecycleApi.runs(existing!.id), enabled: Boolean(existing) });

  const body = { ...form, smsText: withSms ? form.smsText?.trim() ?? '' : '', link: form.link?.trim() ?? '' };
  const save = useMutation({
    mutationFn: () => (existing ? lifecycleApi.update(existing.id, body) : lifecycleApi.create(body)),
    onSuccess: () => {
      toast.success(existing ? 'Saved.' : 'Created. It is off until you turn it on.');
      qc.invalidateQueries({ queryKey: ['lifecycle'] });
      qc.invalidateQueries({ queryKey: ['lifecycle-preview'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save it.')),
  });
  const remove = useMutation({
    mutationFn: () => lifecycleApi.remove(existing!.id),
    onSuccess: () => {
      toast.success('Deleted.');
      qc.invalidateQueries({ queryKey: ['lifecycle'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete it.')),
  });
  const smsLen = form.smsText?.length ?? 0;
  const valid = form.name.trim().length >= 3 && form.title.trim().length >= 3 && form.body.trim().length >= 5 && (!withSms || smsLen >= 5) && (!form.link || form.link.startsWith('/vendor'));

  return (
    <Dialog open={rule !== null} onOpenChange={(o) => !o && onClose()} title={existing ? existing.name : 'New automation'} maxWidth="max-w-2xl">
      <div className="space-y-4 p-6 pt-3">
        <div className="grid gap-4 sm:grid-cols-[1fr_200px_110px]">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">Name (for the team)</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={80} className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">When</label>
            <select value={form.trigger} onChange={(e) => set('trigger', e.target.value as RuleInput['trigger'])} className={field}>
              {LIFECYCLE_TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {TRIGGER_LABEL[t].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">After days</label>
            <input type="number" min={0} max={90} value={form.delayDays} onChange={(e) => set('delayDays', Math.max(0, Math.min(90, Number(e.target.value) || 0)))} className={field} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-regantify-text-muted">{TRIGGER_LABEL[form.trigger].when(form.delayDays)}.</p>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-regantify-text">Bell title</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120} className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-regantify-text">Bell message</label>
          <textarea value={form.body} onChange={(e) => set('body', e.target.value)} maxLength={600} rows={3} className={field} />
          <p className="mt-1 text-xs text-regantify-text-muted">
            <span className="font-mono">{'{store}'}</span> becomes the store's name, <span className="font-mono">{'{name}'}</span> the owner's first name. The bell also reaches the
            store's Telegram and phone alerts if they set them up.
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-regantify-text">Opens (optional)</label>
          <input value={form.link} onChange={(e) => set('link', e.target.value)} maxLength={200} placeholder="/vendor/products/add" className={`${field} font-mono`} />
        </div>
        <div className="rounded-xl border border-black/5 p-3">
          <label className="flex items-center gap-2 text-sm text-regantify-text">
            <input type="checkbox" checked={withSms} onChange={(e) => setWithSms(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
            Also text the owner (paid from the platform's SMS balance)
          </label>
          {withSms && (
            <>
              <textarea value={form.smsText} onChange={(e) => set('smsText', e.target.value)} maxLength={300} rows={2} className={`${field} mt-2`} />
              <p className={`mt-1 text-xs ${smsLen > 160 ? 'text-amber-700' : 'text-regantify-text-muted'}`}>
                {smsLen} letters{smsLen > 160 ? ': more than one SMS each (one SMS is 160 English letters, 70 in Bangla)' : ''}
              </p>
            </>
          )}
        </div>
        <div className="rounded-xl border border-black/5 p-3">
          <label className="flex items-center gap-2 text-sm text-regantify-text">
            <input type="checkbox" checked={form.sendEmail ?? false} onChange={(e) => set('sendEmail', e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
            Also email the owner
          </label>
          <p className="mt-1 text-xs text-regantify-text-muted">
            The title is the subject and the message is the email, with a button to "Opens". Only owners with an email on their account get it, and not those who turned tip
            emails off.
          </p>
        </div>

        {existing && preview && (
          <div className="rounded-xl bg-regantify-search p-3 text-sm">
            <p className="text-xs text-regantify-text-muted">
              {preview.matchingNow} {preview.matchingNow === 1 ? 'store matches' : 'stores match'} this right now, but{' '}
              {existing.enabled ? `${preview.dueNext} ${preview.dueNext === 1 ? 'is' : 'are'} due in the next hourly run` : 'turning it on does not message them'} (only stores that get
              stuck after it is turned on count). Saved version, for {preview.sample.storeName}:
            </p>
            <p className="mt-2 font-medium text-regantify-text">{preview.sample.title}</p>
            <p className="text-regantify-text">{preview.sample.body}</p>
            {preview.sample.sms && <p className="mt-1 text-xs text-regantify-text-muted">Text: {preview.sample.sms}</p>}
          </div>
        )}

        <button type="button" disabled={!valid || save.isPending} onClick={() => save.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {save.isPending ? 'Saving...' : existing ? 'Save' : 'Create (off)'}
        </button>

        {existing && runs && runs.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-regantify-text">Last sent</p>
            <ul className="max-h-48 divide-y divide-black/5 overflow-y-auto rounded-xl border border-black/5 text-sm">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                  <Link to={`/admin/vendors/${r.vendorId}`} className="truncate text-regantify-text hover:underline">
                    {r.storeName}
                  </Link>
                  <span className="shrink-0 text-xs text-regantify-text-muted">
                    {formatDhakaDateTime(r.sentAt)}
                    {r.smsSent ? ' + text' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {existing && (
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => window.confirm(`Delete "${existing.name}"? Its history goes too.`) && remove.mutate()}
            className="text-sm text-red-700 hover:underline"
          >
            Delete this automation
          </button>
        )}
      </div>
    </Dialog>
  );
}
