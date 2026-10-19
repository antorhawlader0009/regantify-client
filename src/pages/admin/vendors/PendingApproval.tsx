import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Loader2 } from 'lucide-react';
import { adminApi, type PendingStore } from '../../../lib/adminApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { Dialog } from '../../../components/ui/Dialog';
import { ReasonNeed } from '../../../components/admin/ReasonNeed';

/**
 * Super Admin > Pending Approval (super-admin-plan.md Step 5). Off by default: with "new stores need approval" on, a new sign-up waits here (storefront
 * closed, no orders) until approved. Rejecting texts the owner the reason. Warnings flag a device or phone that belongs to a store that was shut.
 */
export default function PendingApproval() {
  const qc = useQueryClient();
  const setting = useQuery({ queryKey: ['admin', 'approval-setting'], queryFn: adminApi.approvalSetting });
  const queue = useQuery({ queryKey: ['admin', 'pending-queue'], queryFn: adminApi.pendingQueue, refetchInterval: 60_000 });
  const [rejecting, setRejecting] = useState<PendingStore | null>(null);
  const [reason, setReason] = useState('');
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'pending-queue'] });
    qc.invalidateQueries({ queryKey: ['admin-vendors'] });
  };

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => adminApi.setApprovalSetting(enabled),
    onSuccess: (r) => {
      qc.setQueryData(['admin', 'approval-setting'], r);
      toast.success(r.enabled ? 'New stores now wait for your approval.' : 'New stores open straight away again.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveStore(id),
    onSuccess: (r) => {
      toast.success(r.texted ? 'Approved. The owner was texted.' : 'Approved. The owner could not be texted.');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not approve.')),
  });
  const reject = useMutation({
    mutationFn: () => adminApi.rejectStore(rejecting!.id, reason.trim()),
    onSuccess: () => {
      toast.success('Rejected. The owner was texted the reason.');
      setRejecting(null);
      setReason('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not reject.')),
  });

  return (
    <div className="max-w-4xl">
      <h1 className="mb-4 text-2xl font-semibold text-regantify-text">Pending approval</h1>

      <div className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-black/5 bg-white p-5">
        <div>
          <p className="text-sm font-semibold text-regantify-text">New stores need approval</p>
          <p className="mt-0.5 text-xs text-regantify-text-muted">
            {setting.data?.enabled
              ? 'On. A new sign-up waits here: its storefront is closed and it takes no orders until you approve it.'
              : 'Off. New stores open straight away, as they always did. Turn it on to review each new sign-up first.'}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={!!setting.data?.enabled} disabled={!setting.data || toggle.isPending} onChange={(e) => toggle.mutate(e.target.checked)} />
          {setting.data?.enabled ? 'On' : 'Off'}
        </label>
      </div>

      {queue.isLoading ? (
        <Loader2 className="mx-auto mt-10 animate-spin text-neutral-400" />
      ) : !queue.data?.length ? (
        <p className="rounded-2xl border border-black/5 bg-white p-10 text-center text-sm text-regantify-text-muted">No store is waiting for approval.</p>
      ) : (
        <div className="space-y-3">
          {queue.data.map((s) => (
            <div key={s.id} className="rounded-2xl border border-black/5 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to={`/admin/vendors/${s.id}`} className="font-medium text-regantify-cta hover:underline">
                    {s.storeName}
                  </Link>
                  <p className="text-xs text-regantify-text-muted">
                    {s.subdomain} · signed up {formatDhakaDateTime(s.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-regantify-text">
                    {s.ownerName ?? 'No name yet'} · {s.phone ?? 'no phone'}
                    {s.email ? ` · ${s.email}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={approve.isPending} onClick={() => approve.mutate(s.id)} className="rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    Approve
                  </button>
                  <button type="button" onClick={() => setRejecting(s)} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700">
                    Reject
                  </button>
                </div>
              </div>
              {s.warnings.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {s.warnings.map((w) => (
                    <li key={w} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-900">
                      <CircleAlert size={13} /> {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)} maxWidth="max-w-md">
        <div className="space-y-4 p-6">
          <h2 className="font-semibold text-regantify-text">Reject {rejecting?.storeName}</h2>
          <p className="text-xs text-regantify-text-muted">The store is suspended and the owner is texted this reason.</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder="Reason" className="w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm focus:outline-none" />
          <ReasonNeed value={reason} />
          <button type="button" disabled={reason.trim().length < 5 || reject.isPending} onClick={() => reject.mutate()} className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {reject.isPending ? 'Rejecting…' : 'Reject the store'}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
