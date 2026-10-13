import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, History } from 'lucide-react';
import { adminApi, type AdminAuditQuery } from '../../lib/adminApi';
import { adminAlertsApi } from '../../lib/adminAlertsApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';

const inputClass = 'h-9 rounded-lg border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:border-regantify-black';

/** "VENDOR_STATUS" -> "Vendor status". */
const actionLabel = (a: string) => a.charAt(0) + a.slice(1).toLowerCase().replace(/_/g, ' ');

/** Admin > Settings > Activity log (super-admin-plan.md Step 2): every change a Super Admin made, who, to which store and why. */
export function AdminActivityLog() {
  const [admin, setAdmin] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  // "Which store": type a name, pick one (super-admin-plan.md Step 2 asks for a store filter). Uses the same lookup as Ctrl K.
  const [store, setStore] = useState<{ id: string; name: string } | null>(null);
  const [storeQ, setStoreQ] = useState('');
  const { data: storeHits = [] } = useQuery({
    queryKey: ['admin-log-store-search', storeQ],
    queryFn: async () => (await adminAlertsApi.search(storeQ.trim())).find((g) => g.group === 'Stores')?.hits ?? [],
    enabled: !store && storeQ.trim().length >= 2,
  });

  const query: AdminAuditQuery = {
    admin: admin || undefined,
    action: action || undefined,
    vendorId: store?.id,
    search: search.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
  };
  const { data, isLoading } = useQuery({ queryKey: ['admin-audit-log', query, page], queryFn: () => adminApi.auditLog({ ...query, page }), placeholderData: (prev) => prev });
  const filter = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(1);
  };

  const download = async () => {
    setExporting(true);
    try {
      const csv = await adminApi.auditLogCsv(query);
      const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not make the file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <div>
      <p className="text-sm text-regantify-text-muted">Every change a Super Admin makes is listed here, with who did it, which store it touched and why. Lines are kept for 2 years.</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-regantify-text-muted">
          Admin
          <select value={admin} onChange={(e) => filter(setAdmin)(e.target.value)} className={`${inputClass} mt-1 block`}>
            <option value="">Everyone</option>
            {(data?.admins ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-regantify-text-muted">
          Action
          <select value={action} onChange={(e) => filter(setAction)(e.target.value)} className={`${inputClass} mt-1 block`}>
            <option value="">All actions</option>
            {(data?.actions ?? []).map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </select>
        </label>
        <div className="relative text-xs text-regantify-text-muted">
          Store
          {store ? (
            <button type="button" onClick={() => { setStore(null); setStoreQ(''); setPage(1); }} className={`${inputClass} mt-1 flex items-center gap-2`} title="Clear">
              <span className="max-w-[10rem] truncate">{store.name}</span>
              <span aria-hidden>×</span>
            </button>
          ) : (
            <>
              <input value={storeQ} onChange={(e) => setStoreQ(e.target.value)} placeholder="Any store" className={`${inputClass} mt-1 block w-40`} />
              {storeQ.trim().length >= 2 && storeHits.length > 0 && (
                <ul className="absolute left-0 top-full z-10 mt-1 w-64 divide-y divide-black/5 rounded-lg border border-black/10 bg-white shadow-lg">
                  {storeHits.map((h) => (
                    <li key={h.id}>
                      <button type="button" onClick={() => { setStore({ id: h.id, name: h.title }); setPage(1); }} className="block w-full px-3 py-2 text-left text-sm text-regantify-text hover:bg-regantify-content">
                        {h.title} <span className="text-xs text-regantify-text-muted">{h.subtitle.split(' · ')[0]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        <label className="text-xs text-regantify-text-muted">
          From
          <input type="date" value={from} onChange={(e) => filter(setFrom)(e.target.value)} className={`${inputClass} mt-1 block`} />
        </label>
        <label className="text-xs text-regantify-text-muted">
          To
          <input type="date" value={to} onChange={(e) => filter(setTo)(e.target.value)} className={`${inputClass} mt-1 block`} />
        </label>
        <label className="text-xs text-regantify-text-muted">
          Search
          <input value={search} onChange={(e) => filter(setSearch)(e.target.value)} placeholder="Words or an id" className={`${inputClass} mt-1 block w-48`} />
        </label>
        <button type="button" onClick={download} disabled={exporting} className="ml-auto flex h-9 items-center gap-1.5 rounded-lg border border-black/10 px-3 text-sm hover:bg-regantify-content disabled:opacity-60">
          <Download size={14} />
          {exporting ? 'Making file…' : 'Download CSV'}
        </button>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-regantify-text-muted">Loading…</p>
      ) : !data || data.items.length === 0 ? (
        <div className="py-12 text-center text-sm text-regantify-text-muted">
          <History className="mx-auto mb-2" size={22} />
          Nothing here yet. Changes made from this panel appear from now on.
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-black/5 rounded-xl border border-black/5 bg-white">
            {data.items.map((it) => (
              <li key={it.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium text-regantify-text">{it.adminName}</span>
                  <span className="text-sm text-neutral-700">{it.summary}</span>
                </div>
                <p className="mt-0.5 text-xs text-regantify-text-muted">
                  {formatDhakaDateTime(it.at)} · {actionLabel(it.action)}
                  {it.storeName ? ` · ${it.storeName}` : ''}
                  {it.ip ? ` · ${it.ip}` : ''}
                </p>
                {it.reason && <p className="mt-1 text-xs text-neutral-700">Reason: {it.reason}</p>}
                <ChangeList changes={it.changes} />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-sm text-regantify-text-muted">
            <span>
              {data.total} {data.total === 1 ? 'line' : 'lines'}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-black/10 px-3 py-1 disabled:opacity-40">
                Back
              </button>
              <span>
                {page} / {pages}
              </span>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-black/10 px-3 py-1 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Either [{ field, before, after }] (written by hand) or { sent: {...} } (what the request carried, secrets removed). */
function ChangeList({ changes }: { changes: unknown }) {
  if (Array.isArray(changes)) {
    const rows = changes as Array<{ field: string; before: string; after: string }>;
    return (
      <ul className="mt-1.5 space-y-0.5 text-xs">
        {rows.map((c, i) => (
          <li key={i} className="text-neutral-600">
            <span className="font-medium">{c.field}:</span> {c.before ? <span className="line-through opacity-70">{c.before}</span> : null}
            {c.before ? ' → ' : ''}
            <span>{c.after}</span>
          </li>
        ))}
      </ul>
    );
  }
  const sent = changes && typeof changes === 'object' ? (changes as { sent?: Record<string, unknown> }).sent : undefined;
  if (!sent) return null;
  return (
    <ul className="mt-1.5 space-y-0.5 text-xs text-neutral-600">
      {Object.entries(sent)
        .filter(([k]) => k !== 'reason')
        .map(([k, v]) => (
          <li key={k}>
            <span className="font-medium">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}
          </li>
        ))}
    </ul>
  );
}
