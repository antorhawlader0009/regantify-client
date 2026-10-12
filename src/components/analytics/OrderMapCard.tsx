import { useEffect, useMemo, useState } from 'react';
import type { OrderMapReport } from '../../lib/analyticsApi';
import { Card, EmptyState, Segmented } from './AnalyticsUi';
import { formatTaka } from './format';

/** The drawn districts (src/data/bdDistrictMap.json): pre-projected SVG paths, keyed like the server's BD_DISTRICTS. */
interface MapData {
  width: number;
  height: number;
  districts: { key: string; name: string; d: string; c: [number, number] }[];
}

type Metric = 'orders' | 'sales';

// One sequential ramp (light to dark green) so "more" always reads as darker; districts with no sale stay a neutral grey.
const RAMP = ['#DCEFE6', '#A9D8C3', '#6FBFA0', '#3A9E7E', '#1B7A60', '#0B5844'];
const EMPTY_FILL = '#EEF1EF';

function colorFor(value: number, max: number): string {
  if (value <= 0 || max <= 0) return EMPTY_FILL;
  // Square root keeps Dhaka from washing every other district out to the lightest step.
  const t = Math.sqrt(value / max);
  return RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
}

/**
 * Overview > "Where your customers are": a Bangladesh map shaded by how many orders (or how much sales) each district gave in the
 * picked dates, with the top districts listed beside it. The shapes are static SVG (geoBoundaries ADM2, CC BY 4.0, simplified), so
 * no map library or tile server is loaded; the data file is fetched as its own chunk the first time this card shows.
 */
export function OrderMapCard({ report }: { report: OrderMapReport }) {
  const [map, setMap] = useState<MapData | null>(null);
  const [metric, setMetric] = useState<Metric>('orders');
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('../../data/bdDistrictMap.json').then((m) => {
      if (!cancelled) setMap(m.default as MapData);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byKey = useMemo(() => new Map(report.districts.map((d) => [d.key, d])), [report.districts]);
  const value = (key: string) => {
    const d = byKey.get(key);
    return d ? (metric === 'orders' ? d.orders : d.sales) : 0;
  };
  const max = useMemo(() => Math.max(0, ...report.districts.map((d) => (metric === 'orders' ? d.orders : d.sales))), [report.districts, metric]);
  const ranked = useMemo(
    () => [...report.districts].sort((a, b) => (metric === 'orders' ? b.orders - a.orders : b.sales - a.sales)).slice(0, 10),
    [report.districts, metric],
  );

  const activeKey = hover ?? pinned;
  const active = activeKey ? byKey.get(activeKey) : undefined;
  const activeName = activeKey ? (map?.districts.find((x) => x.key === activeKey)?.name ?? active?.name) : undefined;
  const fmt = (n: number) => (metric === 'orders' ? n.toLocaleString('en-US') : formatTaka(n));

  return (
    <Card
      title="Where your customers are"
      subtitle={`${report.reached} of 64 districts ordered in this period`}
      action={
        <Segmented
          options={[
            { id: 'orders' as const, label: 'Orders' },
            { id: 'sales' as const, label: 'Sales' },
          ]}
          value={metric}
          onChange={setMetric}
        />
      }
    >
      {report.totals.orders === 0 ? (
        <EmptyState text="No orders in this period yet. Districts light up here as customers buy." />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative mx-auto w-full max-w-[460px]">
            {!map ? (
              <div className="aspect-[474/675] animate-pulse rounded-xl bg-neutral-100" aria-busy />
            ) : (
              <svg
                viewBox={`0 0 ${map.width} ${map.height}`}
                className="h-auto w-full"
                role="img"
                aria-label={`Map of Bangladesh shaded by ${metric} per district`}
                onMouseLeave={() => setHover(null)}
              >
                {map.districts.map((dist) => {
                  const on = activeKey === dist.key;
                  return (
                    <path
                      key={dist.key}
                      d={dist.d}
                      fill={colorFor(value(dist.key), max)}
                      stroke={on ? '#111827' : '#ffffff'}
                      strokeWidth={on ? 1.4 : 0.6}
                      strokeLinejoin="round"
                      className="cursor-pointer outline-none transition-[fill] duration-150"
                      tabIndex={0}
                      aria-label={`${dist.name}: ${byKey.get(dist.key)?.orders ?? 0} orders`}
                      onMouseEnter={() => setHover(dist.key)}
                      onFocus={() => setHover(dist.key)}
                      onBlur={() => setHover(null)}
                      onClick={() => setPinned((p) => (p === dist.key ? null : dist.key))}
                    />
                  );
                })}
              </svg>
            )}

            {/* Detail of the district under the pointer (or the one tapped, for touch screens). */}
            <div className="pointer-events-none absolute left-0 top-0 min-w-[170px] rounded-lg border border-line bg-white/95 px-3 py-2 text-xs shadow-sm" aria-live="polite">
              {activeKey ? (
                <>
                  <p className="m-0 text-[13px] font-semibold text-regantify-text">{activeName}</p>
                  {active ? (
                    <p className="m-0 mt-0.5 leading-5 text-neutral-600">
                      {active.orders.toLocaleString('en-US')} orders · {formatTaka(active.sales)}
                      <br />
                      {active.customers.toLocaleString('en-US')} customers · {active.share}% of orders
                    </p>
                  ) : (
                    <p className="m-0 mt-0.5 text-neutral-500">No orders yet</p>
                  )}
                </>
              ) : (
                <p className="m-0 text-neutral-500">Hover or tap a district</p>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 text-[11px] text-neutral-500" aria-hidden>
              <span>Fewer</span>
              <span className="h-2 flex-1 rounded-full" style={{ background: `linear-gradient(to right, ${RAMP.join(',')})` }} />
              <span>More</span>
            </div>
            <p className="m-0 mt-2 text-[10px] text-neutral-400">Boundaries © geoBoundaries (CC BY 4.0), simplified.</p>
          </div>

          <div>
            <p className="m-0 mb-2 text-[12px] font-medium uppercase tracking-wide text-neutral-500">Top districts</p>
            <ol className="m-0 list-none space-y-1.5 p-0">
              {ranked.map((d, i) => {
                const v = metric === 'orders' ? d.orders : d.sales;
                return (
                  <li key={d.key}>
                    <button
                      type="button"
                      onMouseEnter={() => setHover(d.key)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(d.key)}
                      onBlur={() => setHover(null)}
                      onClick={() => setPinned((p) => (p === d.key ? null : d.key))}
                      className="w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    >
                      <span className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate text-regantify-text">
                          <span className="mr-1.5 inline-block w-4 text-right text-xs text-neutral-400">{i + 1}</span>
                          {d.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-neutral-700">{fmt(v)}</span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <span className="block h-full rounded-full" style={{ width: `${max > 0 ? Math.max(3, (v / max) * 100) : 0}%`, background: colorFor(v, max) === EMPTY_FILL ? RAMP[0] : RAMP[4] }} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {report.unplaced.orders > 0 && (
              <p className="m-0 mt-3 text-xs leading-5 text-neutral-500">
                {report.unplaced.orders.toLocaleString('en-US')} {report.unplaced.orders === 1 ? 'order' : 'orders'} ({formatTaka(report.unplaced.sales)}) had no district we could place, so
                {report.unplaced.orders === 1 ? ' it is' : ' they are'} not on the map.
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
