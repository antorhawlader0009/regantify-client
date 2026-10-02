import type { MarketingAnalytics, MarketingRow } from '../../../lib/analyticsApi';
import { Card, CardLink, EmptyState, KpiCard, KpiStrip, SERIES_1, MobileRows } from '../../../components/analytics/AnalyticsUi';
import { PALETTE, TrendChart } from '../../../components/analytics/TrendChart';
import { formatTaka, COMPARE_LABEL, sharePct } from '../../../components/analytics/format';
import { TabState, useAnalytics, type TabProps } from './useAnalytics';

const CHANNEL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  google: 'Google',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  direct: 'Direct',
  other: 'Other websites',
  untracked: 'Not tracked',
};

const CHANNEL_NOTES: Record<string, string> = {
  direct: 'Typed your address, a bookmark, or an app that hides where it came from',
  untracked: 'Visits and orders from before sources were recorded',
};

function rate(value: number | null) {
  return value == null ? '—' : `${value.toFixed(1)}%`;
}

export function MarketingTab({ range }: TabProps) {
  const query = useAnalytics('marketing', range);
  const compareLabel = COMPARE_LABEL;

  return (
    <TabState query={query}>
      {(data) => (
        <>
            <KpiStrip cols={3}>
              <KpiCard label="Store visits" value={data.kpis.visits} kind="count" hint="One per shopper per day" compareLabel={compareLabel} />
              <KpiCard label="Online store orders" value={data.kpis.storefrontOrders} kind="count" compareLabel={compareLabel} />
              <KpiCard label="Conversion rate" value={data.kpis.conversionRate} kind="percent" hint="Online store orders out of visits" compareLabel={compareLabel} />
            </KpiStrip>

            <ShoppingFunnel funnel={data.funnel} />

            <Card title="Where your buyers come from" subtitle="Visits and online store orders by channel">
              <ChannelTable rows={data.channels} />
            </Card>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2" title="Visits and orders" subtitle={`Store visits and online store orders each ${data.bucket === 'month' ? 'month' : 'day'}.`}>
                {data.trend.every((d) => d.visits === 0 && d.orders === 0) ? (
                  <EmptyState text="No visits recorded in this period yet." />
                ) : (
                  <TrendChart
                    data={data.trend}
                    series={[
                      { key: 'visits', label: 'Visits', color: PALETTE.blue },
                      { key: 'orders', label: 'Orders', color: PALETTE.orange },
                    ]}
                    kind="count"
                    bucket={data.bucket}
                    ariaLabel="Store visits and online orders over time"
                  />
                )}
              </Card>

              <Card title="Coupons" subtitle="Orders that used a coupon" action={<CardLink to="/vendor/marketing/coupons">Manage coupons</CardLink>}>
                {data.coupons.length === 0 ? (
                  <EmptyState text="No coupon used in this period." />
                ) : (
                  <ul className="divide-y divide-line">
                    {data.coupons.map((c) => (
                      <li key={c.code} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-regantify-text truncate">{c.code}</p>
                          <p className="text-xs text-neutral-500">
                            {c.orders} order{c.orders === 1 ? '' : 's'}, {formatTaka(c.discount)} off
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-regantify-text">{formatTaka(c.sales)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2" title="Campaigns" subtitle="Links tagged with utm_campaign, like your ad links">
                {data.campaigns.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-regantify-text">No tagged campaigns in this period.</p>
                    <p className="mt-1 text-[13px] text-neutral-500">
                      Add tags to the store link in your ads to see each ad's orders here, for example:
                    </p>
                    <code className="mt-2 inline-block rounded-lg bg-neutral-100 px-3 py-1.5 text-[12px] text-regantify-text break-all">
                      ?utm_source=facebook&amp;utm_campaign=eid-sale
                    </code>
                  </div>
                ) : (
                  <CampaignTable rows={data.campaigns} />
                )}
              </Card>

              <Card title="Top landing pages" subtitle="Visitors and completed checkouts" action={<CardLink to="/vendor/store/landing-pages">Landing pages</CardLink>}>
                {data.landingPages.length === 0 ? (
                  <EmptyState text="No landing page visits in this period." />
                ) : (
                  <ul className="divide-y divide-line">
                    {data.landingPages.map((lp) => (
                      <li key={lp.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-regantify-text truncate">{lp.title}</p>
                          <p className="text-xs text-neutral-500 truncate">/{lp.slug === '/' ? '' : lp.slug}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums text-regantify-text">{lp.visitors}</p>
                          <p className="text-[12px] text-neutral-500 tabular-nums">
                            {lp.checkouts} checkout{lp.checkouts === 1 ? '' : 's'} ({sharePct(lp.checkouts, lp.visitors).toFixed(1)}%)
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
        </>
      )}
    </TabState>
  );
}

/**
 * Visit → product → cart → checkout → order, one bar per step sized
 * against visitors, with the share that went on to the next step
 * between them. The step where the most shoppers leave is named, since
 * that's the one worth fixing first.
 */
function ShoppingFunnel({ funnel }: { funnel: MarketingAnalytics['funnel'] }) {
  if (!funnel) {
    return (
      <Card title="Shopping funnel" subtitle="Where shoppers leave on the way to an order">
        <EmptyState text="No shopping steps recorded for these dates. They're counted from your store's visits since this feature went live." />
      </Card>
    );
  }

  const steps = [
    { label: 'Visited the store', value: funnel.visitors },
    { label: 'Viewed a product', value: funnel.productViews },
    { label: 'Added to cart', value: funnel.addToCart },
    { label: 'Reached checkout', value: funnel.checkout },
    { label: 'Placed an order', value: funnel.orders },
  ];
  const top = Math.max(1, steps[0].value);
  const onward = steps.slice(1).map((s, i) => (steps[i].value > 0 ? Math.min(100, (s.value / steps[i].value) * 100) : null));
  const worst = onward.reduce<number | null>((w, r, i) => (r != null && (w == null || r < onward[w]!) ? i : w), null);

  return (
    <Card
      title="Shopping funnel"
      subtitle={
        funnel.since
          ? `Shopper visits at each step, counted since ${new Date(funnel.since).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
          : 'Shopper visits at each step, this period'
      }
    >
      <ol className="space-y-1">
        {steps.map((s, i) => (
          <li key={s.label}>
            {i > 0 && (
              <p className={`py-1 pl-[168px] text-[12px] tabular-nums ${worst === i - 1 ? 'font-medium text-amber-800' : 'text-neutral-500'}`}>
                {onward[i - 1] == null ? 'No one reached the step before' : `${onward[i - 1]!.toFixed(0)}% went on`}
                {worst === i - 1 && ', the biggest drop'}
              </p>
            )}
            <div className="grid grid-cols-[160px_1fr_64px] items-center gap-2">
              <span className="text-sm text-regantify-text">{s.label}</span>
              <div className="h-3 rounded bg-neutral-100">
                <div className="h-3 rounded" style={{ width: `${Math.max(s.value > 0 ? 1 : 0, (s.value / top) * 100)}%`, background: SERIES_1 }} />
              </div>
              <span className="text-right text-sm font-semibold tabular-nums text-regantify-text">{s.value.toLocaleString('en-US')}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[12px] text-neutral-500">
        Product views and checkout are counted on the StorePal theme and landing pages. Orders are all online store orders in the same days.
      </p>
    </Card>
  );
}

/** Channels, best sales first; "Not tracked" (history from before sources were recorded) always last and muted. */
function ChannelTable({ rows }: { rows: MarketingRow[] }) {
  if (rows.length === 0) return <EmptyState text="No visits or online orders in this period." />;
  const ordered = [...rows.filter((r) => r.key !== 'untracked'), ...rows.filter((r) => r.key === 'untracked')];
  const totalSales = rows.reduce((sum, r) => sum + r.sales, 0);
  const maxSales = Math.max(1, ...rows.map((r) => r.sales));

  return (
    <>
      <MobileRows
        rows={ordered.map((r) => ({
          key: r.key,
          title: CHANNEL_LABELS[r.key] ?? r.key,
          sub: CHANNEL_NOTES[r.key],
          value: formatTaka(r.sales),
          detail: `${r.visits} visits · ${r.orders} orders · ${rate(r.conversionRate)} buy · ${sharePct(r.sales, totalSales).toFixed(0)}% of sales`,
        }))}
      />
      <div className="-mx-5 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[12px] text-neutral-500">
              <th className="px-5 pb-2 font-normal">Channel</th>
              <th className="px-3 pb-2 font-normal text-right">Visits</th>
              <th className="px-3 pb-2 font-normal text-right">Orders</th>
              <th className="px-3 pb-2 font-normal text-right">Conversion</th>
              <th className="px-3 pb-2 font-normal text-right">Sales</th>
              <th className="px-5 pb-2 font-normal w-[24%]">Share of sales</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((r) => {
              const muted = r.key === 'untracked';
              return (
                <tr key={r.key} className={`border-t border-line ${muted ? 'text-neutral-500' : ''}`}>
                  <td className="px-5 py-2.5">
                    <p className={muted ? '' : 'font-medium text-regantify-text'}>{CHANNEL_LABELS[r.key] ?? r.key}</p>
                    {CHANNEL_NOTES[r.key] && <p className="text-[12px] text-neutral-500">{CHANNEL_NOTES[r.key]}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.visits}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.orders}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{rate(r.conversionRate)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatTaka(r.sales)}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-neutral-100">
                        <div className="h-1.5 rounded-full" style={{ width: `${(r.sales / maxSales) * 100}%`, background: muted ? '#9a9a9a' : SERIES_1 }} />
                      </div>
                      <span className="w-9 text-right text-xs tabular-nums text-neutral-500">{sharePct(r.sales, totalSales).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CampaignTable({ rows }: { rows: MarketingRow[] }) {
  return (
    <>
      <MobileRows
        rows={rows.map((r) => ({
          key: r.key,
          title: r.key,
          sub: r.source ? CHANNEL_LABELS[r.source] ?? r.source : undefined,
          value: formatTaka(r.sales),
          detail: `${r.visits} visits · ${r.orders} orders · ${rate(r.conversionRate)} buy`,
        }))}
      />
      <div className="-mx-5 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-[12px] text-neutral-500">
              <th className="px-5 pb-2 font-normal">Campaign</th>
              <th className="px-3 pb-2 font-normal text-right">Visits</th>
              <th className="px-3 pb-2 font-normal text-right">Orders</th>
              <th className="px-3 pb-2 font-normal text-right">Conversion</th>
              <th className="px-5 pb-2 font-normal text-right">Sales</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <td className="px-5 py-2.5">
                  <p className="font-medium text-regantify-text">{r.key}</p>
                  {r.source && <p className="text-[12px] text-neutral-500">{CHANNEL_LABELS[r.source] ?? r.source}</p>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.visits}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.orders}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{rate(r.conversionRate)}</td>
                <td className="px-5 py-2.5 text-right tabular-nums font-semibold">{formatTaka(r.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
