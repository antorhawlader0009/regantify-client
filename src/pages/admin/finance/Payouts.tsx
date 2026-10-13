import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Search } from 'lucide-react';
import { adminFinanceApi, downloadText, type AdminWithdrawRequest, type WithdrawFilters } from '../../../lib/adminFinanceApi';
import type { WithdrawMethod, WithdrawRequestStatus } from '../../../lib/financeApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Dialog } from '../../../components/ui/Dialog';

function formatAmount(value: string | number) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/** What to actually send: the amount the store asked for less the platform's withdraw fee (Settings > Money). */
function toPay(r: { amount: string; fee?: string }) {
  return Math.round((Number(r.amount) - Number(r.fee ?? 0)) * 100) / 100;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const METHOD_LABEL: Record<WithdrawMethod, string> = { BKASH: 'bKash', NAGAD: 'Nagad', BANK: 'Bank Transfer' };

const STATUS_TABS: { label: string; value: WithdrawRequestStatus | 'ALL' }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
];

const STATUS_BADGE: Record<WithdrawRequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-800',
};

const field = 'rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none';

/** Asks for the bKash/Nagad transaction id or bank reference of each payout being marked paid (optional but kept with the request). */
function PaidDialog({ rows, onClose, onDone }: { rows: AdminWithdrawRequest[]; onClose: () => void; onDone: () => void }) {
  const [refs, setRefs] = useState<Record<string, string>>({});
  const m = useMutation({
    mutationFn: () => adminFinanceApi.batchMarkPaid(rows.map((r) => ({ id: r.id, reference: refs[r.id]?.trim() || undefined }))),
    onSuccess: (r) => {
      if (r.failed.length) toast.error(`${r.done} marked paid, ${r.failed.length} could not be: ${r.failed[0].error}`);
      else toast.success(`${r.done} marked as paid.`);
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update these requests.')),
  });
  return (
    <Dialog open={rows.length > 0} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-xl">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">
          Mark {rows.length} {rows.length === 1 ? 'payout' : 'payouts'} as paid
        </h2>
        <p className="text-xs text-regantify-text-muted">Type the bKash/Nagad transaction id or the bank reference of each one. The store is told it was sent, with that reference.</p>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3">
              <div className="w-48 shrink-0">
                <p className="truncate text-sm font-medium text-regantify-text">{r.vendor.storeName}</p>
                <p className="text-xs text-regantify-text-muted">
                  {formatAmount(toPay(r))} · {METHOD_LABEL[r.method]}
                </p>
              </div>
              <input value={refs[r.id] ?? ''} onChange={(e) => setRefs((s) => ({ ...s, [r.id]: e.target.value }))} maxLength={120} placeholder="Reference (optional)" className={`${field} flex-1`} />
            </div>
          ))}
        </div>
        <button type="button" disabled={m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {m.isPending ? 'Saving…' : 'Mark as paid'}
        </button>
      </div>
    </Dialog>
  );
}

/**
 * Super Admin > Finance > Payouts — the admin side of Finance > Withdraw's vendor request flow. Defaults to the PENDING tab. Approve/Reject resolve a pending
 * request (Reject restores the vendor's reserved balance — see AdminService.resolveWithdrawRequest); an Approved one gets "Mark as paid" once the money
 * was really sent (alone or ticked in a batch, with the bKash/bank reference). Filters by method, dates and store; CSV for the batch to send.
 */
