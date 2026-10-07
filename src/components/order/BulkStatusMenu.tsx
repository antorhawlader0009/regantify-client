import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dialog } from '../ui/Dialog';
import { primaryBtn } from '../ui/PageKit';
import { ordersApi, type BulkOrderStatus, type BulkStatusResult } from '../../lib/ordersApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { orderStatusLabel } from '../../pages/vendor/order/orderStatus';

const STATUSES: BulkOrderStatus[] = ['PROCESSING', 'ON_HOLD', 'SHIPPING', 'COMPLETED', 'STOCK_OUT', 'CANCELLED'];
/** Closing steps, asked about first (same as the single-order menu). */
const ASK_FIRST = new Set<BulkOrderStatus>(['COMPLETED', 'CANCELLED']);

/**
 * Orders list bulk bar: "Change status" for every selected order. The server moves each one by
 * the single-order rules and skips the ones that can't move, which are listed afterwards.
 */
export function BulkStatusMenu({ ids, canCancel, className, onDone }: { ids: string[]; canCancel: boolean; className: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<BulkOrderStatus | null>(null);
  const [result, setResult] = useState<BulkStatusResult | null>(null);

  const run = useMutation({
    mutationFn: (status: BulkOrderStatus) => ordersApi.bulkUpdateStatus(ids, status),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setConfirming(null);
      onDone();
      if (res.skipped.length === 0) {
        toast.success(`${res.updated} ${res.updated === 1 ? 'order' : 'orders'} updated.`);
      } else {
        setResult(res);
      }
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change the status. Please try again.')),
  });

  const choose = (status: BulkOrderStatus) => (ASK_FIRST.has(status) ? setConfirming(status) : run.mutate(status));

  return (
    <>
      <DropdownMenu
        align="start"
        trigger={
          <button type="button" className={className} disabled={run.isPending}>
            <RefreshCw size={13} className={run.isPending ? 'animate-spin' : undefined} />
            Change status
            <ChevronDown size={13} />
          </button>
        }
      >
        {STATUSES.filter((s) => s !== 'CANCELLED' || canCancel).map((status) => (
          <DropdownMenuItem key={status} onSelect={() => choose(status)} danger={status === 'CANCELLED'}>
            {orderStatusLabel(status)}
          </DropdownMenuItem>
        ))}
      </DropdownMenu>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Mark ${ids.length} ${ids.length === 1 ? 'order' : 'orders'} as ${confirming ? orderStatusLabel(confirming) : ''}?`}
        message={
          confirming === 'CANCELLED'
            ? 'These orders will be cancelled. This can’t be undone from the list.'
            : 'These orders will be closed as completed, and the platform fee is taken for each one.'
        }
        confirmLabel={confirming === 'CANCELLED' ? 'Cancel orders' : 'Mark completed'}
        danger={confirming === 'CANCELLED'}
        busy={run.isPending}
        onConfirm={() => confirming && run.mutate(confirming)}
      />

      <Dialog open={result !== null} onOpenChange={(open) => !open && setResult(null)} title="Status changed" maxWidth="max-w-md">
        {result && (
          <div className="space-y-3 px-6 pb-6 pt-3 text-sm">
            <p>
              {result.updated} {result.updated === 1 ? 'order' : 'orders'} updated. {result.skipped.length} couldn’t change:
            </p>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-line p-3">
              {result.skipped.map((s) => (
                <li key={s.id}>
                  <span className="font-medium">{s.ref}</span> <span className="text-neutral-600">— {s.reason}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button type="button" onClick={() => setResult(null)} className={primaryBtn}>
                OK
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
