import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Circle, Loader2, RefreshCw } from 'lucide-react';
import { apiErrorMessage } from '../lib/api';
import { DOMAIN_STATUS, domainsApi } from '../lib/domainsApi';
import { toast } from '../lib/toast';

/** Store > Domain: where the connected domain stands, checked by the server (super-admin-new.md Step 9). */
export function DomainStatusCard({ domain }: { domain: string }) {
  const qc = useQueryClient();
  // Same key as the Domain page, so the guide and this card share one answer. While the domain isn't live it is asked every 15 seconds:
  // the server looks at DNS each time and, once the records are there, asks Cloudflare again by itself, so the page finishes on its own.
  const { data } = useQuery({ queryKey: ['vendor-domain-status', domain], queryFn: domainsApi.status, refetchInterval: (q) => (q.state.data?.status === 'ACTIVE' ? false : 15_000) });
  const check = useMutation({
    mutationFn: domainsApi.check,
    onSuccess: (r) => qc.setQueryData(['vendor-domain-status', domain], r),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not check right now.')),
  });
  if (!data) return null;
  const s = DOMAIN_STATUS[data.status ?? 'PENDING'];
  const checks = data.checks ?? null;
  const rows: { label: string; ok: boolean }[] = [];
  if (checks) {
    rows.push({ label: data.needsTxt ? 'Record 1: your domain points to your store' : 'Your domain points to your store', ok: checks.pointing });
    if (data.needsTxt && checks.txt !== null) rows.push({ label: 'Record 2: ownership code (TXT) added', ok: checks.txt });
  }
  const allFound = rows.length > 0 && rows.every((r) => r.ok);
  // Cloudflare's own words ("does not CNAME to this zone") mean nothing to a store, so while the tick list is shown they stay hidden.
  const showError = data.error && data.status !== 'ACTIVE' && rows.length === 0;
  return (
    <div className="mb-6 rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-regantify-text">
            {domain} <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
          </p>
          <p className="mt-1 text-sm text-regantify-text-muted">{s.hint}</p>
          {showError && <p className="mt-1 text-xs text-regantify-text">{data.error}</p>}
          {data.checkedAt && (
            <p className="mt-1 text-xs text-regantify-text-muted">
              Last checked {new Date(data.checkedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })}
            </p>
          )}
        </div>
        {data.status !== 'ACTIVE' && (
          <button type="button" disabled={check.isPending} onClick={() => check.mutate()} className="flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-sm text-regantify-text disabled:opacity-60">
            {check.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Check now
          </button>
        )}
      </div>
      {data.status !== 'ACTIVE' && rows.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-black/5 pt-4">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-2.5 text-sm">
              {r.ok ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white"><Check size={13} /></span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center text-regantify-text-muted"><Circle size={16} /></span>
              )}
              <span className={r.ok ? 'text-regantify-text' : 'text-regantify-text-muted'}>
                {r.label} <span className="text-xs">{r.ok ? '(found)' : '(not found yet)'}</span>
              </span>
            </li>
          ))}
          {allFound && (
            <li className="flex items-center gap-2.5 text-sm text-regantify-text">
              <Loader2 size={16} className="animate-spin text-regantify-text-muted" />
              All records found. Finishing the setup, usually within a few minutes. You can leave this page open.
            </li>
          )}
          {!allFound && <li className="pl-7 text-xs text-regantify-text-muted">Records can take a few minutes to show up after you save them. This list updates by itself.</li>}
        </ul>
      )}
      {data.status === 'ACTIVE' && (
        <a href={`https://${domain}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-regantify-text underline">
          Open https://{domain}
        </a>
      )}
    </div>
  );
}
