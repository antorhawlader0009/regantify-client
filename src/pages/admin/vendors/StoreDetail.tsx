import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Loader2, LogIn, Search } from 'lucide-react';
import { adminApi, type AdminVendor, type StoreDetail } from '../../../lib/adminApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { ColumnChart } from '../../../components/analytics/TrendChart';
import { bucketLabel, formatTaka } from '../../../components/analytics/format';
import { ImpersonateDialog } from '../../../components/admin/ImpersonateDialog';
import { Dialog } from '../../../components/ui/Dialog';
import { StatusBadge } from './StatusBadge';
import { ChangeVendorPlanModal } from './ChangeVendorPlanModal';
import { ChangeVendorStatusModal } from './ChangeVendorStatusModal';
import { AiCreditsAdjust } from './VendorDetailsDialog';

// Super Admin > a store's own page (super-admin-plan.md Step 4): everything about one store, and the actions on it.
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'usage', label: 'Usage' },
  { id: 'money', label: 'Money' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'customers', label: 'Customers' },
  { id: 'connections', label: 'Connections' },
  { id: 'history', label: 'Admin history' },
  { id: 'actions', label: 'Actions' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const when = (iso: string | null) => (iso ? formatDhakaDateTime(iso) : '—');
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 py-2.5 last:border-0">
      <span className="text-sm text-regantify-text-muted">{label}</span>
      <span className="text-right text-sm text-regantify-text">{children}</span>
    </div>
  );
}

