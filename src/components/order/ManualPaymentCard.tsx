import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Wallet } from 'lucide-react';
import { ordersApi, type Order } from '../../lib/ordersApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';

const taka = (n: number | string) => `৳${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const OPEN_FOR_COD = new Set(['PENDING', 'ON_HOLD', 'PROCESSING', 'STOCK_OUT']);

/**
 * Order detail: an order paid by Manual Mobile Payment (Add-ons). The shopper sent the total to the store's own wallet
 * and typed the sender number and TrxID; the store compares them with its wallet and marks the payment received or
 * not received. "Not received" can also turn the order into cash on delivery so the courier collects the money.
 * Nothing here changes the order's status: cancelling stays the store's call.
 */
export function ManualPaymentCard({ order, canEdit }: { order: Order; canEdit: boolean }) {
  const qc = useQueryClient();
  const [confirmNo, setConfirmNo] = useState(false);
  const [toCod, setToCod] = useState(true);

  const m = useMutation({
    mutationFn: (v: { result: 'RECEIVED' | 'NOT_RECEIVED'; switchToCod: boolean }) => ordersApi.checkManualPayment(order.id, v.result, v.switchToCod),
    onSuccess: (_d, v) => {
      toast.success(v.result === 'RECEIVED' ? 'Marked as received.' : v.switchToCod ? 'Marked as not received. The courier will collect the total.' : 'Marked as not received.');
      setConfirmNo(false);
      qc.invalidateQueries({ queryKey: ['order', order.id] });
      qc.invalidateQueries({ queryKey: ['order-history', order.id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });

  if (!order.manualPaymentStatus) return null;
  const status = order.manualPaymentStatus;
  const canSwitch = OPEN_FOR_COD.has(order.status) && order.courierBookingStatus !== 'BOOKED' && order.paymentMethod !== 'COD';
  const tone =
    status === 'RECEIVED' ? 'border-emerald-200 bg-emerald-50' : status === 'NOT_RECEIVED' ? 'border-red-200 bg-red-50' : 'border-sky-200 bg-sky-50';

  return (
    <div className={`rounded-xl border px-4 py-3 ${tone}`}>
      <div className="flex flex-wrap items-start gap-3">
        <Wallet size={16} className="mt-0.5 shrink-0 text-regantify-text" aria-hidden />
        <div className="min-w-0 flex-1 text-sm text-regantify-text">
          <p className="font-medium">
            {status === 'PENDING_CHECK'
              ? `Check this ${order.manualPaymentWallet ?? 'mobile'} payment`
              : status === 'RECEIVED'
                ? `${order.manualPaymentWallet ?? 'Mobile'} payment received`
                : `${order.manualPaymentWallet ?? 'Mobile'} payment not received`}
          </p>
          <p className="mt-1">
            {taka(order.total)} from <span className="tabular-nums font-medium">{order.manualPaymentSender ?? '-'}</span> · TrxID{' '}
            <span className="font-mono font-medium">{order.manualPaymentTrxId ?? '-'}</span>
            {order.manualPaymentTrxId && (
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(order.manualPaymentTrxId ?? '').then(() => toast.success('TrxID copied.'))}
                className="ml-1.5 inline-flex align-middle text-regantify-text-muted hover:text-regantify-text"
                aria-label="Copy TrxID"
              >
                <Copy size={13} />
              </button>
            )}
          </p>
          {status === 'PENDING_CHECK' && <p className="mt-1 text-xs text-regantify-text-muted">Find this TrxID in your {order.manualPaymentWallet ?? 'wallet'} app or statement before you send the order.</p>}
          {order.manualPaymentCheckedAt && (
            <p className="mt-1 text-xs text-regantify-text-muted">
              Checked by {order.manualPaymentCheckedBy ?? 'the store'}, {formatDhakaDateTime(order.manualPaymentCheckedAt)}
              {status === 'NOT_RECEIVED' && order.paymentMethod === 'COD' ? ' · now cash on delivery' : ''}
            </p>
          )}
        </div>
        {canEdit && !confirmNo && (
          <div className="flex shrink-0 gap-2">
            {status !== 'RECEIVED' && (
              <button
                type="button"
                disabled={m.isPending}
                onClick={() => m.mutate({ result: 'RECEIVED', switchToCod: false })}
                className="rounded-lg bg-regantify-cta px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              >
                Received
              </button>
            )}
            {status !== 'NOT_RECEIVED' && (
              <button
                type="button"
                disabled={m.isPending}
                onClick={() => {
                  setToCod(canSwitch);
                  setConfirmNo(true);
                }}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-60"
              >
                Not received
              </button>
            )}
          </div>
        )}
      </div>

      {confirmNo && (
        <div className="mt-3 rounded-lg border border-red-200 bg-white p-3">
          <p className="text-sm text-regantify-text">The money is not in your wallet. What should happen to the order?</p>
          {canSwitch ? (
            <label className="mt-2 flex items-start gap-2 text-sm text-regantify-text">
              <input type="checkbox" checked={toCod} onChange={(e) => setToCod(e.target.checked)} className="mt-0.5" />
              <span>
                Make it cash on delivery: the courier collects {taka(order.total)}.
                <span className="block text-xs text-regantify-text-muted">Leave it off to call the customer first, or cancel the order yourself.</span>
              </span>
            </label>
          ) : (
            <p className="mt-1 text-xs text-regantify-text-muted">This order is already booked or has moved on, so it can only be marked. Call the customer or cancel it.</p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmNo(false)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-regantify-text">
              Back
            </button>
            <button
              type="button"
              disabled={m.isPending}
              onClick={() => m.mutate({ result: 'NOT_RECEIVED', switchToCod: canSwitch && toCod })}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Mark not received
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
