import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { ordersApi, orderRef, type Order } from '../../lib/ordersApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { formatDhakaDateTime } from '../../lib/dhakaDate';

const money = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** Where a "Merge" button can show: the same checks the server starts with. The server judges the rest (advance, coupon, courier...). */
export function canMergeOrder(order: Order): boolean {
  return order.source !== 'POS' && order.paymentMethod === 'COD' && ['PENDING', 'ON_HOLD', 'PROCESSING', 'STOCK_OUT'].includes(order.status);
}

/**
 * Order detail > "Merge with another order" (TellMe idea 36): the same customer (phone) placed two orders; pick the other
 * one and its lines move onto this order, the delivery charge is charged once (the larger of the two), the total is
 * worked out again and the other order is cancelled as "merged". Stock stays as it is and the customer is not texted.
 * Orders that can't be merged are shown with the reason.
 */
export function MergeOrdersDialog({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [pickedId, setPickedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['merge-candidates', order.id],
    queryFn: () => ordersApi.mergeCandidates(order.id),
    enabled: open,
  });
  const candidates = data?.orders ?? [];
  const picked = candidates.find((c) => c.id === pickedId);

  const merge = useMutation({
    mutationFn: () => ordersApi.mergeOrders(order.id, pickedId!),
    onSuccess: () => {
      toast.success(`${picked?.ref ?? 'The other order'} was merged into ${orderRef(order)}.`);
      for (const key of ['order', 'orders', 'order-history', 'merge-candidates', 'dashboard']) void queryClient.invalidateQueries({ queryKey: [key] });
      setPickedId(null);
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t merge these orders. Nothing was changed.')),
  });

  const newTotal = picked ? Number(order.subtotal) + picked.total - picked.deliveryCharge + Math.max(Number(order.deliveryCharge), picked.deliveryCharge) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Merge into ${orderRef(order)}`} maxWidth="max-w-lg">
      <div className="space-y-3 px-6 pb-6 pt-3 text-sm">
        <p className="text-neutral-600">
          Pick another open order from {order.customerName}. Its products move onto this order and the other order is cancelled as merged. The delivery charge is
          charged once. Stock does not change and the customer gets no cancellation text.
        </p>

        {isLoading ? (
          <p className="py-4 text-center text-neutral-500">Looking for this customer’s other orders…</p>
        ) : candidates.length === 0 ? (
          <p className="rounded-lg bg-neutral-50 px-3 py-4 text-center text-neutral-600">No other open order from this phone number.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {candidates.map((c) => (
              <li key={c.id}>
                <label className={`block rounded-lg border px-3 py-2.5 ${c.blocker ? 'cursor-not-allowed border-line bg-neutral-50 opacity-80' : pickedId === c.id ? 'cursor-pointer border-brand bg-brand/5' : 'cursor-pointer border-line hover:bg-neutral-50'}`}>
                  <div className="flex items-start gap-2">
                    <input type="radio" name="merge-with" disabled={!!c.blocker} checked={pickedId === c.id} onChange={() => setPickedId(c.id)} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center justify-between gap-2 font-medium text-regantify-text">
                        <span>{c.ref}</span>
                        <span className="tabular-nums">{money(c.total)}</span>
                      </p>
                      <p className="text-xs text-neutral-500">
                        {c.status.toLowerCase().replace(/_/g, ' ')} · {formatDhakaDateTime(c.createdAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-700">{c.items.join(', ')}</p>
                      {c.address && c.address !== [order.shippingAddress, order.shippingCity, order.shippingDistrict].filter(Boolean).join(', ') && (
                        <p className="mt-0.5 text-xs text-amber-800">Different address: {c.address}. This order’s address is kept.</p>
                      )}
                      {c.blocker && <p className="mt-1 text-xs text-red-700">{c.blocker}</p>}
                    </div>
                  </div>
                </label>
              </li>
            ))}
          </ul>
        )}

        {picked && newTotal !== null && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-neutral-700">
            After merging, this order is about <b className="tabular-nums">{money(newTotal)}</b> (the exact total is worked out again, with the platform charge, when you confirm).
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={() => merge.mutate()} disabled={!pickedId || merge.isPending} className={primaryBtn}>
            {merge.isPending ? 'Merging…' : 'Merge orders'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
