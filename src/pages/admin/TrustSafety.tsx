import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, Search, ShieldAlert, X } from 'lucide-react';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { storefrontProductUrl } from '../../lib/storefrontUrl';
import { toast } from '../../lib/toast';
import { CATEGORY_LABEL, PROHIBITED_CATEGORIES, trustSafetyApi, type AdminProductRow, type ProductFlagRow } from '../../lib/trustSafetyApi';
import { Dialog } from '../../components/ui/Dialog';
import { ReasonNeed } from '../../components/admin/ReasonNeed';
import { GradientDonut, SERIES } from '../../components/admin/charts';
import { Card, CardHeader } from '../../components/admin/ui/Card';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const TABS = [
  { id: 'flags', label: 'Flagged products' },
  { id: 'products', label: 'All products' },
  { id: 'risk', label: 'Store risk' },
  { id: 'reports', label: 'Shopper reports' },
  { id: 'words', label: 'Prohibited words' },
] as const;
type Tab = (typeof TABS)[number]['id'];
const tk = (n: number) => `Tk ${Math.round(n).toLocaleString('en-US')}`;

/**
 * Super Admin > Stores > Trust and safety (super-admin-new.md Step 3): products that matched a prohibited word wait here for a person; any
 * product of any store can be found and hidden; stores are scored for risk from the last 30 days. A hidden product stays a draft until
 * Super Admin lets the store publish it again.
 */
export default function TrustSafety() {
  const [params, setParams] = useSearchParams();
  const asked = params.get('tab');
  const tab: Tab = TABS.some((t) => t.id === asked) ? (asked as Tab) : 'flags';
  const canEdit = adminCan(useAdminViewer(), 'stores.edit');
  const { data: queue } = useQuery({ queryKey: ['ts-flags', 'OPEN'], queryFn: () => trustSafetyApi.flags('OPEN') });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-1 text-regantify-text-muted" size={20} />
        <div>
          <h1 className="text-lg font-semibold text-regantify-text">Trust and safety</h1>
          <p className="max-w-3xl text-sm text-regantify-text-muted">
            Products that match a prohibited word wait here for a decision; nothing is hidden by a machine. A product you hide stays a draft, whatever the store tries,
            until you let it be published again.
          </p>
        </div>
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl border border-black/5 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams(t.id === 'flags' ? {} : { tab: t.id }, { replace: true })}
            className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm ${tab === t.id ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            {t.label}
            {t.id === 'flags' && queue && queue.open > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[11px] font-medium text-white">{queue.open}</span>}
          </button>
        ))}
      </div>

      {tab === 'flags' && <FlagQueue canEdit={canEdit} focusId={params.get('flag')} />}
      {tab === 'products' && <ProductSearch canEdit={canEdit} initial={params.get('q') ?? ''} />}
      {tab === 'risk' && <RiskList />}
      {tab === 'reports' && <ReportCounts />}
      {tab === 'words' && <Words canEdit={canEdit} />}
    </div>
  );
}

// ---- Flagged products ---------------------------------------------------------------------------------------------------------

