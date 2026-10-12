import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Eye, Receipt, RefreshCw, Share2, ShoppingBag, type LucideIcon } from 'lucide-react';
import type { Compared } from '../../lib/analyticsApi';
import type { DashboardSummary } from '../../lib/dashboardApi';
import { ChangeBadge } from '../analytics/AnalyticsUi';
import { formatValue, type ValueKind } from '../analytics/format';
import { Sparkline } from '../charts/Sparkline';

/** "Updated just now" / "Updated 3 min ago", ticking every 30 s so it stays true between refreshes. */
function useUpdatedLabel(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  return mins < 1 ? 'Updated just now' : `Updated ${mins} min ago`;
}

/** "3:42 PM" in Dhaka. */
function dhakaTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' });
}

/** One accent per tile (Tailwind 700 on its 100 tint, same family as the Analytics cards): the icon chip, the number and the line. */
interface Tone {
  accent: string;
  soft: string;
}

const TONES: Record<'green' | 'blue' | 'violet' | 'amber', Tone> = {
  green: { accent: '#047857', soft: '#d1fae5' },
  blue: { accent: '#1d4ed8', soft: '#dbeafe' },
  violet: { accent: '#6d28d9', soft: '#ede9fe' },
  amber: { accent: '#c2410c', soft: '#ffedd5' },
};

interface Kpi {
  label: string;
  icon: LucideIcon;
  /** Analytics tab this number opens, on "Today". */
  to: string;
  kind: ValueKind;
  value: Compared | number;
  /** The last days of this number, drawn as a small line. */
  spark?: number[];
  tone: keyof typeof TONES;
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const tone = TONES[kpi.tone];
  const compared = typeof kpi.value === 'number' ? null : kpi.value;
  const current = compared ? compared.current : (kpi.value as number);
  // Two zeros say nothing: no badge rather than "No data" on a quiet morning.
  const showBadge = compared != null && !(compared.current === 0 && compared.previous === 0);

  return (
    <Link
      to={kpi.to}
      className="group flex min-w-0 flex-col rounded-xl border border-line bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm text-neutral-600">{kpi.label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: tone.soft, color: tone.accent }}>
          <Icon size={16} strokeWidth={1.8} aria-hidden />
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p
          className={`min-w-0 truncate text-[26px] font-semibold leading-tight tracking-tight tabular-nums ${kpi.kind === 'money' ? 'dash-money' : ''}`}
          style={{ color: tone.accent }}
        >
          {formatValue(current, kpi.kind)}
        </p>
        {kpi.spark && <Sparkline values={kpi.spark} color={tone.accent} className="h-9 w-20 shrink-0" />}
      </div>
      <div className="mt-1.5 flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
        {showBadge && <ChangeBadge value={compared!} kind={kpi.kind} />}
        {compared ? (
          <span className="truncate">
            Yesterday by now: <span className={kpi.kind === 'money' ? 'dash-money' : undefined}>{formatValue(compared.previous, kpi.kind)}</span>
          </span>
        ) : (
          <span className="truncate">Store visits so far today</span>
        )}
      </div>
    </Link>
  );
}

/**
 * Dashboard > today's numbers (dashboard-plan.md Step 4). Sales, orders
 * and average order are compared with yesterday up to the same time;
 * visitors are stored per day, so they have no comparison. Before the
 * store's first order, one friendly card stands in for a row of zeros.
 */
export function TodayKpis({
  data,
  onShareStore,
  onRefresh,
  refreshing,
}: {
  data: DashboardSummary;
  onShareStore: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { today } = data;
  const updated = useUpdatedLabel(data.generatedAt);

  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <h2 className="text-[15px] font-semibold text-regantify-text">Today so far</h2>
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span title={`Data as of ${dhakaTime(data.generatedAt)}`}>
          {updated}
          {data.setup.hasOrder && ' · compared with yesterday at the same time'}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh dashboard"
          title="Refresh"
          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden />
        </button>
      </div>
    </div>
  );

  // A staff role without dashboard.view gets no sales numbers (rule-plan.md Step 7): just the header.
  if (!today) {
    return (
      <section className="space-y-3" aria-label="Today so far">
        {header}
      </section>
    );
  }

  if (!data.setup.hasOrder) {
    return (
      <section className="space-y-3" aria-label="Today so far">
        {header}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-neutral-300 bg-white p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-lime/60 text-brand">
            <ShoppingBag size={20} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="mr-auto min-w-0">
            <p className="text-sm font-medium text-regantify-text">Your first order will show here</p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Today’s sales, orders and visitors appear as soon as shoppers start buying.
              {today.visitors > 0 && ` ${today.visitors.toLocaleString()} ${today.visitors === 1 ? 'person has' : 'people have'} visited your store today.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onShareStore}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3 text-sm text-white transition-colors hover:bg-brand-dark"
          >
            <Share2 size={15} aria-hidden />
            Share your store
          </button>
        </div>
      </section>
    );
  }

  // The last 7 days drawn behind each number (today is the last point). Visitors are not in the trend, so they get none.
  const week = data.trend.slice(-7);
  const kpis: Kpi[] = [
    { label: 'Today’s sales', icon: Banknote, to: '/vendor/analytics?tab=sales&preset=today', kind: 'money', value: today.sales, spark: week.map((d) => d.sales), tone: 'green' },
    { label: 'Orders today', icon: Receipt, to: '/vendor/analytics?tab=orders&preset=today', kind: 'count', value: today.orders, spark: week.map((d) => d.orders), tone: 'blue' },
    { label: 'Visitors', icon: Eye, to: '/vendor/analytics?tab=marketing&preset=today', kind: 'count', value: today.visitors, tone: 'violet' },
    { label: 'Avg order value', icon: ShoppingBag, to: '/vendor/analytics?tab=overview&preset=today', kind: 'money', value: today.aov, spark: week.map((d) => (d.orders ? d.sales / d.orders : 0)), tone: 'amber' },
  ];

  return (
    <section className="space-y-3" aria-label="Today so far">
      {header}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiTile key={kpi.label} kpi={kpi} />
        ))}
      </div>
    </section>
  );
}
