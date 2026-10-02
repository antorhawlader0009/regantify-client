import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { courierApi, type BulkCourierProvider, type PathaoBulkResult } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';

function formatTaka(value: number) {
  return `৳${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const NAMES: Record<BulkCourierProvider, string> = { PATHAO: 'Pathao', STEADFAST: 'SteadFast', REDX: 'RedX' };

const BOOK: Record<BulkCourierProvider, typeof courierApi.bookPathaoBulk> = {
  PATHAO: courierApi.bookPathaoBulk,
  STEADFAST: courierApi.bookSteadfastBulk,
  REDX: courierApi.bookRedxBulk,
};

interface PathaoBulkBookDialogProps {
  /** Which courier to book with. Defaults to Pathao. */
  provider?: BulkCourierProvider;
  /** The selected orders; null closes the dialog. */
  orderIds: string[] | null;
  onClose: () => void;
  /** After a real run — the parent clears its selection. */
  onDone: () => void;
}

/**
 * The Orders list's bulk "Send to Pathao" / "Send to SteadFast" / "Send to RedX" (pathao-plan.md Step 11).
 * Opens with the server's dry run (which orders will go, which are
 * skipped and why, total COD, pickup store), books on confirm, then shows
 * the outcome with each failure linking to its order.
 */
export function PathaoBulkBookDialog({ provider = 'PATHAO', orderIds, onClose, onDone }: PathaoBulkBookDialogProps) {
  const queryClient = useQueryClient();
  const name = NAMES[provider];
  const book = BOOK[provider];
  const keyPrefix = provider.toLowerCase();

  const planMutation = useMutation({ mutationFn: (ids: string[]) => book(ids, true) });
  const bookMutation = useMutation({
    mutationFn: (ids: string[]) => book(ids, false),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: [`${keyPrefix}-parcels`] });
      queryClient.invalidateQueries({ queryKey: [`${keyPrefix}-stats`] });
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
    <Dialog open={orderIds != null} onOpenChange={(open) => !open && close()} title={`Send to ${name}`} maxWidth="max-w-lg">
      <div className="p-6 pt-4 space-y-4">
        {outcome ? (
          <>
            <p className="flex items-center gap-2 text-sm font-medium text-regantify-text">
              <CheckCircle2 size={16} className="text-emerald-600" />
              {outcome.summary.booked} booked
              {outcome.summary.failed > 0 && <span className="text-red-600">, {outcome.summary.failed} failed</span>}
              {outcome.summary.skipped > 0 && <span className="text-neutral-500">, {outcome.summary.skipped} skipped</span>}
            </p>
            {outcome.results.some((r) => !r.ok) && (
              <ul className="max-h-60 overflow-y-auto divide-y divide-line rounded-lg border border-line">
                {outcome.results
                  .filter((r) => !r.ok)
                  .map((r) => (
                    <li key={r.orderId} className="px-3 py-2 text-xs">
                      <Link to={`/vendor/orders/${r.orderId}`} className="font-medium text-brand hover:underline">
                        ORDER-{r.invoiceNumber}
                      </Link>
                      <p className="text-red-600 mt-0.5">{r.ok ? '' : r.error}</p>
                    </li>
                  ))}
              </ul>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={close} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">
                Done
              </button>
            </div>
          </>
        ) : planMutation.isPending || (!draft && !planMutation.isError) ? (
          <p className="text-sm text-neutral-500">Checking the selected orders…</p>
        ) : planMutation.isError ? (
          <p className="text-sm text-red-600">{apiErrorMessage(planMutation.error, 'Couldn’t check these orders. Try again in a minute.')}</p>
        ) : draft ? (
          <>
            <div className={`grid ${draft.pickupStore ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-center`}>
              <div className="rounded-lg border border-line bg-neutral-50 p-3">
                <p className="text-xl font-semibold text-regantify-text tabular-nums">{draft.eligible.length}</p>
                <p className="text-xs text-neutral-500">to book</p>
              </div>
              <div className="rounded-lg border border-line bg-neutral-50 p-3">
                <p className="text-xl font-semibold text-regantify-text tabular-nums">{formatTaka(draft.totalCod)}</p>
                <p className="text-xs text-neutral-500">COD to collect</p>
              </div>
              {draft.pickupStore && (
                <div className="rounded-lg border border-line bg-neutral-50 p-3">
                  <p className="text-sm font-semibold text-regantify-text truncate" title={draft.pickupStore.name ?? undefined}>
                    {draft.pickupStore.name ?? `Store #${draft.pickupStore.id}`}
                  </p>
                  <p className="text-xs text-neutral-500">pickup store</p>
                </div>
              )}
            </div>

            <p className="text-xs text-neutral-500">
              Each order uses your booking defaults (Courier integration › {name} › Settings). Orders with no courier yet are set to {name}.
            </p>

            {draft.skipped.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-1.5">
                  <AlertTriangle size={13} /> {draft.skipped.length} will be skipped
                </p>
                <ul className="max-h-40 overflow-y-auto divide-y divide-line rounded-lg border border-line">
                  {draft.skipped.map((s) => (
                    <li key={s.orderId} className="px-3 py-1.5 text-xs">
                      <span className="font-medium text-regantify-text">{s.invoiceNumber ? `ORDER-${s.invoiceNumber}` : 'Unknown order'}</span>
                      <span className="text-neutral-500"> — {s.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bookMutation.isError && (
              <p className="text-sm text-red-600">{apiErrorMessage(bookMutation.error, 'Couldn’t send these orders. Try again in a minute.')}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={bookMutation.isPending}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-4 text-sm text-regantify-text transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => orderIds && bookMutation.mutate(orderIds)}
                disabled={draft.eligible.length === 0 || bookMutation.isPending}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bookMutation.isPending ? `Sending ${draft.eligible.length}…` : `Send ${draft.eligible.length} to ${name}`}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
