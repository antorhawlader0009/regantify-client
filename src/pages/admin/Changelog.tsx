import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { adminHelpApi, CHANGELOG_KIND_LABEL, type ChangelogBody, type ChangelogEntry, type ChangelogKind } from '../../lib/helpApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { dhakaInputToIso, isoToDhakaInput, nowDhakaInput } from '../../lib/dhakaInput';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { RowMenu } from '../../components/admin/RowMenu';
import { Markdown } from '../../components/help/Markdown';

const field = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none';
const th = 'px-4 py-2 font-normal';
const td = 'px-4 py-2.5';
const KINDS: ChangelogKind[] = ['NEW', 'IMPROVED', 'FIXED'];
const PLANS = ['BASIC', 'STARTER', 'ADVANCE'];

/**
 * Super Admin > Reach > What's new (super-admin-new.md Step 11): short notes on what changed. Sellers see a red dot on the Help button until they open the
 * list. A future date schedules an entry; the plan labels only mark it, every store sees every entry.
 */
export default function Changelog() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-changelog'], queryFn: adminHelpApi.changelog });
  const [editing, setEditing] = useState<ChangelogEntry | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ChangelogEntry | null>(null);
  const del = useMutation({
    mutationFn: (id: string) => adminHelpApi.deleteChangelog(id),
    onSuccess: () => {
      toast.success('Deleted.');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-changelog'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete it.')),
  });
  const now = Date.now();

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">What's new</h1>
            <p className="max-w-3xl text-sm text-regantify-text-muted">
              Tell sellers what changed. A new entry puts a red dot on every seller's Help button until they open the list. Set a future date to schedule one.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white">
          New entry
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                <th className={th}>Date</th>
                <th className={th}>Kind</th>
                <th className={th}>Title</th>
                <th className={th}>Plans</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-regantify-text-muted">
                    Nothing yet.
                  </td>
                </tr>
              )}
              {(data ?? []).map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className={`${td} whitespace-nowrap text-xs`}>
                    {formatDhakaDateTime(e.publishedAt)}
                    {new Date(e.publishedAt).getTime() > now && <span className="ml-1.5 text-amber-700">scheduled</span>}
                  </td>
                  <td className={td}>{CHANGELOG_KIND_LABEL[e.kind]}</td>
                  <td className={td}>
                    <button type="button" onClick={() => setEditing(e)} className="font-medium text-regantify-text hover:underline">
                      {e.title}
                    </button>
                  </td>
                  <td className={`${td} text-xs text-regantify-text-muted`}>{e.planCodes.length ? e.planCodes.join(', ') : '-'}</td>
                  <td className={`${td} text-right`}>
                    <RowMenu items={[{ label: 'Edit', onSelect: () => setEditing(e) }, { label: 'Delete', onSelect: () => setDeleting(e), danger: true }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EntryDialog entry={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this entry?"
        message={`"${deleting?.title ?? ''}" disappears from every seller's What's new.`}
        confirmLabel="Delete entry"
        danger
        busy={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
    </div>
  );
}

function EntryDialog({ entry, onClose }: { entry: ChangelogEntry | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<ChangelogKind>('NEW');
  const [plans, setPlans] = useState<string[]>([]);
  const [link, setLink] = useState('');
  const [when, setWhen] = useState('');
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (!entry) return;
    const e = entry === 'new' ? null : entry;
    setTitle(e?.title ?? '');
    setBody(e?.body ?? '');
    setKind(e?.kind ?? 'NEW');
    setPlans(e?.planCodes ?? []);
    setLink(e?.link ?? '');
    setWhen(e ? isoToDhakaInput(e.publishedAt) : nowDhakaInput());
    setPreview(false);
  }, [entry]);
  const save = useMutation({
    mutationFn: () => {
      const payload: ChangelogBody = { title: title.trim(), body: body.trim(), kind, planCodes: plans, link: link.trim() || null, publishedAt: dhakaInputToIso(when) ?? new Date().toISOString() };
      return entry === 'new' ? adminHelpApi.createChangelog(payload) : adminHelpApi.updateChangelog((entry as ChangelogEntry).id, payload);
    },
    onSuccess: () => {
      toast.success('Saved.');
      qc.invalidateQueries({ queryKey: ['admin-changelog'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save it.')),
  });

  return (
    <Dialog open={entry !== null} onOpenChange={(o) => !o && onClose()} title={entry === 'new' ? "New What's new entry" : 'Edit entry'} maxWidth="max-w-xl">
      <div className="space-y-4 p-6 pt-3">
        <div className="flex gap-1 rounded-lg bg-regantify-search p-1">
          {KINDS.map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 rounded-md py-1.5 text-sm ${kind === k ? 'bg-white font-medium text-regantify-text shadow-sm' : 'text-regantify-text-muted'}`}>
              {CHANGELOG_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-regantify-text">Title</label>
          <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Print parcel stickers for any courier" className={field} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-regantify-text">Details (optional)</label>
            <button type="button" onClick={() => setPreview(!preview)} className="text-xs font-medium hover:underline">
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? <div className="rounded-lg border border-line p-3"><Markdown text={body} /></div> : <textarea value={body} maxLength={2000} rows={5} onChange={(e) => setBody(e.target.value)} className={field} />}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-regantify-text">Link (optional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/vendor/orders" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-regantify-text">Date (Dhaka time)</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-regantify-text">Plan label (optional)</p>
          <div className="flex flex-wrap gap-3">
            {PLANS.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm text-regantify-text">
                <input type="checkbox" checked={plans.includes(p)} onChange={(e) => setPlans(e.target.checked ? [...plans, p] : plans.filter((x) => x !== p))} />
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-regantify-text-muted">Only a label ("Advance plan"); every store still sees the entry.</p>
        </div>
        <button type="button" disabled={title.trim().length < 3 || save.isPending} onClick={() => save.mutate()} className="w-full rounded-lg bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {save.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}
