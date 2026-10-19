import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ShieldCheck } from 'lucide-react';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { apiErrorMessage } from '../../lib/api';
import { approvalsApi, type ApprovalRow, type ApprovalRules } from '../../lib/approvalsApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const STATUS: Record<ApprovalRow['status'], { label: string; cls: string }> = {
  PENDING: { label: 'Waiting', cls: 'bg-amber-50 text-amber-800' },
  RUNNING: { label: 'Running', cls: 'bg-blue-50 text-blue-700' },
  DONE: { label: 'Approved and done', cls: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Turned down', cls: 'bg-neutral-100 text-neutral-700' },
  FAILED: { label: 'Approved, but failed', cls: 'bg-red-50 text-red-700' },
  EXPIRED: { label: 'Expired', cls: 'bg-neutral-100 text-neutral-500' },
};

/**
 * Super Admin > Platform > Approvals (super-admin-new.md Step 7): big wallet changes, big withdrawals, closing or moving a store and erasing a
 * shopper wait here until a second team member approves them with their authenticator code. Nobody approves their own request.
 */
export default function Approvals() {
  const [params, setParams] = useSearchParams();
  const tab = (['waiting', 'done', 'rules'] as const).find((t) => t === params.get('tab')) ?? 'waiting';
  const isOwner = adminCan(useAdminViewer(), 'settings.manage');

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 text-regantify-text-muted" size={20} />
        <div>
          <h1 className="text-lg font-semibold text-regantify-text">Approvals</h1>
          <p className="max-w-3xl text-sm text-regantify-text-muted">
            Big or dangerous actions need a second person. The one who asks can't approve; a teammate with the same permission approves with their authenticator code, and
            the action runs then, in their name. If nobody else on the team has the permission, the action runs at once as before.
          </p>
        </div>
      </div>

      <div role="tablist" className="flex gap-1 rounded-xl border border-black/5 bg-white p-1">
        {[
          { id: 'waiting', label: 'Waiting' },
          { id: 'done', label: 'Decided' },
          ...(isOwner ? [{ id: 'rules', label: 'Rules and IP list' }] : []),
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams(t.id === 'waiting' ? {} : { tab: t.id }, { replace: true })}
            className={`h-9 rounded-lg px-3.5 text-sm ${tab === t.id ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rules' && isOwner ? <RulesTab /> : <List show={tab === 'done' ? 'DONE' : 'PENDING'} focusId={params.get('id')} />}
    </div>
  );
}

function List({ show, focusId }: { show: 'PENDING' | 'DONE'; focusId: string | null }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-approvals', show], queryFn: () => approvalsApi.list(show), refetchInterval: 30_000 });
  const [deciding, setDeciding] = useState<{ row: ApprovalRow; approve: boolean } | null>(null);
  if (isLoading || !data) return <Loader2 className="mx-auto animate-spin text-neutral-400" />;
  if (data.length === 0) {
    return <p className="rounded-xl border border-black/5 bg-white px-4 py-8 text-center text-sm text-regantify-text-muted">{show === 'PENDING' ? 'Nothing is waiting for approval.' : 'Nothing decided yet.'}</p>;
  }
  return (
    <>
      <ul className="space-y-2">
        {data.map((r) => (
          <li key={r.id} className={`rounded-xl border bg-white p-4 ${focusId === r.id ? 'border-amber-300' : 'border-black/5'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-regantify-text-muted">{r.actionLabel}</p>
                <p className="text-sm font-medium text-regantify-text">{r.summary}</p>
                <p className="mt-0.5 text-xs text-regantify-text-muted">
                  Asked by {r.mine ? 'you' : r.requestedByName}, {formatDhakaDateTime(r.createdAt)}
                  {r.status === 'PENDING' ? ` - expires ${formatDhakaDateTime(r.expiresAt)}` : ''}
                  {r.vendorId && (
                    <>
                      {' - '}
                      <Link to={`/admin/vendors/${r.vendorId}`} className="underline">
                        open the store
                      </Link>
                    </>
                  )}
                </p>
                {r.decidedByName && (
                  <p className="mt-1 text-xs text-regantify-text">
                    {r.status === 'REJECTED' ? 'Turned down' : 'Approved'} by {r.decidedByName}
                    {r.decidedAt ? `, ${formatDhakaDateTime(r.decidedAt)}` : ''}
                    {r.decisionNote ? `: ${r.decisionNote}` : ''}
                  </p>
                )}
                {r.error && <p className="mt-1 text-xs text-red-700">Failed: {r.error}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
            </div>
            {r.canDecide && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setDeciding({ row: r, approve: true })} className="rounded-lg bg-regantify-cta px-3 py-1.5 text-sm font-medium text-white">
                  Approve
                </button>
                <button type="button" onClick={() => setDeciding({ row: r, approve: false })} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm text-regantify-text">
                  Turn down
                </button>
              </div>
            )}
            {r.status === 'PENDING' && r.mine && <p className="mt-2 text-xs text-regantify-text-muted">Waiting for a teammate. You can't approve your own request.</p>}
          </li>
        ))}
      </ul>
      <DecideDialog deciding={deciding} onClose={() => setDeciding(null)} />
    </>
  );
}

