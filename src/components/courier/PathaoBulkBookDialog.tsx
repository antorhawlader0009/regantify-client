import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { courierApi, type PathaoBulkResult } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';

function formatTaka(value: number) {
  return `৳${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

interface PathaoBulkBookDialogProps {
  /** The selected orders; null closes the dialog. */
  orderIds: string[] | null;
  onClose: () => void;
  /** After a real run — the parent clears its selection. */
  onDone: () => void;
}

/**
 * The Orders list's bulk "Send to Pathao" (pathao-plan.md Step 11).
 * Opens with the server's dry run (which orders will go, which are
 * skipped and why, total COD, pickup store), books on confirm, then shows
 * the outcome with each failure linking to its order.
 */
export function PathaoBulkBookDialog({ orderIds, onClose, onDone }: PathaoBulkBookDialogProps) {
  const queryClient = useQueryClient();

  const planMutation = useMutation({ mutationFn: (ids: string[]) => courierApi.bookPathaoBulk(ids, true) });
  const bookMutation = useMutation({
    mutationFn: (ids: string[]) => courierApi.bookPathaoBulk(ids, false),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['pathao-parcels'] });
      queryClient.invalidateQueries({ queryKey: ['pathao-stats'] });
    },
  });

  const { mutate: plan, reset: resetPlan } = planMutation;
  const { reset: resetBook } = bookMutation;
  useEffect(() => {
    if (orderIds) {
      resetBook();
      plan(orderIds);
    } else {
      resetPlan();
    }
  }, [orderIds, plan, resetPlan, resetBook]);

  const draft = planMutation.data?.dryRun ? planMutation.data : null;
  const outcome: Extract<PathaoBulkResult, { dryRun: false }> | null = bookMutation.data && !bookMutation.data.dryRun ? bookMutation.data : null;

  function close() {
    if (bookMutation.isPending) return;
    if (outcome) onDone();
    onClose();
  }

  return (
    <Dialog open={orderIds != null} onOpenChange={(open) => !open && close()} title="Send to Pathao" maxWidth="max-w-lg">
      <div className="p-6 pt-4 space-y-4">
        {outcome ? (
          <>
            <p className="flex items-center gap-2 text-sm font-medium text-regantify-text">
              <CheckCircle2 size={16} className="text-green-600" />
              {outcome.summary.booked} booked
              {outcome.summary.failed > 0 && <span className="text-red-600">, {outcome.summary.failed} failed</span>}
              {outcome.summary.skipped > 0 && <span className="text-regantify-text-muted">, {outcome.summary.skipped} skipped</span>}
            </p>
            {outcome.results.some((r) => !r.ok) && (
              <ul className="max-h-60 overflow-y-auto divide-y divide-black/5 rounded-xl border border-black/5">
                {outcome.results
                  .filter((r) => !r.ok)
                  .map((r) => (
                    <li key={r.orderId} className="px-3 py-2 text-xs">
                      <Link to={`/vendor/orders/${r.orderId}`} className="font-medium text-regantify-cta hover:underline">
                        ORDER-{r.invoiceNumber}
                      </Link>
                      <p className="text-red-600 mt-0.5">{r.ok ? '' : r.error}</p>
                    </li>
                  ))}
              </ul>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={close} className="px-4 py-2 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium">
                Done
              </button>
            </div>
          </>
        ) : planMutation.isPending || (!draft && !planMutation.isError) ? (
          <p className="text-sm text-regantify-text-muted">Checking the selected orders…</p>
        ) : planMutation.isError ? (
          <p className="text-sm text-red-600">{apiErrorMessage(planMutation.error, 'Could not check these orders. Please try again.')}</p>
        ) : draft ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-regantify-content p-3">
                <p className="text-xl font-semibold text-regantify-text tabular-nums">{draft.eligible.length}</p>
                <p className="text-xs text-regantify-text-muted">to book</p>
              </div>
              <div className="rounded-xl bg-regantify-content p-3">
                <p className="text-xl font-semibold text-regantify-text tabular-nums">{formatTaka(draft.totalCod)}</p>
                <p className="text-xs text-regantify-text-muted">COD to collect</p>
              </div>
              <div className="rounded-xl bg-regantify-content p-3">
                <p className="text-sm font-semibold text-regantify-text truncate" title={draft.pickupStore.name ?? undefined}>
                  {draft.pickupStore.name ?? `Store #${draft.pickupStore.id}`}
                </p>
                <p className="text-xs text-regantify-text-muted">pickup store</p>
              </div>
            </div>

            <p className="text-xs text-regantify-text-muted">
              Each order is booked with your Default Values (Courier Integration › Pathao). Orders without a courier are assigned to Pathao.
            </p>

            {draft.skipped.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-1.5">
                  <AlertTriangle size={13} /> {draft.skipped.length} will be skipped
                </p>
                <ul className="max-h-40 overflow-y-auto divide-y divide-black/5 rounded-xl border border-black/5">
                  {draft.skipped.map((s) => (
                    <li key={s.orderId} className="px-3 py-1.5 text-xs">
                      <span className="font-medium text-regantify-text">{s.invoiceNumber ? `ORDER-${s.invoiceNumber}` : 'Unknown order'}</span>
                      <span className="text-regantify-text-muted"> — {s.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bookMutation.isError && (
              <p className="text-sm text-red-600">{apiErrorMessage(bookMutation.error, 'Could not send these orders. Please try again.')}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={bookMutation.isPending}
                className="px-4 py-2 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => orderIds && bookMutation.mutate(orderIds)}
                disabled={draft.eligible.length === 0 || bookMutation.isPending}
                className="px-4 py-2 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
              >
                {bookMutation.isPending ? `Booking ${draft.eligible.length}…` : `Book ${draft.eligible.length} with Pathao`}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
