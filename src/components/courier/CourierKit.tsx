import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  MoreVertical,
  PackageSearch,
  PlugZap,
  RefreshCw,
} from 'lucide-react';
import type { CourierAccountProvider, PathaoParcel, PathaoStats, PathaoStatsRange } from '../../lib/courierApi';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { formatDhakaDate } from '../../lib/dhakaDate';
import { DropdownMenu } from '../ui/DropdownMenu';
import { LockedFeatureCard } from '../ui/UpgradePrompt';
import {
  EmptyState,
  PillTabs,
  SearchBox,
  StackedList,
  TableFooter,
  TableFrame,
  TableSkeleton,
  iconBtn,
  outlineBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../ui/PageKit';
import { BookingsTrendChart } from './BookingsTrendChart';
import { CourierStatusBadge } from './courierStatus';
import { DateRangeFilter } from '../../pages/vendor/order/DateRangeFilter';
import { OrderStatusBadge } from '../../pages/vendor/order/orderStatus';

// The one shape every courier page uses (theme-update-plan.md Step 5):
// a connection card on top, then Dashboard / Parcels / Settings as lime
// pill tabs. Learn one courier's page and you know all three.

// ------------------------------------------------------------------ formatting

/** ৳1,250 (or ৳1,250.50). Money from the API comes as numbers or decimal strings. */
export function formatTaka(value: number | string | null | undefined): string {
  if (value == null) return '—';
  return `৳${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** "5 min ago" / "3 h ago" / a date — how fresh a courier status is. */
export function formatAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return formatDhakaDate(iso);
}

export async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error('Couldn’t copy. Select the text and copy it yourself.');
  }
}

export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// ------------------------------------------------------------------ page shell

export type CourierTab = 'dashboard' | 'parcels' | 'settings';
const TAB_IDS: CourierTab[] = ['dashboard', 'parcels', 'settings'];

/**
 * The active tab, kept in `?tab=`. Not connected → always Settings (the
 * other tabs have nothing to show yet). No `?tab=` → `landing`.
 */
export function useCourierTab(connected: boolean | undefined, landing: CourierTab): [CourierTab, (tab: CourierTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as CourierTab | null;
  const tab: CourierTab = connected === false ? 'settings' : requested && TAB_IDS.includes(requested) ? requested : landing;
  return [tab, (next) => setSearchParams({ tab: next })];
}

/** A courier page: back to the hub, title, connection card, tabs, then the tab's content. */
export function CourierPageShell({
  name,
  description,
  badge,
  connection,
  tab,
  onTabChange,
  connected,
  loading,
  error,
  onRetry,
  children,
}: {
  name: string;
  description: string;
  badge?: ReactNode;
  connection: ReactNode;
  tab: CourierTab;
  onTabChange: (tab: CourierTab) => void;
  connected: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <Link to="/vendor/courier" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
        <ChevronLeft size={16} aria-hidden />
        Courier integration
      </Link>
      <div className="mb-4">
        <h1 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-regantify-text">
          {name}
          {badge}
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
      </div>

      {loading ? (
        <div className="space-y-4" aria-busy>
          <div className="h-[72px] animate-pulse rounded-xl bg-neutral-100" />
          <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-64 animate-pulse rounded-xl bg-neutral-100" />
        </div>
      ) : error ? (
        <section className="rounded-xl border border-line bg-white">
          <EmptyState
            icon={PlugZap}
            title={`Couldn’t load your ${name} page`}
            hint="Check your internet connection, then try again."
            action={
              <button type="button" onClick={onRetry} className={outlineBtn}>
                <RefreshCw size={14} aria-hidden />
                Try again
              </button>
            }
          />
        </section>
      ) : (
        <>
          {connection}
          <PillTabs
            className="mt-4 mb-4"
            value={tab}
            onChange={(id) => (connected || id === 'settings' ? onTabChange(id) : undefined)}
            tabs={[
              { id: 'dashboard', label: connected ? 'Dashboard' : <span className="opacity-40">Dashboard</span> },
              { id: 'parcels', label: connected ? 'Parcels' : <span className="opacity-40">Parcels</span> },
              { id: 'settings', label: 'Settings' },
            ]}
          />
          {children}
        </>
      )}
    </div>
  );
}

/** "Upgrade to use this" in place of a tab, with a link to the plans. */
export function PlanLockedCard({ title, message }: { title: string; message: string }) {
  const navigate = useNavigate();
  return <LockedFeatureCard title={title} message={message} action={{ label: 'See plans', onClick: () => navigate('/vendor/billing') }} />;
}

/**
 * Top of every courier page: connected or not, which account, and a
 * "Test connection" button that asks the courier with the saved keys.
 */
export function ConnectionCard({
  connected,
  details,
  warning,
  onTest,
  notConnectedText,
}: {
  connected: boolean;
  /** Short facts shown after "Connected", e.g. API key, pickup store. */
  details?: { label: string; value: ReactNode }[];
  /** A problem that stops booking, e.g. no pickup store chosen. */
  warning?: ReactNode;
  /** Resolves with a short success line, throws with the reason it failed. */
  onTest?: () => Promise<string>;
  notConnectedText: string;
}) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const testMutation = useMutation({
    mutationFn: () => onTest!(),
    onSuccess: (text) => setResult({ ok: true, text }),
    onError: (err) =>
      setResult({ ok: false, text: apiErrorMessage(
          err,
          // Our own thrown messages read well; an axios one ("Request failed with status code 502") doesn't.
          err instanceof Error && !('isAxiosError' in err) && err.message ? err.message : 'The courier didn’t answer. Check your keys in Settings.',
        ) }),
  });

  if (!connected) {
    return (
      <section className="flex items-start gap-3 rounded-xl border border-line bg-white p-4">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-300" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium text-regantify-text">Not connected</p>
          <p className="mt-0.5 text-sm text-neutral-500">{notConnectedText}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        <div className="mr-auto min-w-0">
          <p className="text-sm font-medium text-regantify-text">Connected</p>
          {details && details.length > 0 && (
            <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {details.map((d) => (
                <div key={d.label} className="flex gap-1">
                  <dt className="text-neutral-500">{d.label}:</dt>
                  <dd className="text-regantify-text">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {onTest && (
          <button type="button" onClick={() => testMutation.mutate()} disabled={testMutation.isPending} className={`${outlineBtn} w-full sm:w-auto`}>
            <RefreshCw size={14} className={testMutation.isPending ? 'animate-spin' : ''} aria-hidden />
            {testMutation.isPending ? 'Testing…' : 'Test connection'}
          </button>
        )}
      </div>
      {result && (
        <p className={`animate-pop-in mt-2 flex items-start gap-1.5 text-sm ${result.ok ? 'text-emerald-700' : 'text-red-600'}`} role="status">
          {result.ok ? <Check size={15} className="mt-0.5 shrink-0" aria-hidden /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />}
          {result.text}
        </p>
      )}
      {warning && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          <div>{warning}</div>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ dashboard

export const RANGES: { id: PathaoStatsRange; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
];

export function rangeLabel(range: PathaoStatsRange) {
  return RANGES.find((r) => r.id === range)!.label.toLowerCase();
}

export function RangeTabs({ value, onChange }: { value: PathaoStatsRange; onChange: (range: PathaoStatsRange) => void }) {
  return <PillTabs className="w-fit" value={value} onChange={onChange} tabs={RANGES} />;
}

/** The numbers row: hairline tiles, 2 across on phones, 4 on desktop. `dim` while a new range loads. */
export function StatGrid({ children, dim }: { children: ReactNode; dim?: boolean }) {
  return <div className={`grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4 ${dim ? 'opacity-60' : ''}`}>{children}</div>;
}

export function StatTile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'danger' | 'good' }) {
  return (
    <div className={`min-w-0 rounded-xl border bg-white p-3.5 ${tone === 'danger' ? 'border-red-200' : 'border-line'}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p
        className={`mt-1 truncate text-xl font-semibold tabular-nums ${
          tone === 'danger' ? 'text-red-600' : tone === 'good' ? 'text-emerald-700' : 'text-regantify-text'
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[92px] animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-neutral-100" />
    </div>
  );
}

/** A white card with a 15px title (dashboard and settings sections). */
export function CourierCard({ title, description, action, children }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-regantify-text">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TrendCard({ data, courier, period }: { data: PathaoStats['trend']; courier: string; period: string }) {
  return (
    <CourierCard title="Bookings and deliveries per day" description={`Parcels sent to ${courier} and parcels delivered, ${period}.`}>
      {data.every((d) => d.booked === 0 && d.delivered === 0) ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          No {courier} bookings or deliveries {period}.
        </p>
      ) : (
        <BookingsTrendChart data={data} />
      )}
    </CourierCard>
  );
}

/** Orders that need the vendor: failed bookings, stuck parcels and the like. */
export function AttentionCard({ attention, onOpenParcels }: { attention: PathaoStats['attention']; onOpenParcels: () => void }) {
  return (
    <CourierCard
      title={attention.total > 0 ? `Needs attention (${attention.total})` : 'Needs attention'}
      action={
        attention.total > 0 && (
          <button type="button" onClick={onOpenParcels} className={outlineBtn}>
            See all
          </button>
        )
      }
    >
      {attention.items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 size={15} aria-hidden /> Nothing needs your attention.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {attention.items.map((item) => (
            <li key={item.id}>
              <Link to={`/vendor/orders/${item.id}`} className="flex items-start gap-3 px-3 py-2.5 hover:bg-neutral-50">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-regantify-text">{item.reason}</p>
                  {item.detail && <p className="mt-0.5 text-xs text-red-600">{item.detail}</p>}
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    ORDER-{item.invoiceNumber} · {item.customerName} · {item.customerPhone}
                    {item.courierConsignmentId && <> · {item.courierConsignmentId}</>}
                  </p>
                </div>
                <ChevronRight size={16} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CourierCard>
  );
}

export function DashboardError({ courier }: { courier: string }) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <EmptyState icon={AlertTriangle} title={`Couldn’t load your ${courier} numbers`} hint="Refresh the page to try again." />
    </section>
  );
}

// ------------------------------------------------------------------ parcels

/** A monospace ID that copies itself on tap. */
export function CopyId({ value, what }: { value: string | null; what: string }) {
  if (!value) return <span className="text-neutral-400">—</span>;
  return (
    <button
      type="button"
      onClick={() => copyText(value, what)}
      title={`Copy ${what.toLowerCase()}`}
      className="inline-flex items-center gap-1.5 font-mono text-[13px] text-regantify-text hover:text-brand"
    >
      {value}
      <Copy size={12} className="text-neutral-400" aria-hidden />
    </button>
  );
}

export interface ParcelIdColumn<P> {
  header: string;
  /** Used in "Tracking ID copied". */
  what: string;
  value: (parcel: P) => string | null;
}

interface ParcelsPage<P, G extends string> {
  items: P[];
  total: number;
  counts: Record<G | 'all', number>;
}

const PER_PAGE = 20;

/** The courier's own status (or "Pickup cancelled"), with our order status under it. */
function ParcelStatus({ parcel, provider }: { parcel: PathaoParcel; provider: CourierAccountProvider }) {
  return (
    <div className="flex flex-col items-start gap-1">
      {parcel.courierBookingStatus === 'CANCELLED' ? (
        <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">Pickup cancelled</span>
      ) : parcel.courierStatus ? (
        <CourierStatusBadge provider={provider} status={parcel.courierStatus} />
      ) : (
        <span className="text-xs text-neutral-500">Not checked yet</span>
      )}
      <OrderStatusBadge status={parcel.status} />
    </div>
  );
}

function CodCell({ parcel }: { parcel: PathaoParcel }) {
  const collectedDiffers =
    parcel.courierCollectedAmount != null && parcel.courierCodAmount != null && Number(parcel.courierCollectedAmount) !== Number(parcel.courierCodAmount);
  return (
    <>
      <span className="tabular-nums">{formatTaka(parcel.courierCodAmount)}</span>
      {collectedDiffers && <p className="text-xs text-amber-700">Collected {formatTaka(parcel.courierCollectedAmount)}</p>}
      {parcel.courierPaidAt && <p className="text-xs text-emerald-700">Paid out</p>}
    </>
  );
}

/** "Refresh status" for one parcel, shared by every courier's ⋮ menu. */
export function useRefreshParcel(parcelsKey: string, orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => courierApi.refreshStatus(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [parcelsKey] });
      queryClient.invalidateQueries({ queryKey: ['courier-events', orderId] });
      toast.success('Status refreshed');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t refresh the status. Try again in a minute.')),
  });
}

export type ParcelRefresh = ReturnType<typeof useRefreshParcel>;

/** The row's ⋮ menu. Holds the refresh mutation so it survives the menu closing. */
function ParcelMenu<P extends PathaoParcel>({
  parcel,
  parcelsKey,
  actions,
}: {
  parcel: P;
  parcelsKey: string;
  actions: (parcel: P, refresh: ParcelRefresh) => ReactNode;
}) {
  const refresh = useRefreshParcel(parcelsKey, parcel.id);
  return (
    <DropdownMenu
      trigger={
        <button aria-label={`Actions for ORDER-${parcel.invoiceNumber}`} title="Actions" className={`${iconBtn} h-9 w-9 md:h-auto md:w-auto`}>
          <MoreVertical size={14} />
        </button>
      }
    >
      {actions(parcel, refresh)}
    </DropdownMenu>
  );
}

/**
 * Parcels tab for any courier: group tabs with counts, search + dates,
 * a hairline table on desktop and a stacked list on phones, 20 a page.
 * `actions` renders the ⋮ menu items for one parcel; `refresh` is its
 * "Refresh status" mutation.
 */
export function CourierParcelsTable<P extends PathaoParcel, G extends string>({
  provider,
  courier,
  queryKey,
  fetchPage,
  groups,
  searchPlaceholder,
  idColumns,
  actions,
  children,
}: {
  provider: CourierAccountProvider;
  courier: string;
  queryKey: string;
  fetchPage: (query: { group?: G; q?: string; from?: string; to?: string; page: number; perPage: number }) => Promise<ParcelsPage<P, G>>;
  groups: { id: G | 'all'; label: string }[];
  searchPlaceholder: string;
  idColumns: ParcelIdColumn<P>[];
  actions: (parcel: P, refresh: ParcelRefresh) => ReactNode;
  /** Dialogs opened from the menu. */
  children?: ReactNode;
}) {
  const [group, setGroup] = useState<G | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const q = useDebounced(search.trim(), 300);
  useEffect(() => setPage(1), [group, q, dateFrom, dateTo]);

  const query = { group: group === 'all' ? undefined : group, q: q || undefined, from: dateFrom || undefined, to: dateTo || undefined, page, perPage: PER_PAGE };
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: [queryKey, query],
    queryFn: () => fetchPage(query),
    placeholderData: keepPreviousData,
  });

  const columnCount = 6 + idColumns.length;
  const filtered = Boolean(q || dateFrom || dateTo);
  const empty =
    data && data.items.length === 0
      ? data.counts.all === 0 && !filtered
        ? { title: `No ${courier} parcels yet`, hint: `Send an order to ${courier} from the Orders page and it shows up here.` }
        : { title: 'No parcels match', hint: 'Try another tab, a different search or clear the dates.' }
      : null;

  return (
    <section className="rounded-xl border border-line bg-white p-3.5">
      <PillTabs
        value={group}
        onChange={setGroup}
        tabs={groups.map((g) => ({ id: g.id, label: g.label, count: data?.counts[g.id] }))}
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBox value={search} onChange={setSearch} placeholder={searchPlaceholder} className="sm:w-[320px]" />
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }}
        />
      </div>

      {isError && !data ? (
        <div className="rounded-lg border border-line">
          <EmptyState icon={AlertTriangle} title="Couldn’t load your parcels" hint="Refresh the page to try again." />
        </div>
      ) : (
        <div className={`transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
          {/* Desktop */}
          <div className="hidden md:block">
            <TableFrame minWidth="min-w-[960px]">
              <thead>
                <tr className={theadRow}>
                  <th className={th}>Booked</th>
                  <th className={th}>Status</th>
                  <th className={th}>Customer</th>
                  {idColumns.map((c) => (
                    <th key={c.header} className={th}>
                      {c.header}
                    </th>
                  ))}
                  <th className={th}>COD</th>
                  <th className={th}>Delivery fee</th>
                  <th className={`${th} w-12`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton rows={6} colSpan={columnCount} height="h-10" />
                ) : empty ? (
                  <EmptyState as="row" colSpan={columnCount} icon={PackageSearch} title={empty.title} hint={empty.hint} />
                ) : (
                  data!.items.map((parcel) => (
                    <tr key={parcel.id} className={trClass()}>
                      <td className={`${td} whitespace-nowrap`}>
                        <Link to={`/vendor/orders/${parcel.id}`} className="font-medium text-brand hover:underline">
                          ORDER-{parcel.invoiceNumber}
                        </Link>
                        <p className="mt-0.5 text-xs text-neutral-500">{formatDhakaDate(parcel.courierBookedAt ?? parcel.createdAt)}</p>
                        <p className="text-xs text-neutral-400" title="Last status from the courier">
                          Updated {formatAgo(parcel.courierLastSyncedAt).toLowerCase()}
                        </p>
                      </td>
                      <td className={td}>
                        <ParcelStatus parcel={parcel} provider={provider} />
                      </td>
                      <td className={`${td} min-w-[150px]`}>
                        <p>{parcel.customerName}</p>
                        <p className="text-xs text-neutral-500">{parcel.customerPhone}</p>
                      </td>
                      {idColumns.map((c) => (
                        <td key={c.header} className={`${td} whitespace-nowrap`}>
                          <CopyId value={c.value(parcel)} what={c.what} />
                        </td>
                      ))}
                      <td className={`${td} whitespace-nowrap`}>
                        <CodCell parcel={parcel} />
                      </td>
                      <td className={`${td} whitespace-nowrap tabular-nums`}>{formatTaka(parcel.courierDeliveryFee)}</td>
                      <td className={td}>
                        <ParcelMenu parcel={parcel} parcelsKey={queryKey} actions={actions} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </TableFrame>
          </div>

          {/* Phones */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100" />
                ))}
              </div>
            ) : empty ? (
              <div className="rounded-lg border border-line">
                <EmptyState icon={PackageSearch} title={empty.title} hint={empty.hint} />
              </div>
            ) : (
              <StackedList>
                {data!.items.map((parcel) => {
                  const firstId = idColumns.map((c) => c.value(parcel)).find(Boolean);
                  return (
                    <li key={parcel.id} className="flex items-start gap-2 px-3 py-3">
                      <Link to={`/vendor/orders/${parcel.id}`} className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-brand">ORDER-{parcel.invoiceNumber}</span>
                          {parcel.courierBookingStatus === 'CANCELLED' ? (
                            <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">Pickup cancelled</span>
                          ) : parcel.courierStatus ? (
                            <CourierStatusBadge provider={provider} status={parcel.courierStatus} />
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-neutral-600">
                          {parcel.customerName} · {parcel.customerPhone}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          COD {formatTaka(parcel.courierCodAmount)}
                          {parcel.courierPaidAt && ' · paid out'}
                          {firstId && <> · {firstId}</>}
                        </p>
                      </Link>
                      <ParcelMenu parcel={parcel} parcelsKey={queryKey} actions={actions} />
                    </li>
                  );
                })}
              </StackedList>
            )}
          </div>

          {data && data.total > 0 && <TableFooter page={page} perPage={PER_PAGE} total={data.total} onPageChange={setPage} />}
        </div>
      )}
      {children}
    </section>
  );
}

