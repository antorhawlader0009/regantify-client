import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, Filter, LogIn, Mail, Search, Tag, X } from 'lucide-react';
import { adminApi, type AdminVendor, type BulkBody, type HealthBand, type ListVendorsParams, type VendorSort, type VendorStatus } from '../../../lib/adminApi';
import type { PlanCode } from '../../../lib/plansApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { formatTaka } from '../../../components/analytics/format';
import { StatusBadge } from './StatusBadge';
import { ChangeVendorStatusModal } from './ChangeVendorStatusModal';
import { ChangeVendorPlanModal } from './ChangeVendorPlanModal';
import { ImpersonateDialog } from '../../../components/admin/ImpersonateDialog';
import { Dialog } from '../../../components/ui/Dialog';
import { adminCan, useAdminViewer, type AdminPermission } from '../../../lib/adminPermissions';

const BAND: Record<HealthBand, { label: string; cls: string }> = {
  HEALTHY: { label: 'Healthy', cls: 'bg-green-100 text-green-700' },
  NEEDS_HELP: { label: 'Needs help', cls: 'bg-amber-100 text-amber-800' },
  AT_RISK: { label: 'At risk', cls: 'bg-red-100 text-red-700' },
};

export function HealthChip({ health }: { health: AdminVendor['health'] }) {
  const b = BAND[health.band];
  return (
    <span title={health.gaps.length ? `Missing: ${health.gaps.join(', ')}` : 'Nothing missing'} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${b.cls}`}>
      {health.score} · {b.label}
    </span>
  );
}

const SORTS: Array<{ id: VendorSort; label: string }> = [
  { id: 'createdAt', label: 'Signed up' },
  { id: 'storeName', label: 'Name' },
  { id: 'lastLoginAt', label: 'Last sign-in' },
  { id: 'orders30d', label: 'Orders (30 days)' },
  { id: 'gmv30d', label: 'Orders value (30 days)' },
  { id: 'health', label: 'Health' },
  { id: 'balance', label: 'Wallet' },
];

const sel = 'rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none';

function copyToClipboard(value: string, label: string) {
  navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied.`));
}

type BulkKind = 'STATUS' | 'EXTEND' | 'TAG_ADD' | 'TAG_REMOVE';

