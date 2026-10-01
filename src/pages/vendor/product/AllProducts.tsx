import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import {
  Plus,
  Search,
  Upload,
  Columns3,
  Filter,
  Table2,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronsUpDown,
  Check,
  Package,
  PackageX,
  X,
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
  'inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text transition-colors hover:bg-neutral-50';

const filterSelect =
  'h-9 w-full rounded-lg border border-line bg-white px-3 text-sm text-regantify-text outline-none focus:border-brand focus:ring-2 focus:ring-brand/15';

// Table cell: hairline on the right, like the design reference.
const th = 'border-r border-line px-3 py-3 text-left font-normal last:border-r-0';
const td = 'border-r border-line px-3 last:border-r-0';

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
          className="inline-flex items-center justify-center rounded-md border border-line p-1.5 text-regantify-text transition-colors hover:bg-neutral-50"
        >
          <MoreVertical size={14} />
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
  const Icon = !active ? ChevronsUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-regantify-text ${
        active ? 'font-medium text-regantify-text' : ''
      }`}
    >
      {label}
      <Icon size={12} />
    </button>
  );
}

const badge = 'inline-block whitespace-nowrap rounded border px-2 py-0.5 text-sm';

function StatusBadge({ visibility }: { visibility: Product['visibility'] }) {
  return visibility === 'PUBLIC' ? (
    <span className={`${badge} border-green-200 bg-green-50 text-green-700`}>Public</span>
  ) : (
    <span className={`${badge} border-neutral-200 bg-neutral-50 text-neutral-600`}>Draft</span>
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
  const cellY = compact ? 'py-2.5' : 'py-4';
  const thumb = compact ? 'h-7 w-7' : 'h-10 w-10';

  // Product + checkbox + actions are always shown; the rest follow `columns`.
  const visibleColumnCount = 3 + COLUMN_OPTIONS.filter((c) => columns[c.key]).length;
  const allOnPageSelected = products.length > 0 && selected.size === products.length;
  const someOnPageSelected = selected.size > 0 && !allOnPageSelected;

  return (
    <div>
      <section className="rounded-xl border border-line bg-white p-3.5">
        {/* Toolbar */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h1 className="text-[15px] font-semibold text-regantify-text">All Products</h1>
            {productsUsage && (
              <div className="mt-0.5 [&_p]:text-xs">
                <UsageLine label="products used" used={productsUsage.used} limit={productsUsage.limit} />
              </div>
            )}
          </div>

          <button
            onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
            className={toolbarBtn}
            title={compact ? 'Compact rows (click for comfortable)' : 'Comfortable rows (click for compact)'}
          >
            <Table2 size={15} />
            {compact ? 'Compact' : 'Comfortable'}
          </button>

          <ColumnsMenu
            columns={columns}
            onToggle={(key) => setColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
            onReset={() => setColumns(DEFAULT_COLUMNS)}
          />

          <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm sm:w-[215px]">
            <Search size={15} className="shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-regantify-text outline-none placeholder:text-neutral-500"
            />
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`${toolbarBtn} ${showFilters ? 'border-neutral-300 bg-neutral-50' : ''}`}
          >
            Filter
            {activeFilterCount > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : (
              <Filter size={14} />
            )}
          </button>

          <button
            onClick={() => (atProductLimit ? upgradeToast('add more products') : navigate('/vendor/product/add'))}
            disabled={atProductLimit}
            title={atProductLimit ? 'Upgrade your plan to add more products.' : undefined}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
              atProductLimit
                ? 'cursor-not-allowed bg-neutral-100 text-regantify-text-muted'
                : 'bg-brand text-white hover:bg-brand-dark'
            }`}
          >
            {atProductLimit ? <LockedBadge size={14} /> : <Plus size={15} />}
            Add Product
          </button>

          <button
            onClick={() => (atProductLimit ? upgradeToast('add more products') : setShowImportModal(true))}
            title={atProductLimit ? 'Upgrade your plan to add more products.' : 'Import products from CSV'}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
              atProductLimit ? 'bg-neutral-100 text-regantify-text-muted' : 'bg-brand-blue text-white hover:opacity-90'
            }`}
          >
            {atProductLimit ? <LockedBadge size={14} /> : <Upload size={15} />}
            Import Product
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mb-3 rounded-lg border border-line bg-neutral-50 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-neutral-600">Category</label>
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
                <label className="mb-1 block text-xs text-neutral-600">Products</label>
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
                <label className="mb-1 block text-xs text-neutral-600">Stock Type</label>
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
                <button onClick={clearFilters} className={`${toolbarBtn} w-full justify-center`}>
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-brand-lime bg-brand-lime/30 px-3 py-2">
            <span className="text-sm font-medium text-regantify-text">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-neutral-600 hover:bg-white"
              >
                <X size={13} />
                Clear
              </button>
              <button
                onClick={handleBulkDelete}
                className="h-8 rounded-lg border border-red-200 bg-white px-3 text-sm text-red-600 hover:bg-red-50"
              >
                Delete Selected ({selected.size})
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[900px] border-collapse text-[14px]">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600">
                <th className="w-10 border-r border-line p-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer accent-brand"
                  />
                </th>
                <th className={`${th} min-w-[260px]`}>
                  <SortHeader label="Product" sortKey="name" active={sort.key === 'name'} dir={sort.dir} onSort={handleSort} />
                </th>
                {columns.category && (
                  <th className={th}>
                    <SortHeader label="Category" sortKey="category" active={sort.key === 'category'} dir={sort.dir} onSort={handleSort} />
                  </th>
                )}
                {columns.sku && (
                  <th className={th}>
                    <SortHeader label="SKU" sortKey="sku" active={sort.key === 'sku'} dir={sort.dir} onSort={handleSort} />
                  </th>
                )}
                {columns.stock && (
                  <th className={th}>
                    <SortHeader label="Stock" sortKey="stock" active={sort.key === 'stock'} dir={sort.dir} onSort={handleSort} />
                  </th>
                )}
                {columns.price && (
                  <th className={th}>
                    <SortHeader label="Price" sortKey="price" active={sort.key === 'price'} dir={sort.dir} onSort={handleSort} />
                  </th>
                )}
                {columns.status && (
                  <th className={th}>
                    <SortHeader label="Status" sortKey="status" active={sort.key === 'status'} dir={sort.dir} onSort={handleSort} />
                  </th>
                )}
                <th className={`${th} w-16`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: Math.min(perPage, 6) }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-t border-line">
                    <td colSpan={visibleColumnCount} className={`px-3 ${cellY}`}>
                      <div className="h-6 w-full animate-pulse rounded-md bg-neutral-100" />
                    </td>
                  </tr>
                ))}
              {!isLoading && products.length === 0 && (
                <tr className="border-t border-line">
                  <td colSpan={visibleColumnCount} className="px-3 py-16 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                      <PackageX size={20} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-regantify-text">No products yet.</p>
                    {(search || activeFilterCount > 0) && (
                      <p className="mt-1 text-xs text-neutral-500">Try changing your search or filters.</p>
                    )}
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={`border-t border-line text-regantify-text transition-colors ${
                    selected.has(p.id) ? 'bg-brand-lime/20' : 'hover:bg-neutral-50/70'
                  }`}
                >
                  <td className={`${td} ${cellY}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelectOne(p.id)}
                      className="h-4 w-4 cursor-pointer accent-brand"
                    />
                  </td>
                  <td className={`${td} ${cellY}`}>
                    <div className="flex items-center gap-3">
                      {p.photoUrls[0] ? (
                        <img
                          src={p.photoUrls[0]}
                          alt=""
                          className={`${thumb} shrink-0 rounded border border-line bg-neutral-100 object-cover`}
                        />
                      ) : (
                        <div className={`${thumb} flex shrink-0 items-center justify-center rounded bg-neutral-100 text-neutral-400`}>
                          <Package size={14} />
                        </div>
                      )}
                      <button
                        onClick={() => navigate(`/vendor/product/edit/${p.id}`)}
                        title={p.name}
                        className="line-clamp-2 max-w-xs text-left hover:text-brand hover:underline"
                      >
                        {p.name}
                      </button>
                      {p.visibility === 'PUBLIC' && <ViewProductOnStorefront slug={p.slug} />}
                    </div>
                  </td>
                  {columns.category && <td className={`${td} ${cellY} whitespace-nowrap`}>{p.category ?? '—'}</td>}
                  {columns.sku && (
                    <td className={`${td} ${cellY}`}>
                      <span className="block max-w-[220px] truncate" title={p.sku}>
                        {p.sku}
                      </span>
                    </td>
                  )}
                  {columns.stock && (
                    <td className={`${td} ${cellY} whitespace-nowrap`}>
                      {p.stockQuantity === null || p.stockQuantity === undefined ? (
                        <InfinityIcon size={16} className="text-neutral-500" aria-label="Unlimited" />
                      ) : p.stockQuantity === 0 ? (
                        <span className="font-medium text-red-600">0</span>
                      ) : (
                        p.stockQuantity
                      )}
                    </td>
                  )}
                  {columns.price && (
                    <td className={`${td} ${cellY} whitespace-nowrap font-medium`}>
                      ৳{Number(p.price).toLocaleString('en-US')}
                    </td>
                  )}
                  {columns.status && (
                    <td className={`${td} ${cellY} whitespace-nowrap`}>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge visibility={p.visibility} />
                        {p.isPreOrder && <span className={`${badge} border-amber-200 bg-amber-50 text-amber-700`}>Pre-Order</span>}
                        {p.stockQuantity === 0 && (
                          <span className={`${badge} border-red-200 bg-red-50 text-red-700`}>Out of Stock</span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className={`${td} ${cellY}`}>
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
        <div className="mt-4 flex flex-col gap-3 px-2 pb-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            Show
            <div className="relative">
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="h-9 appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-xs text-regantify-text outline-none focus:border-brand"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-3" />
            </div>
            <span className="text-xs">per page</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="mr-2 text-xs text-neutral-600">
              {rangeFrom}-{rangeTo} of {total}
            </span>
            {totalPages > 1 && (
              <>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="disabled:opacity-30"
                >
                  <ArrowLeft size={16} />
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`h-8 min-w-8 rounded-md px-1 ${
                      n === page ? 'bg-neutral-100 font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className="disabled:opacity-30"
                >
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </section>

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
