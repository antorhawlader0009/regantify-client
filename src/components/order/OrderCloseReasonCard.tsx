import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import { ordersApi, type Order } from '../../lib/ordersApi';
import { CANCEL_REASONS, RETURN_REASONS, CLOSE_REASON_LABEL, type CloseReasonCode } from '../../lib/closeReasons';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

/** Choices for an order that is already closed: the lists for its step, plus what it already holds. */
function choicesFor(order: Pick<Order, 'status' | 'closeReason'>): CloseReasonCode[] {
  const base = order.status === 'RETURN' ? RETURN_REASONS : CANCEL_REASONS;
  const own = order.closeReason?.code;
  // Payment failed has no list of its own: a system reason, or "Other".
  if (order.status === 'PAYMENT_FAILED') return own ? [own, 'OTHER'].filter((c, i, a) => a.indexOf(c) === i) as CloseReasonCode[] : ['OTHER'];
  return own && !base.includes(own) ? [own, ...base] : base;
}

/**
 * Order detail: why this order was cancelled, returned or failed. A closing that never said why (a parcel the
 * courier sent back, an order closed before reasons existed, one cancelled from the LMS call desk) shows "Add the
 * reason", so Analytics > Orders can count it properly.
 */
export function OrderCloseReasonCard({ order, canEdit, onChanged }: { order: Order; canEdit: boolean; onChanged: () => void }) {
  const reason = order.closeReason;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<CloseReasonCode | ''>('');

  const save = useMutation({
    mutationFn: (code: CloseReasonCode) => ordersApi.setCloseReason(order.id, code),
    onSuccess: () => {
      setEditing(false);
      onChanged();
      toast.success('Reason saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the reason. Please try again.')),
  });

  if (!reason) return null;
  const choices = choicesFor(order);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-white px-4 py-3">
      <Flag size={15} className="shrink-0 text-neutral-500" aria-hidden />
      {!editing ? (
        <>
          <p className="min-w-0 flex-1 text-sm text-regantify-text">
            {reason.code ? (
              <>
                <span className="text-neutral-500">Reason: </span>
                <span className="font-medium">{CLOSE_REASON_LABEL[reason.code] ?? reason.label}</span>
              </>
            ) : (
              <span className="text-neutral-600">No reason was recorded for this order.</span>
            )}
          </p>
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-xs font-medium text-brand hover:underline">
              {reason.code ? 'Change' : 'Add the reason'}
            </button>
          )}
        </>
      ) : (
        <>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value as CloseReasonCode | '')}
            aria-label="Why was this order closed?"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 text-sm text-regantify-text focus:border-brand focus:outline-none"
          >
            <option value="">Choose a reason</option>
            {choices.map((code) => (
              <option key={code} value={code}>
                {CLOSE_REASON_LABEL[code]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={value === '' || save.isPending}
            onClick={() => value && save.mutate(value)}
            className="h-9 shrink-0 rounded-lg bg-brand px-3 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="shrink-0 text-xs text-neutral-600 hover:underline">
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
