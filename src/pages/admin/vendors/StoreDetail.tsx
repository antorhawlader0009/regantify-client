import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, LogIn, Pin, Search, X } from 'lucide-react';
import { adminApi, type AdminVendor, type StoreDetail } from '../../../lib/adminApi';
import { apiErrorMessage } from '../../../lib/api';
import { isPendingApproval, toastPendingApproval } from '../../../lib/approvalsApi';
import { toast } from '../../../lib/toast';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { GradientAreaChart, GradientBarChart, SERIES, bucketLabel, formatCompact, formatTaka } from '../../../components/admin/charts';
import { ImpersonateDialog } from '../../../components/admin/ImpersonateDialog';
import { Dialog } from '../../../components/ui/Dialog';
import { StatusBadge } from './StatusBadge';
import { ChangeVendorPlanModal } from './ChangeVendorPlanModal';
import { ChangeVendorStatusModal } from './ChangeVendorStatusModal';
import { AiCreditsAdjust } from './VendorDetailsDialog';
import { HealthChip } from './VendorListPage';
import { StoreFeeDeals } from '../../../components/admin/FeeDeals';
import { StoreLimits } from '../../../components/admin/StoreLimits';
import { adminCan, useAdminViewer, type AdminPermission } from '../../../lib/adminPermissions';
import { ReasonNeed } from '../../../components/admin/ReasonNeed';
import { StoreResaleCard } from '../../../components/admin/StoreResaleCard';
import { BackLink } from '../../../components/ui/BackLink';
import { RangeTabs } from '../../../components/admin/ui/RangeTabs';

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
  { id: 'notes', label: 'Notes' },
  { id: 'actions', label: 'Actions' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const when = (iso: string | null) => (iso ? formatDhakaDateTime(iso) : '—');
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
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
      {title && <h2 className="mb-3 text-[17px] font-semibold text-regantify-text">{title}</h2>}
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

/** Health score with what is missing, and the store's private tags (never shown to the store). */
function HealthAndTags({ id }: { id: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-store', id, 'health'], queryFn: () => adminApi.storeHealth(id) });
  const [input, setInput] = useState('');
  const save = useMutation({
    mutationFn: (tags: string[]) => adminApi.setStoreTags(id, tags),
    onSuccess: (r) => {
      qc.setQueryData(['admin-store', id, 'health'], (old: typeof data) => (old ? { ...old, tags: r.tags } : old));
      qc.invalidateQueries({ queryKey: ['admin-vendors'] });
      setInput('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the tags.')),
  });
  if (!data) return null;
  return (
    <Card title="Health and tags" className="lg:col-span-2">
      <div className="flex flex-wrap items-center gap-3">
        <HealthChip health={data.health} />
        <p className="text-sm text-regantify-text-muted">{data.health.gaps.length ? `Missing: ${data.health.gaps.join(', ')}.` : 'Nothing missing.'}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {data.tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded bg-black/5 px-2 py-1 text-xs text-regantify-text">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => save.mutate(data.tags.filter((x) => x !== t))}>
              <X size={11} />
            </button>
          </span>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) save.mutate([...data.tags, input.trim()]);
          }}
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={24} placeholder="Add a tag" className="rounded-lg bg-regantify-search px-2.5 py-1 text-xs focus:outline-none" />
        </form>
      </div>
      <p className="mt-2 text-xs text-regantify-text-muted">Tags and notes are only for the Regantify team. The store never sees them.</p>
    </Card>
  );
}

