import { BadgePercent } from 'lucide-react';
import { discountsApi, type Discount } from '../../../lib/discountsApi';
import { PromoListPage, PromoStatusBadge, StandardPromoMenu, promoStatus, scheduleText, taka } from './MarketingKit';

/** "10% off (up to ৳500)" / "৳200 off" / "Free delivery". */
function discountLabel(d: Discount): string {
  if (d.discountType === 'FREE_SHIPPING') return 'Free delivery';
  if (d.discountType === 'PERCENT') return `${Number(d.amount)}% off${d.maxDiscount ? ` (up to ${taka(d.maxDiscount)})` : ''}`;
  return `${taka(d.amount)} off`;
}

/** What a cart needs for it — "Every order" when nothing. */
function conditionsLabel(d: Discount): string {
  const parts: string[] = [];
  if (d.minCartAmount && Number(d.minCartAmount) > 0) parts.push(`Orders over ${taka(d.minCartAmount)}`);
  if (d.minQuantity) parts.push(`${d.minQuantity}+ items`);
  if (d.products.length) parts.push(`${d.products.length} ${d.products.length === 1 ? 'product' : 'products'}`);
  if (d.categories.length) parts.push(`${d.categories.length} ${d.categories.length === 1 ? 'category' : 'categories'}`);
  return parts.join(' · ') || 'Every order';
}

const statusOf = (d: Discount) => promoStatus({ active: d.active, startsAt: d.startsAt, endsAt: d.endsAt });

function DiscountMenu({ item }: { item: Discount }) {
  return (
    <StandardPromoMenu
      name={item.name}
      kind="discount"
      editTo={`/vendor/marketing/discounts/${item.id}/edit`}
      queryKey="discounts"
      active={item.active}
      setActive={(next) => discountsApi.setActive(item.id, next)}
      remove={() => discountsApi.remove(item.id)}
      deleteMessage="Carts stop getting it right away. Orders that already got it keep their discount."
    />
  );
}

/**
 * Marketing > Discounts — automatic cart discounts (no code to type),
 * with their status, what they give, the conditions, how many orders
 * used them and the schedule.
 */
export default function Discounts() {
  return (
    <PromoListPage<Discount>
      title="Discounts"
      description="Taken off the cart by itself when the conditions are met. No code to type."
      addTo="/vendor/marketing/discounts/add"
      addLabel="Add discount"
      icon={BadgePercent}
      searchPlaceholder="Search discounts"
      emptyHint="For example: 10% off every order over ৳2,000, or free delivery on 3 or more items."
      queryKey="discounts"
      fetchPage={(q) => discountsApi.list(q).then((r) => ({ items: r.discounts, total: r.total }))}
      editPath={(d) => `/vendor/marketing/discounts/${d.id}/edit`}
      Menu={DiscountMenu}
      columns={[
        { header: 'Name', cell: (d) => <span className="font-medium">{d.name}</span> },
        { header: 'Status', cell: (d) => <PromoStatusBadge status={statusOf(d)} /> },
        {
          header: 'Discount',
          cell: (d) => (
            <>
              <p className="whitespace-nowrap">{discountLabel(d)}</p>
              <p className="text-xs text-neutral-500">{conditionsLabel(d)}</p>
            </>
          ),
        },
        { header: 'Used', cell: (d) => <span className="tabular-nums">{d.usageCount}</span>, className: 'whitespace-nowrap' },
        { header: 'When', cell: (d) => <span className="text-neutral-600">{scheduleText(d.startsAt, d.endsAt)}</span>, className: 'whitespace-nowrap' },
      ]}
      mobile={(d) => ({
        title: d.name,
        badge: <PromoStatusBadge status={statusOf(d)} />,
        lines: [`${discountLabel(d)} · ${conditionsLabel(d)}`, `Used ${d.usageCount} · ${scheduleText(d.startsAt, d.endsAt)}`],
      })}
    />
  );
}
