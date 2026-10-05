import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Eye, Megaphone, MousePointerClick, Plus, TrendingUp } from 'lucide-react';
import { campaignsApi, type CampaignListRow } from '../../../lib/campaignsApi';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { formatDhakaDate } from '../../../lib/dhakaDate';
import { DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { PromoListPage, StandardPromoMenu, copyText } from './MarketingKit';
import { EmptyState, PageHeader, PageSection, PillTabs, SearchBox, SelectBox, primaryBtn } from '../../../components/ui/PageKit';
import { popupCampaignsApi, popupPhase, type PopupCampaign, type PopupPhase } from '../../../lib/popupCampaignsApi';
import { toast } from '../../../lib/toast';

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
 * Product pages: a page of products at campaign prices (e.g. "Eid
 * collection") with its own link to share. The API returns them all, so
 * search and pages work here.
 */
function ProductPageCampaigns() {
  return (
    <PromoListPage<CampaignListRow>
      title="Product pages"
      description="A page of products at special prices, with its own link to share on Facebook."
      addTo="/vendor/marketing/campaigns/add"
      addLabel="Add product page"
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

// ------------------------------------------------------------------ popups

const PHASE_STYLE: Record<PopupPhase, { label: string; className: string }> = {
  active: { label: 'Active', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  scheduled: { label: 'Scheduled', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  draft: { label: 'Draft', className: 'border-line bg-neutral-50 text-neutral-600' },
  expired: { label: 'Expired', className: 'border-amber-200 bg-amber-50 text-amber-700' },
};

const rate = (clicks: number, shown: number) => (shown > 0 ? `${((clicks / shown) * 100).toFixed(1)}%` : '0.0%');

function PopupMenu({ item }: { item: PopupCampaign }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const phase = popupPhase(item);
  return (
    <StandardPromoMenu
      name={item.name}
      kind="campaign"
      editTo={`/vendor/marketing/campaigns/popup/${item.id}/edit`}
      queryKey="popup-campaigns"
      active={item.status === 'PUBLISHED' && phase !== 'expired'}
      setActive={(next) => popupCampaignsApi.update(item.id, { status: next ? 'PUBLISHED' : 'DRAFT' })}
      remove={() => popupCampaignsApi.remove(item.id)}
      deleteMessage="It stops showing on your store. Its numbers are lost."
      extra={
        <DropdownMenuItem
          onSelect={async () => {
            try {
              const { id: _i, vendorId: _v, impressions: _im, clicks: _c, createdAt: _ca, updatedAt: _u, ...rest } = item;
              const copy = await popupCampaignsApi.create({ ...rest, name: `${item.name} (copy)`, status: 'DRAFT' });
              queryClient.invalidateQueries({ queryKey: ['popup-campaigns'] });
              navigate(`/vendor/marketing/campaigns/popup/${copy.id}/edit`);
            } catch {
              toast.error('Couldn’t duplicate this campaign. Try again in a minute.');
            }
          }}
        >
          Duplicate
        </DropdownMenuItem>
      }
    />
  );
}

function StatCard({ Icon, label, value, note, tint }: { Icon: typeof Eye; label: string; value: string; note: string; tint: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>
          <Icon size={17} />
        </span>
        <div>
          <div className="text-xs text-neutral-500">{label}</div>
          <div className="text-xl font-semibold tabular-nums text-regantify-text">{value}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-neutral-500">{note}</div>
    </div>
  );
}

/** Popup / message campaigns: what shoppers see over the StorePal storefront. */
function PopupCampaigns() {
  const [phase, setPhase] = useState<PopupPhase | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('new');
  const { data = [], isLoading } = useQuery({ queryKey: ['popup-campaigns'], queryFn: popupCampaignsApi.list });

  const withPhase = data.map((c) => ({ c, phase: popupPhase(c) }));
  const count = (p: PopupPhase) => withPhase.filter((x) => x.phase === p).length;
  const shown = data.reduce((n, c) => n + c.impressions, 0);
  const clicked = data.reduce((n, c) => n + c.clicks, 0);

  const q = search.trim().toLowerCase();
  const rows = withPhase
    .filter((x) => (phase === 'all' || x.phase === phase) && (!q || x.c.name.toLowerCase().includes(q)))
    .sort((a, b) =>
      sort === 'old'
        ? a.c.createdAt.localeCompare(b.c.createdAt)
        : sort === 'shown'
          ? b.c.impressions - a.c.impressions
          : b.c.createdAt.localeCompare(a.c.createdAt),
    );

  const addButton = (
    <Link to="/vendor/marketing/campaigns/popup/new" className={primaryBtn}>
      <Plus size={15} aria-hidden />
      New campaign
    </Link>
  );

  return (
    <div className="space-y-3">
      <PageHeader title="Campaigns" description="Engage visitors with the right message at the right time." actions={addButton} className="mb-0" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard Icon={Activity} label="Running now" value={String(count('active'))} note="Active campaigns" tint="bg-brand-lime/50 text-brand" />
        <StatCard Icon={Eye} label="Times shown" value={shown.toLocaleString()} note="Total impressions" tint="bg-purple-50 text-purple-600" />
        <StatCard Icon={MousePointerClick} label="Clicked" value={clicked.toLocaleString()} note="Total clicks" tint="bg-emerald-50 text-emerald-600" />
        <StatCard Icon={TrendingUp} label="Click rate" value={rate(clicked, shown)} note={`${rate(clicked, shown)} of views`} tint="bg-sky-50 text-sky-600" />
      </div>
      <PageSection>
        <PillTabs
          tabs={[
            { id: 'all' as const, label: 'All', count: data.length },
            { id: 'active' as const, label: 'Active', count: count('active') },
            { id: 'scheduled' as const, label: 'Scheduled', count: count('scheduled') },
            { id: 'draft' as const, label: 'Draft', count: count('draft') },
            { id: 'expired' as const, label: 'Expired', count: count('expired') },
          ]}
          value={phase}
          onChange={setPhase}
        />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[200px] flex-1">
            <SearchBox value={search} onChange={setSearch} placeholder="Search campaigns…" />
          </div>
          <SelectBox ariaLabel="Sort" value={sort} onChange={setSort}>
            <option value="new">Newest first</option>
            <option value="old">Oldest first</option>
            <option value="shown">Most shown</option>
          </SelectBox>
        </div>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-neutral-50" aria-busy />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={data.length === 0 ? 'No campaigns yet' : 'No campaigns match'}
            hint={
              data.length === 0
                ? 'A campaign is one message on your storefront: a sale, a delivery notice, an offer. You choose who sees it, when it appears and how often it comes back.'
                : 'Try another tab or search.'
            }
            action={
              data.length === 0 ? (
                <Link to="/vendor/marketing/campaigns/popup/new" className={primaryBtn}>
                  <Plus size={15} aria-hidden />
                  Create your first
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {rows.map(({ c, phase: ph }) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3">
                <div className="min-w-[180px] flex-1">
                  <Link to={`/vendor/marketing/campaigns/popup/${c.id}/edit`} className="font-medium text-regantify-text hover:underline">
                    {c.name}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    {c.format === 'DIALOG' ? 'Centred dialog' : 'Corner toast'} · Changed {formatDhakaDate(c.updatedAt)}
                  </div>
                </div>
                <span className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium ${PHASE_STYLE[ph].className}`}>{PHASE_STYLE[ph].label}</span>
                <div className="w-20 text-right text-sm tabular-nums">
                  {c.impressions.toLocaleString()}
                  <div className="text-[11px] text-neutral-500">shown</div>
                </div>
                <div className="w-28 text-right text-sm tabular-nums">
                  {c.clicks.toLocaleString()}
                  <div className="text-[11px] text-neutral-500">clicked · {rate(c.clicks, c.impressions)}</div>
                </div>
                <PopupMenu item={c} />
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </div>
  );
}

/**
 * Marketing > Campaigns: two kinds under one roof. Popups are messages
 * shown over the storefront (StorePal); Product pages are the older
 * pages of products at campaign prices.
 */
export default function Campaigns() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('type') === 'pages' ? 'pages' : 'popups';
  return (
    <div>
      <PillTabs
        tabs={[
          { id: 'popups' as const, label: 'Popups & messages' },
          { id: 'pages' as const, label: 'Product pages' },
        ]}
        value={tab}
        onChange={(t) => setParams(t === 'pages' ? { type: 'pages' } : {}, { replace: true })}
      />
      {tab === 'popups' ? <PopupCampaigns /> : <ProductPageCampaigns />}
    </div>
  );
}
