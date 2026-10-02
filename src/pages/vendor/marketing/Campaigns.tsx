import { Megaphone } from 'lucide-react';
import { campaignsApi, type CampaignListRow } from '../../../lib/campaignsApi';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { formatDhakaDate } from '../../../lib/dhakaDate';
import { DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { PromoListPage, StandardPromoMenu, copyText } from './MarketingKit';

/** The campaign's own page on the storefront. */
export function campaignPageUrl(subdomain: string, slug: string) {
  return `${storefrontStoreUrl(subdomain)}/campaigns/${encodeURIComponent(slug)}`;
}

/** Campaigns have no on/off or dates: live once they have products. */
function CampaignBadge({ c }: { c: CampaignListRow }) {
  return c.items.length > 0 ? (
    <span className="inline-block whitespace-nowrap rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">Live</span>
  ) : (
    <span className="inline-block whitespace-nowrap rounded border border-line bg-neutral-50 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">No products</span>
  );
}

function CampaignMenu({ item }: { item: CampaignListRow }) {
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const url = subdomain ? campaignPageUrl(subdomain, item.slug) : null;
  return (
    <StandardPromoMenu
      name={item.name}
      kind="campaign"
      editTo={`/vendor/marketing/campaigns/${item.id}/edit`}
      queryKey="campaigns"
      remove={() => campaignsApi.remove(item.id)}
      deleteMessage="Its page stops working and its products go back to their regular price."
      extra={
        url && (
          <>
            <DropdownMenuItem onSelect={() => window.open(url, '_blank', 'noopener')}>Open page</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => copyText(url, 'Page link')}>Copy page link</DropdownMenuItem>
          </>
        )
      }
    />
  );
}

/**
 * Marketing > Campaigns — a page of products at campaign prices (e.g.
 * "Eid collection") with its own link to share. The API returns them
 * all, so search and pages work here.
 */
export default function Campaigns() {
  return (
    <PromoListPage<CampaignListRow>
      title="Campaigns"
      description="A page of products at special prices, with its own link to share on Facebook."
      addTo="/vendor/marketing/campaigns/add"
      addLabel="Add campaign"
      icon={Megaphone}
      searchPlaceholder="Search campaigns"
      emptyHint="For example: an “Eid collection” page with 20 products at Eid prices."
      queryKey="campaigns"
      fetchPage={async ({ search, page, perPage }) => {
        const all = await campaignsApi.list(search);
        return { items: all.slice((page - 1) * perPage, page * perPage), total: all.length };
      }}
      editPath={(c) => `/vendor/marketing/campaigns/${c.id}/edit`}
      Menu={CampaignMenu}
      columns={[
        { header: 'Name', cell: (c) => <span className="font-medium">{c.name}</span> },
        { header: 'Status', cell: (c) => <CampaignBadge c={c} /> },
        {
          header: 'Products',
          cell: (c) => (
            <span className="tabular-nums">
              {c.items.length} {c.items.length === 1 ? 'product' : 'products'}
            </span>
          ),
          className: 'whitespace-nowrap',
        },
        { header: 'Page link', cell: (c) => <span className="font-mono text-[13px] text-neutral-600">/campaigns/{c.slug}</span> },
        { header: 'Last changed', cell: (c) => <span className="text-neutral-600">{formatDhakaDate(c.updatedAt)}</span>, className: 'whitespace-nowrap' },
      ]}
      mobile={(c) => ({
        title: c.name,
        badge: <CampaignBadge c={c} />,
        lines: [`${c.items.length} ${c.items.length === 1 ? 'product' : 'products'} · /campaigns/${c.slug}`],
      })}
    />
  );
}
