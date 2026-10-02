import { useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import { BarChart3, Boxes, ClipboardList, LayoutGrid, Megaphone, Users, type LucideIcon } from 'lucide-react';
import type { AnalyticsTab } from '../../../lib/analyticsApi';
import { DateRangePicker } from '../../../components/analytics/DateRangePicker';
import { PillTabs } from '../../../components/ui/PageKit';
import {
  addDays,
  clampRange,
  DEFAULT_PRESET,
  formatRange,
  isValidDay,
  presetLabel,
  presetRange,
  PRESETS,
  previousRange,
  todayDhaka,
  type DateRange,
  type PresetId,
} from '../../../components/analytics/dateRanges';
import { OverviewTab } from './OverviewTab';
import { SalesTab } from './SalesTab';
import { OrdersTab } from './OrdersTab';
import { ProductsTab } from './ProductsTab';
import { CustomersTab } from './CustomersTab';
import { MarketingTab } from './MarketingTab';

const TABS: { id: AnalyticsTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'sales', label: 'Sales and profit', icon: BarChart3 },
  { id: 'orders', label: 'Orders and delivery', icon: ClipboardList },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
];

/** One tap away above the tabs; the picker holds every preset. */
const QUICK_PRESETS: PresetId[] = ['today', 'last7', 'last30', 'thisMonth', 'lastMonth', 'last90'];

// The fixed periods from before the date picker, so old links still open.
const LEGACY_RANGES: Record<string, PresetId> = { '7d': 'last7', '30d': 'last30', '90d': 'last90' };

/**
 * The picked dates from the URL: `?preset=last7` (moves with the calendar,
 * so a bookmark always means "the last 7 days") or `?from=&to=` for a
 * custom range. Anything missing or invalid falls back to the default.
 */
function readRange(params: URLSearchParams, today: string): { range: DateRange; preset: PresetId | null } {
  const from = params.get('from');
  const to = params.get('to');
  if (isValidDay(from) && isValidDay(to) && from <= to) return { range: clampRange({ from, to }, today), preset: null };

  const legacy = params.get('range');
  if (legacy === '12m') return { range: clampRange({ from: addDays(today, -365), to: addDays(today, -1) }, today), preset: null };
  const requested = (params.get('preset') ?? (legacy && LEGACY_RANGES[legacy])) as PresetId | null;
  const preset = requested && PRESETS.some((p) => p.id === requested) ? requested : DEFAULT_PRESET;
  return { range: clampRange(presetRange(preset, today), today), preset };
}

/**
 * Vendor dashboard > Analytics: one page, a tab per area (analytics-plan.md).
 * Tab and dates live in the URL so a link or a refresh keeps the view,
 * and every tab reads the same dates.
 */
export default function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fetching = useIsFetching({ queryKey: ['analytics'] }) > 0;
  const today = todayDhaka();

  // "traffic" was this tab's name before it became Marketing; old links still land there.
  const rawTab = searchParams.get('tab');
  const requestedTab = (rawTab === 'traffic' ? 'marketing' : rawTab) as AnalyticsTab | null;
  const tab: AnalyticsTab = requestedTab && TABS.some((t) => t.id === requestedTab) ? requestedTab : 'overview';
  const { range, preset } = useMemo(() => readRange(searchParams, today), [searchParams, today]);
  const previous = previousRange(range);

  const setTab = (next: AnalyticsTab) => {
    const params = new URLSearchParams(searchParams);
    params.delete('range');
    if (next === 'overview') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params);
  };

  const setRange = (next: DateRange, nextPreset: PresetId | null) => {
    const params = new URLSearchParams(searchParams);
    for (const key of ['range', 'preset', 'from', 'to']) params.delete(key);
    if (nextPreset) {
      if (nextPreset !== DEFAULT_PRESET) params.set('preset', nextPreset);
    } else {
      params.set('from', next.from);
      params.set('to', next.to);
    }
    setSearchParams(params, { replace: true });
  };

  const Tab = { overview: OverviewTab, sales: SalesTab, orders: OrdersTab, products: ProductsTab, customers: CustomersTab, marketing: MarketingTab }[tab];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold text-regantify-text">Analytics</h1>
          <p className="mt-0.5 text-sm text-neutral-500">How your store is doing: sales, orders, products, customers and visitors.</p>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full bg-brand transition-opacity ${fetching ? 'animate-pulse opacity-100' : 'opacity-0'}`} aria-hidden />
          <DateRangePicker value={range} preset={preset} today={today} onApply={setRange} />
        </div>
      </div>

      {/* The presets people use most, one tap away; the picker has the rest. */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Quick date ranges">
        {QUICK_PRESETS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setRange(clampRange(presetRange(id, today), today), id)}
            aria-pressed={preset === id}
            className={`h-8 shrink-0 rounded-full border px-3 text-xs transition-colors ${
              preset === id ? 'border-brand bg-brand-lime font-medium text-regantify-text' : 'border-line bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {presetLabel(id)}
          </button>
        ))}
      </div>

      <div className="sticky top-0 z-20 -mx-3 bg-[#f4f4f4]/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <PillTabs<AnalyticsTab>
          className=""
          value={tab}
          onChange={setTab}
          tabs={TABS.map((t) => {
            const Icon = t.icon;
            return {
              id: t.id,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon size={15} aria-hidden />
                  {t.label}
                </span>
              ),
            };
          })}
        />
      </div>

      <p className="mb-4 mt-2 text-xs text-neutral-500">
        Showing <span className="font-medium text-regantify-text">{preset ? presetLabel(preset).toLowerCase() : 'a custom range'}</span>,{' '}
        {formatRange(range)} (Dhaka time), compared with {formatRange(previous)}.
      </p>

      <Tab range={range} />
    </div>
  );
}

/** The old /vendor/analytics/{sales,orders,...} links open the matching tab. */
export function AnalyticsLegacyRedirect() {
  const { tab } = useParams();
  return <Navigate to={TABS.some((t) => t.id === tab) ? `/vendor/analytics?tab=${tab}` : '/vendor/analytics'} replace />;
}
