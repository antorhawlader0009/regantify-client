import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { apiErrorMessage } from '../lib/api';
import { DOMAIN_STATUS, domainsApi } from '../lib/domainsApi';
import { toast } from '../lib/toast';

/** Store > Domain: where the connected domain stands, checked by the server (super-admin-new.md Step 9). */
export function DomainStatusCard({ domain }: { domain: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['vendor-domain-status', domain], queryFn: domainsApi.status, refetchInterval: (q) => (q.state.data?.status === 'ACTIVE' ? false : 60_000) });
  const check = useMutation({
    mutationFn: domainsApi.check,
    onSuccess: (r) => qc.setQueryData(['vendor-domain-status', domain], r),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not check right now.')),
  });
  if (!data) return null;
  const s = DOMAIN_STATUS[data.status ?? 'PENDING'];
  return (
    <div className="mb-6 rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-regantify-text">
            {domain} <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
          </p>
          <p className="mt-1 text-sm text-regantify-text-muted">{s.hint}</p>
          {data.error && data.status !== 'ACTIVE' && <p className="mt-1 text-xs text-regantify-text">{data.error}</p>}
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
      {data.status === 'ACTIVE' && (
        <a href={`https://${domain}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-regantify-text underline">
          Open https://{domain}
        </a>
      )}
    </div>
  );
}
