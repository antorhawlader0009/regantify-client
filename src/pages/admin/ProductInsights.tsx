import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, PackageSearch, TrendingDown, TrendingUp } from 'lucide-react';
import { productInsightsApi, type InsightProduct } from '../../lib/productInsightsApi';
import { GradientBarChart, GradientDonut, SERIES, formatCompact, formatTaka } from '../../components/admin/charts';
import { RangeTabs } from '../../components/admin/ui/RangeTabs';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { storefrontProductUrl } from '../../lib/storefrontUrl';

const panel = 'rounded-2xl bg-white shadow-[var(--console-card-shadow)]';
const DAY_OPTIONS = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
] as const;
const BY_OPTIONS = [
  { id: 'units', label: 'Most pieces' },
  { id: 'revenue', label: 'Most money' },
] as const;
const th = 'px-4 py-2 font-normal';
const thR = 'px-4 py-2 text-right font-normal';
const td = 'px-4 py-2.5';
const tdR = 'px-4 py-2.5 text-right tabular-nums';
const num = (n: number) => n.toLocaleString('en-US');

/**
 * Super Admin > Overview > Product insights: what sells best across every store, so the team can see which products, categories and price levels are
 * doing well. Useful for advising sellers, choosing what to promote, and spotting business ideas. Figures are compared with the equally long period before.
 */
