import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import {
  Plus,
  Search,
  Upload,
  Columns3,
  ListFilter,
  Rows3,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Check,
  Package,
  PackageX,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { productsApi, type Product } from '../../../lib/productsApi';
import { getVendorPlanUsage } from '../../../lib/plansApi';
import { LockedBadge, UsageLine, upgradeToast } from '../../../components/ui/UpgradePrompt';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';
import { ChangeStatusModal } from './ChangeStatusModal';
import { CreateStockProductModal } from './CreateStockProductModal';
import { ImportCsvModal } from './ImportCsvModal';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';

type VisibilityFilter = 'ALL' | 'PUBLIC' | 'DRAFT';
type StockFilter = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNLIMITED';

// Columns the vendor can show/hide. "Product" and "Actions" are always on,
// so they're not part of this list (same rule as the design reference).
type ColumnKey = 'category' | 'sku' | 'status' | 'price' | 'stock';
type SortKey = 'name' | 'category' | 'sku' | 'status' | 'price' | 'stock';
type SortDir = 'asc' | 'desc';
type Density = 'compact' | 'comfortable';

const COLUMN_OPTIONS: { key: ColumnKey; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'sku', label: 'SKU' },
  { key: 'status', label: 'Status' },
  { key: 'price', label: 'Price' },
  { key: 'stock', label: 'Stock' },
];

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  category: true,
  sku: true,
  status: true,
  price: true,
  stock: true,
};

const PREFS_KEY = 'regantify:all-products-table';

// Column / density choice is a per-browser convenience — always wrapped in
// try/catch so a blocked or full localStorage never breaks the page.
function loadPrefs(): { columns: Record<ColumnKey, boolean>; density: Density } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        columns: { ...DEFAULT_COLUMNS, ...(parsed.columns ?? {}) },
        density: parsed.density === 'comfortable' ? 'comfortable' : 'compact',
      };
    }
  } catch {
    /* ignore */
  }
  return { columns: DEFAULT_COLUMNS, density: 'compact' };
}

const toolbarBtn =
  'inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 text-xs font-medium text-regantify-text transition-colors hover:bg-regantify-content';

const filterSelect =
  'h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-xs text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-black/20';

const menuPanel = 'bg-white rounded-xl shadow-lg border border-black/10 py-1.5 z-30 focus:outline-none';

function ActionsMenu({
  onEdit,
  onDelete,
  onChangeStatus,
  onCreateStockProduct,
  atProductLimit,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: () => void;
  onCreateStockProduct: () => void;
  atProductLimit: boolean;
}) {
  return (
    <DropdownMenu
      widthClass="w-52"
      trigger={
        <button
          aria-label="Actions"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-regantify-text-muted transition-colors hover:bg-regantify-content hover:text-regantify-text"
        >
          <MoreVertical size={15} />
        </button>
      }
    >
      <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
      <DropdownMenuItem onSelect={onChangeStatus}>Change Status</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => (atProductLimit ? upgradeToast('add more products') : onCreateStockProduct())}>
        <span className="flex items-center gap-1.5">
          Create Stock Product
          {atProductLimit && <LockedBadge size={12} />}
        </span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onDelete} danger>
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

