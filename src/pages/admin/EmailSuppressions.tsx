import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailApi } from '../../lib/emailApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';

/**
 * Addresses Regantify never emails again: Amazon SES reported a permanent bounce (the address does not exist) or a spam complaint, through
 * SNS. Kept so the bounce rate stays under 5% and complaints under 0.1%, or AWS pauses sending. "Remove" lets one through again.
 */
export function EmailSuppressions({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data } = useQuery({ queryKey: ['admin-email-suppressions', search], queryFn: () => emailApi.suppressions(search.trim()) });
  const remove = useMutation({
    mutationFn: (email: string) => emailApi.removeSuppression(email),
    onSuccess: () => {
      toast.success('Removed: this address can get email again.');
      qc.invalidateQueries({ queryKey: ['admin-email-suppressions'] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not remove it.')),
  });
  return (
    <section className="space-y-3 rounded-xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-regantify-text">Never emailed again ({data?.total ?? 0})</h2>
          <p className="text-xs text-regantify-text-muted">Addresses that bounced for good or marked an email as spam, reported by Amazon SES. Neither SES nor Resend emails them.</p>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search address" className="w-56 rounded-lg border border-line bg-white px-3 py-2 text-sm focus:outline-none" />
      </div>
      {!data?.rows.length ? (
        <p className="text-sm text-regantify-text-muted">None yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-regantify-text-muted">
              <th className="py-1.5">Address</th>
              <th>Why</th>
              <th>Last</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.email} className="border-t border-line">
                <td className="py-2 font-medium text-regantify-text">{r.email}</td>
                <td className={r.reason === 'COMPLAINT' ? 'text-red-700' : 'text-regantify-text-muted'} title={r.detail ?? undefined}>
                  {r.reason === 'COMPLAINT' ? 'Marked as spam' : 'Bounced (does not exist)'}
                  {r.count > 1 ? ` · ${r.count}x` : ''}
                </td>
                <td className="text-regantify-text-muted">{formatDhakaDateTime(r.lastAt)}</td>
                <td className="text-right">
                  {canEdit && (
                    <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(r.email)} className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
