import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import {
  Plus,
  Upload,
  Columns3,
  Filter,
  Table2,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Check,
  Package,
  PackageX,
  X,
  Infinity as InfinityIcon,
  Printer,
  Clock,
} from 'lucide-react';
import { productsApi, type Product } from '../../../lib/productsApi';
import { getVendorPlanUsage } from '../../../lib/plansApi';
import { LockedBadge, UsageLine, upgradeToast } from '../../../components/ui/UpgradePrompt';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';
import { apiErrorMessage } from '../../../lib/api';
import { ChangeStatusModal } from './ChangeStatusModal';
import { ScheduleProductsDialog } from './ScheduleProductsDialog';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { CreateStockProductModal } from './CreateStockProductModal';
import { ImportCsvModal } from './ImportCsvModal';
import { useCan } from '../../../lib/useStaffAccess';
import { PrintLabelsDialog } from '../../../components/product/PrintLabelsDialog';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';
import { SearchBox, TableFooter, outlineBtn, th } from '../../../components/ui/PageKit';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

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

const toolbarBtn = outlineBtn;

const filterSelect =
  'h-9 w-full rounded-lg border border-line bg-white px-3 text-sm text-regantify-text outline-none focus:border-brand focus:ring-2 focus:ring-brand/15';

// Body cells get their padding from the Compact / Comfortable switch, so not PageKit's `td`.
const td = 'border-r border-line px-3 last:border-r-0';

const menuPanel = 'bg-white rounded-lg shadow-lg border border-line py-1.5 z-30 focus:outline-none';

