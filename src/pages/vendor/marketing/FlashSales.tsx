import { Zap } from 'lucide-react';
import { flashSalesApi, type FlashSale } from '../../../lib/flashSalesApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { PromoListPage, PromoStatusBadge, StandardPromoMenu, promoStatus, taka } from './MarketingKit';

/** "20% off" / "৳200 off". */
function discountLabel(sale: FlashSale): string {
  return sale.discountType === 'PERCENT' ? `${Number(sale.amount)}% off` : `${taka(sale.amount)} off`;
}

const statusOf = (s: FlashSale) => promoStatus({ active: s.active, startsAt: s.startsAt, endsAt: s.endsAt });

function FlashSaleMenu({ item }: { item: FlashSale }) {
  return (
    <StandardPromoMenu
      name={item.name}
      kind="flash sale"
      editTo={`/vendor/marketing/flash-sale/${item.id}/edit`}
      queryKey="flash-sales"
      active={item.active}
      setActive={(next) => flashSalesApi.setActive(item.id, next)}
      remove={() => flashSalesApi.remove(item.id)}
      deleteMessage="Its products go back to their regular price right away. Orders already placed keep their price."
    />
  );
}

/**
 * Marketing > Flash Sale — time-boxed sales on chosen products, with
 * status, the discount, how many products, how many orders came in
 * while it ran (server-side count, see FlashSalesService.countOrders)
 * and its start and end.
 */
export default function FlashSales() {
  return (
    <PromoListPage<FlashSale>
      title="Flash sales"
      description="A lower price on chosen products for a set time. It starts and stops by itself."
      addTo="/vendor/marketing/flash-sale/add"
      addLabel="Add flash sale"
      icon={Zap}
      searchPlaceholder="Search flash sales"
      emptyHint="For example: 20% off five products from 9 PM to midnight."
      queryKey="flash-sales"
      fetchPage={(q) => flashSalesApi.list(q).then((r) => ({ items: r.flashSales, total: r.total }))}
      editPath={(s) => `/vendor/marketing/flash-sale/${s.id}/edit`}
      Menu={FlashSaleMenu}
      columns={[
        { header: 'Name', cell: (s) => <span className="font-medium">{s.name}</span> },
        { header: 'Status', cell: (s) => <PromoStatusBadge status={statusOf(s)} /> },
        {
          header: 'Discount',
          cell: (s) => (
            <>
              <p className="whitespace-nowrap">{discountLabel(s)}</p>
              <p className="text-xs text-neutral-500">
                {s.products.length} {s.products.length === 1 ? 'product' : 'products'}
              </p>
            </>
          ),
        },
        {
          header: 'Orders',
          cell: (s) => <span className="tabular-nums" title="Orders placed during the sale with one of its products">{s.orderCount ?? '—'}</span>,
          className: 'whitespace-nowrap',
        },
        {
          header: 'When',
          cell: (s) => (
            <span className="text-neutral-600">
              {formatDhakaDateTime(s.startsAt)}
              <span className="block">to {formatDhakaDateTime(s.endsAt)}</span>
            </span>
          ),
          className: 'whitespace-nowrap text-xs',
        },
      ]}
      mobile={(s) => ({
        title: s.name,
        badge: <PromoStatusBadge status={statusOf(s)} />,
        lines: [
          `${discountLabel(s)} · ${s.products.length} ${s.products.length === 1 ? 'product' : 'products'} · ${s.orderCount ?? 0} orders`,
          `${formatDhakaDateTime(s.startsAt)} to ${formatDhakaDateTime(s.endsAt)}`,
        ],
      })}
    />
  );
}
