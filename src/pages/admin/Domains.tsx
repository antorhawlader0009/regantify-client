import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Loader2 } from 'lucide-react';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { DOMAIN_STATUS, domainsApi, type AdminDomainRow, type DomainStatus } from '../../lib/domainsApi';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';
import { ReasonNeed } from '../../components/admin/ReasonNeed';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';

/**
 * Super Admin > Stores > Domains (super-admin-new.md Step 9): every store's own domain, whether its DNS points at us and whether it answers over
 * HTTPS. Caddy on the VPS makes the certificate on the first visit, but only for a domain listed here as verified or live.
 */
export default function Domains() {
  const qc = useQueryClient();
  const canEdit = adminCan(useAdminViewer(), 'stores.edit');
  const { data, isLoading } = useQuery({ queryKey: ['admin-domains'], queryFn: domainsApi.adminList });
  const [filter, setFilter] = useState<DomainStatus | 'ALL'>('ALL');
  const [removing, setRemoving] = useState<AdminDomainRow | null>(null);
  const recheck = useMutation({
    mutationFn: domainsApi.adminRecheck,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-domains'] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not check it.')),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }
  const rows = data.domains.filter((d) => filter === 'ALL' || (d.customDomainStatus ?? 'PENDING') === filter);
  const count = (s: DomainStatus) => data.domains.filter((d) => (d.customDomainStatus ?? 'PENDING') === s).length;

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-start gap-3">
        <Globe className="mt-1 text-regantify-text-muted" size={20} />
        <div>
          <h1 className="text-lg font-semibold text-regantify-text">Domains</h1>
          <p className="max-w-3xl text-sm text-regantify-text-muted">
            Stores point an A record at {data.aRecords.length ? <span className="font-mono">{data.aRecords.join(', ')}</span> : 'the platform address'}
            {data.cnameTarget ? (
              <>
                {' '}
                (or a CNAME at <span className="font-mono">{data.cnameTarget}</span>)
              </>
            ) : null}
            . The server checks every 30 minutes. A store can press Check now on its Domain page.
          </p>
        </div>
      </div>

      {!data.ready && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-900">
          PLATFORM_PUBLIC_IPS is not set in server/.env, so no domain can be verified yet. Set it to the VPS public address and restart the server. The Caddy setup is in
          z-others/vps/caddy/README.md.
        </p>
      )}

      <div className="flex flex-wrap gap-1 rounded-xl border border-black/5 bg-white p-1">
        {(['ALL', 'ACTIVE', 'VERIFIED', 'PENDING', 'FAILED'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-sm ${filter === s ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'}`}>
            {s === 'ALL' ? `All (${data.domains.length})` : `${DOMAIN_STATUS[s].label} (${count(s)})`}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-black/5 bg-white px-4 py-8 text-center text-sm text-regantify-text-muted">No domains here.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/5 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-xs text-regantify-text-muted">
                <th className="px-4 py-2 font-normal">Domain</th>
                <th className="px-4 py-2 font-normal">Store</th>
                <th className="px-4 py-2 font-normal">State</th>
                <th className="px-4 py-2 font-normal">Last checked</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const s = DOMAIN_STATUS[d.customDomainStatus ?? 'PENDING'];
                return (
                  <tr key={d.id} className="border-b border-black/5 align-top last:border-0">
                    <td className="px-4 py-2.5">
                      <a href={`https://${d.customDomain}`} target="_blank" rel="noreferrer" className="font-mono text-regantify-text hover:underline">
                        {d.customDomain}
                      </a>
                      {d.customDomainError && d.customDomainStatus !== 'ACTIVE' && <p className="mt-0.5 max-w-sm text-xs text-regantify-text-muted">{d.customDomainError}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link to={`/admin/vendors/${d.id}`} className="text-regantify-text hover:underline">
                        {d.storeName}
                      </Link>
                      <span className="block text-xs text-regantify-text-muted">{d.subdomain}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-regantify-text-muted">{d.customDomainCheckedAt ? formatDhakaDateTime(d.customDomainCheckedAt) : 'Not yet'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {canEdit && (
                        <span className="flex justify-end gap-3 text-xs font-medium">
                          <button type="button" disabled={recheck.isPending} onClick={() => recheck.mutate(d.id)} className="text-regantify-text hover:underline disabled:opacity-50">
                            Check now
                          </button>
                          <button type="button" onClick={() => setRemoving(d)} className="text-red-700 hover:underline">
                            Remove
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <RemoveDialog row={removing} onClose={() => setRemoving(null)} />
    </div>
  );
}

function RemoveDialog({ row, onClose }: { row: AdminDomainRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: () => domainsApi.adminRemove(row!.id, reason.trim()),
    onSuccess: () => {
      toast.success('Removed. The store was told why.');
      setReason('');
      qc.invalidateQueries({ queryKey: ['admin-domains'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not remove it.')),
  });
  return (
    <Dialog open={row !== null} onOpenChange={(o) => !o && onClose()} title="Remove this domain" maxWidth="max-w-md">
      {row && (
        <div className="space-y-4 p-6 pt-3">
          <p className="text-sm text-regantify-text-muted">
            <span className="font-mono text-regantify-text">{row.customDomain}</span> is taken off {row.storeName}. The store keeps working on its built-in address, and no new
            certificate is made for the domain.
          </p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} placeholder="Reason the store will read" className={field} />
          <ReasonNeed value={reason} />
          <button type="button" disabled={reason.trim().length < 5 || m.isPending} onClick={() => m.mutate()} className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {m.isPending ? 'Removing...' : 'Remove domain'}
          </button>
        </div>
      )}
    </Dialog>
  );
}
