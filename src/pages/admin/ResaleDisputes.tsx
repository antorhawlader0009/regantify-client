import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { resaleDisputesAdminApi, type Dispute, type DisputeStatus } from '../../lib/resaleDisputesApi';
import { DisputeBody, DisputeStatusChip } from '../../components/resale/DisputeParts';

const TABS: Array<{ id: DisputeStatus; label: string }> = [
  { id: 'ANSWERED', label: 'Waiting for you' },
  { id: 'OPEN', label: 'Waiting for the supplier' },
  { id: 'DECIDED', label: 'Decided' },
  { id: 'WITHDRAWN', label: 'Taken back' },
];
const money = (n: number | null | undefined) => (n == null ? '—' : `৳${n.toLocaleString('en-US')}`);

/**
 * Super Admin > Reseller problems (RESELLER-plan.md Step 14): the queue, oldest first. Each shows the reseller's report and the supplier's
 * answer with their photos. Decide for the reseller (with compensation from the supplier's wallet, up to the order's total; it waits if the
 * wallet can't pay it, and the supplier's new orders stop meanwhile) or for the supplier (courier faults, no proof). Both stores see the note.
 */
export default function ResaleDisputes() {
  const [tab, setTab] = useState<DisputeStatus>('ANSWERED');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'resale-disputes', tab], queryFn: () => resaleDisputesAdminApi.list(tab) });
  const viewer = useAdminViewer();
  const canDecide = adminCan(viewer, 'money.adjust');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-regantify-text">Reseller problems</h1>
        <p className="text-sm text-neutral-600">Problems resellers reported with delivered or returned resale orders. Read both sides, then decide.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${tab === t.id ? 'border-brand bg-white font-medium text-regantify-text' : 'border-line text-neutral-600'}`}
          >
            {t.label}
            {data?.counts[t.id] ? <span className="ml-1 text-xs text-neutral-500">{data.counts[t.id]}</span> : null}
          </button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : !data || data.items.length === 0 ? (
        <p className="rounded-xl border border-line bg-white px-4 py-8 text-center text-sm text-neutral-500">Nothing here.</p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((d) => (
            <li key={d.id} className="rounded-xl border border-line bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="font-medium text-regantify-text">{d.reasonText}</p>
                <DisputeStatusChip status={d.status} />
                <span className="text-xs text-neutral-500">
                  {d.reseller?.storeName} (order {d.resaleOrderRef}) → {d.supplier?.storeName} (order {d.supplyOrderRef}) · total {money(d.orderTotal)} · earning{' '}
                  {d.earning ? `${money(d.earning.amount)} (${d.earning.status.toLowerCase().replace('_', ' ')})` : 'none'}
                </span>
              </div>
              <DisputeBody d={d} />
              {canDecide && (d.status === 'OPEN' || d.status === 'ANSWERED') && <DecideForm dispute={d} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DecideForm({ dispute }: { dispute: Dispute }) {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<'FOR_RESELLER' | 'FOR_SUPPLIER'>('FOR_RESELLER');
  const [amount, setAmount] = useState(dispute.earning ? String(dispute.earning.amount) : '');
  const [note, setNote] = useState('');
  const decide = useMutation({
    mutationFn: () => resaleDisputesAdminApi.decide(dispute.id, { decision, compensation: decision === 'FOR_RESELLER' && amount ? Number(amount) : undefined, note: note.trim() }),
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'resale-disputes'] });
      toast.success(d.compensationStatus === 'WAITING' ? 'Decided. The compensation waits for the supplier’s wallet.' : 'Decided. Both stores are told.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the decision.')),
  });
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input type="radio" checked={decision === 'FOR_RESELLER'} onChange={() => setDecision('FOR_RESELLER')} />
          For the reseller
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={decision === 'FOR_SUPPLIER'} onChange={() => setDecision('FOR_SUPPLIER')} />
          For the supplier (courier fault, no proof)
        </label>
      </div>
      {decision === 'FOR_RESELLER' && (
        <label className="block">
          Compensation from the supplier’s wallet (৳, empty or 0 = none; at most the order total)
          <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block h-9 w-48 rounded-lg border border-line px-3" />
        </label>
      )}
      <label className="block">
        Why (both stores see it)
        <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 block w-full rounded-lg border border-line px-3 py-2" />
      </label>
      <div className="flex justify-end">
        <button type="button" disabled={note.trim().length < 5 || decide.isPending} onClick={() => decide.mutate()} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
          {decide.isPending ? 'Saving…' : 'Decide'}
        </button>
      </div>
    </div>
  );
}