function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-black/5 bg-white p-5 ${className}`}>
      {title && <h2 className="mb-2 text-sm font-semibold text-regantify-text">{title}</h2>}
      {children}
    </section>
  );
}

function Limit({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="py-2">
      <div className="flex justify-between text-sm">
        <span className="text-regantify-text">{label}</span>
        <span className="tabular-nums text-regantify-text">
          {used.toLocaleString('en-US')} <span className="text-regantify-text-muted">/ {limit === null ? 'no limit' : limit.toLocaleString('en-US')}</span>
        </span>
      </div>
      {limit !== null && (
        <div className="mt-1 h-1.5 rounded-full bg-black/5">
          <div className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-red-500' : 'bg-regantify-cta'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function Pager({ page, total, perPage, onPage }: { page: number; total: number; perPage: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  return (
    <div className="flex items-center justify-between border-t border-black/5 px-4 py-3 text-sm text-regantify-text-muted">
      <span>{total.toLocaleString('en-US')} in all</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-black/10 px-3 py-1 disabled:opacity-40">
          Previous
        </button>
        <span>
          {page} / {pages}
        </span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border border-black/10 px-3 py-1 disabled:opacity-40">
          Next
        </button>
      </div>
    </div>
  );
}

/** A searchable, paged table that reads one of the store's lists. */
function ListTab<T>({ id, kind, fetcher, placeholder, columns }: { id: string; kind: string; fetcher: (p: { search?: string; page: number }) => Promise<{ total: number; page: number; perPage: number; items: T[] }>; placeholder: string; columns: Array<{ head: string; cell: (r: T) => ReactNode; right?: boolean }> }) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['admin-store', id, kind, search, page], queryFn: () => fetcher({ search: search || undefined, page }) });
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
      <form
        className="relative border-b border-black/5 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(input.trim());
        }}
      >
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} className="w-full max-w-sm rounded-xl bg-regantify-search py-2.5 pl-10 pr-3 text-sm focus:outline-none" />
      </form>
      {isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : !data?.items.length ? (
        <p className="p-10 text-center text-sm text-regantify-text-muted">Nothing found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-regantify-content text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted">
                {columns.map((c) => (
                  <th key={c.head} className={`px-4 py-3 ${c.right ? 'text-right' : ''}`}>
                    {c.head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((r, i) => (
                <tr key={i} className="border-b border-black/5 last:border-0">
                  {columns.map((c) => (
                    <td key={c.head} className={`px-4 py-3 ${c.right ? 'text-right tabular-nums' : ''}`}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} total={data.total} perPage={data.perPage} onPage={setPage} />}
    </div>
  );
}

function Overview({ d }: { d: StoreDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Owner">
        <Row label="Name">{d.owner.name ?? '—'}</Row>
        <Row label="Phone">{d.owner.phone ?? '—'}</Row>
        <Row label="Email">{d.owner.email ?? '—'}</Row>
        <Row label="Last sign-in">{when(d.owner.lastLoginAt)}</Row>
      </Card>
      <Card title="Store">
        <Row label="Store link">
          <a href={storefrontStoreUrl(d.subdomain)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-regantify-cta hover:underline">
            {d.subdomain} <ExternalLink size={12} />
          </a>
        </Row>
        <Row label="Own domain">{d.customDomain ?? '—'}</Row>
        <Row label="Theme">{d.theme}</Row>
        <Row label="Address">{d.address ?? '—'}</Row>
        <Row label="Created">{when(d.createdAt)}</Row>
      </Card>
      <Card title="Plan">
        <Row label="Plan">{d.plan.name}</Row>
        <Row label="Price per month">{formatTaka(d.plan.priceMonthly)}</Row>
        <Row label="Started">{day(d.plan.startedAt)}</Row>
        <Row label="Ends">{d.plan.code === 'FREE' ? 'No end date' : day(d.plan.expiresAt)}</Row>
      </Card>
      <Card title="Needs a look">
        <Row label="Verification (KYC)">{d.kyc ? `${d.kyc.status.toLowerCase()}, due ${day(d.kyc.dueAt)}` : 'Not asked'}</Row>
        <Row label="Open support tickets">{d.openTickets}</Row>
        <Row label="Last order">{when(d.usage.lastOrderAt)}</Row>
        <Row label="Orders, last 30 days">{d.usage.orders30d}</Row>
      </Card>
    </div>
  );
}

function Usage({ d }: { d: StoreDetail }) {
  const u = d.usage;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Against the plan">
        <Limit label="Products" {...u.products} />
        <Limit label="Staff" {...u.staff} />
        <Limit label="Landing pages" {...u.landingPages} />
        <Limit label="Visits this month" {...u.visitsThisMonth} />
        <Row label="Orders per day allowed">{u.dailyOrderLimit === null ? 'No limit' : u.dailyOrderLimit}</Row>
      </Card>
      <Card title="Balances">
        <Row label="Wallet">{formatTaka(d.wallet.balance)}</Row>
        <Row label="SMS credits">{d.wallet.smsCredits.toLocaleString('en-US')}</Row>
        <Row label="AI credits">{d.wallet.aiCredits.toLocaleString('en-US')}</Row>
        <Row label="Orders value, last 30 days">{formatTaka(u.gmv30d)}</Row>
      </Card>
      <Card title="Orders per day, last 30 days" className="lg:col-span-2">
        <ColumnChart
          data={u.perDay.map((p) => ({ key: p.bucket, value: p.orders, tick: bucketLabel(p.bucket, 'day'), tooltip: `${bucketLabel(p.bucket, 'day', true)}: ${p.orders} orders, ${formatTaka(p.gmv)}` }))}
          label="Orders"
          ariaLabel="Orders per day for the last 30 days"
          tickEvery={7}
        />
      </Card>
    </div>
  );
}

function Money({ id }: { id: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-store', id, 'money'], queryFn: () => adminApi.storeMoney(id) });
  if (isLoading || !data) return <Loader2 className="mx-auto mt-10 animate-spin text-neutral-400" />;
  const head = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted';
  return (
    <div className="space-y-4">
      <Card title="Platform fees paid by this store">
        <Row label="Last 30 days">{formatTaka(data.platformFees.last30d)}</Row>
        <Row label="All time">{formatTaka(data.platformFees.allTime)}</Row>
      </Card>
      <Card title="Wallet history (last 50)">
        {data.transactions.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">No wallet entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={head}>Date</th>
                  <th className={head}>What</th>
                  <th className={`${head} text-right`}>Amount</th>
                  <th className={`${head} text-right`}>Balance after</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id} className="border-t border-black/5">
                    <td className="px-4 py-2 whitespace-nowrap">{when(t.createdAt)}</td>
                    <td className="px-4 py-2">{t.description}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${t.type === 'CREDIT' ? 'text-green-700' : 'text-red-700'}`}>
                      {t.type === 'CREDIT' ? '+' : '−'}
                      {formatTaka(t.amount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatTaka(t.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="Payments to the platform (last 30)">
        {data.payments.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">No payments.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={head}>Date</th>
                  <th className={head}>For</th>
                  <th className={head}>Receipt</th>
                  <th className={head}>Status</th>
                  <th className={`${head} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id} className="border-t border-black/5">
                    <td className="px-4 py-2 whitespace-nowrap">{when(p.createdAt)}</td>
                    <td className="px-4 py-2">{p.purpose.replace(/_/g, ' ').toLowerCase()}{p.packageId ? ` (${p.packageId})` : ''}</td>
                    <td className="px-4 py-2">{p.receiptNumber ? `RCPT-${String(p.receiptNumber).padStart(6, '0')}` : '—'}</td>
                    <td className="px-4 py-2">{p.status.toLowerCase()}{p.status === 'SUCCESS' && !p.fulfilledAt ? ' (not applied!)' : ''}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatTaka(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="Withdrawals (last 20)">
        {data.withdrawals.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">No withdrawals.</p>
        ) : (
          data.withdrawals.map((w) => (
            <Row key={w.id} label={`${when(w.createdAt)} · ${w.method.toLowerCase()}`}>
              {formatTaka(w.amount)} · {w.status.toLowerCase()}
            </Row>
          ))
        )}
      </Card>
    </div>
  );
}

function Connections({ d }: { d: StoreDetail }) {
  const c = d.connections;
  const list = (items: Array<{ name: string; on: boolean; since: string }>, empty: string) =>
    items.length === 0 ? <p className="text-sm text-regantify-text-muted">{empty}</p> : items.map((i) => (
      <Row key={i.name} label={i.name.replace(/_/g, ' ').toLowerCase()}>
        {i.on ? 'Connected' : 'Off'} since {day(i.since)}
      </Row>
    ));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Couriers">{list(c.couriers, 'None connected.')}</Card>
      <Card title="Payment options">{list(c.gateways, 'None.')}</Card>
      <Card title="Alerts and domain">
        <Row label="Own domain">{c.customDomain ?? 'Not set'}</Row>
        <Row label="Telegram chats">{c.telegramChats}</Row>
        <Row label="Phone notification devices">{c.pushDevices}</Row>
      </Card>
      <p className="self-center text-xs text-regantify-text-muted">Keys, secrets and passwords are never shown here.</p>
    </div>
  );
}

function History({ id }: { id: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['admin-store', id, 'history'], queryFn: () => adminApi.storeHistory(id) });
  if (isLoading || !data) return <Loader2 className="mx-auto mt-10 animate-spin text-neutral-400" />;
  return (
    <div className="space-y-4">
      <Card title="What admins did to this store">
        {data.log.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">Nothing yet.</p>
        ) : (
          data.log.map((l) => (
            <div key={l.id} className="border-b border-black/5 py-2.5 last:border-0">
              <p className="text-sm text-regantify-text">{l.summary}</p>
              <p className="text-xs text-regantify-text-muted">
                {l.adminName} · {when(l.createdAt)}
                {l.reason ? ` · ${l.reason}` : ''}
              </p>
            </div>
          ))
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Support tickets">
          {data.tickets.length === 0 ? <p className="text-sm text-regantify-text-muted">None.</p> : data.tickets.map((t) => (
            <Row key={t.id} label={`#${t.number} ${t.subject}`}>{t.status.toLowerCase()}</Row>
          ))}
          <Link to="/admin/support" className="mt-2 inline-block text-xs text-regantify-cta hover:underline">Open the support inbox</Link>
        </Card>
        <Card title="Verification requests">
          {data.kyc.length === 0 ? <p className="text-sm text-regantify-text-muted">Never asked.</p> : data.kyc.map((k) => (
            <Row key={k.id} label={`Asked ${day(k.requestedAt)}`}>{k.status.toLowerCase()}</Row>
          ))}
          <Link to="/admin/verification" className="mt-2 inline-block text-xs text-regantify-cta hover:underline">Open Verification (to ask this store)</Link>
        </Card>
      </div>
    </div>
  );
}

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';