export default function ProductInsights() {
  const [days, setDays] = useState(30);
  const [by, setBy] = useState<'units' | 'revenue'>('units');
  const { data, isLoading, isFetching } = useQuery({ queryKey: ['admin-product-insights', days], queryFn: () => productInsightsApi.get(days) });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <PackageSearch className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">Product insights</h1>
            <p className="max-w-3xl text-sm text-regantify-text-muted">
              What sells best across all stores on Regantify: products, categories and price levels, against the same number of days before. A sale is an order that was not
              cancelled, left unpaid, returned or refunded; counter (POS) sales count, free gifts do not.
            </p>
          </div>
        </div>
        <div className="max-w-full overflow-x-auto rounded-full bg-white px-1.5 py-1 shadow-[var(--console-card-shadow)]">
          <RangeTabs options={DAY_OPTIONS} value={String(days) as (typeof DAY_OPTIONS)[number]['id']} onChange={(id) => setDays(Number(id))} />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className={`space-y-6 ${isFetching ? 'opacity-60' : ''}`}>
          <div className="grid gap-3 sm:grid-cols-4">
            <Tile label="Pieces sold" value={num(data.totals.units)} hint={changeText(data.totals.units, data.totals.prevUnits)} />
            <Tile label="Sales" value={formatTaka(data.totals.revenue)} hint={data.totals.revenueChange === null ? 'nothing before to compare' : `${signed(data.totals.revenueChange)} vs before`} />
            <Tile label="Orders" value={num(data.totals.orders)} hint={`average ${data.totals.orders ? formatTaka(data.totals.revenue / data.totals.orders) : '-'} an order`} />
            <Tile label="Products that sold" value={num(data.totals.products)} hint={`from ${num(data.totals.stores)} stores`} />
          </div>

          <Section
            title="Best-selling products"
            right={
              <RangeTabs options={BY_OPTIONS} value={by} onChange={setBy} label="Sort best sellers by" />
            }
          >
            <ProductTable rows={by === 'units' ? data.topByUnits : data.topByRevenue} empty="Nothing sold in this period." />
          </Section>

          <Section title="Rising fast" hint="At least 5 pieces now, sorted by how much faster they sell than the period before. New = no sales before.">
            <ProductTable rows={data.rising} empty="No product is clearly rising right now." />
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Top categories" hint="By the category name stores gave their products. Products with no category are left out.">
              {data.categories.length === 0 ? (
                <Empty>No category sold in this period.</Empty>
              ) : (
                <div className={`overflow-x-auto ${panel} p-5`}>
                  <GradientDonut
                    label="Sales by category"
                    slices={[...data.categories].sort((a, b) => b.revenue - a.revenue).map((c) => ({ key: c.label, label: c.label, value: c.revenue }))}
                    format={formatTaka}
                    centerValue={formatCompact(data.categories.reduce((s, c) => s + c.revenue, 0), 'money')}
                    centerCaption="sales"
                    height={210}
                  />
                  <div className="mt-4" />
                  <table className="w-full min-w-[460px] text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                        <th className={th}>Category</th>
                        <th className={thR}>Sales</th>
                        <th className={thR}>Share</th>
                        <th className={thR}>Pieces</th>
                        <th className={thR}>Stores</th>
                        <th className={thR}>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.categories.map((c) => (
                        <tr key={c.label} className="border-b border-line last:border-0">
                          <td className={`${td} text-regantify-text`}>{c.label}</td>
                          <td className={tdR}>{formatTaka(c.revenue)}</td>
                          <td className={tdR}>
                            <span className="inline-flex items-center gap-2">
                              <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-regantify-search sm:inline-block">
                                <span className="block h-full rounded-full bg-regantify-text/60" style={{ width: `${Math.min(100, c.share)}%` }} />
                              </span>
                              {c.share}%
                            </span>
                          </td>
                          <td className={tdR}>{num(c.units)}</td>
                          <td className={tdR}>{c.stores}</td>
                          <td className={tdR}>
                            <Change value={c.revenueChange} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Price levels that sell" hint="Pieces and sales by the price a piece was sold at.">
              <div className={`overflow-x-auto ${panel} p-5`}>
                <GradientBarChart
                  label="Pieces sold at each price level"
                  rows={data.priceBands}
                  xKey="label"
                  series={[{ key: 'units', label: 'Pieces', color: SERIES.purple }]}
                  format={num}
                  axisFormat={(n) => formatCompact(n)}
                  height={210}
                />
                <div className="mt-4" />
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                      <th className={th}>Price of a piece</th>
                      <th className={thR}>Pieces</th>
                      <th className={thR}>Sales</th>
                      <th className={thR}>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.priceBands.map((b) => (
                      <tr key={b.label} className="border-b border-line last:border-0">
                        <td className={`${td} text-regantify-text`}>{b.label}</td>
                        <td className={tdR}>{num(b.units)}</td>
                        <td className={tdR}>{formatTaka(b.revenue)}</td>
                        <td className={tdR}>
                          <Change value={b.unitsChange} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>

          <Section
            title="Sold by many stores"
            hint="The same product name selling in two or more stores (case and punctuation ignored), so a common product shows its demand across the platform and the price range stores charge."
          >
            {data.acrossStores.length === 0 ? (
              <Empty>No product name sells in more than one store yet.</Empty>
            ) : (
              <div className={`overflow-x-auto ${panel}`}>
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                      <th className={th}>Product</th>
                      <th className={thR}>Stores</th>
                      <th className={thR}>Pieces</th>
                      <th className={thR}>Sales</th>
                      <th className={thR}>Price range</th>
                      <th className={thR}>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.acrossStores.map((a) => (
                      <tr key={a.name} className="border-b border-line last:border-0">
                        <td className={`${td} text-regantify-text`}>{a.name}</td>
                        <td className={tdR}>{a.stores}</td>
                        <td className={tdR}>{num(a.units)}</td>
                        <td className={tdR}>{formatTaka(a.revenue)}</td>
                        <td className={tdR}>{a.minPrice === a.maxPrice ? formatTaka(a.minPrice) : `${formatTaka(a.minPrice)} to ${formatTaka(a.maxPrice)}`}</td>
                        <td className={tdR}>
                          <Change value={a.unitsChange} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <p className="text-xs text-regantify-text-muted">Updated every 10 minutes (last: {formatDhakaDateTime(data.generatedAt)}). Prices are what shoppers paid, after campaigns and sale prices.</p>
        </div>
      )}
    </div>
  );
}

function ProductTable({ rows, empty }: { rows: InsightProduct[]; empty: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className={`overflow-x-auto ${panel}`}>
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
            <th className={`${th} w-8`}>#</th>
            <th className={th}>Product</th>
            <th className={th}>Store</th>
            <th className={thR}>Pieces</th>
            <th className={thR}>Orders</th>
            <th className={thR}>Sales</th>
            <th className={thR}>Avg price</th>
            <th className={thR}>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.key} className="border-b border-line last:border-0">
              <td className={`${td} tabular-nums text-regantify-text-muted`}>{i + 1}</td>
              <td className={td}>
                <div className="flex items-center gap-3">
                  {p.photoUrl ? <img src={p.photoUrl} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-md object-cover" /> : <span className="h-9 w-9 shrink-0 rounded-md bg-regantify-search" />}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-regantify-text">{p.name}</p>
                    {p.category && <p className="truncate text-xs text-regantify-text-muted">{p.category}</p>}
                  </div>
                  {p.slug && p.subdomain && (
                    <a href={storefrontProductUrl(p.subdomain, p.slug)} target="_blank" rel="noopener noreferrer" aria-label="Open the product page" className="shrink-0 text-regantify-text-muted hover:text-regantify-text">
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </td>
              <td className={`${td} text-xs`}>
                <Link to={`/admin/vendors/${p.vendorId}`} className="hover:underline">
                  {p.storeName}
                </Link>
              </td>
              <td className={`${tdR} font-medium`}>{num(p.units)}</td>
              <td className={tdR}>{num(p.orders)}</td>
              <td className={tdR}>{formatTaka(p.revenue)}</td>
              <td className={tdR}>{p.avgPrice === null ? '-' : formatTaka(p.avgPrice)}</td>
              <td className={tdR}>{p.prevUnits === 0 ? <span className="text-xs font-medium text-emerald-700">New</span> : <Change value={p.unitsChange} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, hint, right, children }: { title: string; hint?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-semibold text-regantify-text">{title}</h2>
          {hint && <p className="max-w-3xl text-xs text-regantify-text-muted">{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={`${panel} p-5`}>
      <p className="text-[13px] font-medium text-regantify-text-muted">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-tight tracking-tight tabular-nums text-regantify-text">{value}</p>
      {hint && <p className="text-xs text-regantify-text-muted">{hint}</p>}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className={`${panel} px-4 py-8 text-center text-sm text-regantify-text-muted`}>{children}</p>;
}

const signed = (n: number) => `${n > 0 ? '+' : ''}${n}%`;
function changeText(now: number, before: number) {
  if (before === 0) return 'nothing before to compare';
  return `${signed(Math.round(((now - before) / before) * 100))} vs before`;
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-regantify-text-muted">-</span>;
  if (value === 0) return <span className="text-regantify-text-muted">0%</span>;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-1 ${up ? 'text-emerald-700' : 'text-red-700'}`}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {signed(value)}
    </span>
  );
}
