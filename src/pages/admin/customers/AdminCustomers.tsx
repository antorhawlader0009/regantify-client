import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Loader2, Search } from 'lucide-react';
import { adminShoppersApi, type ShopperSummary } from '../../../lib/adminShoppersApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { Dialog } from '../../../components/ui/Dialog';
import { ReasonNeed } from '../../../components/admin/ReasonNeed';

const field = 'rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none';

/** Reason + optional number of days, then "block this phone on every store". */
export function BlockDialog({ phone: initial, open, onClose, onDone }: { phone?: string; open: boolean; onClose: () => void; onDone: () => void }) {
  const [phone, setPhone] = useState(initial ?? '');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('');
  const m = useMutation({
    mutationFn: () => adminShoppersApi.block(phone.trim(), reason.trim(), days ? Number(days) : undefined),
    onSuccess: () => {
      toast.success('Blocked on every store.');
      setReason('');
      setDays('');
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not block it.')),
  });
  const area = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm focus:outline-none';
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-red-700">Block a phone number on every store</h2>
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">For proven fraud only. Every store’s checkout refuses this number, with the same plain message a shopper gets for any refusal. The number’s existing orders are not touched.</p>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone, e.g. 017XXXXXXXX" className={area} disabled={!!initial} />
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} placeholder="Reason (saved in the admin log)" className={area} />
        <ReasonNeed value={reason} />
        <input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} placeholder="For how many days? Leave empty for until removed" className={area} />
        <button type="button" disabled={phone.trim().length < 10 || reason.trim().length < 5 || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {m.isPending ? 'Blocking…' : 'Block this number'}
        </button>
      </div>
    </Dialog>
  );
}

function Find() {
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const { data, isFetching, error } = useQuery({ queryKey: ['admin-shoppers', q], queryFn: () => adminShoppersApi.search(q), enabled: q.length >= 3, retry: false });
  return (
    <div>
      <form
        className="relative mb-4 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(input.trim());
        }}
      >
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Full phone number, or part of a name" className={`${field} w-full pl-10`} autoFocus />
      </form>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{apiErrorMessage(error, 'Could not search.')}</p>}
      {isFetching && <Loader2 className="mx-auto my-6 animate-spin text-neutral-400" />}
      {data && (
        <>
          {data.nameSearchDays && <p className="mb-2 text-xs text-regantify-text-muted">A name is looked for in shopper accounts and in orders of the last {data.nameSearchDays} days. A full phone number is found at any age.</p>}
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-regantify-content text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted">
                  <th className="px-4 py-3">Shopper</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Stores</th>
                  <th className="px-4 py-3 text-right">Cancelled</th>
                  <th className="px-4 py-3 text-right">Returned</th>
                  <th className="px-4 py-3 text-right">Store blacklists</th>
                  <th className="px-4 py-3">Last order</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-regantify-text-muted">Nobody found.</td></tr>
                )}
                {data.items.map((s: ShopperSummary) => (
                  <tr key={s.phone} className="border-t border-black/5">
                    <td className="px-4 py-2.5">
                      <Link to={`/admin/customers/${s.phone}`} className="font-medium text-regantify-cta hover:underline">{s.name || s.phone}</Link>
                      <div className="text-xs text-regantify-text-muted">
                        {s.phone}
                        {s.hasAccount ? ' · has an account' : ' · guest'}
                        {s.loginOff ? ' · sign-in off' : ''}
                      </div>
                      {s.platformBlocked && <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700"><Ban size={11} /> blocked on every store</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.orders}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.stores}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.cancelled}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.returned}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${s.blacklistedByStores ? 'font-semibold text-red-700' : ''}`}>{s.blacklistedByStores}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{s.lastOrderAt ? formatDhakaDateTime(s.lastOrderAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!q && <p className="py-10 text-center text-sm text-regantify-text-muted">Search to find a shopper. Opening a profile is written to the admin log.</p>}
    </div>
  );
}

function Blocklist() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-blocklist'], queryFn: adminShoppersApi.blocklist });
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-blocklist'] });
  const unblock = useMutation({
    mutationFn: () => adminShoppersApi.unblock(removing!, reason.trim()),
    onSuccess: () => {
      toast.success('Taken off the blacklist.');
      setRemoving(null);
      setReason('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not remove it.')),
  });
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-regantify-text-muted">Numbers refused at every store’s checkout. For proven fraud only.</p>
        <button type="button" onClick={() => setAdding(true)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white">Block a number</button>
      </div>
      {isLoading ? (
        <Loader2 className="mx-auto mt-6 animate-spin text-neutral-400" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-regantify-content text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted">
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3">Until</th>
                <th className="px-4 py-3 text-right">Refused</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {!data?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-regantify-text-muted">No number is blocked.</td></tr>}
              {data?.map((b) => (
                <tr key={b.phone} className={`border-t border-black/5 ${b.active ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-2.5"><Link to={`/admin/customers/${b.phone}`} className="text-regantify-cta hover:underline">{b.phone}</Link></td>
                  <td className="px-4 py-2.5">{b.reason}</td>
                  <td className="px-4 py-2.5 text-xs text-regantify-text-muted">{b.by}<div>{formatDhakaDateTime(b.since)}</div></td>
                  <td className="px-4 py-2.5">{b.until ? (b.active ? formatDhakaDateTime(b.until) : 'ended') : 'until removed'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{b.attempts}{b.lastAttemptAt && <div className="text-xs text-regantify-text-muted">last {formatDhakaDateTime(b.lastAttemptAt)}</div>}</td>
                  <td className="px-4 py-2.5 text-right"><button type="button" onClick={() => setRemoving(b.phone)} className="rounded-lg border border-black/10 px-3 py-1 text-xs">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <BlockDialog open={adding} onClose={() => setAdding(false)} onDone={() => { setAdding(false); refresh(); }} />
      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} maxWidth="max-w-md">
        <div className="space-y-4 p-6">
          <h2 className="font-semibold text-regantify-text">Take {removing} off the blacklist</h2>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} placeholder="Reason (saved in the admin log)" className="w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm focus:outline-none" />
          <ReasonNeed value={reason} />
          <button type="button" disabled={reason.trim().length < 5 || unblock.isPending} onClick={() => unblock.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">Remove from the blacklist</button>
        </div>
      </Dialog>
    </div>
  );
}

/** Super Admin > Customers (super-admin-plan.md Step 8): find a shopper across every store, and the platform-wide phone blacklist. */
export default function AdminCustomers() {
  const [tab, setTab] = useState<'find' | 'blocklist'>('find');
  return (
    <div className="max-w-6xl">
      <h1 className="mb-4 text-2xl font-semibold text-regantify-text">Customers</h1>
      <div className="mb-5 flex gap-1 border-b border-black/5">
        {(
          [
            ['find', 'Find a shopper'],
            ['blocklist', 'Platform blacklist'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`px-4 py-2 text-sm font-medium ${tab === id ? 'border-b-2 border-regantify-cta text-regantify-text' : 'text-regantify-text-muted hover:text-regantify-text'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'find' ? <Find /> : <Blocklist />}
    </div>
  );
}
