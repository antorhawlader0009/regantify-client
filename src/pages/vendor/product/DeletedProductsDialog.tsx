import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { productsApi, type DeletedProduct } from '../../../lib/productsApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

/**
 * All Products > Deleted (TellMe idea 151): products deleted in the last 30 days. "Bring back" makes the product again as a Draft with its variants,
 * options, batches, bundle parts and shopper questions; check it, then make it Public. Anyone who may delete products may bring one back.
 */
export function DeletedProductsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['products-trash'], queryFn: productsApi.listTrash, enabled: open });
  const [notes, setNotes] = useState<{ name: string; productId: string; notes: string[] } | null>(null);

  const restore = useMutation({
    mutationFn: (item: DeletedProduct) => productsApi.restoreFromTrash(item.id).then((r) => ({ ...r, name: item.name })),
    onSuccess: (r) => {
      toast.success(`“${r.name}” is back as a Draft.`);
      if (r.notes.length > 0) setNotes({ name: r.name, productId: r.productId, notes: r.notes });
      void queryClient.invalidateQueries({ queryKey: ['products-trash'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t bring this product back.')),
  });
  const forever = useMutation({
    mutationFn: (id: string) => productsApi.deleteFromTrash(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['products-trash'] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t remove it.')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Deleted products" maxWidth="max-w-xl">
      <div className="space-y-3 p-6 pt-3 text-sm">
        <p className="text-neutral-600">A deleted product stays here for 30 days. Bringing it back makes it a Draft, so nothing goes live by mistake.</p>

        {notes && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
            <p className="font-medium">“{notes.name}” was brought back with changes:</p>
            <ul className="mt-1 list-disc pl-5">
              {notes.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <Link to={`/vendor/product/edit/${notes.productId}`} className="mt-1 inline-block font-medium underline underline-offset-2">
              Open the product
            </Link>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-neutral-400" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="rounded-lg bg-neutral-50 px-3 py-6 text-center text-neutral-500">Nothing deleted in the last 30 days.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {data.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                {item.photoUrl ? <img src={item.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" /> : <div className="h-10 w-10 shrink-0 rounded bg-neutral-100" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-regantify-text">{item.name}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {item.sku} · deleted {formatDhakaDateTime(item.deletedAt)}
                    {item.deletedBy ? ` by ${item.deletedBy}` : ''} · {item.daysLeft} {item.daysLeft === 1 ? 'day' : 'days'} left
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => restore.mutate(item)}
                  disabled={restore.isPending}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-sm hover:bg-neutral-50 disabled:opacity-60"
                >
                  <RotateCcw size={14} />
                  Bring back
                </button>
                <button
                  type="button"
                  onClick={() => forever.mutate(item.id)}
                  disabled={forever.isPending}
                  className="text-neutral-400 hover:text-red-600"
                  title="Remove for good"
                  aria-label={`Remove ${item.name} for good`}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
