import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X, Package } from 'lucide-react';
import { productsApi, type Product } from '../../lib/productsApi';

interface ProductPickerFieldProps {
  value: string[];
  onChange: (productIds: string[]) => void;
  /** Single-select collapses the list to one entry and swaps "Add Product" for "Change". */
  multiple?: boolean;
  label?: string;
}

/**
 * Product selector for section forms that bind to real products
 * (Select Products, Price Offer, Sticky Order Bar, Checkout Form).
 * Resolves the currently-selected ids back to names/photos so the panel
 * shows what's actually picked rather than raw uuids.
 */
export function ProductPickerField({ value, onChange, multiple = true, label }: ProductPickerFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // One list fetch covers both resolving the selected ids to display rows
  // and populating the picker — a vendor's catalog is small enough
  // (plan-capped) that a separate by-ids endpoint isn't worth it.
  const { data } = useQuery({
    queryKey: ['products', 'landing-picker'],
    queryFn: () => productsApi.list({ perPage: 200 }),
  });

  const byId = new Map((data?.products ?? []).map((p) => [p.id, p]));
  const selected = value.map((id) => byId.get(id)).filter((p): p is Product => !!p);

  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  const pick = (id: string) => {
    if (multiple) {
      if (!value.includes(id)) onChange([...value, id]);
    } else {
      onChange([id]);
      setPickerOpen(false);
    }
  };

  return (
    <div>
      {label && <span className="mb-1.5 block text-[11px] font-medium text-slate-400">{label}</span>}

      {selected.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {selected.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-1.5"
            >
              {p.photoUrls?.[0] ? (
                <img src={p.photoUrls[0]} alt="" className="h-8 w-8 rounded object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded bg-white/5 text-slate-500">
                  <Package size={14} />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[12px] text-slate-200">{p.name}</span>
              <button
                onClick={() => remove(p.id)}
                className="shrink-0 rounded p-1 text-slate-500 hover:text-red-400"
                aria-label={`Remove ${p.name}`}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed
          border-white/15 py-2 text-[12px] text-slate-400 transition-colors hover:border-white/25 hover:text-slate-200"
      >
        <Plus size={13} />
        {!multiple && selected.length > 0 ? 'Change product' : 'Add product'}
      </button>

      {pickerOpen && (
        <ProductPickerModal
          products={data?.products ?? []}
          selectedIds={value}
          onPick={pick}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function ProductPickerModal({
  products,
  selectedIds,
  onPick,
  onClose,
}: {
  products: Product[];
  selectedIds: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const filtered = term
    ? products.filter((p) => p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term))
    : products;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#15151D]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h3 className="text-[14px] font-semibold text-slate-100">Select a product</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100" aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="border-b border-white/10 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3
                text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-[calc(80vh-120px)] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-[13px] text-slate-500">No products found.</p>
          )}
          {filtered.map((p) => {
            const already = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => onPick(p.id)}
                disabled={already}
                className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors
                  hover:bg-white/5 disabled:opacity-40"
              >
                {p.photoUrls?.[0] ? (
                  <img src={p.photoUrls[0]} alt="" className="h-9 w-9 rounded object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded bg-white/5 text-slate-500">
                    <Package size={15} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-slate-200">{p.name}</span>
                  <span className="block text-[11px] text-slate-500">৳ {Number(p.price).toLocaleString()}</span>
                </span>
                {already && <span className="shrink-0 text-[11px] text-slate-500">Added</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