/** One action over the ticked stores: a reason (logged), and the one value the action needs. */
function BulkDialog({ kind, ids, onClose, onDone }: { kind: BulkKind | null; ids: string[]; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'PENDING' | 'SUSPENDED'>('ACTIVE');
  const [days, setDays] = useState(7);
  const [tag, setTag] = useState('');
  const m = useMutation({
    mutationFn: () => {
      const base = { vendorIds: ids, reason: reason.trim() };
      const body: BulkBody = kind === 'STATUS' ? { ...base, action: 'STATUS', status } : kind === 'EXTEND' ? { ...base, action: 'EXTEND', days } : { ...base, action: kind as 'TAG_ADD' | 'TAG_REMOVE', tag: tag.trim() };
      return adminApi.bulk(body);
    },
    onSuccess: (r) => {
      if (r.failed.length) toast.error(`${r.done} done, ${r.failed.length} could not be changed: ${r.failed.slice(0, 2).map((f) => `${f.storeName} (${f.error})`).join('; ')}`);
      else toast.success(`${r.done} stores done.`);
      setReason('');
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work.')),
  });
  const title = kind === 'STATUS' ? 'Change status' : kind === 'EXTEND' ? 'Extend the plan for free' : kind === 'TAG_ADD' ? 'Add a tag' : 'Remove a tag';
  const ok = reason.trim().length >= 5 && (kind !== 'TAG_ADD' && kind !== 'TAG_REMOVE' ? true : tag.trim().length > 0) && (kind !== 'EXTEND' || (days >= 1 && days <= 365));
  const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
  return (
    <Dialog open={kind !== null} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">
          {title} · {ids.length} {ids.length === 1 ? 'store' : 'stores'}
        </h2>
        {kind === 'STATUS' && (
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={field}>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended (each owner is texted the reason)</option>
          </select>
        )}
        {kind === 'EXTEND' && <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className={field} placeholder="Days to add" />}
        {(kind === 'TAG_ADD' || kind === 'TAG_REMOVE') && <input value={tag} onChange={(e) => setTag(e.target.value)} maxLength={24} className={field} placeholder="Tag, e.g. vip" />}
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} className={field} placeholder="Reason (saved in the admin log)" />
        <button type="button" disabled={!ok || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {m.isPending ? 'Working…' : 'Apply'}
        </button>
      </div>
    </Dialog>
  );
}

/**
 * All Vendors, Pending Approval and Suspended Vendors share this list (super-admin-plan.md Step 5): filters, sorting, health, tags, bulk actions and a CSV
 * export. `chips` are the status chips shown (the first is selected at start; `null` means "all").
 */
export function VendorListPage({ title, chips, children }: { title: string; chips: Array<VendorStatus | null>; children?: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const viewer = useAdminViewer();
  const can = (p: AdminPermission) => adminCan(viewer, p);
  const [filters, setFilters] = useState<ListVendorsParams>({});
  const [status, setStatus] = useState<VendorStatus | null>(chips[0]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<VendorSort>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<BulkKind | null>(null);
  const [statusModalVendor, setStatusModalVendor] = useState<AdminVendor | null>(null);
  const [planModalVendor, setPlanModalVendor] = useState<AdminVendor | null>(null);
  const [impersonateVendor, setImpersonateVendor] = useState<AdminVendor | null>(null);

  const params: ListVendorsParams = { ...filters, search: search.trim() || undefined, status: status ?? undefined, sortBy, sortOrder, page, perPage };
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [filters, search, status, sortBy, sortOrder, perPage]);

  const { data, isLoading } = useQuery({ queryKey: ['admin-vendors', params], queryFn: () => adminApi.listVendors(params), placeholderData: (p) => p });
  const vendors = data?.vendors ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const setF = <K extends keyof ListVendorsParams>(k: K, v: ListVendorsParams[K] | '') => setFilters((f) => ({ ...f, [k]: v === '' || v === false ? undefined : v }));
  const activeFilters = Object.values(filters).filter((v) => v !== undefined).length;

  const statusMutation = useMutation({
    mutationFn: ({ vendorId, status: s, reason }: { vendorId: string; status: VendorStatus; reason?: string }) => adminApi.updateVendorStatus(vendorId, s, reason),
    onSuccess: (_, { status: s }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success(`Status changed to ${s.charAt(0) + s.slice(1).toLowerCase()}.`);
      setStatusModalVendor(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change the status. Please try again.')),
  });
  const planMutation = useMutation({
    mutationFn: ({ vendorId, planCode }: { vendorId: string; planCode: PlanCode }) => adminApi.assignVendorPlan(vendorId, planCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success('Plan changed.');
      setPlanModalVendor(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change the plan. Please try again.')),
  });

  async function exportCsv() {
    try {
      const { page: _p, perPage: _pp, ...rest } = params;
      const csv = await adminApi.listVendorsCsv(rest);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stores.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not export.'));
    }
  }

  const allOnPage = vendors.length > 0 && vendors.every((v) => selected.has(v.id));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(vendors.map((v) => v.id)));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-regantify-text">{title}</h1>
      {children}

      {chips.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c ?? 'all'}
              type="button"
              onClick={() => setStatus(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${status === c ? 'border-regantify-black bg-regantify-black text-white' : 'border-black/10 bg-white text-regantify-text'}`}
            >
              {c === null ? 'All' : c.charAt(0) + c.slice(1).toLowerCase()} · {data ? (c === null ? data.counts.ALL : data.counts[c]) : '…'}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-black/5 p-4">
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by store name, URL, or phone" className="w-full rounded-xl border border-black/10 py-2.5 pl-10 pr-4 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none" />
          </div>
          <button type="button" onClick={() => setShowFilters((v) => !v)} className={`${sel} inline-flex items-center gap-1.5`}>
            <Filter size={14} /> Filters{activeFilters ? ` (${activeFilters})` : ''}
          </button>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as VendorSort)} className={sel} aria-label="Sort by">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                Sort: {s.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))} className={sel}>
            {sortOrder === 'asc' ? 'Low to high' : 'High to low'}
          </button>
          <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className={sel}>
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              const { page: _p, perPage: _pp, sortBy: _s, sortOrder: _o, ...rest } = params;
              const filter = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined && v !== '' && v !== false).map(([k, v]) => [k, String(v)]));
              navigate('/admin/messages', { state: { filter, label: `All ${total} stores in this list` } });
            }}
            disabled={total === 0 || !can('messages.send')}
            className={`${sel} ml-auto inline-flex items-center gap-1.5 disabled:opacity-40`}
          >
            <Mail size={14} /> Message this list
          </button>
          <button type="button" onClick={exportCsv} className={`${sel} inline-flex items-center gap-1.5`}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        {showFilters && (
          <div className="grid gap-3 border-b border-black/5 bg-regantify-content p-4 sm:grid-cols-2 lg:grid-cols-4">
            <select value={filters.plan ?? ''} onChange={(e) => setF('plan', e.target.value as PlanCode | '')} className={sel}>
              <option value="">Any plan</option>
              {['FREE', 'BASIC', 'STARTER', 'ADVANCE'].map((p) => (
                <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <select value={filters.endingInDays ?? ''} onChange={(e) => setF('endingInDays', e.target.value ? Number(e.target.value) : '')} className={sel}>
              <option value="">Plan ending: any time</option>
              {[3, 7, 14, 30].map((d) => (
                <option key={d} value={d}>Plan ends within {d} days</option>
              ))}
            </select>
            <select value={filters.health ?? ''} onChange={(e) => setF('health', e.target.value as HealthBand | '')} className={sel}>
              <option value="">Any health</option>
              <option value="HEALTHY">Healthy</option>
              <option value="NEEDS_HELP">Needs help</option>
              <option value="AT_RISK">At risk</option>
            </select>
            <select value={filters.kyc ?? ''} onChange={(e) => setF('kyc', e.target.value as 'none' | 'open' | 'approved' | '')} className={sel}>
              <option value="">Any verification</option>
              <option value="none">Not asked</option>
              <option value="open">Open request</option>
              <option value="approved">Approved</option>
            </select>
            <select value={filters.hasDomain ?? ''} onChange={(e) => setF('hasDomain', e.target.value as 'yes' | 'no' | '')} className={sel}>
              <option value="">Own domain: any</option>
              <option value="yes">Has own domain</option>
              <option value="no">No own domain</option>
            </select>
            <select value={filters.theme ?? ''} onChange={(e) => setF('theme', e.target.value)} className={sel}>
              <option value="">Any theme</option>
              <option value="STOREPAL">StorePal</option>
              <option value="MEDIUM">Medium</option>
              <option value="MINIMAL">Minimal</option>
            </select>
            <select value={filters.tag ?? ''} onChange={(e) => setF('tag', e.target.value)} className={sel}>
              <option value="">Any tag</option>
              {(data?.tags ?? []).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={filters.inactiveDays ?? ''} onChange={(e) => setF('inactiveDays', e.target.value ? Number(e.target.value) : '')} className={sel}>
              <option value="">Last sign-in: any</option>
              {[7, 14, 30, 60].map((d) => (
                <option key={d} value={d}>Not signed in for {d} days</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-regantify-text-muted">
              Signed up from
              <input type="date" value={filters.signupFrom ?? ''} onChange={(e) => setF('signupFrom', e.target.value)} className={sel} />
            </label>
            <label className="flex items-center gap-2 text-xs text-regantify-text-muted">
              to
              <input type="date" value={filters.signupTo ?? ''} onChange={(e) => setF('signupTo', e.target.value)} className={sel} />
            </label>
            <label className="flex items-center gap-2 text-sm text-regantify-text">
              <input type="checkbox" checked={!!filters.noOrders} onChange={(e) => setF('noOrders', e.target.checked)} /> Never had an order
            </label>
            <button type="button" onClick={() => setFilters({})} className="inline-flex items-center gap-1 text-left text-xs text-regantify-text-muted underline">
              <X size={12} /> Clear all filters
            </button>
          </div>
        )}

        {selected.size > 0 && can('stores.edit') && (
          <div className="flex flex-wrap items-center gap-2 border-b border-black/5 bg-blue-50 px-4 py-2.5 text-sm">
            <span className="font-medium text-blue-900">{selected.size} selected</span>
            <button type="button" onClick={() => setBulk('STATUS')} className="rounded-lg border border-black/10 bg-white px-3 py-1">Change status</button>
            <button type="button" onClick={() => setBulk('EXTEND')} className="rounded-lg border border-black/10 bg-white px-3 py-1">Extend plan</button>
            <button type="button" onClick={() => setBulk('TAG_ADD')} className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-3 py-1"><Tag size={12} /> Add tag</button>
            <button type="button" onClick={() => setBulk('TAG_REMOVE')} className="rounded-lg border border-black/10 bg-white px-3 py-1">Remove tag</button>
            <button type="button" onClick={() => navigate('/admin/messages', { state: { vendorIds: [...selected] } })} className="rounded-lg border border-black/10 bg-white px-3 py-1">Send message</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs underline">Clear</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-regantify-content text-left text-regantify-text-muted">
                <th className="px-4 py-3"><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on this page" /></th>
                <th className="px-4 py-3 font-medium">STORE</th>
                <th className="px-4 py-3 font-medium">STATUS</th>
                <th className="px-4 py-3 font-medium">PLAN</th>
                <th className="px-4 py-3 font-medium">PHONE</th>
                <th className="px-4 py-3 font-medium">HEALTH</th>
                <th className="px-4 py-3 font-medium">ORDERS 30D</th>
                <th className="px-4 py-3 font-medium">VALUE 30D</th>
                <th className="px-4 py-3 font-medium">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-regantify-text-muted">Loading…</td></tr>
              )}
              {!isLoading && vendors.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-regantify-text-muted">No stores match.</td></tr>
              )}
              {vendors.map((v) => (
                <tr key={v.id} className="border-t border-black/5 align-top">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} aria-label={`Select ${v.storeName}`} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/vendors/${v.id}`} className="text-left font-medium text-regantify-cta hover:underline">{v.storeName}</Link>
                    <div className="flex items-center gap-2">
                      <a href={storefrontStoreUrl(v.subdomain)} target="_blank" rel="noopener noreferrer" className="text-xs text-regantify-text-muted hover:underline">{v.subdomain}</a>
                      <button type="button" onClick={() => copyToClipboard(v.id, 'Vendor ID')} className="text-regantify-text-muted hover:text-regantify-text" title="Copy the store ID"><Copy size={11} /></button>
                    </div>
                    {v.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {v.tags.map((t) => (
                          <span key={t} className="rounded bg-black/5 px-1.5 py-0.5 text-[11px] text-regantify-text">{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3 text-regantify-text">
                    {v.planName}
                    {v.planEndsAt && <div className="text-xs text-regantify-text-muted">ends {new Date(v.planEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>}
                  </td>
                  <td className="px-4 py-3 text-regantify-text">{v.phone ?? '—'}</td>
                  <td className="px-4 py-3"><HealthChip health={v.health} /></td>
                  <td className="px-4 py-3 tabular-nums text-regantify-text">{v.orders30d}</td>
                  <td className="px-4 py-3 tabular-nums text-regantify-text">{formatTaka(v.gmv30d)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">
                      {can('stores.edit') && <button onClick={() => setStatusModalVendor(v)} disabled={v.status === 'CLOSED'} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-40">Change Status</button>}
                      {can('stores.edit') && <button onClick={() => setPlanModalVendor(v)} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm text-regantify-text hover:bg-regantify-content">Change Plan</button>}
                      {can('stores.impersonate_view') && <button onClick={() => setImpersonateVendor(v)} disabled={v.status === 'CLOSED'} className="flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-40" title="Open this vendor's dashboard for support/troubleshooting">
                        <LogIn size={14} /> Login as Vendor
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-black/5 px-5 py-3.5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg px-2.5 py-1 text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40">‹</button>
              <span className="px-2 text-sm text-regantify-text">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg px-2.5 py-1 text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40">›</button>
            </div>
          )}
        </div>
      </div>

      <BulkDialog
        kind={bulk}
        ids={[...selected]}
        onClose={() => setBulk(null)}
        onDone={() => {
          setBulk(null);
          setSelected(new Set());
          queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
        }}
      />
      {statusModalVendor && (
        <ChangeVendorStatusModal open onOpenChange={(open) => !open && setStatusModalVendor(null)} storeName={statusModalVendor.storeName} currentStatus={statusModalVendor.status} submitting={statusMutation.isPending} onConfirm={(next, reason) => statusMutation.mutate({ vendorId: statusModalVendor.id, status: next, reason })} />
      )}
      <ImpersonateDialog vendor={impersonateVendor} onClose={() => setImpersonateVendor(null)} />
      {planModalVendor && (
        <ChangeVendorPlanModal open onOpenChange={(open) => !open && setPlanModalVendor(null)} storeName={planModalVendor.storeName} currentPlanCode={planModalVendor.planCode} submitting={planMutation.isPending} onConfirm={(next) => planMutation.mutate({ vendorId: planModalVendor.id, planCode: next })} />
      )}
    </div>
  );
}
