import { Copy, Gift } from 'lucide-react';
import { giftCardsApi, giftCardStatus, type GiftCard } from '../../../lib/giftCardsApi';
import { formatDhakaDate } from '../../../lib/dhakaDate';
import { DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { PromoListPage, StandardPromoMenu, copyText, taka } from './MarketingKit';

export function GiftCardBadge({ card }: { card: GiftCard }) {
  const s = giftCardStatus(card);
  return <span className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium ${s.className}`}>{s.label}</span>;
}

/** Remaining of issued, with a thin bar of what's left. */
function BalanceCell({ card }: { card: GiftCard }) {
  const issued = Number(card.initialAmount);
  const left = Number(card.balance);
  const pct = issued > 0 ? Math.max(0, Math.min(100, (left / issued) * 100)) : 0;
  return (
    <div className="min-w-[120px]">
      <p className="tabular-nums">
        <span className="font-medium">{taka(left)}</span> <span className="text-xs text-neutral-500">of {taka(issued)}</span>
      </p>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100" aria-hidden>
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function GiftCardMenu({ item }: { item: GiftCard }) {
  return (
    <StandardPromoMenu
      name={item.code}
      kind="gift card"
      editTo={`/vendor/marketing/gift-cards/${item.id}`}
      queryKey="gift-cards"
      active={item.active}
      setActive={(next) => giftCardsApi.update(item.id, { active: next })}
      remove={() => giftCardsApi.remove(item.id)}
      deleteMessage="Only a card that was never used can be deleted. For a used one, turn it off instead."
      extra={<DropdownMenuItem onSelect={() => copyText(item.code, 'Code')}>Copy code</DropdownMenuItem>}
    />
  );
}

/**
 * Marketing > Gift Cards — prepaid cards with a balance that shoppers
 * pay with at checkout (or that you redeem by hand), with status, what's
 * left of each, who it's for and when it expires.
 */
export default function GiftCards() {
  return (
    <PromoListPage<GiftCard>
      title="Gift cards"
      description="A prepaid balance a shopper spends at checkout, like cash. Sell or give them away."
      addTo="/vendor/marketing/gift-cards/add"
      addLabel="Add gift card"
      icon={Gift}
      searchPlaceholder="Search code or name"
      emptyHint="Make a ৳1,000 card for a customer’s birthday, or to sell in your shop."
      queryKey="gift-cards"
      fetchPage={(q) => giftCardsApi.list(q).then((r) => ({ items: r.giftCards, total: r.total }))}
      editPath={(g) => `/vendor/marketing/gift-cards/${g.id}`}
      Menu={GiftCardMenu}
      columns={[
        {
          header: 'Code',
          cell: (g) => (
            <button
              type="button"
              onClick={() => copyText(g.code, 'Code')}
              title="Copy code"
              className="inline-flex items-center gap-1.5 rounded border border-dashed border-neutral-300 bg-neutral-50 px-2 py-0.5 font-mono text-[13px] font-medium text-regantify-text hover:border-brand"
            >
              {g.code}
              <Copy size={12} className="text-neutral-400" aria-hidden />
            </button>
          ),
          className: 'whitespace-nowrap',
        },
        { header: 'Status', cell: (g) => <GiftCardBadge card={g} /> },
        { header: 'Balance', cell: (g) => <BalanceCell card={g} /> },
        {
          header: 'For',
          cell: (g) =>
            g.recipientName || g.recipientPhone ? (
              <>
                <p>{g.recipientName ?? '—'}</p>
                {g.recipientPhone && <p className="text-xs text-neutral-500">{g.recipientPhone}</p>}
              </>
            ) : (
              <span className="text-neutral-400">—</span>
            ),
        },
        { header: 'Expires', cell: (g) => <span className="text-neutral-600">{g.expiresAt ? formatDhakaDate(g.expiresAt) : 'Never'}</span>, className: 'whitespace-nowrap' },
      ]}
      mobile={(g) => ({
        title: <span className="font-mono">{g.code}</span>,
        badge: <GiftCardBadge card={g} />,
        lines: [`${taka(g.balance)} left of ${taka(g.initialAmount)}`, [g.recipientName, g.expiresAt ? `expires ${formatDhakaDate(g.expiresAt)}` : null].filter(Boolean).join(' · ')],
      })}
    />
  );
}
