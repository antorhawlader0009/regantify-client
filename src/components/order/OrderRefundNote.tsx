import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HandCoins } from 'lucide-react';
import { orderRefundsApi } from '../../lib/orderRefundsApi';

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/**
 * Order detail: a cancelled, returned or payment-failed order that took online money shows how much is still to pay back, with a link to
 * Orders > Refunds to pay (TellMe idea 145). Silent for every other order and once everything is settled.
 */
export function OrderRefundNote({ orderId, status }: { orderId: string; status: string }) {
  const relevant = status === 'CANCELLED' || status === 'RETURN' || status === 'PAYMENT_FAILED';
  const { data } = useQuery({ queryKey: ['order-refunds', 'order', orderId, status], queryFn: () => orderRefundsApi.forOrder(orderId), enabled: relevant });
  if (!relevant || !data || data.remaining <= 0.004) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <HandCoins size={16} className="shrink-0 text-amber-700" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-amber-900">
        <span className="font-medium">{taka(data.remaining)} to pay back.</span> The customer paid {taka(data.paid)} online for this order.
      </p>
      <Link to="/vendor/orders/refunds" className="text-sm font-medium text-amber-900 underline underline-offset-2">
        Open Refunds to pay
      </Link>
    </div>
  );
}
