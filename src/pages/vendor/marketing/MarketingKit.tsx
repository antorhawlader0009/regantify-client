import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, MoreVertical, Plus, Search, Sparkles, X, type LucideIcon } from 'lucide-react';
import { Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { Segmented } from '../../../components/product/ProductFormKit';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../../components/ui/DropdownMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import {
  EmptyState,
  PageHeader,
  PageSection,
  SearchBox,
  StackedList,
  TableFooter,
  TableFrame,
  TableSkeleton,
  iconBtn,
  primaryBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';
import { productsApi } from '../../../lib/productsApi';
import { categoriesApi } from '../../../lib/categoriesApi';
import { customersApi } from '../../../lib/customersApi';
import { toLatinDigits } from '../../../lib/bdPhone';
import { formatDhakaDate, formatDhakaDateTime } from '../../../lib/dhakaDate';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';
import type { StaffPermission } from '../../../lib/staffPermissions';

// Shared pieces of the five Marketing pages (theme-update-plan.md Step 7):
// Coupons, Discounts, Flash Sale, Campaigns, Gift Cards. Same list and
// form pattern five times, so it lives here once.

// ------------------------------------------------------------------ format

/** ৳1,250 (drops .00). */
export function taka(value: number | string | null | undefined): string {
  return `৳${Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** ISO -> the local "yyyy-MM-ddTHH:mm" a datetime-local input wants. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A datetime-local value `days` from now; `endOfDay` snaps to 11:59 PM that day. */
function localInputIn(days: number, endOfDay = false) {
  const d = new Date(Date.now() + days * 24 * 60 * 60_000);
  if (endOfDay) d.setHours(23, 59, 0, 0);
  return toLocalInput(d.toISOString());
}

export async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error('Couldn’t copy. Select the text and copy it yourself.');
  }
}

/** Numbers a seller might type with Bangla digits. */
export const latinNumber = (v: string) => toLatinDigits(v);

// ------------------------------------------------------------------ status

export type PromoStatus = 'active' | 'scheduled' | 'ended' | 'off' | 'usedUp';

/** Active / Scheduled / Ended from the on-off switch, the dates and (coupons) the usage limit. */
export function promoStatus(p: {
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  usageCount?: number;
}): PromoStatus {
  const now = Date.now();
  if (p.endsAt && new Date(p.endsAt).getTime() <= now) return 'ended';
  if (!p.active) return 'off';
  if (p.usageLimit && (p.usageCount ?? 0) >= p.usageLimit) return 'usedUp';
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return 'scheduled';
  return 'active';
}

const STATUS_STYLE: Record<PromoStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  scheduled: { label: 'Scheduled', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  ended: { label: 'Ended', className: 'border-line bg-neutral-50 text-neutral-600' },
  off: { label: 'Off', className: 'border-line bg-neutral-50 text-neutral-600' },
  usedUp: { label: 'Used up', className: 'border-amber-200 bg-amber-50 text-amber-700' },
};

export function PromoStatusBadge({ status }: { status: PromoStatus }) {
  const s = STATUS_STYLE[status];
  return <span className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium ${s.className}`}>{s.label}</span>;
}

/** "Until 30 Oct" / "From 5 Oct" / "5 Oct – 30 Oct" / "No end date". */
export function scheduleText(startsAt?: string | null, endsAt?: string | null) {
  const future = startsAt && new Date(startsAt).getTime() > Date.now();
  if (future && endsAt) return `${formatDhakaDate(startsAt!)} – ${formatDhakaDate(endsAt)}`;
  if (future) return `From ${formatDhakaDateTime(startsAt!)}`;
  if (endsAt) return `${new Date(endsAt).getTime() <= Date.now() ? 'Ended' : 'Until'} ${formatDhakaDateTime(endsAt)}`;
  return 'No end date';
}

// ------------------------------------------------------------------ list

/** The row's ⋮ menu: Edit, turn on/off, Delete (the caller confirms). */
export function PromoRowMenu({
  name,
  onEdit,
  active,
  onToggleActive,
  onDelete,
  extra,
  editPermission = 'marketing.edit',
}: {
  name: string;
  onEdit: () => void;
  active?: boolean;
  onToggleActive?: () => void;
  onDelete: () => void;
  extra?: ReactNode;
  /** What changing this needs (rule-plan.md Step 10): marketing.edit, or marketing.gift_cards for gift cards. */
  editPermission?: StaffPermission;
}) {
  const canEdit = useCan(editPermission);
  const trigger = (
    <button aria-label={`Actions for ${name}`} title="Actions" className={`${iconBtn} h-9 w-9 md:h-auto md:w-auto`}>
      <MoreVertical size={14} />
    </button>
  );
  // A read-only role keeps only the harmless extras (copy code / link), or no menu at all.
  if (!canEdit) return extra ? <DropdownMenu trigger={trigger}>{extra}</DropdownMenu> : null;
  return (
    <DropdownMenu trigger={trigger}>
      <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
      {extra}
      {onToggleActive && <DropdownMenuItem onSelect={onToggleActive}>{active ? 'Turn off' : 'Turn on'}</DropdownMenuItem>}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onDelete} danger>
        Delete
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

/**
 * The usual row menu with its own work: Edit, Turn on / off (when
 * `setActive` is given) and Delete behind a confirm that says what
 * happens. Toasts use the button's words.
 */
export function StandardPromoMenu({
  name,
  kind,
  editTo,
  queryKey,
  active,
  setActive,
  remove,
  deleteMessage,
  extra,
  editPermission,
}: {
  editPermission?: StaffPermission;
  name: string;
  /** "coupon", "discount", "flash sale"… */
  kind: string;
  editTo: string;
  queryKey: string;
  active?: boolean;
  setActive?: (next: boolean) => Promise<unknown>;
  remove: () => Promise<unknown>;
  deleteMessage: string;
  extra?: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const Kind = kind.charAt(0).toUpperCase() + kind.slice(1);

  const activeMutation = useMutation({
    mutationFn: () => setActive!(!active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast.success(active ? `${Kind} turned off` : `${Kind} turned on`);
    },
    onError: () => toast.error(`Couldn’t change this ${kind}. Try again in a minute.`),
  });
  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setConfirming(false);
      toast.success(`${Kind} deleted`);
    },
    onError: () => toast.error(`Couldn’t delete this ${kind}. Try again in a minute.`),
  });

  return (
    <>
      <PromoRowMenu
        name={name}
        onEdit={() => navigate(editTo)}
        active={active}
        onToggleActive={setActive ? () => activeMutation.mutate() : undefined}
        onDelete={() => setConfirming(true)}
        extra={extra}
        editPermission={editPermission}
      />
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${kind} “${name}”?`}
        message={deleteMessage}
        confirmLabel={`Delete ${kind}`}
        onConfirm={() => deleteMutation.mutate()}
        busy={deleteMutation.isPending}
        danger
      />
    </>
  );
}

/**
 * A whole Marketing list page: header with the Add button, search, a
 * hairline table on desktop and a stacked list on phones, empty states
 * that offer the first Add, and the footer. `Menu` is a component so it
 * can hold its own mutations and confirm dialog.
 */
export function PromoListPage<T extends { id: string }>({
  title,
  description,
  addTo,
  addLabel,
  icon,
  searchPlaceholder,
  emptyHint,
  queryKey,
  fetchPage,
  columns,
  mobile,
  editPath,
  Menu,
  editPermission = 'marketing.edit',
}: {
  /** What adding or changing these needs (rule-plan.md Step 10). */
  editPermission?: StaffPermission;
  title: string;
  description: string;
  addTo: string;
  addLabel: string;
  icon: LucideIcon;
  searchPlaceholder: string;
  emptyHint: string;
  queryKey: string;
  fetchPage: (q: { search?: string; page: number; perPage: number }) => Promise<{ items: T[]; total: number }>;
  columns: { header: string; cell: (item: T) => ReactNode; className?: string }[];
  mobile: (item: T) => { title: ReactNode; badge?: ReactNode; lines: ReactNode[] };
  editPath: (item: T) => string;
  Menu: ComponentType<{ item: T }>;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => setPage(1), [search, perPage]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [queryKey, { search, page, perPage }],
    queryFn: () => fetchPage({ search: search.trim() || undefined, page, perPage }),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const colSpan = columns.length + 1;

  const canEdit = useCan(editPermission);
  const addButton = canEdit ? (
    <Link to={addTo} className={primaryBtn}>
      <Plus size={15} aria-hidden />
      {addLabel}
    </Link>
  ) : undefined;
  const empty = search.trim()
    ? { title: `No ${title.toLowerCase()} match`, hint: 'Try another search.', action: undefined }
    : { title: `No ${title.toLowerCase()} yet`, hint: emptyHint, action: addButton };

  return (
    <PageSection>
      <PageHeader title={title} description={description} actions={addButton} />
      <div className="mb-3">
        <SearchBox value={search} onChange={setSearch} placeholder={searchPlaceholder} />
      </div>

      <div className={`transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <div className="hidden md:block">
          <TableFrame minWidth="min-w-[760px]">
            <thead>
              <tr className={theadRow}>
                {columns.map((c) => (
                  <th key={c.header} className={`${th} ${c.className ?? ''}`}>
                    {c.header}
                  </th>
                ))}
                <th className={`${th} w-12`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton rows={5} colSpan={colSpan} />
              ) : items.length === 0 ? (
                <EmptyState as="row" colSpan={colSpan} icon={icon} title={empty.title} hint={empty.hint} action={empty.action} />
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={trClass()}>
                    {columns.map((c) => (
                      <td key={c.header} className={`${td} ${c.className ?? ''}`}>
                        {c.cell(item)}
                      </td>
                    ))}
                    <td className={td}>
                      <Menu item={item} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </TableFrame>
        </div>

        <div className="md:hidden">
          {isLoading ? (
            <div className="space-y-2" aria-busy>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-line">
              <EmptyState icon={icon} title={empty.title} hint={empty.hint} action={empty.action} />
            </div>
          ) : (
            <StackedList>
              {items.map((item) => {
                const m = mobile(item);
                return (
                  <li key={item.id} className="flex items-start gap-2 px-3 py-3">
                    <button type="button" disabled={!canEdit} onClick={() => navigate(editPath(item))} className="min-w-0 flex-1 text-left disabled:cursor-default">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-regantify-text">{m.title}</span>
                        {m.badge}
                      </div>
                      {m.lines.filter(Boolean).map((line, i) => (
                        <p key={i} className={`mt-0.5 truncate text-xs ${i === 0 ? 'text-neutral-600' : 'text-neutral-500'}`}>
                          {line}
                        </p>
                      ))}
                    </button>
                    <Menu item={item} />
                  </li>
                );
              })}
            </StackedList>
          )}
        </div>

        {total > 0 && <TableFooter page={page} perPage={perPage} total={total} onPageChange={setPage} onPerPageChange={setPerPage} />}
      </div>
    </PageSection>
  );
}

// ------------------------------------------------------------------ form

/** "← Coupons", the 15px title and one help line. */
export function FormHeader({ backTo, backLabel, title, description }: { backTo: string; backLabel: string; title: string; description: ReactNode }) {
  return (
    <div className="mb-4">
      <Link to={backTo} className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
        <ChevronLeft size={16} aria-hidden />
        {backLabel}
      </Link>
      <h1 className="text-[15px] font-semibold text-regantify-text">{title}</h1>
      <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
    </div>
  );
}

/** The live sentence of what the shopper gets, in a lime box. */
export function OfferSummary({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-brand-lime bg-brand-lime/25 px-3 py-2.5 text-sm text-regantify-text" aria-live="polite">
      <Sparkles size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

/** A segmented discount-type switch. */
export function DiscountTypePicker<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-regantify-text">Discount type</p>
      <Segmented<T> ariaLabel="Discount type" value={value} onChange={onChange} options={options} />
    </div>
  );
}

/** A number field with ৳ or % in front. Bangla digits are turned into 0-9. */
export function UnitInput({
  unit,
  value,
  onChange,
  placeholder,
  ariaLabel,
  integer,
}: {
  unit: '৳' | '%' | null;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  integer?: boolean;
}) {
  return (
    <div className="relative">
      {unit && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-500">{unit}</span>}
      <input
        type="number"
        inputMode={integer ? 'numeric' : 'decimal'}
        min={0}
        step={integer ? 1 : 'any'}
        value={value}
        onChange={(e) => onChange(latinNumber(e.target.value))}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`${productInputClass} ${unit ? 'pl-8' : ''}`}
      />
    </div>
  );
}

function ShortcutChip({ children, onClick, on }: { children: ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-full border px-3 text-xs transition-colors ${on ? 'border-brand bg-brand-lime font-medium text-regantify-text' : 'border-line text-neutral-600 hover:bg-neutral-50'}`}
    >
      {children}
    </button>
  );
}

/**
 * A start or end date-time with shortcuts ("Start now", "Ends in 7
 * days", "No end"). `kind: 'date'` keeps a plain date (coupons' valid-till).
 */
export function DateField({
  label,
  value,
  onChange,
  role,
  optional,
  kind = 'datetime',
  hint,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  role: 'start' | 'end';
  optional?: boolean;
  kind?: 'datetime' | 'date';
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
}) {
  const asKind = (v: string) => (kind === 'date' ? v.slice(0, 10) : v);
  const shortcuts: { label: string; value: string }[] =
    role === 'start'
      ? [
          { label: 'Start now', value: asKind(toLocalInput(new Date().toISOString())) },
          { label: 'Tomorrow', value: asKind(`${localInputIn(1).slice(0, 10)}T00:00`) },
        ]
      : [
          { label: 'Ends today', value: asKind(localInputIn(0, true)) },
          { label: 'In 7 days', value: asKind(localInputIn(7, true)) },
          { label: 'In 30 days', value: asKind(localInputIn(30, true)) },
        ];

  return (
    <Field label={label} required={required} hint={hint} error={error}>
      <input type={kind === 'date' ? 'date' : 'datetime-local'} value={value} onChange={(e) => onChange(e.target.value)} className={productInputClass} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {shortcuts.map((s) => (
          <ShortcutChip key={s.label} onClick={() => onChange(s.value)} on={value === s.value}>
            {s.label}
          </ShortcutChip>
        ))}
        {optional && (
          <ShortcutChip onClick={() => onChange('')} on={!value}>
            {role === 'start' ? 'Right away' : 'No end'}
          </ShortcutChip>
        )}
      </div>
    </Field>
  );
}

// ------------------------------------------------------------------ pickers

export interface PickedItem {
  id: string;
  label: string;
  sub?: string;
  photoUrl?: string | null;
  /** Products: the regular price, for previews. */
  price?: number;
}

/**
 * Search box + picked items as rows with a remove button. `results` are
 * the matches for `query` (the caller fetches them); picked ones are
 * left out of the list.
 */
function PickerBase({
  label,
  placeholder,
  selected,
  onChange,
  query,
  onQuery,
  results,
  renderExtra,
  error,
  emptyText,
}: {
  label: string;
  placeholder: string;
  selected: PickedItem[];
  onChange: (items: PickedItem[]) => void;
  query: string;
  onQuery: (q: string) => void;
  results: PickedItem[];
  renderExtra?: (item: PickedItem) => ReactNode;
  error?: string | null;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const matches = results.filter((r) => !selected.some((s) => s.id === r.id)).slice(0, 8);

  return (
    <Field label={label} error={error}>
      {selected.length > 0 && (
        <ul className="mb-2 divide-y divide-line overflow-hidden rounded-lg border border-line">
          {selected.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5 px-3 py-2">
              {item.photoUrl !== undefined && (
                <span className="h-8 w-8 shrink-0 overflow-hidden rounded bg-neutral-100">
                  {item.photoUrl && <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-regantify-text">{item.label}</p>
                {item.sub && <p className="truncate text-xs text-neutral-500">{item.sub}</p>}
              </div>
              {renderExtra?.(item)}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s.id !== item.id))}
                aria-label={`Remove ${item.label}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-red-50 hover:text-red-600"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`${productInputClass} pl-10`}
        />
        {open && (matches.length > 0 || (emptyText && query.trim())) && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg">
            {matches.length === 0 ? (
              <p className="px-3.5 py-2.5 text-sm text-neutral-500">{emptyText}</p>
            ) : (
              matches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={() => {
                    onChange([...selected, item]);
                    onQuery('');
                  }}
                  className="flex min-h-10 w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-regantify-text hover:bg-neutral-50"
                >
                  {item.photoUrl !== undefined && (
                    <span className="h-7 w-7 shrink-0 overflow-hidden rounded bg-neutral-100">
                      {item.photoUrl && <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.sub && <span className="shrink-0 text-xs text-neutral-500">{item.sub}</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

/** Pick products by searching their names. */
export function ProductPicker({
  label = 'Products',
  ...props
}: {
  selected: PickedItem[];
  onChange: (items: PickedItem[]) => void;
  label?: string;
  renderExtra?: (item: PickedItem) => ReactNode;
  error?: string | null;
}) {
  const [query, setQuery] = useState('');
  const { data } = useQuery({
    queryKey: ['products-search', query],
    queryFn: () => productsApi.list({ search: query.trim(), perPage: 8 }),
    enabled: query.trim().length > 0,
  });
  const results: PickedItem[] = (data?.products ?? []).map((p) => ({
    id: p.id,
    label: p.name,
    sub: taka(p.price),
    photoUrl: p.photoUrls[0] ?? null,
    price: Number(p.price),
  }));
  return (
    <PickerBase
      label={label}
      placeholder="Search products to add"
      emptyText="No products match."
      query={query}
      onQuery={setQuery}
      results={results}
      {...props}
    />
  );
}

/** Pick categories (the list is small, so it filters locally). */
export function CategoryPicker(props: { selected: PickedItem[]; onChange: (items: PickedItem[]) => void; error?: string | null }) {
  const [query, setQuery] = useState('');
  const { data } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() });
  const term = query.trim().toLowerCase();
  const results: PickedItem[] = (data ?? []).filter((c) => !term || c.name.toLowerCase().includes(term)).map((c) => ({ id: c.id, label: c.name }));
  return <PickerBase label="Categories" placeholder="Search categories to add" emptyText="No categories match." query={query} onQuery={setQuery} results={results} {...props} />;
}

/** Pick customers by name or phone; the id is the phone. */
export function CustomerPicker(props: { selected: PickedItem[]; onChange: (items: PickedItem[]) => void; error?: string | null }) {
  const [query, setQuery] = useState('');
  const { data } = useQuery({
    queryKey: ['customers-search', query],
    queryFn: () => customersApi.list({ search: toLatinDigits(query.trim()), perPage: 8 }),
    enabled: query.trim().length > 0,
  });
  const results: PickedItem[] = (data?.customers ?? []).map((c) => ({ id: c.phone, label: c.name, sub: c.phone }));
  return <PickerBase label="Customers" placeholder="Search by name or phone" emptyText="No customers match." query={query} onQuery={setQuery} results={results} {...props} />;
}

/** A checkbox row that shows its picker underneath when ticked. */
export function LimitOption({ checked, onChange, label, hint, children }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; children?: ReactNode }) {
  return (
    <div>
      <label className="flex min-h-10 cursor-pointer items-start gap-2.5 py-1 text-sm text-regantify-text">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand" />
        <span>
          {label}
          {hint && <span className="mt-0.5 block text-xs text-neutral-500">{hint}</span>}
        </span>
      </label>
      {checked && children && <div className="mb-2 mt-1 pl-[26px]">{children}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ offer sentence

/**
 * "৳100 off orders over ৳1,000, until 30 Oct." — what the shopper gets,
 * built from the form as it's filled in.
 */
export function offerSentence(o: {
  type: 'FIXED' | 'PERCENT' | 'FREE_SHIPPING';
  amount: string;
  maxDiscount?: string;
  minCart?: string;
  minQuantity?: string;
  scope?: string;
  who?: string;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: string;
}): string {
  const amount = Number(o.amount);
  const what =
    o.type === 'FREE_SHIPPING'
      ? 'Free delivery'
      : !amount
        ? null
        : o.type === 'PERCENT'
          ? `${amount}% off${o.maxDiscount && Number(o.maxDiscount) > 0 ? ` (up to ${taka(o.maxDiscount)})` : ''}`
          : `${taka(amount)} off`;
  if (!what) return 'Fill in the discount to see what the shopper gets.';
  const parts = [what];
  parts.push(o.scope ? `on ${o.scope}` : o.type === 'FREE_SHIPPING' ? 'on the order' : 'on the whole order');
  const conditions: string[] = [];
  if (o.minCart && Number(o.minCart) > 0) conditions.push(`orders over ${taka(o.minCart)}`);
  if (o.minQuantity && Number(o.minQuantity) > 0) conditions.push(`${o.minQuantity} or more items`);
  if (conditions.length) parts.push(`for ${conditions.join(' with ')}`);
  if (o.who) parts.push(o.who);
  const fmt = (v: string) => (v.length <= 10 ? formatDhakaDate(`${v}T23:59:00`) : formatDhakaDate(new Date(v).toISOString()));
  if (o.startsAt && new Date(o.startsAt).getTime() > Date.now()) parts.push(`from ${fmt(o.startsAt)}`);
  if (o.endsAt) parts.push(`until ${fmt(o.endsAt)}`);
  let sentence = `${parts.join(' ')}.`;
  if (o.usageLimit && Number(o.usageLimit) > 0) sentence += ` Can be used ${o.usageLimit} ${Number(o.usageLimit) === 1 ? 'time' : 'times'}.`;
  return sentence;
}

/** "3 products" / "2 categories" / "3 products and 2 categories". */
export function scopeText(products: number, categories: number) {
  const parts: string[] = [];
  if (products) parts.push(`${products} ${products === 1 ? 'product' : 'products'}`);
  if (categories) parts.push(`${categories} ${categories === 1 ? 'category' : 'categories'}`);
  return parts.join(' and ') || undefined;
}
