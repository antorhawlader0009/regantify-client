import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { outlineBtn, primaryBtn } from '../ui/PageKit';

interface Batch {
  expiresOn: string;
  quantity: string;
}
interface BatchesResponse {
  batches: Array<{ id: string; expiresOn: string; quantity: number }>;
  total: number;
  stock: number | null;
}

const inputClass = 'h-10 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

/**
 * Edit product > "Expiry and batches" (TellMe idea 101). Optional: pieces with a best-before date. A sale takes from the batch that expires first; the
 * stock number above stays what decides if something can be sold. A bell alert lists products with a batch expiring within 30 days, once a day.
 * Saved on its own button (not with the product form). Returned goods are never added back to a batch.
 */
export function BatchesField({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['product-batches', productId], queryFn: () => api.get<BatchesResponse>(`/v1/products/${productId}/batches`).then((r) => r.data) });
  const [rows, setRows] = useState<Batch[]>([]);
  useEffect(() => {
    if (query.data) setRows(query.data.batches.map((b) => ({ expiresOn: b.expiresOn, quantity: String(b.quantity) })));
  }, [query.data]);

  const save = useMutation({
    mutationFn: () =>
      api
        .put<BatchesResponse>(`/v1/products/${productId}/batches`, { batches: rows.filter((r) => r.expiresOn).map((r) => ({ expiresOn: r.expiresOn, quantity: Number(r.quantity) || 0 })) })
        .then((r) => r.data),
    onSuccess: (data) => {
      queryClient.setQueryData(['product-batches', productId], data);
      toast.success('Batches saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the batches. Please try again.')),
  });

  const total = rows.reduce((n, r) => n + (Number(r.quantity) || 0), 0);
  const stock = query.data?.stock ?? null;
  const set = (i: number, patch: Partial<Batch>) => setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="mt-5 border-t border-line pt-5">
      <p className="text-sm font-medium text-regantify-text">Expiry and batches</p>
      <p className="mt-0.5 text-xs text-neutral-500">Optional, for food, cosmetics and medicine. Sales take from the batch that expires first. You get an alert when a batch is within 30 days of expiring.</p>
      <div className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input type="date" value={r.expiresOn} onChange={(e) => set(i, { expiresOn: e.target.value })} className={inputClass} aria-label="Expiry date" />
            <input type="text" inputMode="numeric" value={r.quantity} onChange={(e) => set(i, { quantity: e.target.value.replace(/\D/g, '').slice(0, 7) })} placeholder="Pieces" className={`${inputClass} w-28`} aria-label="Pieces" />
            <button type="button" onClick={() => setRows((cur) => cur.filter((_, idx) => idx !== i))} className="text-xs text-red-600">
              Remove
            </button>
          </div>
        ))}
      </div>
      {rows.length > 0 && stock !== null && total !== stock && (
        <p className="mt-2 text-xs text-amber-700">
          The batches add up to {total}, but the stock is {stock}. Selling still follows the stock number; fix whichever is wrong.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setRows((cur) => [...cur, { expiresOn: '', quantity: '' }])} className={outlineBtn}>
          Add a batch
        </button>
        <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className={primaryBtn}>
          {save.isPending ? 'Saving…' : 'Save batches'}
        </button>
      </div>
    </div>
  );
}
