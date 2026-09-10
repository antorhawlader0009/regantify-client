import { useMemo, useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { productsApi, type Product } from '../../../lib/productsApi';
import { toast } from '../../../lib/toast';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateStockProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * "Create Stock Product" — clones a pre-order product into a new
 * in-stock product. Only asks for a stock quantity per variant
 * combination (a grid when there are exactly two variation options,
 * like the reference's Color × Size; a flat list otherwise) — everything
 * else is copied from the source product automatically.
 */
export function CreateStockProductModal({ open, onOpenChange, product }: CreateStockProductModalProps) {
  const queryClient = useQueryClient();
  const options = product.variationOptions ?? [];
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const newSku = `stk_${product.sku}`;
  const newSlugPreview = `${slugify(product.name)}-stk`;

  // Every combination of the two axes, for the grid layout — only used
  // when there are exactly two variation options (matches the reference
  // "Color \ Size" grid). Any other number of options falls back to a
  // flat list of combinations instead of trying to force a 2D grid.
  const isTwoAxisGrid = options.length === 2;
  const rows = isTwoAxisGrid ? options[0].values : [];
  const cols = isTwoAxisGrid ? options[1].values : [];

  const flatCombinations = useMemo(() => {
    if (options.length === 0) return [];
    return options.reduce<Record<string, string>[]>(
      (acc, option) => {
        const next: Record<string, string>[] = [];
        for (const combo of acc) {
          for (const value of option.values) {
            next.push({ ...combo, [option.name]: value });
          }
        }
        return next;
      },
      [{}],
    );
  }, [options]);

  const keyFor = (combo: Record<string, string>) => JSON.stringify(combo);

  const totalStock = Object.values(quantities).reduce((sum, v) => sum + (Number(v) || 0), 0);

  const createMutation = useMutation({
    mutationFn: () =>
      productsApi.createStockProduct(product.id, {
        variantStocks: flatCombinations.map((combo) => ({
          optionValues: combo,
          stock: Number(quantities[keyFor(combo)]) || 0,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock product created.');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Could not create the stock product. Please try again.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-2xl">
      <div className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-regantify-text">Create Stock Product</h2>
          <p className="text-sm text-regantify-text-muted mt-1 flex items-center gap-1.5">
            Product: <span className="font-medium text-regantify-text">{product.name}</span>
            {product.visibility === 'PUBLIC' && <ViewProductOnStorefront slug={product.slug} />}
          </p>
          <p className="text-xs text-regantify-text-muted mt-0.5">
            Source SKU: {product.sku} → New SKU: <span className="font-medium">{newSku}</span>
          </p>
          <p className="text-xs text-regantify-text-muted">New Slug: {newSlugPreview}</p>
        </div>

        <div className="text-sm bg-blue-50 text-blue-900 rounded-xl px-4 py-3">
          This will create a new in-stock product ({newSku}) from this pre-order product. Prices are copied
          from the source. Set stock quantity per variation.
        </div>

        {options.length === 0 ? (
          <p className="text-sm text-regantify-text-muted">
            This product has no variations — the new stock product will be created with no stock set.
          </p>
        ) : isTwoAxisGrid ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left font-medium text-regantify-text pb-2 pr-3">
                    {options[0].name} \ {options[1].name}
                  </th>
                  {cols.map((col) => (
                    <th key={col} className="text-left font-medium text-regantify-text pb-2 px-1.5">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row}>
                    <td className="font-medium text-regantify-text pr-3 py-1.5">{row}</td>
                    {cols.map((col) => {
                      const combo = { [options[0].name]: row, [options[1].name]: col };
                      const key = keyFor(combo);
                      return (
                        <td key={col} className="px-1.5 py-1.5">
                          <input
                            type="number"
                            min={0}
                            value={quantities[key] ?? ''}
                            onChange={(e) => setQuantities((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder="0"
                            className="w-20 px-2.5 py-1.5 rounded-lg bg-regantify-search text-sm text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {flatCombinations.map((combo) => {
              const key = keyFor(combo);
              const label = Object.values(combo).join(' / ');
              return (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-regantify-text">{label}</span>
                  <input
                    type="number"
                    min={0}
                    value={quantities[key] ?? ''}
                    onChange={(e) => setQuantities((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder="0"
                    className="w-24 px-2.5 py-1.5 rounded-lg bg-regantify-search text-sm text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        )}

        {options.length > 0 && (
          <p className="text-xs text-regantify-text-muted text-right">Total Stock: {totalStock}</p>
        )}
      </div>

      <div className="border-t border-black/5 px-6 py-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="px-5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-regantify-content"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
            transition-colors disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creating…' : 'Create Stock Product'}
        </button>
      </div>
    </Dialog>
  );
}
