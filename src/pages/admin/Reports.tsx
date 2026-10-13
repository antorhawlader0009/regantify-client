import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminStep17Api, type ReportStatus, type StoreReportRow } from '../../lib/adminStep17Api';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';

type Action = 'dismiss' | 'warn' | 'suspend';
const TABS: Array<{ id: ReportStatus | ''; label: string }> = [
  { id: 'OPEN', label: 'Open' },
  { id: 'WARNED', label: 'Warned' },
  { id: 'SUSPENDED', label: 'Suspended' },
  { id: 'DISMISSED', label: 'Dismissed' },
  { id: '', label: 'All' },
];
const COPY: Record<Action, { title: string; hint: string; placeholder: string; button: string; danger?: boolean }> = {
  dismiss: { title: 'Dismiss this report', hint: 'Nothing is wrong. The store is not told.', placeholder: 'Why (kept with the report)', button: 'Dismiss' },
  warn: { title: 'Warn the store', hint: 'The store gets this message with the reason of the report (never who reported). It is asked to put it right.', placeholder: 'What the store must fix', button: 'Send warning' },
  suspend: { title: 'Suspend the store', hint: 'The store is shut now and its owner is texted this reason. Reopen it later from the store page.', placeholder: 'Reason the owner will read', button: 'Suspend the store', danger: true },
};
const STATUS_STYLE: Record<ReportStatus, string> = { OPEN: 'bg-amber-50 text-amber-800', WARNED: 'bg-sky-50 text-sky-800', SUSPENDED: 'bg-red-50 text-red-700', DISMISSED: 'bg-neutral-100 text-neutral-600' };
const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';

/** Super Admin > Reports (super-admin-plan.md Step 17): the queue behind “Report this store”. Dismiss, warn or suspend; ten reports on one store read as one problem. */
export default function AdminReports() {
  const qc = useQueryClient();
  const viewer = useAdminViewer();
  const [tab, setTab] = useState<ReportStatus | ''>('OPEN');
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<{ report: StoreReportRow; action: Action } | null>(null);
  const [note, setNote] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin-reports', tab, page], queryFn: () => adminStep17Api.reports(tab, page), placeholderData: keepPreviousData, refetchInterval: 60_000 });
  const run = useMutation({
    mutationFn: () => {
      const { report, action } = acting!;
      return action === 'dismiss' ? adminStep17Api.dismissReport(report.id, note.trim()) : action === 'warn' ? adminStep17Api.warnReport(report.id, note.trim()) : adminStep17Api.suspendReport(report.id, note.trim());
    },
    onSuccess: () => {
      toast.success('Done.');
      setActing(null);
      setNote('');
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-regantify-text">Store reports</h1>
      <p className="mt-1 text-sm text-regantify-text-muted">People can report a store from the “Report this store” link in its footer. {data ? `${data.openTotal} open.` : ''}</p>
      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-black/5">
        {TABS.map((t) => (
          <button key={t.label} type="button" onClick={() => { setTab(t.id); setPage(1); }} className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === t.id ? 'border-regantify-black text-regantify-text' : 'border-transparent text-regantify-text-muted hover:text-regantify-text'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-regantify-text-muted">Loading…</p>}
        {data?.items.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm text-regantify-text-muted ring-1 ring-black/5">Nothing here.</p>}
        {data?.items.map((r) => (
          <article key={r.id} className="rounded-2xl border border-black/5 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-regantify-text">
                  <Link to={`/admin/vendors/${r.store.id}`} className="text-regantify-cta hover:underline">{r.store.name}</Link>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status.toLowerCase()}</span>
                  {r.store.openReports > 1 && r.status === 'OPEN' && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{r.store.openReports} open reports on this store</span>}
                  {r.store.status !== 'ACTIVE' && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-600">store is {r.store.status.toLowerCase()}</span>}
                </p>
                <p className="mt-0.5 text-xs text-regantify-text-muted">{r.reasonLabel} · {formatDhakaDateTime(r.createdAt)}{r.phone ? ` · reporter’s phone ${r.phone}` : ''}</p>
              </div>
              {r.status === 'OPEN' && (
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => { setActing({ report: r, action: 'dismiss' }); setNote(''); }} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm">Dismiss</button>
                  <button type="button" onClick={() => { setActing({ report: r, action: 'warn' }); setNote(''); }} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm">Warn</button>
                  {adminCan(viewer, 'stores.edit') && <button type="button" onClick={() => { setActing({ report: r, action: 'suspend' }); setNote(''); }} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700">Suspend</button>}
                </div>
              )}
            </div>
            {r.note && <p className="mt-2 whitespace-pre-line text-sm text-regantify-text">{r.note}</p>}
            {r.handledAt && <p className="mt-2 rounded-lg bg-regantify-search px-3 py-1.5 text-xs text-regantify-text-muted">{r.handledByName ?? 'Super Admin'}, {formatDhakaDateTime(r.handledAt)}: {r.handledNote}</p>}
          </article>
        ))}
      </div>

      {data && pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-black/10 px-3 py-1.5 disabled:opacity-40">Previous</button>
          <span className="text-regantify-text-muted">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-black/10 px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      )}

      <Dialog open={acting !== null} onOpenChange={(o) => !o && setActing(null)} maxWidth="max-w-md">
        {acting && (
          <div className="space-y-4 p-6">
            <h2 className="font-semibold text-regantify-text">{COPY[acting.action].title}: {acting.report.store.name}</h2>
            <p className="text-sm text-regantify-text-muted">{COPY[acting.action].hint}</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder={COPY[acting.action].placeholder} className={field} />
            <button type="button" disabled={note.trim().length < 5 || run.isPending} onClick={() => run.mutate()} className={`w-full rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-50 ${COPY[acting.action].danger ? 'bg-red-600' : 'bg-regantify-cta'}`}>
              {run.isPending ? 'Working…' : COPY[acting.action].button}
            </button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
