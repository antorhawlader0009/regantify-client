import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Loader2 } from 'lucide-react';
import { adminShoppersApi } from '../../../lib/adminShoppersApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { formatTaka } from '../../../components/analytics/format';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { Dialog } from '../../../components/ui/Dialog';
import { BlockDialog } from './AdminCustomers';
import { ReasonNeed } from '../../../components/admin/ReasonNeed';
import { BackLink } from '../../../components/ui/BackLink';

function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-black/5 bg-white p-5 ${className}`}>
      <h2 className="mb-2 text-sm font-semibold text-regantify-text">{title}</h2>
      {children}
    </section>
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 py-2 last:border-0">
      <span className="text-sm text-regantify-text-muted">{label}</span>
      <span className="text-right text-sm text-regantify-text">{children}</span>
    </div>
  );
}

type Act = { title: string; button: string; run: (reason: string) => Promise<string> };

/** Super Admin > one shopper across every store (super-admin-plan.md Step 8). Opening this page is written to the admin log. */
export default function AdminShopperDetail() {
  const { phone = '' } = useParams();
  const qc = useQueryClient();
  const { data: p, isLoading, error } = useQuery({ queryKey: ['admin-shopper', phone], queryFn: () => adminShoppersApi.profile(phone), staleTime: 30_000 });
  const [blocking, setBlocking] = useState(false);
  const [act, setAct] = useState<Act | null>(null);
  const [reason, setReason] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-shopper', phone] });

  const run = useMutation({
    mutationFn: () => act!.run(reason.trim()),
    onSuccess: (msg) => {
      toast.success(msg);
      setAct(null);
      setReason('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work.')),
  });

  if (isLoading) return <Loader2 className="mx-auto mt-16 animate-spin text-neutral-400" />;
  if (error || !p) return <p className="py-10 text-center text-sm text-red-600">{apiErrorMessage(error, 'No shopper with this number.')}</p>;

  const btn = 'rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-regantify-text hover:bg-regantify-content';
  const s = p.summary;
  return (
    <div className="max-w-6xl">
      <BackLink to="/admin/customers" label="Customers" className="" />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-regantify-text">{s.name || p.phone}</h1>
        <span className="text-sm text-regantify-text-muted">{p.phone}</span>
        {p.block?.active && <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700"><Ban size={12} /> blocked on every store</span>}
        {p.account?.loginOffAt && <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">sign-in off</span>}
      </div>
      {p.names.length > 1 && <p className="mt-1 text-xs text-regantify-text-muted">Also ordered as: {p.names.join(', ')}</p>}

      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {[
          ['Orders', s.orders],
          ['Stores', s.stores],
          ['Cancelled', s.cancelled],
          ['Returned', s.returned],
          ['Store blacklists', s.blacklistedByStores],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-black/5 bg-white p-4">
            <p className="text-xs text-regantify-text-muted">{l}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${l === 'Store blacklists' && (v as number) > 0 ? 'text-red-700' : 'text-regantify-text'}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Account">
          {p.account ? (
            <>
              <Row label="Name">{p.account.name}</Row>
              <Row label="Email">{p.account.email ?? '—'}</Row>
              <Row label="Saved address">{p.account.address ?? '—'}</Row>
              <Row label="Joined">{formatDhakaDateTime(p.account.since)}</Row>
              <Row label="Sign-in">{p.account.loginOffAt ? `off since ${formatDhakaDateTime(p.account.loginOffAt)}${p.account.loginOffReason ? `: ${p.account.loginOffReason}` : ''}` : 'on'}</Row>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.account.loginOffAt ? (
                  <button type="button" className={btn} onClick={() => setAct({ title: 'Turn sign-in back on', button: 'Turn on', run: async (r) => { await adminShoppersApi.loginOn(p.phone, r); return 'Sign-in is on.'; } })}>Turn sign-in on</button>
                ) : (
                  <button type="button" className={btn} onClick={() => setAct({ title: 'Turn this shopper’s sign-in off', button: 'Turn off', run: async (r) => { await adminShoppersApi.loginOff(p.phone, r); return 'Sign-in is off.'; } })}>Turn sign-in off</button>
                )}
                <button type="button" className={btn} onClick={() => setAct({ title: 'Sign this shopper out of every device', button: 'Sign out', run: async (r) => { await adminShoppersApi.signOut(p.phone, r); return 'Signed out.'; } })}>Sign out everywhere</button>
                <button type="button" className={btn} onClick={() => setAct({ title: 'Text a new password', button: 'Send', run: async (r) => { const x = await adminShoppersApi.passwordSms(p.phone, r); return `New password sent to ${x.sentTo}.`; } })}>Text a new password</button>
              </div>
            </>
          ) : (
            <p className="text-sm text-regantify-text-muted">No platform account. This number only ordered as a guest.</p>
          )}
        </Card>

        <Card title="Platform blacklist">
          {p.block ? (
            <>
              <Row label="Status">{p.block.active ? 'Blocked on every store' : 'Block ended'}</Row>
              <Row label="Reason">{p.block.reason}</Row>
              <Row label="By">{p.block.by}, {formatDhakaDateTime(p.block.since)}</Row>
              <Row label="Until">{p.block.until ? formatDhakaDateTime(p.block.until) : 'until removed'}</Row>
              <Row label="Checkouts refused">{p.block.attempts}{p.block.lastAttemptAt ? ` (last ${formatDhakaDateTime(p.block.lastAttemptAt)})` : ''}</Row>
              <button type="button" className={`${btn} mt-3`} onClick={() => setAct({ title: 'Take off the platform blacklist', button: 'Remove', run: async (r) => { await adminShoppersApi.unblock(p.phone, r); return 'Taken off the blacklist.'; } })}>Remove from the blacklist</button>
            </>
          ) : (
            <>
              <p className="text-sm text-regantify-text-muted">Not blocked. Block a number only for proven fraud; every store’s checkout then refuses it.</p>
              <button type="button" className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700" onClick={() => setBlocking(true)}>Block on every store</button>
            </>
          )}
          {p.storeBlacklists.length > 0 && (
            <div className="mt-4 border-t border-black/5 pt-3">
              <p className="mb-1 text-xs font-semibold text-regantify-text">Blacklisted by these stores</p>
              {p.storeBlacklists.map((b) => (
                <p key={b.vendorId} className="text-xs text-regantify-text-muted">
                  <Link to={`/admin/vendors/${b.vendorId}`} className="text-regantify-cta hover:underline">{b.storeName}</Link>
                  {b.reason ? `: ${b.reason}` : ''}
                </p>
              ))}
            </div>
          )}
        </Card>

        <Card title="By store" className="lg:col-span-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted">
                <th className="px-3 py-2">Store</th>
                <th className="px-3 py-2 text-right">Orders</th>
                <th className="px-3 py-2 text-right">Completed</th>
                <th className="px-3 py-2 text-right">Cancelled</th>
                <th className="px-3 py-2 text-right">Returned</th>
                <th className="px-3 py-2 text-right">Spent</th>
                <th className="px-3 py-2">Last order</th>
              </tr>
            </thead>
            <tbody>
              {p.perStore.map((r) => (
                <tr key={r.vendorId} className="border-t border-black/5">
                  <td className="px-3 py-2"><Link to={`/admin/vendors/${r.vendorId}`} className="text-regantify-cta hover:underline">{r.storeName}</Link></td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.orders}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.completed}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.cancelled}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.returned}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatTaka(r.spent)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{formatDhakaDateTime(r.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Latest orders" className="lg:col-span-2">
          {p.recentOrders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 py-2 text-sm last:border-0">
              <Link to={`/admin/orders/${o.id}`} className="font-medium text-regantify-cta hover:underline">{o.publicCode ?? `ORDER-${o.number}`}</Link>
              <span className="text-regantify-text-muted">{o.storeName} · {formatDhakaDateTime(o.createdAt)}</span>
              <span>{o.status.replace(/_/g, ' ').toLowerCase()} · {o.paymentMethod.toLowerCase().replace(/_/g, ' ')} · {formatTaka(o.total)}</span>
            </div>
          ))}
        </Card>
      </div>

      <BlockDialog phone={p.phone} open={blocking} onClose={() => setBlocking(false)} onDone={() => { setBlocking(false); refresh(); qc.invalidateQueries({ queryKey: ['admin-blocklist'] }); }} />
      <Dialog open={!!act} onOpenChange={(o) => !o && setAct(null)} maxWidth="max-w-md">
        <div className="space-y-4 p-6">
          <h2 className="font-semibold text-regantify-text">{act?.title}</h2>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} placeholder="Reason (saved in the admin log)" className="w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm focus:outline-none" />
          <ReasonNeed value={reason} />
          <button type="button" disabled={reason.trim().length < 5 || run.isPending} onClick={() => run.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">{run.isPending ? 'Working…' : act?.button}</button>
        </div>
      </Dialog>
    </div>
  );
}