function DecideDialog({ deciding, onClose }: { deciding: { row: ApprovalRow; approve: boolean } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  useEffect(() => setText(''), [deciding]);
  const m = useMutation({
    mutationFn: () => (deciding!.approve ? approvalsApi.approve(deciding!.row.id, text) : approvalsApi.reject(deciding!.row.id, text.trim())),
    onSuccess: () => {
      toast.success(deciding!.approve ? 'Approved. The action ran.' : 'Turned down.');
      qc.invalidateQueries({ queryKey: ['admin-approvals'] });
      onClose();
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'That did not work.'));
      qc.invalidateQueries({ queryKey: ['admin-approvals'] });
    },
  });
  const ready = deciding?.approve ? /^\d{6}$/.test(text) : text.trim().length >= 3;
  return (
    <Dialog open={deciding !== null} onOpenChange={(o) => !o && onClose()} title={deciding?.approve ? 'Approve' : 'Turn down'} maxWidth="max-w-md">
      {deciding && (
        <div className="space-y-4 p-6 pt-3">
          <p className="text-sm text-regantify-text">{deciding.row.summary}</p>
          <p className="text-xs text-regantify-text-muted">Asked by {deciding.row.requestedByName}.</p>
          {deciding.approve ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-regantify-text">Your authenticator code</label>
              <input value={text} onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit code" className={field} />
              <p className="mt-1 text-xs text-regantify-text-muted">The action runs at once, in your name.</p>
            </div>
          ) : (
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={300} placeholder="Why (the person who asked will see this)" className={field} />
          )}
          <button type="button" disabled={!ready || m.isPending} onClick={() => m.mutate()} className={`w-full rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-50 ${deciding.approve ? 'bg-regantify-cta' : 'bg-neutral-700'}`}>
            {m.isPending ? 'Working...' : deciding.approve ? 'Approve and run it' : 'Turn down'}
          </button>
        </div>
      )}
    </Dialog>
  );
}

function RulesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-approval-rules'], queryFn: approvalsApi.rules });
  const [form, setForm] = useState<ApprovalRules | null>(null);
  const [listText, setListText] = useState('');
  const [code, setCode] = useState('');
  useEffect(() => {
    if (data) {
      setForm(data);
      setListText(data.ipAllowList.join('\n'));
    }
  }, [data]);
  const save = useMutation({
    mutationFn: () =>
      approvalsApi.saveRules({
        walletApprovalAbove: form!.walletApprovalAbove,
        payoutApprovalAbove: form!.payoutApprovalAbove,
        approveCloseStore: form!.approveCloseStore,
        approveTransferStore: form!.approveTransferStore,
        approveShopperErase: form!.approveShopperErase,
        ipAllowListOn: form!.ipAllowListOn,
        ipAllowList: listText.split(/[\n,]/).map((x) => x.trim()).filter(Boolean),
        code,
      }),
    onSuccess: (r) => {
      toast.success('Saved.');
      setCode('');
      qc.setQueryData(['admin-approval-rules'], r);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  if (!form) return <Loader2 className="mx-auto animate-spin text-neutral-400" />;
  const set = <K extends keyof ApprovalRules>(k: K, v: ApprovalRules[K]) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-black/5 bg-white p-4">
        <h2 className="text-sm font-semibold text-regantify-text">What needs a second approval</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-regantify-text-muted">A wallet change of at least (Tk)</label>
            <input type="number" min={0} value={form.walletApprovalAbove} onChange={(e) => set('walletApprovalAbove', Math.max(0, Number(e.target.value) || 0))} className={field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-regantify-text-muted">Approving a withdrawal of at least (Tk)</label>
            <input type="number" min={0} value={form.payoutApprovalAbove} onChange={(e) => set('payoutApprovalAbove', Math.max(0, Number(e.target.value) || 0))} className={field} />
          </div>
        </div>
        {(
          [
            ['approveCloseStore', 'Closing a store'],
            ['approveTransferStore', 'Moving a store to a new owner'],
            ['approveShopperErase', 'Erasing a shopper'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-regantify-text">
            <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
            {label}
          </label>
        ))}
        <p className="text-xs text-regantify-text-muted">Set an amount to 0 to ask for approval on every wallet change or withdrawal.</p>
      </section>

      <section className="space-y-3 rounded-xl border border-black/5 bg-white p-4">
        <h2 className="text-sm font-semibold text-regantify-text">Admin IP list</h2>
        <p className="text-xs text-regantify-text-muted">
          When on, the admin panel (and its sign-in) only works from these addresses. One per line: an exact address or a range like 103.4.5.0/24. Your address now is{' '}
          <span className="font-mono text-regantify-text">{form.yourIp ?? 'unknown'}</span>; it must be on the list. If you ever get locked out, set ADMIN_IP_ALLOWLIST_OFF=true in
          server/.env and restart.
        </p>
        {form.envOverride && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-900">ADMIN_IP_ALLOWLIST_OFF=true is set on the server, so the list is not enforced right now.</p>}
        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={form.ipAllowListOn} onChange={(e) => set('ipAllowListOn', e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          Only allow the addresses below
        </label>
        <textarea value={listText} onChange={(e) => setListText(e.target.value)} rows={4} placeholder={form.yourIp ?? '103.4.5.6'} className={`${field} font-mono`} />
        {form.yourIp && !listText.includes(form.yourIp) && (
          <button type="button" onClick={() => setListText((t) => (t.trim() ? `${t.trim()}\n${form.yourIp}` : form.yourIp!))} className="text-xs font-medium text-regantify-text underline">
            Add my address
          </button>
        )}
      </section>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="mb-1.5 block text-xs text-regantify-text-muted">Your authenticator code</label>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit code" className={field} />
        </div>
        <button type="button" disabled={!/^\d{6}$/.test(code) || save.isPending} onClick={() => save.mutate()} className="rounded-xl bg-regantify-cta px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {save.isPending ? 'Saving...' : 'Save rules'}
        </button>
        {data?.updatedBy && <span className="text-xs text-regantify-text-muted">Last changed by {data.updatedBy}</span>}
      </div>
    </div>
  );
}
