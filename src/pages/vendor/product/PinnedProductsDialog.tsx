import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { productsApi } from '../../../lib/productsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { ProductPicker, toLocalInput, type PickedItem } from '../marketing/MarketingKit';

const MAX_PINNED = 12;

interface Row {
  id: string;
  name: string;
  photoUrl: string | null;
  /** A datetime-local value, empty = stays until taken off. */
  until: string;
}

/**
 * All Products > Pinned products (TellMe idea 47): the products shown first on the store's home page and in their
 * categories (StorePal), in this order, up to 12. A pin can end by itself on a date. "Pin to top" on selected
 * products passes them in `adding`, they join the end of the list.
 */
export function PinnedProductsDialog({
  adding = [],
  onOpenChange,
  onDone,
}: {
  adding?: Array<{ id: string; name: string; photoUrl: string | null }>;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['pinned-products'], queryFn: productsApi.listPinned });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data || rows) return;
    const current: Row[] = data.map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, until: toLocalInput(p.until) }));
    const extra = adding.filter((a) => !current.some((c) => c.id === a.id)).map((a) => ({ id: a.id, name: a.name, photoUrl: a.photoUrl, until: '' }));
    setRows([...current, ...extra].slice(0, MAX_PINNED));
    if (current.length + extra.length > MAX_PINNED) toast.error(`Only ${MAX_PINNED} products can be pinned. The rest were left out.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const list = rows ?? [];
  const move = (i: number, by: number) =>
    setRows((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const j = i + by;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const pickerValue: PickedItem[] = [];
  const addPicked = (items: PickedItem[]) => {
    const item = items[items.length - 1];
    if (!item || list.some((r) => r.id === item.id)) return;
    if (list.length >= MAX_PINNED) return toast.error(`You can pin at most ${MAX_PINNED} products.`);
    setRows([...list, { id: item.id, name: item.label, photoUrl: item.photoUrl ?? null, until: '' }]);
  };

  async function save() {
    setBusy(true);
    try {
      await productsApi.setPinned(list.map((r) => ({ id: r.id, until: r.until ? new Date(r.until).toISOString() : null })));
      void queryClient.invalidateQueries({ queryKey: ['pinned-products'] });
      toast.success(list.length > 0 ? 'Pinned products saved.' : 'No products are pinned now.');
      onDone?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Couldn’t save the pinned products. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange} title="Pinned products" maxWidth="max-w-lg">
      <div className="space-y-3 px-6 pb-6 pt-3 text-sm">
        <p className="text-neutral-600">
          These show first on your store’s home page and in their categories, in this order (up to {MAX_PINNED}). A shopper who sorts by price
          sees the price order. Search results don’t change.
        </p>

        {isLoading || !rows ? (
          <p className="text-neutral-500">Loading…</p>
        ) : list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-neutral-500">Nothing is pinned. Search below to add a product.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 rounded-lg border border-line">
            {list.map((r, i) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                {r.photoUrl ? <img src={r.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded object-cover" /> : <span className="h-9 w-9 shrink-0 rounded bg-neutral-100" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                    Unpin on
                    <input
                      type="datetime-local"
                      value={r.until}
                      onChange={(e) => setRows(list.map((x) => (x.id === r.id ? { ...x, until: e.target.value } : x)))}
                      className="rounded border border-line px-1.5 py-0.5 text-xs"
                    />
                  </label>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" aria-label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30">
                    <ArrowDown size={14} />
                  </button>
                  <button type="button" aria-label="Unpin" onClick={() => setRows(list.filter((x) => x.id !== r.id))} className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <ProductPicker label="Add a product" selected={pickerValue} onChange={addPicked} />

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={busy || !rows} className={primaryBtn}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
