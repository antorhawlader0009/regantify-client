import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, UserPlus, Users } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { EmptyState, PillTabs, outlineBtn, primaryBtn } from '../ui/PageKit';
import { ResaleNoteDialog } from './ResaleNoteDialog';
import { dhakaDate } from './ResaleOfferDialogs';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { PARTNERSHIP_LABEL, resalePartnersApi, type Partnership, type PartnershipStatus } from '../../lib/resaleSellApi';

const KEY = ['resale-partners'] as const;
type Filter = 'PENDING' | 'APPROVED' | 'OTHER';
type Action = { kind: 'reject' | 'end' | 'block'; row: Partnership } | null;

/**
 * Products > Sell through resellers > Resellers (RESELLER-plan.md Step 3): requests to approve or reject, partners to end or block,
 * invitations by store address. Ending or blocking stops the reseller's listings (Step 4); money already earned is still paid.
 */
export function ResellerPartnersPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [action, setAction] = useState<Action>(null);
  const [inviting, setInviting] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: () => resalePartnersApi.list() });

  const done = (msg: string) => {
    queryClient.invalidateQueries({ queryKey: KEY });
    toast.success(msg);
    setAction(null);
  };
  const fail = (fallback: string) => (err: unknown) => toast.error(apiErrorMessage(err, fallback));
  const approve = useMutation({ mutationFn: resalePartnersApi.approve, onSuccess: () => done('Approved. They can now sell your offered products.'), onError: fail('Could not approve.') });
  const unblock = useMutation({ mutationFn: resalePartnersApi.unblock, onSuccess: () => done('Unblocked. The store may ask again.'), onError: fail('Could not unblock.') });
  const note = useMutation({
    mutationFn: ({ kind, id, text }: { kind: 'reject' | 'end' | 'block'; id: string; text: string }) =>
      kind === 'reject' ? resalePartnersApi.reject(id, text || undefined) : kind === 'end' ? resalePartnersApi.end(id, text || undefined) : resalePartnersApi.block(id, text),
    onSuccess: (_r, v) => done(v.kind === 'reject' ? 'Request rejected.' : v.kind === 'end' ? 'Partnership ended.' : 'Store blocked.'),
    onError: fail('Could not save that.'),
  });

  const counts = data?.counts ?? {};
  const rows = (data?.items ?? []).filter((r) =>
    filter === 'PENDING' ? r.status === 'PENDING' : filter === 'APPROVED' ? r.status === 'APPROVED' : !['PENDING', 'APPROVED'].includes(r.status),
  );
  const other = (['REJECTED', 'BLOCKED', 'ENDED'] as PartnershipStatus[]).reduce((n, s) => n + (counts[s] ?? 0), 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <PillTabs
          className=""
          tabs={[
            { id: 'PENDING', label: 'Waiting', count: counts.PENDING ?? 0 },
            { id: 'APPROVED', label: 'Resellers', count: counts.APPROVED ?? 0 },
            { id: 'OTHER', label: 'Ended and blocked', count: other },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <button type="button" onClick={() => setInviting(true)} className={`${outlineBtn} ml-auto`}>
          <UserPlus size={15} aria-hidden />
          Invite a store
        </button>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filter === 'PENDING' ? 'Nothing waiting' : filter === 'APPROVED' ? 'No resellers yet' : 'Nothing here'}
          hint={filter === 'APPROVED' ? 'Stores that resell your products show here. Invite a store you know, or wait for requests.' : undefined}
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {rows.map((r) => {
            const request = r.status === 'PENDING' && !r.invited;
            const invitation = r.status === 'PENDING' && r.invited;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-sm font-medium text-regantify-text">
                    {r.reseller.storeName}
                    {r.reseller.verified && <BadgeCheck size={13} className="text-emerald-600" aria-label="Verified" />}
                    <span className="font-normal text-neutral-500">· {r.reseller.subdomain}</span>
                  </p>
                  <p className="text-xs text-neutral-500">
                    {request ? 'Asked to resell' : invitation ? 'You invited them, waiting for an answer' : PARTNERSHIP_LABEL[r.status]}
                    {` · ${dhakaDate(r.decidedAt ?? r.requestedAt)}`}
                  </p>
                  {r.message && request && <p className="mt-0.5 text-xs text-neutral-700">“{r.message}”</p>}
                  {request && r.overall && r.overall.finished > 0 && (
                    <p className={`mt-0.5 text-xs ${(r.overall.returnRate ?? 0) >= 30 ? 'text-red-700' : 'text-neutral-600'}`}>
                      With all suppliers: {r.overall.finished} finished resale orders, {r.overall.returnRate ?? 0}% came back
                    </p>
                  )}
                  {r.stats && r.stats.orders > 0 && (
                    <p className="mt-0.5 text-xs text-neutral-600">
                      {r.stats.orders} order{r.stats.orders === 1 ? '' : 's'} · {r.stats.delivered} delivered
                      {r.stats.returnRate !== null ? ` · ${r.stats.returnRate}% returned` : ''} · sales ৳{r.stats.sales.toLocaleString('en-US')}
                      {' · '}earnings paid ৳{r.stats.paid.toLocaleString('en-US')}
                      {r.stats.owed > 0 && <span className="text-red-700"> · ৳{r.stats.owed.toLocaleString('en-US')} waiting for your wallet</span>}
                    </p>
                  )}
                  {r.reason && <p className="mt-0.5 text-xs text-neutral-600">Reason: {r.reason}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {request && (
                    <>
                      <button type="button" disabled={approve.isPending} onClick={() => approve.mutate(r.id)} className={primaryBtn}>
                        Approve
                      </button>
                      <button type="button" onClick={() => setAction({ kind: 'reject', row: r })} className={outlineBtn}>
                        Reject
                      </button>
                    </>
                  )}
                  {(r.status === 'APPROVED' || invitation) && (
                    <button type="button" onClick={() => setAction({ kind: 'end', row: r })} className={outlineBtn}>
                      {invitation ? 'Take back' : 'End'}
                    </button>
                  )}
                  {r.status === 'BLOCKED' ? (
                    <button type="button" disabled={unblock.isPending} onClick={() => unblock.mutate(r.id)} className={outlineBtn}>
                      Unblock
                    </button>
                  ) : (
                    <button type="button" onClick={() => setAction({ kind: 'block', row: r })} className={`${outlineBtn} text-red-700`}>
                      Block
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {action && (
        <ResaleNoteDialog
          title={
            action.kind === 'reject'
              ? `Reject ${action.row.reseller.storeName}?`
              : action.kind === 'end'
                ? `End the partnership with ${action.row.reseller.storeName}?`
                : `Block ${action.row.reseller.storeName}?`
          }
          message={
            action.kind === 'block'
              ? 'They stop selling your products and cannot ask again until you unblock them. Money they already earned is still paid.'
              : action.kind === 'end'
                ? 'Your products stop selling in their store. They may ask again later. Money they already earned is still paid.'
                : undefined
          }
          label="Reason (they see it)"
          minLength={action.kind === 'block' ? 5 : 0}
          confirmLabel={action.kind === 'reject' ? 'Reject' : action.kind === 'end' ? 'End' : 'Block'}
          danger={action.kind !== 'reject'}
          busy={note.isPending}
          onConfirm={(text) => note.mutate({ kind: action.kind, id: action.row.id, text })}
          onClose={() => setAction(null)}
        />
      )}
      {inviting && <InviteDialog onClose={() => setInviting(false)} onDone={() => done('Invitation sent.')} />}
    </div>
  );
}

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const invite = useMutation({
    mutationFn: () => resalePartnersApi.invite(address.trim(), message.trim() || undefined),
    onSuccess: () => {
      onDone();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the invitation.')),
  });
  const field = 'mt-1 block w-full rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Invite a store" maxWidth="max-w-md">
      <div className="space-y-3">
        <p className="text-sm text-neutral-600">Invite a store you know to sell your products. They get a note and accept or decline.</p>
        <label className="block text-sm text-regantify-text">
          Their store address
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="rahim-fashion" className={`${field} h-10`} />
        </label>
        <label className="block text-sm text-regantify-text">
          A note <span className="text-neutral-400">(optional)</span>
          <textarea rows={3} maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} className={`${field} py-2`} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" disabled={address.trim().length < 2 || invite.isPending} onClick={() => invite.mutate()} className={primaryBtn}>
            {invite.isPending ? 'Sending…' : 'Send invitation'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