function ActionsMenu({
  onEdit,
  onDelete,
  onChangeStatus,
  onCreateStockProduct,
  onDuplicate,
  onPrintLabels,
  atProductLimit,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onChangeStatus: () => void;
  onCreateStockProduct: () => void;
  onDuplicate: () => void;
  onPrintLabels: () => void;
  atProductLimit: boolean;
}) {
  // Only what this person's role can do (rule-plan.md Step 10); the server checks each again.
  const canEdit = useCan('products.edit');
  const canDelete = useCan('products.delete');
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
      <DropdownMenuItem onSelect={onEdit}>{canEdit ? 'Edit' : 'View'}</DropdownMenuItem>
      {canEdit && <DropdownMenuItem onSelect={onChangeStatus}>Change Status</DropdownMenuItem>}
      <DropdownMenuItem onSelect={onPrintLabels}>Print labels</DropdownMenuItem>
      {canEdit && (
        <DropdownMenuItem onSelect={() => (atProductLimit ? upgradeToast('add more products') : onDuplicate())}>
          <span className="flex items-center gap-1.5">
            Duplicate
            {atProductLimit && <LockedBadge size={12} />}
          </span>
        </DropdownMenuItem>
      )}
      {canEdit && (
        <DropdownMenuItem onSelect={() => (atProductLimit ? upgradeToast('add more products') : onCreateStockProduct())}>
          <span className="flex items-center gap-1.5">
            Create Stock Product
            {atProductLimit && <LockedBadge size={12} />}
          </span>
        </DropdownMenuItem>
      )}
      {canDelete && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onDelete} danger>
            Delete
          </DropdownMenuItem>
        </>
      )}
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
          <RadixDropdown.Label className="px-4 pb-1 pt-1.5 text-xs font-medium text-neutral-500">Columns to show</RadixDropdown.Label>
          {COLUMN_OPTIONS.map((c) => (
            <RadixDropdown.CheckboxItem
              key={c.key}
              checked={columns[c.key]}
              // Keep the menu open so several columns can be toggled in one go.
              onSelect={(e) => {
                e.preventDefault();
                onToggle(c.key);
              }}
              className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-2 text-sm text-regantify-text outline-none data-[highlighted]:bg-neutral-50"
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  columns[c.key] ? 'border-brand bg-brand text-white' : 'border-neutral-300'
                }`}
              >
                {columns[c.key] && <Check size={11} strokeWidth={3} />}
              </span>
              {c.label}
            </RadixDropdown.CheckboxItem>
          ))}
          <RadixDropdown.Separator className="my-1 h-px bg-line" />
          <RadixDropdown.Item
            onSelect={(e) => {
              e.preventDefault();
              onReset();
            }}
            className="mx-2 mb-1 cursor-pointer rounded-lg border border-line py-1.5 text-center text-xs font-medium text-regantify-text outline-none data-[highlighted]:bg-neutral-50"
          >
            Reset columns
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

function StatusBadge({ visibility, publishAt, unpublishAt }: { visibility: Product['visibility']; publishAt?: string | null; unpublishAt?: string | null }) {
  // A Draft that goes live by itself, or a Public that hides by itself (Status card > Schedule).
  const when = visibility === 'DRAFT' ? publishAt : unpublishAt;
  const note = when ? (
    <span className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500" title="Scheduled, Dhaka time">
      <Clock size={11} aria-hidden />
      {visibility === 'DRAFT' ? 'Live ' : 'Hides '}
      {formatDhakaDateTime(when)}
    </span>
  ) : null;
  return (
    <>
      {visibility === 'PUBLIC' ? (
        <span className={`${badge} border-green-200 bg-green-50 text-green-700`}>Public</span>
      ) : (
        <span className={`${badge} border-neutral-200 bg-neutral-50 text-neutral-600`}>Draft</span>
      )}
      {note}
    </>
  );
}

/**
 * Quick edit for the Price and Stock cells: click the value, type, Enter (or click away) saves
 * through the normal product update, Esc cancels. Products with variations keep these on the
 * Edit page, since each variation has its own price and stock there.
 */
function QuickEditCell({
  productId,
  field,
  value,
  display,
  editable,
}: {
  productId: string;
  field: 'price' | 'stockQuantity';
  value: number | null;
  display: ReactNode;
  editable: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const save = useMutation({
    mutationFn: (next: number | null) => productsApi.update(productId, { [field]: next }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(field === 'price' ? 'Price updated.' : 'Stock updated.');
      setEditing(false);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : message || 'Could not save. Please try again.');
    },
  });

  if (!editable) return <>{display}</>;
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value === null ? '' : String(value));
          setEditing(true);
        }}
        title={field === 'price' ? 'Click to change the price' : 'Click to change the stock (empty = unlimited)'}
        className="-mx-1.5 rounded px-1.5 py-0.5 text-left hover:bg-neutral-100 hover:ring-1 hover:ring-line"
      >
        {display}
      </button>
    );
  }

  const commit = () => {
    const text = draft.trim();
    if (field === 'price') {
      if (!text || Number(text) < 0) {
        toast.error('Enter a price.');
        return;
      }
      if (Number(text) === value) return setEditing(false);
      save.mutate(Number(text));
    } else {
      const next = text ? Math.floor(Number(text)) : null; // empty = unlimited
      if (next === value) return setEditing(false);
      save.mutate(next);
    }
  };

  return (
    <input
      autoFocus
      type="number"
      inputMode={field === 'price' ? 'decimal' : 'numeric'}
      min={0}
      value={draft}
      disabled={save.isPending}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
      }}
      placeholder={field === 'stockQuantity' ? 'Unlimited' : undefined}
      aria-label={field === 'price' ? 'Price' : 'Stock'}
      className="w-24 rounded-md border border-brand px-2 py-1 text-sm outline-none disabled:opacity-60"
    />
  );
}

export default function AllProducts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // What this person's role can do here (rule-plan.md Step 10); the server checks each again.
  const canEditProducts = useCan('products.edit');
  const canDeleteProducts = useCan('products.delete');
  // Quick price edit also needs the price permission (the server checks it too).
  const canChangePrices = useCan('products.price');
  const canEditPrice = canEditProducts && canChangePrices;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<VisibilityFilter>('ALL');
  const [stockType, setStockType] = useState<StockFilter>('ALL');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusModalProduct, setStatusModalProduct] = useState<Product | null>(null);
  const [stockProductModalId, setStockProductModalId] = useState<string | null>(null);
  // Print labels: the products whose barcode/price labels are being printed (one from the row menu, or the selection).
  const [labelProductIds, setLabelProductIds] = useState<string[] | null>(null);
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
      setPendingDelete(null);
      toast.success('Product deleted.');
    },
    onError: () => toast.error('Could not delete the product. Please try again.'),
  });

  // Bulk bar "Make Public" / "Make Draft": the same visibility change as Change Status, for every
  // selected product (e.g. hide a season's products at once).
  const [bulkVisibility, setBulkVisibility] = useState(false);
  // Bulk bar "Schedule": go live / hide the selected products by themselves at a time.
  const [scheduleOpen, setScheduleOpen] = useState(false);
  async function handleBulkVisibility(visibility: 'PUBLIC' | 'DRAFT') {
    const ids = Array.from(selected);
    setBulkVisibility(true);
    const results = await Promise.allSettled(ids.map((id) => productsApi.updateVisibility(id, visibility)));
    setBulkVisibility(false);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    const failed = results.filter((r) => r.status === 'rejected').length;
    const done = ids.length - failed;
    const word = visibility === 'PUBLIC' ? 'Public' : 'Draft';
    if (failed === 0) {
      toast.success(`${done} ${done === 1 ? 'product' : 'products'} set to ${word}.`);
      setSelected(new Set());
    } else {
      toast.error(`${done} set to ${word}, ${failed} failed. Please try again for the rest.`);
    }
  }

  // "Duplicate": the copy opens in Edit Product so only what differs needs changing.
  const duplicateMutation = useMutation({
    mutationFn: productsApi.duplicate,
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Copy created as a Draft. Change what’s different, then set it to Public.');
      navigate(`/vendor/product/edit/${copy.id}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not duplicate the product. Please try again.')),
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

  // Asked in a ConfirmDialog (below) before anything is deleted.
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'one'; id: string; name: string } | { kind: 'bulk' } | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const handleDelete = (id: string, name: string) => setPendingDelete({ kind: 'one', id, name });

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
    if (selected.size > 0) setPendingDelete({ kind: 'bulk' });
  };

  const runBulkDelete = () => {
    const count = selected.size;
    setBulkDeleting(true);
    // Promise.allSettled, not Promise.all: with N independent DELETE calls,
    // one failing (e.g. a network blip) must not hide that the others
    // already succeeded server-side. This always refreshes the list and
    // reports exactly how many succeeded.
    Promise.allSettled(Array.from(selected).map((id) => productsApi.remove(id))).then((results) => {
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      setSelected(new Set());
      setBulkDeleting(false);
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (failed === 0) {
        toast.success(`${succeeded} ${succeeded === 1 ? 'product' : 'products'} deleted.`);
      } else if (succeeded === 0) {
        toast.error('Could not delete the selected products. Please try again.');
      } else {
        toast.error(`Deleted ${succeeded} of ${count}; ${failed} failed. Please try again for the rest.`);
      }
    });
  };

  const activeFilterCount = (category ? 1 : 0) + (visibility !== 'ALL' ? 1 : 0) + (stockType !== 'ALL' ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setVisibility('ALL');
    setStockType('ALL');
  };

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

          <SearchBox value={search} onChange={setSearch} placeholder="Search products" />

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

          {canEditProducts && (
          <>
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
          </>
          )}
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
                onClick={() => setLabelProductIds(Array.from(selected))}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text hover:bg-neutral-50"
              >
                <Printer size={13} aria-hidden />
                Print labels
              </button>
              {canEditProducts && (
                <>
                  <button
                    onClick={() => handleBulkVisibility('PUBLIC')}
                    disabled={bulkVisibility}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Make Public
                  </button>
                  <button
                    onClick={() => handleBulkVisibility('DRAFT')}
                    disabled={bulkVisibility}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Make Draft
                  </button>
                  <button
                    onClick={() => setScheduleOpen(true)}
                    disabled={bulkVisibility}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
                  >
                    <Clock size={13} aria-hidden />
                    Schedule
                  </button>
                </>
              )}
              {canDeleteProducts && (
                <button
                  onClick={handleBulkDelete}
                  className="h-8 rounded-lg border border-red-200 bg-white px-3 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete Selected ({selected.size})
                </button>
              )}
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
                      <QuickEditCell
                        productId={p.id}
                        field="stockQuantity"
                        value={p.stockQuantity ?? null}
                        editable={canEditProducts && !p.variants?.length}
                        display={
                          p.stockQuantity === null || p.stockQuantity === undefined ? (
                            <InfinityIcon size={16} className="text-neutral-500" aria-label="Unlimited" />
                          ) : p.stockQuantity === 0 ? (
                            <span className="font-medium text-red-600">0</span>
                          ) : (
                            p.stockQuantity
                          )
                        }
                      />
                    </td>
                  )}
                  {columns.price && (
                    <td className={`${td} ${cellY} whitespace-nowrap font-medium`}>
                      <QuickEditCell
                        productId={p.id}
                        field="price"
                        value={Number(p.price)}
                        editable={canEditPrice && !p.variants?.length}
                        display={`৳${Number(p.price).toLocaleString('en-US')}`}
                      />
                    </td>
                  )}
                  {columns.status && (
                    <td className={`${td} ${cellY} whitespace-nowrap`}>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge visibility={p.visibility} publishAt={p.publishAt} unpublishAt={p.unpublishAt} />
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
                      onDuplicate={() => duplicateMutation.mutate(p.id)}
                      onPrintLabels={() => setLabelProductIds([p.id])}
                      atProductLimit={atProductLimit}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TableFooter page={page} perPage={perPage} total={total} onPageChange={setPage} onPerPageChange={setPerPage} />
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

      {scheduleOpen && (
        <ScheduleProductsDialog
          open
          onOpenChange={(open) => !open && setScheduleOpen(false)}
          products={products.filter((p) => selected.has(p.id))}
          onDone={() => setSelected(new Set())}
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

      {labelProductIds && <PrintLabelsDialog productIds={labelProductIds} onClose={() => setLabelProductIds(null)} />}

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={
          pendingDelete?.kind === 'bulk'
            ? `Delete ${selected.size} ${selected.size === 1 ? 'product' : 'products'}?`
            : `Delete ${pendingDelete?.kind === 'one' ? pendingDelete.name : 'product'}?`
        }
        message="They disappear from your store and your product list. This can’t be undone. Orders that already have them keep their details."
        confirmLabel={pendingDelete?.kind === 'bulk' ? `Delete ${selected.size} ${selected.size === 1 ? 'product' : 'products'}` : 'Delete product'}
        onConfirm={() => {
          if (pendingDelete?.kind === 'bulk') runBulkDelete();
          else if (pendingDelete?.kind === 'one') deleteMutation.mutate(pendingDelete.id);
        }}
        busy={deleteMutation.isPending || bulkDeleting}
        danger
      />
    </div>
  );
}
