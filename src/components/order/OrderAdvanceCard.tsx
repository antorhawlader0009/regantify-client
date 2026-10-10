import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { codDue, ordersApi, type Order } from '../../lib/ordersApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { productInputClass } from '../product/ProductFormPieces';
import { PaymentLinkPanel } from './PaymentLinkPanel';

const money = (value: number) => `৳${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

// An order that is already closed has no cash left to adjust (mirrors OrdersService.setManualAdvance).
const LOCKED = new Set(['PAYMENT_INITIATED', 'PAYMENT_FAILED', 'CANCELLED', 'REFUNDED', 'COMPLETED']);

/**
 * Order Detail > "Advance". On a Cash on Delivery order, the part of the total paid before delivery (the
 * delivery charge, usually): the shopper pays it online at checkout when Store > COD Guard asks for it
 * (shown here, read-only), or the vendor records what they took themselves, e.g. on their own bKash, so the
 * courier is told to collect only the rest. Nothing is posted to the wallet for a manual advance.
 */
export function OrderAdvanceCard({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const advance = Number(order.advanceAmount ?? 0);
  const paid = Boolean(order.advancePaidAt) && advance > 0;
  const online = order.advanceMethod === 'ONLINE';
  // Still awaiting the shopper's PayStation payment (the order sits as "Incomplete Payment").
  const waitingOnline = online && !paid && advance > 0 && order.status === 'PAYMENT_INITIATED';
  const manual = order.advanceMethod === 'MANUAL';
  const locked = LOCKED.has(order.status);
  const booked = order.courierBookingStatus === 'BOOKED' || order.courierBookingStatus === 'BOOKING';

  const [amount, setAmount] = useState(manual && advance > 0 ? String(advance) : '');
  const [note, setNote] = useState(order.advanceNote ?? '');
  useEffect(() => {
    setAmount(manual && advance > 0 ? String(advance) : '');
    setNote(order.advanceNote ?? '');
  }, [manual, advance, order.advanceNote]);

  const save = useMutation({
    mutationFn: ({ value, text }: { value: number; text?: string }) => ordersApi.updateAdvance(order.id, value, text),
    onSuccess: (_updated, vars) => {
      toast.success(vars.value > 0 ? 'Advance saved.' : 'Advance removed.');
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the advance. Please try again.')),
  });

  const submit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter the amount you received.');
      return;
    }
    if (value > Number(order.total)) {
      toast.error('The advance can’t be more than the order total.');
      return;
    }
    save.mutate({ value, text: note.trim() || undefined });
  };

  // Paid online through the store (or through the payment link you sent): final, nothing to edit.
  if (online && paid) {
    return (
      <div className="space-y-1.5 text-sm">
        <p className="text-regantify-text">
          The customer paid <b>{money(advance)}</b> {order.advanceFor === 'LINK' ? 'online through your payment link' : 'online at checkout'}
          {order.advancePaidAt ? ` on ${new Date(order.advancePaidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}. It
          is in your wallet in full.
        </p>
        <p className="font-medium text-regantify-text">Courier collects {money(codDue(order))} on delivery.</p>
      </div>
    );
  }

  // A payment link is out (or ran out) on an order you entered: its own panel.
  if (order.paymentLink && (order.paymentLink.state === 'READY' || order.paymentLink.state === 'EXPIRED')) {
    return <PaymentLinkPanel order={order} onChanged={onChanged} />;
  }

  if (waitingOnline) {
    return (
      <p className="text-sm text-neutral-600">
        Waiting for the customer to pay the <b>{money(advance)}</b> {order.advanceFor === 'PREORDER' ? 'pre-order advance' : 'delivery charge'} online. The order moves to Pending as soon as it is paid.
      </p>
    );
  }

  if (locked) {
    return (
      <p className="text-sm text-neutral-600">
        {paid ? (
          <>
            <b>{money(advance)}</b> was received in advance. The courier collected {money(codDue(order))}.
          </>
        ) : (
          'No advance was taken on this order.'
        )}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {order.source === 'MANUAL' && (
        <>
          <PaymentLinkPanel order={order} onChanged={onChanged} />
          <hr className="border-line" />
        </>
      )}
      <p className="text-xs text-neutral-500">
        Took part of the payment yourself, like the delivery charge on your own bKash? Record it here and the courier is asked to collect only
        the rest. Nothing is added to your wallet.
      </p>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Amount received (৳)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={productInputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Note (optional)</label>
          <input
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. bKash 01712… TrxID 9AB3"
            className={productInputClass}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setAmount(String(Number(order.deliveryCharge)))} className={outlineBtn}>
          Use delivery charge ({money(Number(order.deliveryCharge))})
        </button>
        <button type="button" onClick={submit} disabled={save.isPending} className={primaryBtn}>
          {save.isPending && <Loader2 size={14} className="animate-spin" />}
          Save advance
        </button>
        {manual && advance > 0 && (
          <button type="button" onClick={() => save.mutate({ value: 0 })} disabled={save.isPending} className={outlineBtn}>
            Remove
          </button>
        )}
      </div>
      {paid && (
        <p className="text-sm font-medium text-regantify-text">
          Courier collects {money(codDue(order))} on delivery ({money(advance)} already received).
        </p>
      )}
      {booked && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          This parcel is already booked with the courier for the old amount. Cancel and book it again so the courier collects the new one.
        </p>
      )}
    </div>
  );
}
