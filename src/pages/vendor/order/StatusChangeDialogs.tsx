import { useState, type ReactNode } from 'react';
import type { Order, OrderStatus } from '../../../lib/ordersApi';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Dialog } from '../../../components/ui/Dialog';
import { ALL_ORDER_STATUSES, orderStatusLabel } from './orderStatus';

export interface StatusChangeRequest {
  status: OrderStatus;
  note?: string;
  /** The owner's "Correct a mistake": outside the forward-only flow, with a reason (server checks both). */
  correction?: boolean;
}

// Steps that close the order (server/src/orders/order-status-flow.ts), so they're asked about first.
const CONFIRM_TEXT: Partial<Record<OrderStatus, string>> = {
  COMPLETED: 'The order is closed after this: later it can only be marked Return or Refunded. Any Platform Charge on it is taken from your balance now (once).',
  CANCELLED: 'A cancelled order can’t be opened again; later it can only be marked Refunded.',
  RETURN: 'After this the order can only be marked Refunded.',
  REFUNDED: 'Refunded is final: the status can’t change after this.',
  PAYMENT_FAILED: 'After this the order can only be cancelled.',
};

// Only the payment itself puts an order in these, so a correction can't pick them (the server refuses too).
const NOT_CORRECTABLE: OrderStatus[] = ['PAYMENT_INITIATED', 'PARTIAL_PAYMENT_PENDING', 'PAYMENT_FAILED'];

/**
 * Asks before a status move that closes the order, and holds the owner's
 * "Correct a mistake" form. `request(status)` goes straight through for an
 * ordinary step; `openCorrection()` opens the form.
 */
export function useStatusChangeDialogs({
  order,
  onChange,
  busy,
}: {
  order: Pick<Order, 'status' | 'invoiceNumber'>;
  onChange: (req: StatusChangeRequest) => void;
  busy: boolean;
}): { request: (status: OrderStatus) => void; openCorrection: () => void; dialogs: ReactNode } {
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [target, setTarget] = useState<OrderStatus | ''>('');
  const [reason, setReason] = useState('');

  const request = (status: OrderStatus) => {
    if (CONFIRM_TEXT[status]) setConfirming(status);
    else onChange({ status });
  };

  const openCorrection = () => {
    setTarget('');
    setReason('');
    setCorrecting(true);
  };

  const correctionTargets = ALL_ORDER_STATUSES.filter((s) => s !== order.status && !NOT_CORRECTABLE.includes(s));
  const canSubmit = target !== '' && reason.trim().length >= 3 && !busy;

  const dialogs = (
    <>
      <ConfirmDialog
        open={confirming != null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirming ? `Mark order #${order.invoiceNumber} ${orderStatusLabel(confirming)}?` : ''}
        message={
          <>
            {confirming && CONFIRM_TEXT[confirming]}
            <span className="mt-2 block text-xs text-neutral-500">
              Clicked by mistake later? The store owner can fix it with Change status → Correct a mistake.
            </span>
          </>
        }
        confirmLabel={confirming ? `Mark ${orderStatusLabel(confirming)}` : 'Confirm'}
        onConfirm={() => {
          if (confirming) onChange({ status: confirming });
          setConfirming(null);
        }}
        danger={confirming === 'CANCELLED' || confirming === 'REFUNDED'}
        busy={busy}
      />

      <Dialog open={correcting} onOpenChange={setCorrecting} title={`Correct order #${order.invoiceNumber}’s status`} maxWidth="max-w-md">
        <form
          className="px-6 pb-6 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            onChange({ status: target, note: reason.trim(), correction: true });
            setCorrecting(false);
          }}
        >
          <p className="text-sm leading-relaxed text-neutral-600">
            For a status set by mistake. It skips the normal order steps, so only the store owner can do it, and the reason is saved in
            the order’s history.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-neutral-500">
            <li>Money already posted stays as it is, and completing the order again never charges twice.</li>
            <li>Stock already taken out isn’t put back.</li>
            <li>The customer may already have had a message about the old status.</li>
            <li>If a courier has the parcel, change it with the courier too.</li>
          </ul>

          <label className="mt-4 block text-sm font-medium text-regantify-text">
            Now: {orderStatusLabel(order.status)}. Change to
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as OrderStatus)}
              className="mt-1.5 block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal"
            >
              <option value="" disabled>
                Pick the right status…
              </option>
              {correctionTargets.map((s) => (
                <option key={s} value={s}>
                  {orderStatusLabel(s)}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block text-sm font-medium text-regantify-text">
            Why
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              placeholder="e.g. Marked Completed on the wrong order"
              className="mt-1.5 block w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal"
            />
          </label>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setCorrecting(false)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm text-regantify-text hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? 'Working…' : 'Correct status'}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );

  return { request, openCorrection, dialogs };
}
