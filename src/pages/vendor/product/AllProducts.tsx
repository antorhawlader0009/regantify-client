import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronDown, Infinity as InfinityIcon } from 'lucide-react';
import { productsApi, type Product } from '../../../lib/productsApi';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';
import { ChangeStatusModal } from './ChangeStatusModal';
import { CreateStockProductModal } from './CreateStockProductModal';

type VisibilityFilter = 'ALL' | 'PUBLIC' | 'DRAFT';
type StockFilter = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNLIMITED';

function ActionsMenu({
  onDelete,
  onChangeStatus,
  onCreateStockProduct,
}: {
  onDelete: () => void;
  onChangeStatus: () => void;
  onCreateStockProduct: () => void;
}) {
  return (
    <DropdownMenu
      trigger={
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
          Actions
          <ChevronDown size={14} />
        </button>
      }
    >
      <DropdownMenuItem onSelect={onChangeStatus}>Change Status</DropdownMenuItem>
      <DropdownMenuItem onSelect={onCreateStockProduct}>Create Stock Product</DropdownMenuItem>
      <DropdownMenuItem onSelect={onDelete} danger>
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

export default function AllProducts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<VisibilityFilter>('ALL');
  const [stockType, setStockType] = useState<StockFilter>('ALL');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusModalProduct, setStatusModalProduct] = useState<Product | null>(null);
  const [stockProductModalId, setStockProductModalId] = useState<string | null>(null);

  // Reset to page 1 whenever a filter changes, so a stale page number
  // from a previous, larger result set doesn't land past the new total.
  useEffect(() => setPage(1), [search, category, visibility, stockType, perPage]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, category, visibility, stockType, page, perPage }],
    queryFn: () =>
      productsApi.list({
        search: search.trim() || undefined,
        category: category || undefined,
        visibility: visibility === 'ALL' ? undefined : visibility,
        stockType: stockType === 'ALL' ? undefined : stockType,
        page,
        perPage,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['products-categories-in-use'],
    queryFn: productsApi.categoriesInUse,
  });

  // The list rows are lightweight (no variationOptions) — fetch the full
  // record only when the Create Stock Product modal actually needs it.
  const { data: stockProductSource } = useQuery({
    queryKey: ['products', stockProductModalId],
    queryFn: () => productsApi.findOne(stockProductModalId!),
    enabled: Boolean(stockProductModalId),
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const deleteMutation = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted.');
    },
    onError: () => toast.error('Could not delete the product. Please try again.'),
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: 'PUBLIC' | 'DRAFT' }) =>
      productsApi.updateVisibility(id, visibility),
    onSuccess: (_, { visibility }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Status changed to ${visibility === 'PUBLIC' ? 'Public' : 'Draft'}.`);
      setStatusModalProduct(null);
    },
    onError: () => toast.error('Could not change the status. Please try again.'),
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const toggleSelectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    const count = selected.size;
    if (window.confirm(`Delete ${count} selected product(s)? This cannot be undone.`)) {
      Promise.all(Array.from(selected).map((id) => productsApi.remove(id)))
        .then(() => {
          setSelected(new Set());
          queryClient.invalidateQueries({ queryKey: ['products'] });
          toast.success(`${count} product(s) deleted.`);
        })
        .catch(() => toast.error('Could not delete all selected products. Please try again.'));
    }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Products</h1>
        <button
          onClick={() => navigate('/vendor/product/add')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as VisibilityFilter)}
            className="px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
          >
            <option value="ALL">All Products</option>
            <option value="PUBLIC">Public</option>
            <option value="DRAFT">Draft</option>
          </select>

          <select
            value={stockType}
            onChange={(e) => setStockType(e.target.value as StockFilter)}
            className="px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
          >
            <option value="ALL">All Stock Types</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
            <option value="UNLIMITED">Unlimited</option>
          </select>

          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-2.5 rounded-xl border border-red-200 text-sm text-red-600 hover:bg-red-50"
            >
              Delete Selected ({selected.size})
            </button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content text-left text-regantify-text-muted">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={products.length > 0 && selected.size === products.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-2 py-3 font-medium">PRODUCT</th>
              <th className="px-4 py-3 font-medium">CATEGORY</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">STATUS</th>
              <th className="px-4 py-3 font-medium">PRICE</th>
              <th className="px-4 py-3 font-medium">STOCK</th>
              <th className="px-4 py-3 font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-regantify-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-regantify-text-muted">
                  No products yet.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-t border-black/5">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelectOne(p.id)} />
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.photoUrls[0] ?? ''}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-regantify-content shrink-0"
                    />
                    <button
                      onClick={() => navigate(`/vendor/product/edit/${p.id}`)}
                      className="text-regantify-cta font-medium hover:underline line-clamp-2 max-w-xs text-left"
                    >
                      {p.name}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-regantify-text">{p.category ?? '—'}</td>
                <td className="px-4 py-3 text-regantify-text">{p.sku}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-md ${
                      p.visibility === 'PUBLIC' ? 'bg-green-100 text-green-700' : 'bg-regantify-content text-regantify-text-muted'
                    }`}
                  >
                    {p.visibility}
                  </span>
                </td>
                <td className="px-4 py-3 text-regantify-text">৳{Number(p.price).toLocaleString('en-US')}</td>
                <td className="px-4 py-3 text-regantify-text">
                  {p.stockQuantity === null || p.stockQuantity === undefined ? (
                    <InfinityIcon size={16} className="text-regantify-text-muted" />
                  ) : (
                    p.stockQuantity
                  )}
                </td>
                <td className="px-4 py-3">
                  <ActionsMenu
                    onDelete={() => handleDelete(p.id, p.name)}
                    onChangeStatus={() => setStatusModalProduct(p)}
                    onCreateStockProduct={() => setStockProductModalId(p.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ‹
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    n === page ? 'bg-regantify-black text-white' : 'text-regantify-text hover:bg-regantify-content'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>

      {statusModalProduct && (
        <ChangeStatusModal
          open
          onOpenChange={(open) => !open && setStatusModalProduct(null)}
          productName={statusModalProduct.name}
          currentStatus={statusModalProduct.visibility}
          submitting={visibilityMutation.isPending}
          onConfirm={(next) => visibilityMutation.mutate({ id: statusModalProduct.id, visibility: next })}
        />
      )}

      {stockProductModalId && stockProductSource && (
        <CreateStockProductModal
          open
          onOpenChange={(open) => !open && setStockProductModalId(null)}
          product={stockProductSource}
        />
      )}
    </div>
  );
}
