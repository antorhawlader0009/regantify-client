import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareWarning } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { EmptyState, outlineBtn, primaryBtn } from '../ui/PageKit';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { DISPUTE_REASON_LABEL, RESALE_DISPUTES_KEY, resaleDisputesApi, type Dispute, type DisputeReason } from '../../lib/resaleDisputesApi';
import { DisputeBody, DisputePhotoPicker, DisputeStatusChip } from './DisputeParts';

const fieldClass = 'mt-1 block w-full rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';

/**
 * Order detail of a resale order (RESELLER-plan.md Step 14): "Report a problem" while the order is delivered or returned and inside the
 * supplier's return window, or the problem already reported, with both sides and the decision.
 */
export function ReportProblemCard({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: [...RESALE_DISPUTES_KEY, 'order', orderId], queryFn: () => resaleDisputesApi.forOrder(orderId), retry: false });
  if (!data) return null;
  if (data.dispute) {
    return (
      <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-regantify-text">Problem reported: {data.dispute.reasonText}</h2>
          <DisputeStatusChip status={data.dispute.status} />
        </div>
        <DisputeBody d={data.dispute} />
      </section>
    );
  }
  if (!data.canOpen) return data.reason ? <p className="text-xs text-neutral-500">{data.reason}</p> : null;
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4">
      <MessageSquareWarning size={18} className="text-amber-600" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-neutral-700">
        Something wrong with the parcel (wrong item, damaged, missing, late)? Report it with photos; the supplier answers and Regantify decides.
      </p>
      <button type="button" onClick={() => setOpen(true)} className={outlineBtn}>
        Report a problem
      </button>
      {open && <ReportDialog orderId={orderId} onClose={() => setOpen(false)} />}
    </section>
  );
}

function ReportDialog({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<DisputeReason>('WRONG_ITEM');
  const [details, setDetails] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const send = useMutation({
    mutationFn: () => resaleDisputesApi.open({ resaleOrderId: orderId, reason, details: details.trim(), photos, checkedWithCustomer: checked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESALE_DISPUTES_KEY });
      toast.success('Reported. The supplier is told, and Regantify decides after its answer.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the report.')),
  });
  const missing = reason === 'MISSING';
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Report a problem" maxWidth="max-w-lg">
      <div className="space-y-3 text-sm">
        <label className="block text-regantify-text">
          What went wrong
          <select value={reason} onChange={(e) => setReason(e.target.value as DisputeReason)} className={`${fieldClass} h-10`}>
            {(Object.keys(DISPUTE_REASON_LABEL) as DisputeReason[]).map((r) => (
              <option key={r} value={r}>
                {DISPUTE_REASON_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-regantify-text">
          What happened
          <textarea rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What the customer received, and what was ordered" className={`${fieldClass} py-2`} />
        </label>
        <div>
          <p className="mb-1 text-regantify-text">Photos from the customer (the parcel, the item)</p>
          <DisputePhotoPicker photos={photos} onChange={setPhotos} />
        </div>
        {missing && (
          <label className="flex items-start gap-2 text-regantify-text">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
            I checked with my customer: the parcel really did not arrive.
          </label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" disabled={details.trim().length < 10 || (missing && !checked) || send.isPending} onClick={() => send.mutate()} className={primaryBtn}>
            {send.isPending ? 'Sending…' : 'Send report'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** The problems list: the reseller's reports (take back while undecided), or the supplier's to answer. */
export function ResaleProblemsList({ side }: { side: 'reseller' | 'supplier' }) {
  const queryClient = useQueryClient();
  const [answering, setAnswering] = useState<Dispute | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: [...RESALE_DISPUTES_KEY, side],
    queryFn: side === 'reseller' ? resaleDisputesApi.mine : resaleDisputesApi.toAnswer,
  });
  const withdraw = useMutation({
    mutationFn: (id: string) => resaleDisputesApi.withdraw(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESALE_DISPUTES_KEY });
      toast.success('Taken back.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not take it back.')),
  });

  if (isLoading) return <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>;
  if (data.length === 0)
    return (
      <EmptyState
        icon={MessageSquareWarning}
        title="No problems reported"
        hint={side === 'reseller' ? 'Report a problem from a delivered or returned resale order.' : 'When a reseller reports a problem with one of your parcels, it shows here.'}
      />
    );

  return (
    <>
      <ul className="space-y-3">
        {data.map((d) => (
          <li key={d.id} className="rounded-lg border border-line p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="font-medium text-regantify-text">{d.reasonText}</p>
              <DisputeStatusChip status={d.status} />
              <span className="text-xs text-neutral-500">
                {side === 'reseller' ? (
                  <>
                    <Link to={`/vendor/orders/${d.resaleOrderId}`} className="text-brand hover:underline">
                      {d.resaleOrderRef}
                    </Link>{' '}
                    · {d.supplier?.storeName}
                  </>
                ) : (
                  <>
                    <Link to={`/vendor/orders/${d.supplyOrderId}`} className="text-brand hover:underline">
                      {d.supplyOrderRef}
                    </Link>{' '}
                    · {d.reseller?.storeName}
                  </>
                )}
              </span>
              <span className="ml-auto flex gap-2">
                {side === 'supplier' && (d.status === 'OPEN' || d.status === 'ANSWERED') && (
                  <button type="button" onClick={() => setAnswering(d)} className={d.status === 'OPEN' ? primaryBtn : outlineBtn}>
                    {d.status === 'OPEN' ? 'Answer' : 'Change answer'}
                  </button>
                )}
                {side === 'reseller' && (d.status === 'OPEN' || d.status === 'ANSWERED') && (
                  <button type="button" disabled={withdraw.isPending} onClick={() => withdraw.mutate(d.id)} className={outlineBtn}>
                    Take back
                  </button>
                )}
              </span>
            </div>
            <DisputeBody d={d} />
          </li>
        ))}
      </ul>
      {answering && <AnswerDialog dispute={answering} onClose={() => setAnswering(null)} />}
    </>
  );
}

function AnswerDialog({ dispute, onClose }: { dispute: Dispute; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [answer, setAnswer] = useState(dispute.supplierAnswer ?? '');
  const [photos, setPhotos] = useState<string[]>(dispute.supplierPhotos);
  const send = useMutation({
    mutationFn: () => resaleDisputesApi.answer(dispute.id, { answer: answer.trim(), photos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESALE_DISPUTES_KEY });
      toast.success('Answer sent. Regantify decides.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the answer.')),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Answer: ${dispute.reasonText}`} maxWidth="max-w-lg">
      <div className="space-y-3 text-sm">
        <DisputeBody d={{ ...dispute, supplierAnswer: null, status: 'ANSWERED' }} />
        <label className="block text-regantify-text">
          Your answer
          <textarea rows={4} maxLength={2000} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="What was packed and sent, and how you checked it" className={`${fieldClass} py-2`} />
        </label>
        <div>
          <p className="mb-1 text-regantify-text">Your packing photos</p>
          <DisputePhotoPicker photos={photos} onChange={setPhotos} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" disabled={answer.trim().length < 5 || send.isPending} onClick={() => send.mutate()} className={primaryBtn}>
            {send.isPending ? 'Sending…' : 'Send answer'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