function FlagQueue({ canEdit, focusId }: { canEdit: boolean; focusId: string | null }) {
  const [show, setShow] = useState<'OPEN' | 'DONE'>('OPEN');
  const { data, isLoading } = useQuery({ queryKey: ['ts-flags', show], queryFn: () => trustSafetyApi.flags(show) });
  const [hiding, setHiding] = useState<ProductFlagRow | null>(null);
  const qc = useQueryClient();
  const allow = useMutation({
    mutationFn: (id: string) => trustSafetyApi.decide(id, { action: 'ALLOW' }),
    onSuccess: () => {
      toast.success("Allowed. It won't be flagged again for the same words.");
      qc.invalidateQueries({ queryKey: ['ts-flags'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work.')),
  });

  useEffect(() => {
    if (focusId && data) document.getElementById(`flag-${focusId}`)?.scrollIntoView({ block: 'center' });
  }, [focusId, data]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-regantify-search p-0.5 text-xs">
          {(['OPEN', 'DONE'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setShow(k)} className={`rounded-md px-2.5 py-1 ${show === k ? 'bg-white font-medium text-regantify-text shadow-sm' : 'text-regantify-text-muted'}`}>
              {k === 'OPEN' ? 'Waiting' : 'Decided'}
            </button>
          ))}
        </div>
        {canEdit && <ScanButton />}
      </div>
      {isLoading || !data ? (
        <Loader2 className="mx-auto animate-spin text-neutral-400" />
      ) : data.flags.length === 0 ? (
        <p className="rounded-xl border border-black/5 bg-white px-4 py-8 text-center text-sm text-regantify-text-muted">
          {show === 'OPEN' ? 'Nothing waiting. New and edited products are checked against the prohibited words as they are saved.' : 'Nothing decided yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {data.flags.map((f) => (
            <li key={f.id} id={`flag-${f.id}`} className={`rounded-xl border bg-white p-4 ${focusId === f.id ? 'border-amber-300' : 'border-black/5'}`}>
              <div className="flex gap-4">
                {f.product.photo ? (
                  <img src={f.product.photo} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-neutral-100" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-regantify-text">{f.product.name}</p>
                      <p className="text-xs text-regantify-text-muted">
                        <Link to={`/admin/vendors/${f.store.id}`} className="hover:underline">
                          {f.store.storeName}
                        </Link>{' '}
                        - {tk(f.product.price)} - {f.product.hidden ? 'hidden by Regantify' : f.product.visibility === 'PUBLIC' ? 'on sale' : 'draft'} -{' '}
                        {f.source === 'SCAN' ? 'found by a scan' : 'flagged when saved'} {formatDhakaDateTime(f.createdAt)}
                      </p>
                    </div>
                    <a href={storefrontProductUrl(f.store.subdomain, f.product.slug)} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 text-xs text-regantify-text-muted hover:text-regantify-text">
                      View on store <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.terms.map((t) => (
                      <span key={t} className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700">
                        {t}
                      </span>
                    ))}
                    {f.categories.map((c) => (
                      <span key={c} className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">
                        {CATEGORY_LABEL[c] ?? c}
                      </span>
                    ))}
                  </div>
                  {f.product.excerpt && <p className="mt-2 line-clamp-2 text-xs text-regantify-text-muted">{f.product.excerpt}</p>}
                  {f.status !== 'OPEN' ? (
                    <p className="mt-2 text-xs text-regantify-text">
                      {f.status === 'ALLOWED' ? 'Allowed' : f.status === 'HIDDEN' ? 'Hidden' : 'Cleared (the store took the words out)'} by {f.decidedBy}
                      {f.decidedAt ? `, ${formatDhakaDateTime(f.decidedAt)}` : ''}
                      {f.note ? `: ${f.note}` : ''}
                    </p>
                  ) : (
                    canEdit && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setHiding(f)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white">
                          Hide product
                        </button>
                        <button type="button" disabled={allow.isPending} onClick={() => allow.mutate(f.id)} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm text-regantify-text">
                          It's fine, allow
                        </button>
                        <Link to={`/admin/vendors/${f.store.id}`} className="rounded-lg px-3 py-1.5 text-sm text-regantify-text-muted hover:text-regantify-text">
                          Open the store (suspend, verify...)
                        </Link>
                      </div>
                    )
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <HideDialog
        target={hiding ? { name: hiding.product.name, storeName: hiding.store.storeName } : null}
        defaultReason={hiding ? `It looks like a prohibited product (${hiding.categories.map((c) => CATEGORY_LABEL[c] ?? c).join(', ').toLowerCase()}).` : ''}
        onClose={() => setHiding(null)}
        onHide={(reason, warn) => trustSafetyApi.decide(hiding!.id, { action: 'HIDE', note: reason, warn })}
        invalidate={['ts-flags']}
      />
    </section>
  );
}

function ScanButton() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['ts-scan'], queryFn: trustSafetyApi.scanStatus, refetchInterval: (q) => (q.state.data?.running ? 2000 : false) });
  const start = useMutation({
    mutationFn: trustSafetyApi.scan,
    onSuccess: (s) => qc.setQueryData(['ts-scan'], s),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not start the scan.')),
  });
  useEffect(() => {
    if (data && !data.running && data.finishedAt) qc.invalidateQueries({ queryKey: ['ts-flags'] });
  }, [data, qc]);
  return (
    <div className="flex items-center gap-3 text-xs text-regantify-text-muted">
      {data?.running ? (
        <span className="flex items-center gap-1.5">
          <Loader2 size={13} className="animate-spin" /> Scanned {data.scanned.toLocaleString()} products, {data.flagged} flagged
        </span>
      ) : data?.finishedAt ? (
        <span>
          Last scan {formatDhakaDateTime(data.finishedAt)}: {data.scanned.toLocaleString()} products, {data.flagged} flagged
        </span>
      ) : null}
      <button type="button" disabled={data?.running || start.isPending} onClick={() => start.mutate()} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-regantify-text disabled:opacity-50">
        Scan every product
      </button>
    </div>
  );
}

function HideDialog({
  target,
  defaultReason,
  onClose,
  onHide,
  invalidate,
}: {
  target: { name: string; storeName: string } | null;
  defaultReason: string;
  onClose: () => void;
  onHide: (reason: string, warn: boolean) => Promise<unknown>;
  invalidate: string[];
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [warn, setWarn] = useState(false);
  useEffect(() => {
    if (target) {
      setReason(defaultReason);
      setWarn(false);
    }
  }, [target, defaultReason]);
  const m = useMutation({
    mutationFn: () => onHide(reason.trim(), warn),
    onSuccess: () => {
      toast.success('Hidden. The store got a note with your reason.');
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not hide it.')),
  });
  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && onClose()} title="Hide this product" maxWidth="max-w-md">
      {target && (
        <div className="space-y-4 p-6 pt-3">
          <p className="text-sm text-regantify-text-muted">
            "{target.name}" of {target.storeName} leaves the store at once and stays a draft until you let it be published again.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">Reason the store will read</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} className={field} />
            <ReasonNeed value={reason} />
          </div>
          <label className="flex items-start gap-2 text-sm text-regantify-text">
            <input type="checkbox" checked={warn} onChange={(e) => setWarn(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" />
            Also warn the store that more products like this can close it
          </label>
          <button type="button" disabled={reason.trim().length < 5 || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {m.isPending ? 'Hiding...' : 'Hide product'}
          </button>
        </div>
      )}
    </Dialog>
  );
}

// ---- All products -------------------------------------------------------------------------------------------------------------

function ProductSearch({ canEdit, initial }: { canEdit: boolean; initial: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState(initial);
  const [term, setTerm] = useState(initial);
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [hiding, setHiding] = useState<AdminProductRow | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isFetching } = useQuery({
    queryKey: ['ts-products', term, hiddenOnly, page],
    queryFn: () => trustSafetyApi.products({ search: term || undefined, hidden: hiddenOnly ? '1' : undefined, page }),
    placeholderData: (prev) => prev,
  });
  const unhide = useMutation({
    mutationFn: trustSafetyApi.unhide,
    onSuccess: () => {
      toast.success('The store can publish it again. It stays a draft until they do.');
      qc.invalidateQueries({ queryKey: ['ts-products'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work.')),
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-regantify-text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Product name or SKU, any store" className={`${field} pl-9`} />
        </div>
        <label className="flex items-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={hiddenOnly} onChange={(e) => setHiddenOnly(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          Only hidden by Regantify
        </label>
        {isFetching && <Loader2 size={16} className="animate-spin text-neutral-400" />}
      </div>
      {data && (
        <div className="overflow-x-auto rounded-xl border border-black/5 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-regantify-text-muted">
                <th className="px-4 py-2 font-normal">Product</th>
                <th className="px-4 py-2 font-normal">Store</th>
                <th className="px-4 py-2 font-normal">Price</th>
                <th className="px-4 py-2 font-normal">State</th>
                <th className="px-4 py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.id} className="border-b border-black/5 align-top last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {p.photo ? <img src={p.photo} alt="" className="h-9 w-9 rounded object-cover" loading="lazy" /> : <div className="h-9 w-9 rounded bg-neutral-100" />}
                      <div className="min-w-0">
                        <a href={storefrontProductUrl(p.vendor.subdomain, p.slug)} target="_blank" rel="noreferrer" className="block max-w-[280px] truncate font-medium text-regantify-text hover:underline">
                          {p.name}
                        </a>
                        <span className="text-xs text-regantify-text-muted">{p.sku}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link to={`/admin/vendors/${p.vendor.id}`} className="text-regantify-text hover:underline">
                      {p.vendor.storeName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{tk(p.price)}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {p.hidden ? (
                      <span className="text-red-700" title={p.adminHiddenReason ?? ''}>
                        Hidden by Regantify
                      </span>
                    ) : (
                      <span className="text-regantify-text-muted">{p.visibility === 'PUBLIC' ? 'On sale' : 'Draft'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {canEdit &&
                      (p.hidden ? (
                        <button type="button" disabled={unhide.isPending} onClick={() => unhide.mutate(p.id)} className="text-xs font-medium text-regantify-text hover:underline">
                          Allow again
                        </button>
                      ) : (
                        <button type="button" onClick={() => setHiding(p)} className="text-xs font-medium text-red-700 hover:underline">
                          Hide
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
              {data.products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-regantify-text-muted">
                    No product found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {data && pages > 1 && (
        <div className="flex items-center justify-between text-xs text-regantify-text-muted">
          <span>
            {data.total.toLocaleString()} products - page {page} of {pages}
          </span>
          <span className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-black/10 bg-white px-3 py-1 disabled:opacity-40">
              Previous
            </button>
            <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-black/10 bg-white px-3 py-1 disabled:opacity-40">
              Next
            </button>
          </span>
        </div>
      )}
      <HideDialog
        target={hiding ? { name: hiding.name, storeName: hiding.vendor.storeName } : null}
        defaultReason=""
        onClose={() => setHiding(null)}
        onHide={(reason, warn) => trustSafetyApi.hide(hiding!.id, { reason, warn })}
        invalidate={['ts-products', 'ts-flags']}
      />
    </section>
  );
}

// ---- Shopper reports ----------------------------------------------------------------------------------------------------------

const REPORT_KIND_LABEL: Record<string, string> = { REVIEW: 'Reviews', QUESTION: 'Questions', AI_ANSWER: 'Assistant answers' };

/**
 * What shoppers reported with the Report button on shop pages (Google Play's user-generated and AI-generated content rules). The stores read and
 * handle them in Reviews > Reports; here only the counts show, and which stores let them pile up. No shopper details are kept with a report.
 */
function ReportCounts() {
  const { data, isLoading } = useQuery({ queryKey: ['ts-content-reports'], queryFn: trustSafetyApi.contentReports });
  if (isLoading || !data) return <Loader2 className="mx-auto animate-spin text-neutral-400" />;
  return (
    <section className="space-y-3">
      <p className="text-xs text-regantify-text-muted">
        Shoppers can report a review, an answered question or an answer of a shop's AI assistant. Each shop handles its own reports (hide the item or close the report).
        A shop with many open ones is worth a look.
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-black/5 bg-white px-4 py-3">
          <p className="text-xs text-regantify-text-muted">Waiting for the shops</p>
          <p className="text-2xl font-semibold text-regantify-text">{data.open}</p>
        </div>
        <div className="rounded-xl border border-black/5 bg-white px-4 py-3">
          <p className="text-xs text-regantify-text-muted">New in the last 7 days</p>
          <p className="text-2xl font-semibold text-regantify-text">{data.lastWeek}</p>
        </div>
        {(['REVIEW', 'QUESTION', 'AI_ANSWER'] as const).slice(0, 2).map((k) => (
          <div key={k} className="rounded-xl border border-black/5 bg-white px-4 py-3">
            <p className="text-xs text-regantify-text-muted">Waiting: {REPORT_KIND_LABEL[k].toLowerCase()}</p>
            <p className="text-2xl font-semibold text-regantify-text">{data.byKind[k] ?? 0}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-regantify-text-muted">Waiting: assistant answers {data.byKind.AI_ANSWER ?? 0}</p>
      {data.stores.length === 0 ? (
        <p className="rounded-xl border border-black/5 bg-white px-4 py-8 text-center text-sm text-regantify-text-muted">No shop has an open report right now.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-regantify-text-muted">
                <th className="px-4 py-2 font-medium">Shop</th>
                <th className="px-4 py-2 text-right font-medium">Open reports</th>
              </tr>
            </thead>
            <tbody>
              {data.stores.map((s) => (
                <tr key={s.vendorId} className="border-t border-black/5">
                  <td className="px-4 py-2">
                    <Link to={`/admin/vendors/${s.vendorId}`} className="text-regantify-text hover:underline">
                      {s.storeName || s.subdomain}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right text-regantify-text">{s.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---- Store risk ---------------------------------------------------------------------------------------------------------------

function RiskList() {
  const { data, isLoading } = useQuery({ queryKey: ['ts-risk'], queryFn: trustSafetyApi.risk });
  if (isLoading || !data) return <Loader2 className="mx-auto animate-spin text-neutral-400" />;
  return (
    <section className="space-y-3">
      <p className="text-xs text-regantify-text-muted">
        Worked out from the last 30 days each time you open this. 60 or more sends the team an alert once a week. A score is a reason to look, not proof: check the store before
        acting (ask for verification, pause withdrawals, or suspend, all on the store's page).
      </p>
      {data.length === 0 ? (
        <p className="rounded-xl border border-black/5 bg-white px-4 py-8 text-center text-sm text-regantify-text-muted">No store shows any risk signal right now.</p>
      ) : (
        <>
        <Card>
          <CardHeader title="Stores by risk" subtitle="last 30 days" />
          <div className="mx-auto max-w-md">
            <GradientDonut
              label="Stores by risk score: high (60 or more), medium (30 to 59), low (under 30)"
              slices={[
                { key: 'high', label: 'High (60+)', value: data.filter((s) => s.score >= 60).length, color: SERIES.orange },
                { key: 'mid', label: 'Medium (30-59)', value: data.filter((s) => s.score >= 30 && s.score < 60).length, color: SERIES.purple },
                { key: 'low', label: 'Low (under 30)', value: data.filter((s) => s.score < 30).length, color: SERIES.cyan },
              ]}
              format={(n) => `${n} ${n === 1 ? 'store' : 'stores'}`}
              centerValue={String(data.length)}
              centerCaption="stores with a signal"
              height={210}
            />
          </div>
        </Card>
        <ul className="divide-y divide-black/5 rounded-xl border border-black/5 bg-white">
          {data.map((s) => (
            <li key={s.vendorId} className="flex gap-4 p-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold tabular-nums ${s.score >= 60 ? 'bg-red-50 text-red-700' : s.score >= 30 ? 'bg-amber-50 text-amber-800' : 'bg-neutral-100 text-neutral-600'}`}
                aria-label={`Risk score ${s.score} of 100`}
              >
                {s.score}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <Link to={`/admin/vendors/${s.vendorId}`} className="font-medium text-regantify-text hover:underline">
                    {s.storeName}
                  </Link>
                  <span className="text-xs text-regantify-text-muted">
                    {s.subdomain} - {s.orders30d} orders, {tk(s.online30d)} online in 30 days{s.kycApproved ? ' - verified' : ''}
                    {s.status !== 'ACTIVE' ? ` - ${s.status.toLowerCase()}` : ''}
                  </span>
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-regantify-text">
                  {s.reasons.map((r) => (
                    <li key={r.text}>
                      <span className="tabular-nums text-regantify-text-muted">+{r.points}</span> {r.text}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
        </>
      )}
    </section>
  );
}

// ---- Prohibited words ---------------------------------------------------------------------------------------------------------

function Words({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['ts-terms'], queryFn: trustSafetyApi.terms });
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string>('WEAPONS');
  const add = useMutation({
    mutationFn: () => trustSafetyApi.addTerms({ terms: text.split(/[\n,]/).map((t) => t.trim()).filter(Boolean), category }),
    onSuccess: (r) => {
      toast.success(`${r.added} added${r.skipped ? `, ${r.skipped} were already on the list` : ''}. Run a scan to check existing products.`);
      setText('');
      qc.invalidateQueries({ queryKey: ['ts-terms'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not add them.')),
  });
  const remove = useMutation({
    mutationFn: trustSafetyApi.removeTerm,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ts-terms'] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not remove it.')),
  });

  return (
    <section className="space-y-4">
      <p className="text-xs text-regantify-text-muted">
        English words match whole words only ("gun" catches "toy gun", not "gunny bag"). Bangla words match anywhere in the text. Name, description, category and brand are
        checked.
      </p>
      {canEdit && (
        <div className="rounded-xl border border-black/5 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-regantify-text">Words or phrases</label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="One per line, or separated by commas" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-regantify-text">Kind</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
                {PROHIBITED_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" disabled={!text.trim() || add.isPending} onClick={() => add.mutate()} className="rounded-xl bg-regantify-cta px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              Add
            </button>
          </div>
        </div>
      )}
      {isLoading || !data ? (
        <Loader2 className="mx-auto animate-spin text-neutral-400" />
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-black/5 bg-white px-4 py-8 text-center text-sm text-regantify-text-muted">The list is empty, so no product is flagged yet.</p>
      ) : (
        <div className="space-y-3">
          {PROHIBITED_CATEGORIES.filter((c) => data.some((t) => t.category === c)).map((c) => (
            <div key={c} className="rounded-xl border border-black/5 bg-white p-4">
              <p className="mb-2 text-sm font-medium text-regantify-text">{CATEGORY_LABEL[c]}</p>
              <div className="flex flex-wrap gap-1.5">
                {data
                  .filter((t) => t.category === c)
                  .map((t) => (
                    <span key={t.id} className="flex items-center gap-1 rounded-lg bg-neutral-100 py-0.5 pl-2 pr-1 text-xs text-regantify-text" title={`Added by ${t.createdByName}`}>
                      {t.term}
                      {canEdit && (
                        <button type="button" aria-label={`Remove ${t.term}`} onClick={() => remove.mutate(t.id)} className="text-neutral-400 hover:text-red-600">
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