export default function Payouts() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<WithdrawRequestStatus | 'ALL'>('PENDING');
  const [method, setMethod] = useState<WithdrawMethod | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState<AdminWithdrawRequest[]>([]);

  const filters: WithdrawFilters = { status: tab === 'ALL' ? undefined : tab, method: method || undefined, from: from || undefined, to: to || undefined, search: search.trim() || undefined };
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['admin-withdraw-requests', filters], queryFn: () => adminFinanceApi.listWithdrawRequests(filters) });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-withdraw-requests'] });
    setSelected(new Set());
    setPaying([]);
  };

  const resolveMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) => adminFinanceApi.resolveWithdrawRequest(id, decision),
    onSuccess: (_, { decision }) => {
      refresh();
      toast.success(decision === 'APPROVED' ? 'Request approved.' : 'Request rejected — balance restored.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not resolve this request. Please try again.')),
  });

  async function exportCsv() {
    try {
      downloadText('withdrawals.csv', await adminFinanceApi.withdrawalsCsv(filters));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not export.'));
    }
  }

  const approved = requests.filter((r) => r.status === 'APPROVED');
  const chosen = approved.filter((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-regantify-text">Payouts</h1>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setTab(t.value);
              setSelected(new Set());
            }}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${tab === t.value ? 'bg-regantify-black text-white' : 'text-regantify-text-muted hover:bg-regantify-content'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Store, number or reference" className={`${field} w-64 pl-9`} />
        </div>
        <select value={method} onChange={(e) => setMethod(e.target.value as WithdrawMethod | '')} className={field}>
          <option value="">Any method</option>
          <option value="BKASH">bKash</option>
          <option value="NAGAD">Nagad</option>
          <option value="BANK">Bank transfer</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-regantify-text-muted">
          From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
        </label>
        <label className="flex items-center gap-2 text-xs text-regantify-text-muted">
          to <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
        </label>
        <button type="button" onClick={exportCsv} className={`${field} ml-auto inline-flex items-center gap-1.5`}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {chosen.length > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-blue-900">
            {chosen.length} selected · {formatAmount(chosen.reduce((s, r) => s + toPay(r), 0))}
          </span>
          <button type="button" onClick={() => setPaying(chosen)} className="rounded-lg bg-regantify-cta px-3 py-1 font-medium text-white">
            Mark selected as paid
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs underline">
            Clear
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-regantify-content text-left text-regantify-text-muted">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all approved"
                    checked={approved.length > 0 && approved.every((r) => selected.has(r.id))}
                    disabled={approved.length === 0}
                    onChange={() => setSelected(approved.every((r) => selected.has(r.id)) ? new Set() : new Set(approved.map((r) => r.id)))}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Payout details</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Requested</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-regantify-text-muted">Loading…</td>
                </tr>
              )}
              {!isLoading && requests.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-regantify-text-muted">No requests here.</td>
                </tr>
              )}
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-black/5 align-top">
                  <td className="px-4 py-3">{r.status === 'APPROVED' && <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.vendor.storeName}`} />}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/vendors/${r.vendor.id}`} className="font-medium text-regantify-cta hover:underline">{r.vendor.storeName}</Link>
                    <p className="text-xs text-regantify-text-muted">{r.vendor.subdomain}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-regantify-text">
                    {formatAmount(toPay(r))}
                    {Number(r.fee ?? 0) > 0 && <p className="text-xs font-normal text-regantify-text-muted">asked {formatAmount(r.amount)}, fee {formatAmount(r.fee ?? 0)}</p>}
                  </td>
                  <td className="px-4 py-3 text-regantify-text">{METHOD_LABEL[r.method]}</td>
                  <td className="max-w-[220px] whitespace-pre-wrap px-4 py-3 text-regantify-text-muted">{r.method === 'BANK' ? r.bankDetails : r.receiverNumber}</td>
                  <td className="max-w-[200px] px-4 py-3 text-regantify-text-muted">{r.note ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-regantify-text-muted">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</span>
                    {r.payoutReference && <p className="mt-1 text-xs text-regantify-text-muted">Ref: {r.payoutReference}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => resolveMutation.mutate({ id: r.id, decision: 'APPROVED' })} disabled={resolveMutation.isPending} className="rounded-lg bg-regantify-cta px-3 py-1.5 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-50">
                          Approve
                        </button>
                        <button onClick={() => resolveMutation.mutate({ id: r.id, decision: 'REJECTED' })} disabled={resolveMutation.isPending} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-50">
                          Reject
                        </button>
                      </div>
                    )}
                    {r.status === 'APPROVED' && (
                      <button onClick={() => setPaying([r])} className="rounded-lg bg-regantify-cta px-3 py-1.5 text-sm font-medium text-white hover:bg-regantify-cta-dark">
                        Mark as Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-2 text-xs text-regantify-text-muted">To stop one store from withdrawing, open the store and use “Pause withdrawals”. The minimum amount and the withdraw fee are set in Settings, Money tab; the amount shown is what to pay out (the fee is already taken off).</p>

      {paying.length > 0 && <PaidDialog rows={paying} onClose={() => setPaying([])} onDone={refresh} />}
    </div>
  );
}
