import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { productsApi } from '../../../lib/productsApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { describePriceChange } from './ChangePricesDialog';

/** All Products > Change prices > "Recent price changes": the store's latest runs, each with Undo while it hasn't been undone. */
export function PriceChangeHistoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['price-changes'], queryFn: productsApi.listPriceChanges, enabled: open });
  const [undoingId, setUndoingId] = useState<string | null>(null);

  async function undo(id: string) {
    setUndoingId(id);
    try {
      const r = await productsApi.undoPriceChange(id);
      toast.success(
        `${r.restored} ${r.restored === 1 ? 'product' : 'products'} back to the old price${r.skipped ? `, ${r.skipped} left alone because their price was changed since` : ''}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['price-changes'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not undo the change.'));
    } finally {
      setUndoingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Recent price changes" maxWidth="max-w-xl">
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-neutral-400" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-neutral-600">No price changes yet. They are kept for 90 days.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-regantify-text">{describePriceChange(b.params)}</p>
                  <p className="text-xs text-neutral-500">
                    {b.productCount} {b.productCount === 1 ? 'product' : 'products'} · {b.actor} · {formatDhakaDateTime(b.createdAt)}
                  </p>
                  {b.undoneAt && <p className="text-xs text-neutral-500">Undone {formatDhakaDateTime(b.undoneAt)}{b.undoneBy ? ` by ${b.undoneBy}` : ''}</p>}
                </div>
                {!b.undoneAt && (
                  <button
                    type="button"
                    onClick={() => undo(b.id)}
                    disabled={undoingId !== null}
                    className="shrink-0 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
                  >
                    {undoingId === b.id ? 'Undoing…' : 'Undo'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-neutral-500">
          Undo puts back only the prices this change set. A product whose price you edited since is left as it is.
        </p>
      </div>
    </Dialog>
  );
}