function ColumnsMenu({
  columns,
  onToggle,
  onReset,
}: {
  columns: Record<ColumnKey, boolean>;
  onToggle: (key: ColumnKey) => void;
  onReset: () => void;
}) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>
        <button className={toolbarBtn} title="Show or hide columns">
          <Columns3 size={14} />
          <span>Columns</span>
        </button>
      </RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content align="end" sideOffset={8} collisionPadding={12} className={`w-52 ${menuPanel}`}>
          <RadixDropdown.Label className="px-4 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-regantify-text-muted">
            Visible Columns
          </RadixDropdown.Label>
          {COLUMN_OPTIONS.map((c) => (
            <RadixDropdown.CheckboxItem
              key={c.key}
              checked={columns[c.key]}
              // Keep the menu open so several columns can be toggled in one go.
              onSelect={(e) => {
                e.preventDefault();
                onToggle(c.key);
              }}
              className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-2 text-sm text-regantify-text outline-none data-[highlighted]:bg-regantify-content"
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  columns[c.key] ? 'border-regantify-black bg-regantify-black text-white' : 'border-black/20'
                }`}
              >
                {columns[c.key] && <Check size={11} strokeWidth={3} />}
              </span>
              {c.label}
            </RadixDropdown.CheckboxItem>
          ))}
          <RadixDropdown.Separator className="my-1 h-px bg-black/5" />
          <RadixDropdown.Item
            onSelect={(e) => {
              e.preventDefault();
              onReset();
            }}
            className="mx-2 mb-1 cursor-pointer rounded-lg border border-black/10 py-1.5 text-center text-xs font-medium text-regantify-text outline-none data-[highlighted]:bg-regantify-content"
          >
            Reset Columns
          </RadixDropdown.Item>
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 whitespace-nowrap uppercase tracking-wide transition-colors hover:text-regantify-text ${
        active ? 'text-regantify-text' : ''
      }`}
    >
      {label}
      <Icon size={11} className={active ? '' : 'opacity-40'} />
    </button>
  );
}