// ------------------------------------------------------------------ settings

/** A read-only value with Copy (and Show/Hide for secrets), e.g. the webhook URL. */
export function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [shown, setShown] = useState(!secret);
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-regantify-text">{label}</label>
      <div className="flex gap-2">
        <input
          readOnly
          value={shown ? value : '•'.repeat(24)}
          onFocus={(e) => e.target.select()}
          aria-label={label}
          className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-neutral-50 px-3 font-mono text-[13px] text-regantify-text outline-none focus:border-brand"
        />
        {secret && (
          <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? 'Hide' : 'Show'} className={`${outlineBtn} h-10 w-10 px-0`}>
            {shown ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
        <button type="button" onClick={() => copyText(value, label)} className={`${outlineBtn} h-10`}>
          <Copy size={14} aria-hidden />
          Copy
        </button>
      </div>
    </div>
  );
}

/** A checkbox with a label and one line of help (settings options). At least 40px tall to tap. */
export function CheckRow({ checked, onChange, label, hint, strong }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; strong?: boolean }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-start gap-2.5 py-1 text-sm text-regantify-text">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand" />
      <span>
        <span className={strong ? 'font-medium' : undefined}>{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-neutral-500">{hint}</span>}
      </span>
    </label>
  );
}

/** Loading placeholder for one settings card. */
export function CardSkeleton({ title }: { title: string }) {
  return (
    <CourierCard title={title}>
      <div className="space-y-2" aria-busy>
        <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-neutral-100" />
      </div>
    </CourierCard>
  );
}

/** Settings save row: Saved note on the left of the button, button on the right. */
export function SaveRow({ children, saved }: { children: ReactNode; saved?: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
      {saved && (
        <span className="animate-pop-in mr-auto inline-flex items-center gap-1 text-sm text-emerald-600">
          <Check size={15} aria-hidden />
          Saved
        </span>
      )}
      {children}
    </div>
  );
}

/** Green / white button styles used on settings cards. */
export const saveBtn =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60';
export const formOutlineBtn = `${outlineBtn} h-10`;
export const dangerOutlineBtn =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60';
