import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lightbulb, Loader2 } from 'lucide-react';
import { adminHelpApi, REQUEST_STATUS_LABEL, REQUEST_STATUSES, type AdminFeatureRequest, type RequestStatus } from '../../lib/helpApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDate } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { RowMenu } from '../../components/admin/RowMenu';
import { GradientBarChart } from '../../components/admin/charts';
import { Card, CardHeader } from '../../components/admin/ui/Card';

const field = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none';
const th = 'px-4 py-2 font-normal';
const td = 'px-4 py-2.5';

/**
 * Super Admin > Reach > Feature requests (super-admin-new.md Step 11): ideas sellers sent and voted on. A new idea waits in "Waiting for review" (only the
 * store that sent it sees it) until the team opens it for votes or declines it. Moving one to Planned, Being built or Done tells every store that voted.
 */
export default function FeatureRequests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const { data, isLoading } = useQuery({ queryKey: ['admin-feature-requests', status], queryFn: () => adminHelpApi.requests(status || undefined) });
  const [editing, setEditing] = useState<AdminFeatureRequest | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminFeatureRequest | null>(null);
  const del = useMutation({
    mutationFn: (id: string) => adminHelpApi.deleteRequest(id),
    onSuccess: () => {
      toast.success('Deleted.');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-feature-requests'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete it.')),
  });
  const quick = useMutation({
    mutationFn: ({ id, s }: { id: string; s: RequestStatus }) => adminHelpApi.updateRequest(id, { status: s }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feature-requests'] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change it.')),
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">Feature requests</h1>
            <p className="max-w-3xl text-sm text-regantify-text-muted">
              Ideas sellers sent from the Help button, with one vote per store. Open a new idea for votes or decline it. Moving an idea to Planned, Being built or
              Done sends a bell note to every store that voted.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value as RequestStatus | '')} className="rounded-lg border border-line bg-white px-3 py-2 text-sm">
            <option value="">All</option>
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setEditing('new')} className="rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white">
            Add one
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <>
        {(data ?? []).some((r) => r.votes > 0) && (
          <Card>
            <CardHeader title="Most wanted" subtitle="top 8 ideas by votes, in this list" />
            <GradientBarChart
              label="The 8 ideas with the most votes in this list"
              rows={[...(data ?? [])].sort((a, b) => b.votes - a.votes).slice(0, 8).filter((r) => r.votes > 0)}
              xKey="title"
              series={[{ key: 'votes', label: 'Votes' }]}
              xLabel={(v) => (String(v).length > 16 ? `${String(v).slice(0, 15)}…` : String(v))}
              tooltipTitle={(v) => String(v)}
              format={(n) => `${n} ${n === 1 ? 'vote' : 'votes'}`}
              height={220}
            />
          </Card>
        )}
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                <th className={`${th} text-right`}>Votes</th>
                <th className={th}>Idea</th>
                <th className={th}>From</th>
                <th className={th}>Status</th>
                <th className={th}>Sent</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-regantify-text-muted">
                    No ideas here.
                  </td>
                </tr>
              )}
              {(data ?? []).map((r) => (
                <tr key={r.id} className="border-b border-line align-top last:border-0">
                  <td className={`${td} text-right font-medium tabular-nums`}>{r.votes}</td>
                  <td className={td}>
                    <button type="button" onClick={() => setEditing(r)} className="text-left font-medium text-regantify-text hover:underline">
                      {r.title}
                    </button>
                    {r.body && <p className="line-clamp-2 max-w-md whitespace-pre-wrap text-xs text-regantify-text-muted">{r.body}</p>}
                    {r.adminNote && <p className="text-xs text-regantify-text">Note to stores: {r.adminNote}</p>}
                  </td>
                  <td className={`${td} text-xs`}>
                    {r.vendorId ? (
                      <Link to={`/admin/vendors/${r.vendorId}`} className="hover:underline">
                        {r.storeName ?? 'Removed store'}
                      </Link>
                    ) : (
                      <span className="text-regantify-text-muted">Team</span>
                    )}
                    {r.askedBy && r.vendorId && <p className="text-regantify-text-muted">{r.askedBy}</p>}
                  </td>
                  <td className={td}>{REQUEST_STATUS_LABEL[r.status]}</td>
                  <td className={`${td} whitespace-nowrap text-xs text-regantify-text-muted`}>{formatDhakaDate(r.createdAt)}</td>
                  <td className={`${td} text-right`}>
                    <RowMenu
                      items={[
                        ...(r.status === 'REVIEW' ? [{ label: 'Open for votes', onSelect: () => quick.mutate({ id: r.id, s: 'OPEN' }) }] : []),
                        { label: 'Edit and change status', onSelect: () => setEditing(r) },
                        { label: 'Delete', onSelect: () => setDeleting(r), danger: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <RequestDialog request={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this idea?"
        message={`"${deleting?.title ?? ''}" and its ${deleting?.votes ?? 0} votes are removed. To say no but keep it visible to the store that asked, choose "Not for now" instead.`}
        confirmLabel="Delete idea"
        danger
        busy={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
    </div>
  );
}

function RequestDialog({ request, onClose }: { request: AdminFeatureRequest | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<RequestStatus>('OPEN');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!request) return;
    const r = request === 'new' ? null : request;
    setTitle(r?.title ?? '');
    setBody(r?.body ?? '');
    setStatus(r?.status ?? 'OPEN');
    setNote(r?.adminNote ?? '');
  }, [request]);
  const save = useMutation({
    mutationFn: () =>
      request === 'new'
        ? adminHelpApi.createRequest({ title: title.trim(), body: body.trim() || undefined })
        : adminHelpApi.updateRequest((request as AdminFeatureRequest).id, { title: title.trim(), body: body.trim() || null, status, adminNote: note.trim() || null }),
    onSuccess: () => {
      toast.success('Saved.');
      qc.invalidateQueries({ queryKey: ['admin-feature-requests'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save it.')),
  });
  const before = request && request !== 'new' ? request.status : null;
  const tells = before !== null && status !== before && ['PLANNED', 'IN_PROGRESS', 'DONE', 'DECLINED'].includes(status);

  return (
    <Dialog open={request !== null} onOpenChange={(o) => !o && onClose()} title={request === 'new' ? 'Add an idea' : 'Feature request'} maxWidth="max-w-lg">
      <div className="space-y-4 p-6 pt-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-regantify-text">Idea</label>
          <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={field} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-regantify-text">Details</label>
          <textarea value={body} maxLength={1000} rows={3} onChange={(e) => setBody(e.target.value)} className={field} />
        </div>
        {request !== 'new' && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-regantify-text">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)} className={field}>
                {REQUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {REQUEST_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              {tells && (
                <p className="mt-1 text-xs text-regantify-text-muted">
                  {status === 'DECLINED' ? 'The store that asked gets a bell note.' : 'Every store that voted (and the one that asked) gets a bell note.'}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-regantify-text">Note shown to stores (optional)</label>
              <textarea value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} placeholder="Coming in November." className={field} />
            </div>
          </>
        )}
        <button type="button" disabled={title.trim().length < 5 || save.isPending} onClick={() => save.mutate()} className="w-full rounded-lg bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {save.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}