function StatusBadge({ visibility }: { visibility: Product['visibility'] }) {
  const isPublic = visibility === 'PUBLIC';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
        isPublic
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-black/10 bg-regantify-content text-regantify-text-muted'
      }`}
    >
      {visibility}
    </span>
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
  const [showImportModal, setShowImportModal] = useState(false);

  // Table look & feel (from the design reference): filter panel toggle,
  // row density, visible columns and a per-page sort.
  const [showFilters, setShowFilters] = useState(false);
  const [density, setDensity] = useState<Density>(() => loadPrefs().density);
  const [columns, setColumns] = useState<Record<ColumnKey, boolean>>(() => loadPrefs().columns);
  const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({ key: null, dir: 'asc' });

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ columns, density }));
    } catch {
      /* ignore */
    }
  }, [columns, density]);

  // Reset to page 1 whenever a filter changes, so a stale page number
  // from a previous, larger result set doesn't land past the new total.
  useEffect(() => setPage(1), [search, category, visibility, stockType, perPage]);

  // Clear any bulk-selected product IDs whenever the visible result set
  // changes (new filter, new page). Without this, selecting products on
  // one page/filter and then navigating away leaves their ids sitting in
  // `selected` with nothing on screen to show for it — the "Delete
  // Selected (N)" bar keeps showing a stale count, the header checkbox's
  // checked state can end up wrong by coincidence (e.g. 3 selected
  // earlier + the new page also has exactly 3 products), and a vendor
  // could end up bulk-deleting products they can no longer see and have
  // likely forgotten they selected.
  useEffect(() => setSelected(new Set()), [search, category, visibility, stockType, page, perPage]);

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

  // PLAN.md Step 3 — Free: 5 products, others: unlimited. Server already
  // hard-blocks both ProductsService.create and createStockProduct at
  // the cap — this is purely so a Free vendor at the cap doesn't click
  // through to the Add Product form (or Create Stock Product action)
  // only to fail on submit, same precedent as Staff.tsx's Add New
  // button (Step 10).
  const { data: planUsage } = useQuery({
    queryKey: ['vendor-plan-usage'],
    queryFn: getVendorPlanUsage,
  });
  const productsUsage = planUsage?.usage.products;
  const atProductLimit = productsUsage != null && productsUsage.limit !== null && productsUsage.used >= productsUsage.limit;

  // The list rows are lightweight (no variationOptions) — fetch the full
  // record only when the Create Stock Product modal actually needs it.
  const { data: stockProductSource } = useQuery({
    queryKey: ['products', stockProductModalId],
    queryFn: () => productsApi.findOne(stockProductModalId!),
    enabled: Boolean(stockProductModalId),
  });

  const rawProducts = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // Sorting is applied to the rows of the current page only (the list API
  // has no sort parameter), so pagination / filters keep working as before.
  const products = useMemo(() => {
    if (!sort.key) return rawProducts;
    const key = sort.key;
    const factor = sort.dir === 'asc' ? 1 : -1;
    const value = (p: Product): string | number => {
      switch (key) {
        case 'name':
          return p.name.toLowerCase();
        case 'category':
          return (p.category ?? '').toLowerCase();
        case 'sku':
          return (p.sku ?? '').toLowerCase();
        case 'status':
          return p.visibility;
        case 'price':
          return Number(p.price);
        case 'stock':
          return p.stockQuantity === null || p.stockQuantity === undefined ? Number.POSITIVE_INFINITY : p.stockQuantity;
      }
    };
    return [...rawProducts].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      if (x < y) return -1 * factor;
      if (x > y) return 1 * factor;
      return 0;
    });
  }, [rawProducts, sort]);

  const handleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: 'asc' }; // third click clears the sort
    });
  };

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
      // Promise.allSettled, not Promise.all: with N independent DELETE
      // calls, one failing (e.g. a network blip) must not hide that the
      // others already succeeded server-side. Promise.all's catch would
      // skip invalidating the query below entirely, leaving the list
      // showing products that are actually already gone — this always
      // refreshes the list and reports exactly how many succeeded.
      Promise.allSettled(Array.from(selected).map((id) => productsApi.remove(id))).then((results) => {
        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.length - succeeded;
        setSelected(new Set());
        queryClient.invalidateQueries({ queryKey: ['products'] });
        if (failed === 0) {
          toast.success(`${succeeded} product(s) deleted.`);
        } else if (succeeded === 0) {
          toast.error('Could not delete the selected products. Please try again.');
        } else {
          toast.error(`Deleted ${succeeded} of ${count} — ${failed} failed. Please try again for the rest.`);
        }
      });
    }
  };

  const activeFilterCount = (category ? 1 : 0) + (visibility !== 'ALL' ? 1 : 0) + (stockType !== 'ALL' ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setVisibility('ALL');
    setStockType('ALL');
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  const rangeFrom = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeTo = Math.min(page * perPage, total);

  const compact = density === 'compact';
  const cellY = compact ? 'py-2' : 'py-4';
  const thumb = compact ? 'w-8 h-8' : 'w-11 h-11';

  // Product + checkbox + actions are always shown; the rest follow `columns`.
  const visibleColumnCount = 3 + COLUMN_OPTIONS.filter((c) => columns[c.key]).length;
  const allOnPageSelected = products.length > 0 && selected.size === products.length;
  const someOnPageSelected = selected.size > 0 && !allOnPageSelected;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-black/5 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-semibold text-regantify-text">Products</h1>
              {productsUsage && (
                <div className="mt-0.5 [&_p]:text-xs">
                  <UsageLine label="products used" used={productsUsage.used} limit={productsUsage.limit} />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
              className={toolbarBtn}
              title="Toggle table density"
            >
              <Rows3 size={14} />
              <span>{compact ? 'Compact' : 'Comfortable'}</span>
            </button>

            <ColumnsMenu
              columns={columns}
              onToggle={(key) => setColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
              onReset={() => setColumns(DEFAULT_COLUMNS)}
            />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product"
                className="h-9 w-40 rounded-lg border border-black/10 bg-white pl-8 pr-3 text-xs text-regantify-text
                  placeholder:text-regantify-text-muted focus:outline-none focus:ring-2 focus:ring-regantify-black/20 sm:w-52"
              />
            </div>

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`${toolbarBtn} ${showFilters ? 'bg-regantify-content' : ''}`}
            >
              <ListFilter size={14} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-regantify-black px-1 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => (atProductLimit ? upgradeToast('add more products') : setShowImportModal(true))}
              title={atProductLimit ? 'Upgrade your plan to add more products.' : 'Import products from CSV'}
              className={`${toolbarBtn} ${atProductLimit ? 'text-regantify-text-muted' : ''}`}
            >
              {atProductLimit ? <LockedBadge size={14} /> : <Upload size={14} />}
              <span>Import Product</span>
            </button>

            <button
              onClick={() => (atProductLimit ? upgradeToast('add more products') : navigate('/vendor/product/add'))}
              disabled={atProductLimit}
              title={atProductLimit ? 'Upgrade your plan to add more products.' : undefined}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition-colors ${
                atProductLimit
                  ? 'bg-regantify-content text-regantify-text-muted cursor-not-allowed'
                  : 'bg-regantify-cta hover:bg-regantify-cta-dark text-white'
              }`}
            >
              {atProductLimit ? <LockedBadge size={14} /> : <Plus size={15} />}
              Add New
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="border-b border-black/5 bg-regantify-content/50 px-5 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-regantify-text-muted">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={filterSelect}>
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-medium text-regantify-text-muted">Products</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as VisibilityFilter)}
                  className={filterSelect}
                >
                  <option value="ALL">All Products</option>
                  <option value="PUBLIC">Public</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-medium text-regantify-text-muted">Stock Type</label>
                <select
                  value={stockType}
                  onChange={(e) => setStockType(e.target.value as StockFilter)}
                  className={filterSelect}
                >
                  <option value="ALL">All Stock Types</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                  <option value="UNLIMITED">Unlimited</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="h-9 w-full rounded-lg border border-black/10 bg-white text-xs font-medium text-regantify-text hover:bg-regantify-content"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between border-b border-black/5 bg-regantify-search/60 px-5 py-2">
            <span className="text-xs font-medium text-regantify-text">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs text-regantify-text-muted hover:bg-white"
              >
                <X size={13} />
                Clear
              </button>
              <button
                onClick={handleBulkDelete}
                className="h-8 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete Selected ({selected.size})
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-black/5 bg-regantify-content text-[11px] font-medium text-regantify-text-muted">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 cursor-pointer rounded accent-regantify-black"
                  />
                </th>
                <th className="min-w-[260px] px-2 py-3 font-medium">
                  <SortHeader label="Product" sortKey="name" active={sort.key === 'name'} dir={sort.dir} onSort={handleSort} />
                </th>
                {columns.category && (
                  <th className="px-4 py-3 font-medium">
                    <SortHeader label="Category" sortKey="category" active={sort.key === 'category'} dir={sort.dir} onSort={handleSort} />
                  </th>
                )}
                {columns.sku && (
                  <th className="px-4 py-3 font-medium">
                    <SortHeader label="SKU" sortKey="sku" active={sort.key === 'sku'} dir={sort.dir} onSort={handleSort} />
                  </th>
                )}
                {columns.status && (
                  <th className="px-4 py-3 font-medium">
                    <SortHeader label="Status" sortKey="status" active={sort.key === 'status'} dir={sort.dir} onSort={handleSort} />
                  </th>
                )}
                {columns.price && (
                  <th className="px-4 py-3 font-medium">
                    <SortHeader label="Price" sortKey="price" active={sort.key === 'price'} dir={sort.dir} onSort={handleSort} />
                  </th>
                )}
                {columns.stock && (
                  <th className="px-4 py-3 font-medium">
                    <SortHeader label="Stock" sortKey="stock" active={sort.key === 'stock'} dir={sort.dir} onSort={handleSort} />
                  </th>
                )}
                <th className="w-16 px-4 py-3 text-center font-medium uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: Math.min(perPage, 6) }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-t border-black/5">
                    <td colSpan={visibleColumnCount} className={`px-4 ${cellY}`}>
                      <div className="h-6 w-full animate-pulse rounded-md bg-regantify-content" />
                    </td>
                  </tr>
                ))}
              {!isLoading && products.length === 0 && (
                <tr>
                  <td colSpan={visibleColumnCount} className="px-4 py-16 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-regantify-content text-regantify-text-muted">
                      <PackageX size={20} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-regantify-text">No products yet.</p>
                    {(search || activeFilterCount > 0) && (
                      <p className="mt-1 text-xs text-regantify-text-muted">Try changing your search or filters.</p>
                    )}
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={`border-t border-black/5 transition-colors hover:bg-regantify-content/40 ${
                    selected.has(p.id) ? 'bg-regantify-search/40' : ''
                  }`}
                >
                  <td className={`px-4 ${cellY}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelectOne(p.id)}
                      className="h-3.5 w-3.5 cursor-pointer rounded accent-regantify-black"
                    />
                  </td>
                  <td className={`px-2 ${cellY}`}>
                    <div className="flex items-center gap-3">
                      {p.photoUrls[0] ? (
                        <img
                          src={p.photoUrls[0]}
                          alt=""
                          className={`${thumb} shrink-0 rounded-lg border border-black/5 bg-regantify-content object-cover`}
                        />
                      ) : (
                        <div
                          className={`${thumb} flex shrink-0 items-center justify-center rounded-lg bg-regantify-content text-regantify-text-muted`}
                        >
                          <Package size={15} />
                        </div>
                      )}
                      <button
                        onClick={() => navigate(`/vendor/product/edit/${p.id}`)}
                        title={p.name}
                        className="line-clamp-2 max-w-xs text-left text-[13px] font-medium text-regantify-cta hover:underline"
                      >
                        {p.name}
                      </button>
                      {p.visibility === 'PUBLIC' && <ViewProductOnStorefront slug={p.slug} />}
                    </div>
                  </td>
                  {columns.category && (
                    <td className={`whitespace-nowrap px-4 ${cellY} text-[13px] text-regantify-text`}>{p.category ?? '—'}</td>
                  )}
                  {columns.sku && (
                    <td className={`px-4 ${cellY} text-[13px] text-regantify-text`}>
                      <span className="block max-w-[220px] truncate" title={p.sku}>
                        {p.sku}
                      </span>
                    </td>
                  )}
                  {columns.status && (
                    <td className={`whitespace-nowrap px-4 ${cellY}`}>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge visibility={p.visibility} />
                        {p.isPreOrder && (
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            PRE-ORDER
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  {columns.price && (
                    <td className={`whitespace-nowrap px-4 ${cellY} text-[13px] font-semibold text-regantify-text`}>
                      ৳{Number(p.price).toLocaleString('en-US')}
                    </td>
                  )}
                  {columns.stock && (
                    <td className={`whitespace-nowrap px-4 ${cellY} text-[13px] text-regantify-text`}>
                      {p.stockQuantity === null || p.stockQuantity === undefined ? (
                        <InfinityIcon size={16} className="text-regantify-text-muted" />
                      ) : p.stockQuantity === 0 ? (
                        <span className="font-medium text-red-600">0</span>
                      ) : (
                        p.stockQuantity
                      )}
                    </td>
                  )}
                  <td className={`px-4 ${cellY} text-center`}>
                    <ActionsMenu
                      onEdit={() => navigate(`/vendor/product/edit/${p.id}`)}
                      onDelete={() => handleDelete(p.id, p.name)}
                      onChangeStatus={() => setStatusModalProduct(p)}
                      onCreateStockProduct={() => setStockProductModalId(p.id)}
                      atProductLimit={atProductLimit}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-black/5 px-5 py-3 text-xs text-regantify-text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="h-7 rounded-md border border-black/10 bg-white px-2 text-xs text-regantify-text focus:outline-none"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>per page</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span>
              {rangeFrom}-{rangeTo} of {total}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  aria-label="First page"
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-regantify-content disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-regantify-content disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft size={14} />
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`h-7 min-w-7 rounded-md px-2 text-xs ${
                      n === page ? 'bg-regantify-black text-white' : 'text-regantify-text hover:bg-regantify-content'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-regantify-content disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  aria-label="Last page"
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-regantify-content disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            )}
          </div>
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

      {showImportModal && <ImportCsvModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
}
