import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPlanRequestsApi } from '../../../lib/adminPlansApi';
import type { PlanUpgradeRequestStatus } from '../../../lib/plansApi';
import { toast } from '../../../lib/toast';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const STATUS_TABS: { label: string; value: PlanUpgradeRequestStatus | 'ALL' }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
];

/**
 * Super Admin > Plans > Plan Requests (PLAN.md Step 15) — the admin
 * side of Step 14's vendor "Request Upgrade" flow. Defaults to the
 * PENDING tab (the actual "needs action" queue); Approve calls the same
 * assignVendorPlan path a direct manual plan change on All Vendors
 * uses, so the vendor's plan is genuinely changed in the same action,
 * not a separate follow-up step.
 */
export default function PlanRequests() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<PlanUpgradeRequestStatus | 'ALL'>('PENDING');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-plan-requests', tab],
    queryFn: () => adminPlanRequestsApi.list(tab === 'ALL' ? undefined : tab),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'REJECTED' }) =>
      adminPlanRequestsApi.resolve(id, decision),
    onSuccess: (_, { decision }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-plan-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success(decision === 'APPROVED' ? 'Request approved — plan updated.' : 'Request rejected.');
    },
    onError: () => toast.error('Could not resolve this request. Please try again.'),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Plan Requests</h1>

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
                <th className="px-4 py-3 font-medium">WANTS</th>
                <th className="px-4 py-3 font-medium">NOTE</th>
                <th className="px-4 py-3 font-medium">REQUESTED</th>
                <th className="px-4 py-3 font-medium">STATUS</th>
                <th className="px-4 py-3 font-medium">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-regantify-text-muted">
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
                  <td className="px-4 py-3 text-regantify-text">{r.requestedPlan.name}</td>
                  <td className="px-4 py-3 text-regantify-text-muted max-w-[240px]">{r.note ?? '—'}</td>
                  <td className="px-4 py-3 text-regantify-text-muted whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                        r.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : r.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
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
