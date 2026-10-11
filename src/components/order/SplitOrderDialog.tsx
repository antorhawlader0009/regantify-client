import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ordersApi, type Order } from '../../lib/ordersApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';

/** Where a "Split order" button can show: the server judges the rest (advance, gift card, courier booking...). */
export function canSplitOrder(order: Order): boolean {
  const pieces = order.items.reduce((sum, i) => sum + i.quantity, 0);
  return pieces >= 2 && order.source !== 'POS' && order.paymentMethod === 'COD' && ['PENDING', 'ON_HOLD', 'PROCESSING', 'STOCK_OUT'].includes(order.status);
}

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/**
 * Order detail > "Split order" (TellMe idea 59): pick the lines, or some pieces of a line, that go out first; they move
 * into a new order for the same customer. The delivery charge stays here, the discount is shared by value, stock does not
 * move (and nothing is given back), and each order says where the other is.
 */
export function SplitOrderDialog({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [moves, setMoves] = useState<Record<string, number>>({});
  const movedPieces = Object.values(moves).reduce((a, b) => a + b, 0);
  const totalPieces = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const movedGoods = order.items.reduce((sum, i) => sum + Number(i.unitPrice) * (moves[i.id] ?? 0), 0);

  const split = useMutation({
    mutationFn: () => ordersApi.split(order.id, Object.entries(moves).filter(([, q]) => q > 0).map(([itemId, quantity]) => ({ itemId, quantity }))),
    onSuccess: (r) => {
      for (const key of ['order', 'orders', 'order-history', 'dashboard']) void queryClient.invalidateQueries({ queryKey: [key] });
      toast.success(`New order ${r.newOrder.ref} made.`);
      onOpenChange(false);
      navigate(`/vendor/orders/${r.newOrder.id}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not split this order.')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Split order" maxWidth="max-w-lg">
      <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
        <p className="text-neutral-600">
          Choose what goes into a new order, like the items that are in stock now. The delivery charge stays on this order, the discount is shared by value, and stock is not
          changed.
        </p>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-regantify-text">{item.productName}</p>
                <p className="text-xs text-neutral-500">
                  {taka(Number(item.unitPrice))} × {item.quantity}
                  {Object.entries(item.selectedOptions).length > 0 && ` · ${Object.values(item.selectedOptions).join('/')}`}
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                Move
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={item.quantity}
                  value={moves[item.id] ?? 0}
                  onChange={(e) => setMoves({ ...moves, [item.id]: Math.min(item.quantity, Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0)) })}
                  className="h-9 w-16 rounded-lg border border-line px-2 text-sm text-regantify-text"
                />
              </label>
            </li>
          ))}
        </ul>
        <p className="text-neutral-600">
          {movedPieces} of {totalPieces} pieces move ({taka(movedGoods)} of goods).
          {movedPieces >= totalPieces && <span className="text-red-600"> Leave at least one piece in this order.</span>}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={() => split.mutate()} disabled={split.isPending || movedPieces === 0 || movedPieces >= totalPieces} className={primaryBtn}>
            {split.isPending ? 'Splitting…' : 'Split into a new order'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
