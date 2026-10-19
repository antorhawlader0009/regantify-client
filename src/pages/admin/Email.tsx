import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { emailApi } from '../../lib/emailApi';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';

const field = 'rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none';
const STATUS_CLASS = { SENT: 'text-emerald-700', FAILED: 'text-red-700', SKIPPED: 'text-regantify-text-muted' } as const;
const KIND_LABEL: Record<string, string> = { RECEIPT: 'Receipt', NUDGE: 'Automation', TEST: 'Test', VERIFY_EMAIL: 'Email verification' };

/**
 * Super Admin > Platform > Email (super-admin-new.md Step 13): which email service is set up, a test send, and every email Regantify sent to stores
 * (receipts and automation emails; never to shoppers) for the last 90 days.
 */
export default function AdminEmail() {
  const qc = useQueryClient();
  const canTest = adminCan(useAdminViewer(), 'settings.manage');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [to, setTo] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-email', status, kind, search, page],
    queryFn: () => emailApi.log({ status: status || undefined, kind: kind || undefined, search: search.trim() || undefined, page }),
    placeholderData: keepPreviousData,
  });
  const test = useMutation({
    mutationFn: () => emailApi.test(to.trim()),
    onSuccess: (r) => {
      if (r.ok) toast.success('Sent. Check that inbox (and its spam folder).');
      else toast.error(r.error ?? 'Not sent.');
      qc.invalidateQueries({ queryKey: ['admin-email'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the test.')),
  });

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }
  const s = data.status;
  const pages = Math.max(1, Math.ceil(data.total / data.perPage));

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start gap-3">
        <Mail className="mt-1 text-regantify-text-muted" size={20} />
        <div>
          <h1 className="text-lg font-semibold text-regantify-text">Email</h1>
          <p className="max-w-3xl text-sm text-regantify-text-muted">
            Emails Regantify sends to store owners: payment receipts and automation emails. Never to shoppers. An owner with no email on their account gets none. Pause all of
            it with the "Platform email" switch.
          </p>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {s.configured ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-red-600" />}
          <span className="font-medium text-regantify-text">{s.configured ? `${s.provider === 'RESEND' ? 'Resend' : s.provider} is set up` : 'Not set up: no Resend API key on the server'}</span>
          <span className="text-regantify-text-muted">· sender {s.from}</span>
          {s.replyTo && <span className="text-regantify-text-muted">· replies to {s.replyTo}</span>}
        </div>
        {s.testSender && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-900">
            Still on Resend's test sender, which only delivers to the Resend account owner's own address. Verify your domain in Resend, then set EMAIL_FROM on the server (for
            example "Regantify &lt;no-reply@yourdomain.com&gt;") so emails reach store owners.
          </p>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            Last 24 hours: <span className="font-medium text-emerald-700">{data.last24h.SENT ?? 0} sent</span>
          </span>
          <span className="font-medium text-red-700">{data.last24h.FAILED ?? 0} failed</span>
          <span className="text-regantify-text-muted">{data.last24h.SKIPPED ?? 0} skipped</span>
        </div>
        {canTest && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Send a test to..." className={`${field} w-64`} />
            <button type="button" disabled={!/^\S+@\S+\.\S+$/.test(to.trim()) || test.isPending} onClick={() => test.mutate()} className="rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {test.isPending ? 'Sending...' : 'Send test'}
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={field}>
            <option value="">All results</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped</option>
          </select>
          <select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }} className={field}>
            <option value="">All kinds</option>
            {data.kinds.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k] ?? k}
              </option>
            ))}
          </select>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search address or subject" className={`${field} ml-auto w-60`} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                <th className="px-4 py-2 font-normal">When</th>
                <th className="px-4 py-2 font-normal">To</th>
                <th className="px-4 py-2 font-normal">Subject</th>
                <th className="px-4 py-2 font-normal">Kind</th>
                <th className="px-4 py-2 font-normal">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-regantify-text-muted">
                    No emails yet.
                  </td>
                </tr>
              )}
              {data.items.map((e) => (
                <tr key={e.id} className="border-b border-line align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-regantify-text-muted">{formatDhakaDateTime(e.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-regantify-text">{e.toAddress}</p>
                    {e.storeName && <p className="text-xs text-regantify-text-muted">{e.storeName}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-regantify-text">{e.subject}</td>
                  <td className="px-4 py-2.5 text-xs">{KIND_LABEL[e.kind] ?? e.kind}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className={`font-medium ${STATUS_CLASS[e.status]}`}>{e.status === 'SENT' ? 'Sent' : e.status === 'FAILED' ? 'Failed' : 'Skipped'}</span>
                    {e.error && <p className="max-w-xs text-regantify-text-muted">{e.error}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">
              Previous
            </button>
            <span className="text-regantify-text-muted">
              {page} / {pages}
            </span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
