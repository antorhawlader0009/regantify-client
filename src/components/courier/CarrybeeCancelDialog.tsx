import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { carrybeeApi } from '../../lib/carrybeeApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface CarrybeeCancelDialogProps {
  /** The order whose CarryBee parcel to cancel; null closes the dialog. */
  order: { id: string; invoiceNumber: number } | null;
  onClose: () => void;
}

/** CarryBee needs a cancellation reason (the plugin always sends one), so the box is required here, unlike RedX's. */
const MIN_REASON = 3;

/**
 * "Cancel parcel" for CarryBee (POST /v1/courier/carrybee/orders/:id/cancel), used by the Orders list, the CarryBee
 * Parcels tab and Order detail. CarryBee decides whether it can still be cancelled (its own reply is shown when not).
 * The booking becomes "cancelled", so the order can be booked again; the order's own status isn't touched.
 */
export function CarrybeeCancelDialog({ order, onClose }: CarrybeeCancelDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  useEffect(() => setReason(''), [order]);
  const ready = reason.trim().length >= MIN_REASON;

  const mutation = useMutation({
    mutationFn: (orderId: string) => carrybeeApi.cancel(orderId, reason.trim()),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['courier-events', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['carrybee-parcels'] });
      queryClient.invalidateQueries({ queryKey: ['carrybee-stats'] });
      toast.success('CarryBee parcel cancelled. You can book this order again.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t cancel the parcel. Try again in a minute.')),
  });

  return (
    <Dialog open={order != null} onOpenChange={(open) => !open && !mutation.isPending && onClose()} title="Cancel CarryBee parcel" maxWidth="max-w-md">
      <div className="p-6 pt-4 space-y-4">
        <p className="text-sm text-neutral-500">
          Asks CarryBee not to deliver ORDER-{order?.invoiceNumber}. CarryBee may refuse once the parcel is on its way. Your order status stays as it
          is, and you can book the order again afterwards.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Reason, e.g. Customer cancelled"
          aria-label="Reason for cancelling"
          className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-regantify-text outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        {!ready && <p className="-mt-2 text-xs text-neutral-500">CarryBee needs a short reason.</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-line text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
          >
            Keep parcel
          </button>
          <button
            type="button"
            onClick={() => order && mutation.mutate(order.id)}
            disabled={mutation.isPending || !ready}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
          >
            {mutation.isPending ? 'Cancelling…' : 'Cancel parcel'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