/** One action that needs a reason (and sometimes a number). Opens a small dialog, then runs `run`. */
function ReasonAction({ title, description, button, extra, run, danger }: { title: string; description: string; button: string; extra?: { label: string; min: number; max: number; initial: number; unit: string }; run: (reason: string, n: number) => Promise<string>; danger?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [n, setN] = useState(extra?.initial ?? 0);
  const m = useMutation({
    mutationFn: () => run(reason.trim(), n),
    onSuccess: (msg) => {
      toast.success(msg);
      setOpen(false);
      setReason('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/5 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-regantify-text">{title}</p>
        <p className="text-xs text-regantify-text-muted">{description}</p>
      </div>
      <button type="button" onClick={() => setOpen(true)} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${danger ? 'border border-red-300 text-red-700' : 'border border-black/10 text-regantify-text'}`}>
        {button}
      </button>
      <Dialog open={open} onOpenChange={setOpen} maxWidth="max-w-md">
        <div className="space-y-4 p-6">
          <h2 className="font-semibold text-regantify-text">{title}</h2>
          {extra && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-regantify-text">{extra.label}</label>
              <input type="number" min={extra.min} max={extra.max} value={n} onChange={(e) => setN(Number(e.target.value))} className={field} />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} className={field} placeholder="Saved in the admin log" />
          </div>
          <button type="button" disabled={reason.trim().length < 5 || m.isPending || (!!extra && (!Number.isInteger(n) || n < extra.min || n > extra.max))} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {m.isPending ? 'Working…' : button}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

/** Close the store / move it to a new owner: reason + the store's name typed out + a fresh authenticator code. */
function DangerDialog({ d, mode, onClose }: { d: StoreDetail; mode: 'close' | 'transfer' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const reset = () => {
    setReason('');
    setName('');
    setCode('');
    setPhone('');
    setOtp('');
    setSentTo(null);
    onClose();
  };
  const done = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ['admin-store', d.id] });
    qc.invalidateQueries({ queryKey: ['admin-vendors'] });
    reset();
  };
  const fail = (err: unknown) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.'));
  const close = useMutation({ mutationFn: () => adminApi.closeStore(d.id, { reason: reason.trim(), storeName: name, code }), onSuccess: (r) => done(r.texted ? 'Store closed. The owner was texted.' : 'Store closed. The owner could not be texted.'), onError: fail });
  const start = useMutation({ mutationFn: () => adminApi.transferStart(d.id, { reason: reason.trim(), storeName: name, code, newPhone: phone }), onSuccess: (r) => { setSentTo(r.sentTo); setCode(''); }, onError: fail });
  const confirm = useMutation({ mutationFn: () => adminApi.transferConfirm(d.id, { reason: reason.trim(), newPhone: phone, otp }), onSuccess: (r) => done(`Ownership moved to ${r.owner}. A temporary password was texted there.`), onError: fail });

  const base = reason.trim().length >= 5 && name.trim().length > 0 && /^\d{6}$/.test(code);
  return (
    <Dialog open={mode !== null} onOpenChange={(o) => !o && reset()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-red-700">{mode === 'close' ? `Close ${d.storeName}` : `Move ${d.storeName} to a new owner`}</h2>
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {mode === 'close'
            ? 'The store goes offline and nobody can sign in. Its wallet is frozen and all its data is kept. You can reopen it later.'
            : 'The owner account moves to a phone number that has no account. The old name, email and photo are cleared, every device is signed out, and a temporary password is texted to the new phone. The old owner is told by SMS. Orders, products and staff stay.'}
        </p>
        {sentTo ? (
          <>
            <p className="text-sm text-regantify-text">A code was texted to {sentTo}. Ask the new owner for it.</p>
            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6-digit code from the new owner" className={field} />
            <button type="button" disabled={otp.length !== 6 || confirm.isPending} onClick={() => confirm.mutate()} className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {confirm.isPending ? 'Moving…' : 'Move ownership'}
            </button>
          </>
        ) : (
          <>
            {mode === 'transfer' && <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="New owner’s phone, e.g. 017XXXXXXXX" className={field} />}
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} placeholder="Reason (saved in the admin log)" className={field} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Type the store name: ${d.storeName}`} className={field} />
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="Your authenticator code (6 digits)" className={field} />
            <button
              type="button"
              disabled={!base || (mode === 'transfer' && phone.trim().length < 10) || close.isPending || start.isPending}
              onClick={() => (mode === 'close' ? close.mutate() : start.mutate())}
              className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {mode === 'close' ? (close.isPending ? 'Closing…' : 'Close the store') : start.isPending ? 'Sending…' : 'Text a code to the new owner'}
            </button>
          </>
        )}
      </div>
    </Dialog>
  );
}

function Actions({ d }: { d: StoreDetail }) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-store', d.id] });
    qc.invalidateQueries({ queryKey: ['admin-vendors'] });
  };
  const [impersonate, setImpersonate] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [danger, setDanger] = useState<'close' | 'transfer' | null>(null);
  const statusM = useMutation({
    mutationFn: ({ status, reason }: { status: Parameters<typeof adminApi.updateVendorStatus>[1]; reason?: string }) => adminApi.updateVendorStatus(d.id, status, reason),
    onSuccess: () => { toast.success('Status changed.'); setStatusOpen(false); refresh(); },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change the status.')),
  });
  const planM = useMutation({
    mutationFn: (planCode: Parameters<typeof adminApi.assignVendorPlan>[1]) => adminApi.assignVendorPlan(d.id, planCode),
    onSuccess: () => { toast.success('Plan changed.'); setPlanOpen(false); refresh(); },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change the plan.')),
  });
  const closed = d.status === 'CLOSED';
  const asVendor = { id: d.id, storeName: d.storeName } as AdminVendor;

  const btn = 'shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-regantify-text';
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Everyday">
        <div className="flex items-center justify-between gap-4 border-b border-black/5 py-3">
          <div>
            <p className="text-sm font-medium text-regantify-text">Login as this store</p>
            <p className="text-xs text-regantify-text-muted">Opens its dashboard in a new tab. A reason is asked, view only by default.</p>
          </div>
          <button type="button" disabled={closed} onClick={() => setImpersonate(true)} className={`${btn} inline-flex items-center gap-1 disabled:opacity-40`}>
            <LogIn size={14} /> Login
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-black/5 py-3">
          <div>
            <p className="text-sm font-medium text-regantify-text">Status</p>
            <p className="text-xs text-regantify-text-muted">Active, pending or suspended (the owner is texted the reason).</p>
          </div>
          <button type="button" disabled={closed} onClick={() => setStatusOpen(true)} className={`${btn} disabled:opacity-40`}>
            <StatusBadge status={d.status} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-black/5 py-3">
          <div>
            <p className="text-sm font-medium text-regantify-text">Change plan</p>
            <p className="text-xs text-regantify-text-muted">Now on {d.plan.name}.</p>
          </div>
          <button type="button" onClick={() => setPlanOpen(true)} className={btn}>Change</button>
        </div>
        <ReasonAction title="Extend the plan for free" description="Adds days after the current end date. Not for the Free plan." button="Extend" extra={{ label: 'Days to add', min: 1, max: 365, initial: 7, unit: 'days' }} run={async (reason, n) => { await adminApi.extendPlan(d.id, n, reason); refresh(); return `Plan extended by ${n} days.`; }} />
        <ReasonAction title="Send a new password by SMS" description="A temporary password is texted to the owner. You never see it." button="Send" run={async (reason) => { const r = await adminApi.sendPasswordSms(d.id, reason); return `Password sent to ${r.sentTo}.`; }} />
        <ReasonAction title="Sign out every device" description="Owner and staff must sign in again (an open page can last up to 15 minutes)." button="Sign out" run={async (reason) => { const r = await adminApi.signOutStore(d.id, reason); return `${r.accounts} accounts signed out.`; }} />
        <Link to="/admin/verification" className="block py-3 text-sm text-regantify-cta hover:underline">Ask this store for verification (KYC) →</Link>
      </Card>

      <div className="space-y-4">
        <Card title="AI credits">
          <AiCreditsAdjust vendor={asVendor} onDone={refresh} />
        </Card>
        <Card title="Dangerous" className="border-red-200">
          {closed ? (
            <ReasonAction title="Reopen the store" description="Brings the storefront and sign-ins back. The owner is texted." button="Reopen" run={async (reason) => { await adminApi.reopenStore(d.id, reason); refresh(); return 'Store reopened.'; }} />
          ) : (
            <div className="flex items-center justify-between gap-4 border-b border-black/5 py-3">
              <div>
                <p className="text-sm font-medium text-regantify-text">Close the store</p>
                <p className="text-xs text-regantify-text-muted">Offline, nobody can sign in, wallet frozen, data kept. Reversible.</p>
              </div>
              <button type="button" onClick={() => setDanger('close')} className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700">Close</button>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-regantify-text">Move to a new owner</p>
              <p className="text-xs text-regantify-text-muted">Gives the store to a new phone number, after a code from that phone.</p>
            </div>
            <button type="button" onClick={() => setDanger('transfer')} className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700">Move</button>
          </div>
        </Card>
        <p className="text-xs text-regantify-text-muted">Wallet and SMS-credit changes, and messages to the owner, come with the Money and Messages steps.</p>
      </div>

      <ImpersonateDialog vendor={impersonate ? asVendor : null} onClose={() => setImpersonate(false)} />
      {statusOpen && (
        <ChangeVendorStatusModal open onOpenChange={(o) => !o && setStatusOpen(false)} storeName={d.storeName} currentStatus={d.status} submitting={statusM.isPending} onConfirm={(status, reason) => statusM.mutate({ status, reason })} />
      )}
      {planOpen && (
        <ChangeVendorPlanModal open onOpenChange={(o) => !o && setPlanOpen(false)} storeName={d.storeName} currentPlanCode={d.plan.code} submitting={planM.isPending} onConfirm={(code) => planM.mutate(code)} />
      )}
      <DangerDialog d={d} mode={danger} onClose={() => setDanger(null)} />
    </div>
  );
}

