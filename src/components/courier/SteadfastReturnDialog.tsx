import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { normalizeSteadfastStatus } from './courierStatus';

// Mirrors server STEADFAST_RETURNABLE_STATUSES: the parcel is still out
// there and SteadFast hasn't settled it yet.
const RETURNABLE = new Set(['in_review', 'pending', 'hold', 'unknown', 'exceptional']);

/** Whether a return can still be requested for a parcel with this SteadFast status (no status yet counts). */
export function steadfastReturnable(courierStatus: string | null | undefined): boolean {
  return !courierStatus || RETURNABLE.has(normalizeSteadfastStatus(courierStatus));
}

interface SteadfastReturnDialogProps {
  /** The order to ask about; null closes the dialog. */
  order: { id: string; invoiceNumber: number } | null;
  onClose: () => void;
}

/**
 * "Request return" — asks SteadFast to stop delivering a parcel and bring
 * it back (POST /v1/courier/steadfast/orders/:id/return-request). Used by
 * the SteadFast Parcels tab and Order Detail. The order's status isn't
 * touched here; it moves when SteadFast reports the return.
 */
export function SteadfastReturnDialog({ order, onClose }: SteadfastReturnDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  useEffect(() => setReason(''), [order]);

  const mutation = useMutation({
    mutationFn: (orderId: string) => courierApi.requestSteadfastReturn(orderId, reason.trim() || undefined),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['courier-events', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['steadfast-parcels'] });
      toast.success('Return requested. SteadFast will bring the parcel back.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t request the return. Try again in a minute.')),
  });

  return (
    <Dialog open={order != null} onOpenChange={(open) => !open && !mutation.isPending && onClose()} title="Request return from SteadFast" maxWidth="max-w-md">
      <div className="p-6 pt-4 space-y-4">
        <p className="text-sm text-neutral-500">
          Asks SteadFast to stop delivering ORDER-{order?.invoiceNumber} and bring it back to you. Your order status changes when SteadFast
          reports the return.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Reason (optional), e.g. Customer cancelled"
          className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-regantify-text outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-line text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => order && mutation.mutate(order.id)}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {mutation.isPending ? 'Requesting…' : 'Request return'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
