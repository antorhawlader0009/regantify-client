import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { productsApi } from '../../lib/productsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

/**
 * Analytics > Products > "Searched but not found" > "Add to a product" (TellMe idea 23). Pick the product this word
 * should find; the word is added to that product's hidden "Also found as" words, so the next shopper who types it finds
 * the product. Nothing about the product's name or page changes.
 */
export function AddSearchWordDialog({ word, open, onOpenChange }: { word: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    if (!open) return;
    setText('');
    setDebounced('');
  }, [open, word]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text]);

  const { data, isFetching } = useQuery({
    queryKey: ['products', 'pick-for-search-word', debounced],
    queryFn: () => productsApi.list({ search: debounced || undefined, perPage: 8 }),
    enabled: open,
  });

  const add = useMutation({
    mutationFn: (productId: string) => productsApi.addSearchWord(productId, word),
    onSuccess: (res) => {
      toast.success(res.added ? `“${word}” now finds ${res.name}.` : `${res.name} already has “${word}”.`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not add the word.')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Make “${word}” find a product`} maxWidth="max-w-md">
      <div className="space-y-3 px-6 pb-6 pt-3">
        <p className="text-sm text-neutral-600">
          Pick the product shoppers meant. The word is added to its hidden “Also found as” words, and your store’s search will show it for “{word}”.
        </p>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search your products by name or SKU"
            className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-regantify-text focus:border-brand focus:outline-none"
          />
        </div>
        <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
          {(data?.products ?? []).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => add.mutate(p.id)}
                disabled={add.isPending}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-neutral-50 disabled:opacity-60"
              >
                <span className="min-w-0 truncate font-medium text-regantify-text">{p.name}</span>
                <span className="shrink-0 text-xs text-neutral-500">{p.sku}</span>
              </button>
            </li>
          ))}
          {!isFetching && (data?.products.length ?? 0) === 0 && <li className="px-3 py-4 text-center text-sm text-neutral-500">No product found.</li>}
        </ul>
      </div>
    </Dialog>
  );
}
