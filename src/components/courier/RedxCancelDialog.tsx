import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface RedxCancelDialogProps {
  /** The order whose RedX parcel to cancel; null closes the dialog. */
  order: { id: string; invoiceNumber: number } | null;
  onClose: () => void;
}

/**
 * "Cancel parcel" — tells RedX to drop a parcel it hasn't picked up yet
 * (POST /v1/courier/redx/orders/:id/cancel). Used by the Orders list, the
 * RedX Parcels tab and Order Detail. The booking becomes "cancelled", so
 * the order can be booked again (with RedX or another courier); the
 * order's own status isn't touched.
 */
export function RedxCancelDialog({ order, onClose }: RedxCancelDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  useEffect(() => setReason(''), [order]);

  const mutation = useMutation({
    mutationFn: (orderId: string) => courierApi.cancelRedxParcel(orderId, reason.trim() || undefined),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['courier-events', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['redx-parcels'] });
      queryClient.invalidateQueries({ queryKey: ['redx-stats'] });
      toast.success('RedX parcel cancelled. You can book this order again.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not cancel the parcel. Please try again.')),
  });

  return (
    <Dialog open={order != null} onOpenChange={(open) => !open && !mutation.isPending && onClose()} title="Cancel RedX parcel" maxWidth="max-w-md">
      <div className="p-6 pt-4 space-y-4">
        <p className="text-sm text-regantify-text-muted">
          Tells RedX not to pick up ORDER-{order?.invoiceNumber}. This only works before RedX collects the parcel. Your order status stays as
          it is, and you can book the order again afterwards.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Reason (optional), e.g. Customer cancelled"
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-60"
          >
            Keep parcel
          </button>
          <button
            type="button"
            onClick={() => order && mutation.mutate(order.id)}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {mutation.isPending ? 'Cancelling…' : 'Cancel parcel'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
