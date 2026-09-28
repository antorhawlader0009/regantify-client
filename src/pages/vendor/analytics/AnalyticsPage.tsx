import { useMemo } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import { BarChart3, Boxes, ClipboardList, LayoutGrid, Megaphone, Users, type LucideIcon } from 'lucide-react';
import type { AnalyticsTab } from '../../../lib/analyticsApi';
import { DateRangePicker } from '../../../components/analytics/DateRangePicker';
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
  { id: 'sales', label: 'Sales & Profit', icon: BarChart3 },
  { id: 'orders', label: 'Orders & Delivery', icon: ClipboardList },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
];

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
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-regantify-black">Analytics</h1>
          <p className="text-sm text-regantify-text-muted mt-1">See how your store is doing: sales, orders, products, customers and visitors.</p>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2 w-2 shrink-0 rounded-full bg-regantify-cta transition-opacity ${fetching ? 'opacity-100 animate-pulse' : 'opacity-0'}`}
            aria-hidden
          />
          <DateRangePicker value={range} preset={preset} today={today} onApply={setRange} />
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-8 px-8 py-3 mb-1 bg-white/90 backdrop-blur">
        <nav role="tablist" aria-label="Analytics sections" className="flex gap-1 overflow-x-auto rounded-2xl bg-regantify-content/70 p-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  selected
                    ? 'bg-white text-regantify-text shadow-[0_1px_3px_rgba(16,24,40,0.1)]'
                    : 'text-regantify-text-muted hover:text-regantify-text hover:bg-white/60'
                }`}
              >
                <Icon size={16} strokeWidth={2} className={selected ? 'text-regantify-cta' : ''} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <p className="text-xs text-regantify-text-muted mb-4">
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
