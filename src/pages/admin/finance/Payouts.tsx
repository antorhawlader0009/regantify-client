import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFinanceApi } from '../../../lib/adminFinanceApi';
import type { WithdrawMethod, WithdrawRequestStatus } from '../../../lib/financeApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

function formatAmount(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const METHOD_LABEL: Record<WithdrawMethod, string> = {
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  BANK: 'Bank Transfer',
};

const STATUS_TABS: { label: string; value: WithdrawRequestStatus | 'ALL' }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
];

const STATUS_BADGE: Record<WithdrawRequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-800',
};

/**
 * Super Admin > Finance > Payouts — the admin side of Finance >
 * Withdraw's vendor request flow. Defaults to the PENDING tab (the
 * actual "needs action" queue). Approve/Reject resolve a pending
 * request (Reject restores the vendor's reserved balance — see
 * AdminService.resolveWithdrawRequest); an already-Approved request gets
 * a separate "Mark as Paid" once the admin has actually sent the money
 * outside the platform.
 */
export default function Payouts() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<WithdrawRequestStatus | 'ALL'>('PENDING');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-withdraw-requests', tab],
    queryFn: () => adminFinanceApi.listWithdrawRequests(tab === 'ALL' ? undefined : tab),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      adminFinanceApi.resolveWithdrawRequest(id, decision),
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdraw-requests'] });
      toast.success(decision === 'APPROVED' ? 'Request approved.' : 'Request rejected — balance restored.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not resolve this request. Please try again.')),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => adminFinanceApi.markWithdrawRequestPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdraw-requests'] });
      toast.success('Marked as paid.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update this request. Please try again.')),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Payouts</h1>

      <div className="flex items-center gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.value ? 'bg-regantify-black text-white' : 'text-regantify-text-muted hover:bg-regantify-content'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-regantify-content text-left text-regantify-text-muted">
                <th className="px-4 py-3 font-medium">VENDOR</th>
                <th className="px-4 py-3 font-medium">AMOUNT</th>
                <th className="px-4 py-3 font-medium">METHOD</th>
                <th className="px-4 py-3 font-medium">PAYOUT DETAILS</th>
                <th className="px-4 py-3 font-medium">NOTE</th>
                <th className="px-4 py-3 font-medium">REQUESTED</th>
                <th className="px-4 py-3 font-medium">STATUS</th>
                <th className="px-4 py-3 font-medium">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && requests.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-regantify-text-muted">
                    No requests here.
                  </td>
                </tr>
              )}
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-black/5 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-regantify-text">{r.vendor.storeName}</p>
                    <p className="text-xs text-regantify-text-muted">{r.vendor.subdomain}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-regantify-text whitespace-nowrap">
                    {formatAmount(r.amount)}
                  </td>
                  <td className="px-4 py-3 text-regantify-text">{METHOD_LABEL[r.method]}</td>
                  <td className="px-4 py-3 text-regantify-text-muted max-w-[220px] whitespace-pre-wrap">
                    {r.method === 'BANK' ? r.bankDetails : r.receiverNumber}
                  </td>
                  <td className="px-4 py-3 text-regantify-text-muted max-w-[200px]">{r.note ?? '—'}</td>
                  <td className="px-4 py-3 text-regantify-text-muted whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status]}`}>
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => resolveMutation.mutate({ id: r.id, decision: 'APPROVED' })}
                          disabled={resolveMutation.isPending}
                          className="px-3 py-1.5 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm
                            font-medium disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => resolveMutation.mutate({ id: r.id, decision: 'REJECTED' })}
                          disabled={resolveMutation.isPending}
                          className="px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text
                            hover:bg-regantify-content disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {r.status === 'APPROVED' && (
                      <button
                        onClick={() => markPaidMutation.mutate(r.id)}
                        disabled={markPaidMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm
                          font-medium disabled:opacity-50"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
