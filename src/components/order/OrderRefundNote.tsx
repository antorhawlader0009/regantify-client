import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HandCoins, Loader2, Undo2 } from 'lucide-react';
import { orderRefundsApi } from '../../lib/orderRefundsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useCan } from '../../lib/useStaffAccess';
import { useDashboardView } from '../../lib/useDashboardView';

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/**
 * Order detail: a cancelled, returned or payment-failed order that took online money shows how much is still to pay back, with a link to
 * Orders > Refunds to pay (TellMe idea 145). Silent for every other order and once everything is settled. When the order was paid through
 * the store's own bKash, PortWallet or SSLCommerz (the gateways whose documentation has a refund call), "Refund to customer" sends the money back
 * through that gateway and records it; everything else is still paid back by hand and recorded on Refunds to pay.
 */
export function OrderRefundNote({ orderId, status }: { orderId: string; status: string }) {
  const relevant = status === 'CANCELLED' || status === 'RETURN' || status === 'PAYMENT_FAILED';
  const queryClient = useQueryClient();
  const canRefund = useCan('orders.cancel_refund');
  // Refunding through the gateway is Full view (SIMPLE-VIEW-plan.md Step 5); the amount still owed shows in both views.
  const { isSimple } = useDashboardView();
  const { data } = useQuery({ queryKey: ['order-refunds', 'order', orderId, status], queryFn: () => orderRefundsApi.forOrder(orderId), enabled: relevant });
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [sms, setSms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refund = useMutation({
    mutationFn: () => orderRefundsApi.refundThroughGateway(orderId, { amount: Number(amount), reason: reason.trim() || undefined, sms }),
    onSuccess: (res) => {
      const via = data?.gatewayRefund?.label ?? 'the gateway';
      toast.success(res.pending ? `${via} accepted the refund and will pay it out.` : `Refunded through ${via} (ref ${res.reference}).`);
      if (sms && !res.smsSent) toast.error('The refund went through, but the text to the customer was not sent.');
      setOpen(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['order-refunds'] });
      queryClient.invalidateQueries({ queryKey: ['order-history'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'The refund did not go through.')),
  });

  if (!relevant || !data || data.remaining <= 0.004) return null;
  const via = data.gatewayRefund;

  const start = () => {
    setAmount(String(via?.max ?? data.remaining));
    setReason('');
    setError(null);
    setOpen(true);
  };

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <HandCoins size={16} className="shrink-0 text-amber-700" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-amber-900">
          <span className="font-medium">{taka(data.remaining)} to pay back.</span> The customer paid {taka(data.paid)} online for this order.
        </p>
        {via && canRefund && !open && !isSimple && (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
          >
            <Undo2 size={14} aria-hidden />
            Refund through {via.label}
          </button>
        )}
        <Link to="/vendor/orders/refunds" className="text-sm font-medium text-amber-900 underline underline-offset-2">
          Open Refunds to pay
        </Link>
      </div>

      {via && open && (
        <form
          className="mt-3 space-y-3 border-t border-amber-200 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(amount);
            if (!(n > 0) || n > via.max + 0.004) {
              setError(`Enter an amount between ৳1 and ${taka(via.max)}.`);
              return;
            }
            refund.mutate();
          }}
        >
          <p className="text-xs text-amber-900">
            The money goes back to the customer's {via.gateway === 'BKASH_MERCHANT' ? 'bKash account' : 'card or wallet'} through your own {via.label}{' '}
            account. {via.gateway === 'BKASH_MERCHANT' ? 'bKash allows refunds within 60 days of the payment.' : `${via.label} accepts the refund now and pays it out afterwards.`}{' '}
            This cannot be undone.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-amber-900">
              Amount (up to {taka(via.max)})
              <input
                type="number"
                min={1}
                step="0.01"
                max={via.max}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
              />
            </label>
            <label className="block text-xs font-medium text-amber-900">
              Reason (sent to {via.label})
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                placeholder={status === 'RETURN' ? 'Order returned' : 'Order cancelled'}
                className="mt-1 block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-amber-900">
            <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />
            Text the customer that the money was sent back (uses SMS credits)
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={refund.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {refund.isPending && <Loader2 size={14} className="animate-spin" aria-hidden />}
              {refund.isPending ? `Sending through ${via.label}…` : `Refund ${amount ? taka(Number(amount) || 0) : ''}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