export default function StoreDetailPage() {
  const { vendorId = '' } = useParams();
  const [tab, setTab] = useState<TabId>('overview');
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-store', vendorId, 'detail'], queryFn: () => adminApi.storeDetail(vendorId) });

  if (isLoading) return <Loader2 className="mx-auto mt-16 animate-spin text-neutral-400" />;
  if (error || !data) return <p className="py-10 text-center text-sm text-red-600">Could not find this store.</p>;

  return (
    <div className="max-w-6xl">
      <Link to="/admin/vendors/all" className="inline-flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text">
        <ArrowLeft size={14} /> All vendors
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-regantify-text">{data.storeName}</h1>
        <StatusBadge status={data.status} />
        <span className="rounded-md bg-black/5 px-2 py-1 text-xs font-medium">{data.plan.name}</span>
      </div>
      <p className="mt-1 font-mono text-xs text-regantify-text-muted">{data.id}</p>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-black/5">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-b-2 border-regantify-cta text-regantify-text' : 'text-regantify-text-muted hover:text-regantify-text'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'overview' && <Overview d={data} />}
        {tab === 'usage' && <Usage d={data} />}
        {tab === 'money' && <Money id={vendorId} />}
        {tab === 'orders' && (
          <ListTab id={vendorId} kind="orders" fetcher={(p) => adminApi.storeOrders(vendorId, p)} placeholder="Order number, name or phone" columns={[
            { head: 'Order', cell: (o) => o.publicCode ?? `ORDER-${o.invoiceNumber}` },
            { head: 'Date', cell: (o) => when(o.createdAt) },
            { head: 'Customer', cell: (o) => `${o.customerName} · ${o.customerPhone}` },
            { head: 'Status', cell: (o) => o.status.replace(/_/g, ' ').toLowerCase() },
            { head: 'From', cell: (o) => o.source.toLowerCase() },
            { head: 'Total', right: true, cell: (o) => formatTaka(o.total) },
          ]} />
        )}
        {tab === 'products' && (
          <ListTab id={vendorId} kind="products" fetcher={(p) => adminApi.storeProducts(vendorId, p)} placeholder="Product name or SKU" columns={[
            { head: 'Product', cell: (p) => p.name },
            { head: 'SKU', cell: (p) => p.sku },
            { head: 'Shown', cell: (p) => p.visibility.toLowerCase() },
            { head: 'Stock', right: true, cell: (p) => (p.stockQuantity === null ? '—' : p.stockQuantity) },
            { head: 'Price', right: true, cell: (p) => formatTaka(p.discountPrice ?? p.price) },
          ]} />
        )}
        {tab === 'customers' && (
          <ListTab id={vendorId} kind="customers" fetcher={(p) => adminApi.storeCustomers(vendorId, p)} placeholder="Name or phone" columns={[
            { head: 'Customer', cell: (c) => c.name },
            { head: 'Phone', cell: (c) => c.phone },
            { head: 'Orders', right: true, cell: (c) => c.orders },
            { head: 'Spent', right: true, cell: (c) => formatTaka(c.spent) },
            { head: 'Last order', cell: (c) => when(c.last) },
          ]} />
        )}
        {tab === 'connections' && <Connections d={data} />}
        {tab === 'history' && <History id={vendorId} />}
        {tab === 'actions' && <Actions d={data} />}
      </div>
    </div>
  );
}