function Notes({ id }: { id: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-store', id, 'notes'], queryFn: () => adminApi.storeNotes(id) });
  const [text, setText] = useState('');
  const [pinned, setPinned] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-store', id, 'notes'] });
  const add = useMutation({
    mutationFn: () => adminApi.addStoreNote(id, text.trim(), pinned),
    onSuccess: () => {
      setText('');
      setPinned(false);
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the note.')),
  });
  const pin = useMutation({ mutationFn: (v: { noteId: string; pinned: boolean }) => adminApi.pinStoreNote(id, v.noteId, v.pinned), onSuccess: refresh, onError: (err) => toast.error(apiErrorMessage(err, 'Could not pin the note.')) });
  return (
    <div className="max-w-3xl space-y-4">
      <Card title="Write a note">
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={3} placeholder="For example: owner asked for a call on Friday" className={field} />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-regantify-text">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to the top
          </label>
          <button type="button" disabled={text.trim().length < 2 || add.isPending} onClick={() => add.mutate()} className="rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Save note
          </button>
        </div>
        <p className="mt-2 text-xs text-regantify-text-muted">Notes can’t be edited or deleted, so the record stays true. Only the Regantify team sees them.</p>
      </Card>
      {isLoading ? (
        <Loader2 className="mx-auto animate-spin text-neutral-400" />
      ) : (
        (data ?? []).map((n) => (
          <Card key={n.id} className={n.pinned ? 'border-amber-300' : ''}>
            <p className="whitespace-pre-wrap text-sm text-regantify-text">{n.text}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-regantify-text-muted">
              <span>
                {n.authorName} · {when(n.createdAt)}
              </span>
              <button type="button" onClick={() => pin.mutate({ noteId: n.id, pinned: !n.pinned })} className="inline-flex items-center gap-1 underline">
                <Pin size={11} /> {n.pinned ? 'Unpin' : 'Pin'}
              </button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function Overview({ d }: { d: StoreDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <HealthAndTags id={d.id} />
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
      <StoreResaleCard vendorId={d.id} />
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
        <Row label="New products per day allowed">{u.dailyProductLimit === null ? 'No limit' : u.dailyProductLimit.toLocaleString('en-US')}</Row>
        <Row label="Image uploads per day allowed">{u.dailyImageLimit === null ? 'No limit' : u.dailyImageLimit.toLocaleString('en-US')}</Row>
        <Row label="Orders per day allowed">{u.dailyOrderLimit === null ? 'No limit' : u.dailyOrderLimit.toLocaleString('en-US')}</Row>
        {u.ownLimits && (
          <p className="mt-2 text-xs text-regantify-text-muted">
            This store has limits of its own{u.ownLimits.until ? ` until ${day(u.ownLimits.until)}` : ''} ({u.ownLimits.reason}). Change them under Actions.
          </p>
        )}
      </Card>
      <Card title="Balances">
        <Row label="Wallet">{formatTaka(d.wallet.balance)}</Row>
        <Row label="SMS credits">{d.wallet.smsCredits.toLocaleString('en-US')}</Row>
        <Row label="AI credits">{d.wallet.aiCredits.toLocaleString('en-US')}</Row>
        <Row label="Orders value, last 30 days">{formatTaka(u.gmv30d)}</Row>
      </Card>
      <Card title="Orders per day, last 30 days" className="lg:col-span-2">
        <GradientBarChart
          label="Orders per day for the last 30 days"
          rows={u.perDay}
          xKey="bucket"
          series={[{ key: 'orders', label: 'Orders' }]}
          xLabel={(v) => bucketLabel(String(v), 'day')}
          tooltipTitle={(v) => bucketLabel(String(v), 'day', true)}
          format={(n) => String(n)}
          height={240}
        />
        <div className="mt-5">
          <GradientAreaChart
            label="Order value per day for the last 30 days"
            rows={u.perDay}
            xKey="bucket"
            series={[{ key: 'gmv', label: 'Order value', color: SERIES.purple }]}
            xLabel={(v) => bucketLabel(String(v), 'day')}
            tooltipTitle={(v) => bucketLabel(String(v), 'day', true)}
            format={formatTaka}
            axisFormat={(n) => formatCompact(n, 'money')}
            height={200}
          />
        </div>
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
      <Card title="Shopper refunds this store still owes">
        {!data.refundsOwed ? (
          <p className="text-sm text-regantify-text-muted">Could not be read right now.</p>
        ) : data.refundsOwed.count === 0 ? (
          <p className="text-sm text-regantify-text-muted">Nothing owed. (Counted from {day(data.refundsOwed.since)}; shoppers who paid online for an order that was then cancelled or returned.)</p>
        ) : (
          <>
            <Row label="Orders waiting for a refund">{data.refundsOwed.count}{data.refundsOwed.lateCount > 0 ? <span className="ml-2 text-red-700">({data.refundsOwed.lateCount} waiting over 3 days)</span> : null}</Row>
            <Row label="Total still owed">{formatTaka(data.refundsOwed.total)}</Row>
            {data.refundsOwed.items.map((i) => (
              <Row key={i.orderId} label={<Link to={`/admin/orders/${i.orderId}`} className="text-regantify-cta hover:underline">{i.ref}</Link>}>
                {formatTaka(i.remaining)} <span className="text-xs text-regantify-text-muted">· {i.waitingDays}d</span>
              </Row>
            ))}
          </>
        )}
      </Card>
      <Card title="SMS credit history (last 30)">
        {data.smsEntries.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">No entries.</p>
        ) : (
          data.smsEntries.map((e) => (
            <Row key={e.id} label={`${when(e.createdAt)} · ${e.reason.toLowerCase()}${e.note ? ` · ${e.note}` : ''}`}>
              <span className={e.delta >= 0 ? 'text-green-700' : 'text-red-700'}>{e.delta >= 0 ? '+' : '−'}{Math.abs(e.delta).toLocaleString('en-US')}</span> → {e.balanceAfter.toLocaleString('en-US')}
            </Row>
          ))
        )}
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
              {formatTaka(w.amount)} · {w.status.toLowerCase()}{w.payoutReference ? ` · ref ${w.payoutReference}` : ''}
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
            <ReasonNeed value={reason} />
          </div>
          <button type="button" disabled={reason.trim().length < 5 || m.isPending || (!!extra && (!Number.isInteger(n) || n < extra.min || n > extra.max))} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {m.isPending ? 'Working…' : button}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

/** Add or take money from the wallet, or SMS credits, with a reason. The store reads the reason in its wallet history and bell (super-admin-plan.md Step 6). */
function MoneyAdjust({ d, onDone }: { d: StoreDetail; onDone: () => void }) {
  const [kind, setKind] = useState<'wallet' | 'sms'>('wallet');
  const [dir, setDir] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const n = Number(amount);
  const valid = Number.isFinite(n) && n > 0 && (kind === 'wallet' || Number.isInteger(n)) && reason.trim().length >= 5;
  const m = useMutation({
    mutationFn: (): Promise<unknown> => (kind === 'wallet' ? adminApi.walletAdjust(d.id, dir === 'add' ? 'CREDIT' : 'DEBIT', n, reason.trim()) : adminApi.smsCreditsAdjust(d.id, dir === 'add' ? n : -n, reason.trim())),
    onSuccess: (r) => {
      if (isPendingApproval(r)) toastPendingApproval();
      else toast.success(kind === 'wallet' ? 'Wallet updated.' : 'SMS credits updated.');
      setAmount('');
      setReason('');
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work.')),
  });
  const chip = (active: boolean) => `rounded-lg px-3 py-1.5 text-sm ${active ? 'bg-regantify-cta text-white' : 'bg-regantify-search text-regantify-text'}`;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setKind('wallet')} className={chip(kind === 'wallet')}>Wallet ({formatTaka(d.wallet.balance)})</button>
        <button type="button" onClick={() => setKind('sms')} className={chip(kind === 'sms')}>SMS credits ({d.wallet.smsCredits.toLocaleString('en-US')})</button>
        <span className="mx-1 w-px bg-black/10" />
        <button type="button" onClick={() => setDir('add')} className={chip(dir === 'add')}>Add</button>
        <button type="button" onClick={() => setDir('remove')} className={chip(dir === 'remove')}>Take</button>
      </div>
      <input type="number" min={kind === 'wallet' ? 0.01 : 1} step={kind === 'wallet' ? 0.01 : 1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={kind === 'wallet' ? 'Amount in taka' : 'Number of SMS credits'} className={field} />
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Reason (the store sees this)" className={field} />
      <button type="button" disabled={!valid || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
        {m.isPending ? 'Saving…' : `${dir === 'add' ? 'Add' : 'Take'} ${kind === 'wallet' ? 'money' : 'SMS credits'}`}
      </button>
      <p className="text-xs text-regantify-text-muted">Every change is one row in the store’s history and in the admin log. Taking can’t go below zero.</p>
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
  const close = useMutation({ mutationFn: () => adminApi.closeStore(d.id, { reason: reason.trim(), storeName: name, code }), onSuccess: (r) => (isPendingApproval(r) ? (toastPendingApproval(), done('Waiting for a second approval.')) : done(r.texted ? 'Store closed. The owner was texted.' : 'Store closed. The owner could not be texted.')), onError: fail });
  const start = useMutation({ mutationFn: () => adminApi.transferStart(d.id, { reason: reason.trim(), storeName: name, code, newPhone: phone }), onSuccess: (r) => { if (isPendingApproval(r)) { toastPendingApproval(); done('Waiting for a second approval. After it, start the move again to send the code.'); return; } setSentTo(r.sentTo); setCode(''); }, onError: fail });
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
            <ReasonNeed value={reason} />
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
  // What this team member's role allows (super-admin-plan.md Step 13); the server refuses the rest anyway.
  const viewer = useAdminViewer();
  const can = (p: AdminPermission) => adminCan(viewer, p);

  const btn ='shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-regantify-text';
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Everyday">
        {can('stores.impersonate_view') && (
          <div className="flex items-center justify-between gap-4 border-b border-black/5 py-3">
            <div>
              <p className="text-sm font-medium text-regantify-text">Login as this store</p>
              <p className="text-xs text-regantify-text-muted">Opens its dashboard in a new tab. A reason is asked, view only by default.</p>
            </div>
            <button type="button" disabled={closed} onClick={() => setImpersonate(true)} className={`${btn} inline-flex items-center gap-1 disabled:opacity-40`}>
              <LogIn size={14} /> Login
            </button>
          </div>
        )}
        {can('stores.edit') && (
          <>
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
        <ReasonAction
          title="Turn off two-step sign-in"
          description="For an owner who lost the authenticator app and the recovery codes. They can turn it on again in Settings."
          button="Turn off"
          run={async (reason) => {
            await adminApi.resetOwnerTwoStep(d.id, reason);
            return 'Two-step sign-in is off for the owner.';
          }}
        />
        <ReasonAction title="Sign out every device" description="Owner and staff must sign in again (an open page can last up to 15 minutes)." button="Sign out" run={async (reason) => { const r = await adminApi.signOutStore(d.id, reason); return `${r.accounts} accounts signed out.`; }} />
          </>
        )}
        {can('kyc.manage') && <Link to="/admin/verification" className="block py-3 text-sm text-regantify-cta hover:underline">Ask this store for verification (KYC) →</Link>}
      </Card>

      <div className="space-y-4">
        {can('money.adjust') && (
          <Card title="Wallet and SMS credits">
            <MoneyAdjust d={d} onDone={refresh} />
          </Card>
        )}
        {can('stores.edit') && (
          <Card title="Store limits">
            <StoreLimits vendorId={d.id} storeName={d.storeName} />
          </Card>
        )}
        {can('plans.edit') && (
          <Card title="Special fees">
            <StoreFeeDeals vendorId={d.id} storeName={d.storeName} />
          </Card>
        )}
        {can('money.adjust') && <Card title="Withdrawals">
          {d.withdrawPause ? (
            <ReasonAction title="Withdrawals are paused" description={`Since ${when(d.withdrawPause.since)}${d.withdrawPause.reason ? `: ${d.withdrawPause.reason}` : ''}`} button="Resume" run={async (reason) => { await adminApi.resumeWithdrawals(d.id, reason); refresh(); return 'Withdrawals resumed.'; }} />
          ) : (
            <ReasonAction title="Pause withdrawals" description="The store can’t cash out until you resume. Its other work goes on." button="Pause" danger run={async (reason) => { await adminApi.pauseWithdrawals(d.id, reason); refresh(); return 'Withdrawals paused.'; }} />
          )}
        </Card>}
        {can('money.adjust') && (
          <Card title="Pay from the wallet">
            {(() => {
              const w = d.walletPurchase;
              const rule = { OFF: 'off for every store', VERIFIED: 'only verified stores', ALL: 'every store' }[w.platformMode];
              const now =
                w.setting === 'DEFAULT'
                  ? `Follows the platform rule (${rule}${w.platformMode === 'VERIFIED' ? `; this store is ${w.verified ? '' : 'not '}verified` : ''}).`
                  : w.setting === 'ON'
                    ? 'Always on for this store, whatever the platform rule says.'
                    : 'Always off for this store, whatever the platform rule says.';
              const options = (
                [
                  ['ON', 'Always on', 'This store may pay for plans, SMS and AI Credits from its wallet.'],
                  ['OFF', 'Always off', 'This store never sees the wallet button.'],
                  ['DEFAULT', 'Follow the platform rule', `Settings > Money decides (now: ${rule}).`],
                ] as const
              ).filter(([s]) => s !== w.setting);
              return (
                <>
                  <p className="border-b border-black/5 pb-3 text-sm text-regantify-text">
                    <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-medium ${w.allowed ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>{w.allowed ? 'Can pay from wallet' : 'Cannot pay from wallet'}</span>
                    {now}
                  </p>
                  {options.map(([s, title, description]) => (
                    <ReasonAction
                      key={s}
                      title={title}
                      description={description}
                      button={s === 'DEFAULT' ? 'Use rule' : s === 'ON' ? 'Turn on' : 'Turn off'}
                      run={async (reason) => {
                        const r = await adminApi.setWalletPurchases(d.id, s, reason);
                        refresh();
                        return r.allowed ? 'This store can now pay from its wallet.' : 'This store cannot pay from its wallet now.';
                      }}
                    />
                  ))}
                </>
              );
            })()}
          </Card>
        )}
        {can('stores.edit') && (
          <Card title="AI credits">
            <AiCreditsAdjust vendor={asVendor} onDone={refresh} />
          </Card>
        )}
        {can('stores.danger') && <Card title="Dangerous" className="border-red-200">
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
        </Card>}
        {can('messages.send') && (
          <Link to="/admin/messages" state={{ vendorIds: [d.id], label: `Only ${d.storeName}` }} className="block text-sm text-regantify-cta hover:underline">
            Send this store a message (bell and SMS) →
          </Link>
        )}
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
  const viewer = useAdminViewer();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-store', vendorId, 'detail'], queryFn: () => adminApi.storeDetail(vendorId) });

  if (isLoading) return <Loader2 className="mx-auto mt-16 animate-spin text-neutral-400" />;
  if (error || !data) return <p className="py-10 text-center text-sm text-red-600">Could not find this store.</p>;

  return (
    <div className="max-w-6xl">
      <BackLink to="/admin/vendors/all" label="All stores" className="" />
      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl bg-white p-5 shadow-[var(--console-card-shadow)]">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--tint-orange-bg)] text-[20px] font-semibold text-[var(--tint-orange-fg)]" aria-hidden>
          {data.storeName.trim().charAt(0).toUpperCase() || 'S'}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold text-regantify-text">{data.storeName}</h1>
            <StatusBadge status={data.status} />
            <span className="rounded-full bg-[var(--tint-orange-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--tint-orange-fg)]">{data.plan.name}</span>
          </div>
          <p className="console-id mt-1 text-regantify-text-muted">{data.id}</p>
        </div>
      </div>

      <div className="mt-5 inline-flex max-w-full overflow-x-auto rounded-full bg-white p-1.5 shadow-[var(--console-card-shadow)]">
        <RangeTabs options={TABS.filter((t) => t.id !== 'money' || adminCan(viewer, 'money.view'))} value={tab} onChange={setTab} label="Store sections" />
      </div>

      <div className="mt-5">
        {tab === 'overview' && <Overview d={data} />}
        {tab === 'usage' && <Usage d={data} />}
        {tab === 'money' && <Money id={vendorId} />}
        {tab === 'orders' && (
          <ListTab id={vendorId} kind="orders" fetcher={(p) => adminApi.storeOrders(vendorId, p)} placeholder="Order number, name or phone" columns={[
            { head: 'Order', cell: (o) => <Link to={`/admin/orders/${o.id}`} className="text-regantify-cta hover:underline">{o.publicCode ?? `ORDER-${o.invoiceNumber}`}</Link> },
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
        {tab === 'notes' && <Notes id={vendorId} />}
        {tab === 'actions' && <Actions d={data} />}
      </div>
    </div>
  );
}
