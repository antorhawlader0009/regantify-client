import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Handshake, PackageSearch, Store } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState, PageHeader, PageSection, PillTabs, SearchBox, SelectBox, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { ResaleNoteDialog } from '../../../components/product/ResaleNoteDialog';
import { ResaleListingsPanel } from '../../../components/product/ResaleListingsPanel';
import { ResaleProblemsList } from '../../../components/resale/ResaleProblems';
import { dhakaDate } from '../../../components/product/ResaleOfferDialogs';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { FeatureGate } from '../../../lib/features';
import { cloudinaryThumb } from '../../../lib/cloudinaryThumb';
import { commissionLabel } from '../../../lib/resaleSupplyApi';
import {
  PARTNERSHIP_LABEL,
  RESALE_SELL_KEY,
  resaleSellApi,
  type CatalogItem,
  type CatalogSort,
  type Partnership,
  type MyRating,
  type SupplierScore,
} from '../../../lib/resaleSellApi';

const money = (n: number) => `৳${n.toLocaleString()}`;
type Tab = 'catalog' | 'listings' | 'suppliers' | 'problems';

/**
 * Products > Find products to sell (RESELLER-plan.md Step 3): the reseller side. Browse what suppliers offer, read a supplier's card and
 * Bangla terms, ask to sell; "My suppliers" lists requests, invitations and partners. Adding a product to the store comes in Step 4.
 */
export default function ResellerFind() {
  return (
    <FeatureGate
      flag="RESALE_SELL"
      fallback={
        <PageSection>
          <EmptyState icon={Handshake} title="Reselling is not open for your store yet" hint="Regantify opens it for stores step by step." />
        </PageSection>
      }
    >
      <ResellerFindPage />
    </FeatureGate>
  );
}

function ResellerFindPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'suppliers' || raw === 'listings' || raw === 'problems' ? raw : 'catalog';
  const [supplierOpen, setSupplierOpen] = useState<string | null>(null);
  const partnerships = useQuery({ queryKey: [...RESALE_SELL_KEY, 'partnerships'], queryFn: resaleSellApi.partnerships, retry: false });
  const invitations = (partnerships.data ?? []).filter((p) => p.status === 'PENDING' && p.invited).length;

  if (partnerships.isError)
    return (
      <PageSection>
        <EmptyState icon={Handshake} title="You can't resell right now" hint={apiErrorMessage(partnerships.error, 'Please try again later.')} />
      </PageSection>
    );

  return (
    <PageSection>
      <PageHeader
        title="Find products to sell"
        description="Sell other stores' products in your own store without keeping stock. The supplier ships every order; you earn the commission when the parcel is delivered."
      />
      <PillTabs
        tabs={[
          { id: 'catalog', label: 'Products' },
          { id: 'listings', label: 'My listings' },
          { id: 'suppliers', label: 'My suppliers', count: invitations || undefined },
          { id: 'problems', label: 'Problems' },
        ]}
        value={tab}
        onChange={(t) => setParams(t === 'catalog' ? {} : { tab: t }, { replace: true })}
      />
      {tab === 'catalog' ? (
        <CatalogTab onSupplier={setSupplierOpen} />
      ) : tab === 'listings' ? (
        <ResaleListingsPanel />
      ) : tab === 'problems' ? (
        <ResaleProblemsList side="reseller" />
      ) : (
        <SuppliersTab rows={partnerships.data ?? []} loading={partnerships.isLoading} onSupplier={setSupplierOpen} />
      )}
      {supplierOpen && <SupplierDialog supplierId={supplierOpen} onClose={() => setSupplierOpen(null)} />}
    </PageSection>
  );
}

function CatalogTab({ onSupplier }: { onSupplier: (id: string) => void }) {
  const [adding, setAdding] = useState<CatalogItem | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<CatalogSort>('newest');
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [search, category, sort]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...RESALE_SELL_KEY, 'catalog', search, category, sort, page],
    queryFn: () => resaleSellApi.catalog({ q: search || undefined, category: category || undefined, sort, page }),
    placeholderData: (prev) => prev,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="Search products" />
        <SelectBox ariaLabel="Category" value={category} onChange={setCategory}>
          <option value="">All categories</option>
          {(data?.categories ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectBox>
        <SelectBox ariaLabel="Sort" value={sort} onChange={(v) => setSort(v as CatalogSort)}>
          <option value="newest">Newest</option>
          <option value="earning">Highest earning</option>
          <option value="price_low">Price: low to high</option>
          <option value="price_high">Price: high to low</option>
        </SelectBox>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : isError ? (
        <EmptyState icon={PackageSearch} title="Could not load products" hint={apiErrorMessage(error, 'Please try again.')} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No products to resell yet" hint="Suppliers' products show here as soon as they offer them." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.items.map((item) => (
            <CatalogCard key={item.offerId} item={item} onSupplier={() => onSupplier(item.supplier.id)} onAdd={() => setAdding(item)} />
          ))}
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-neutral-600">
          <button type="button" className={outlineBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" className={outlineBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
      {adding && <AddListingDialog item={adding} onClose={() => setAdding(null)} />}
    </>
  );
}

function partnershipChip(p: CatalogItem['partnership']) {
  if (!p) return null;
  if (p.status === 'PENDING') return p.invited ? 'Invited you' : 'Request sent';
  if (p.status === 'APPROVED') return 'You can sell';
  return PARTNERSHIP_LABEL[p.status];
}

function CatalogCard({ item, onSupplier, onAdd }: { item: CatalogItem; onSupplier: () => void; onAdd: () => void }) {
  const t = item.terms;
  const chip = partnershipChip(item.partnership);
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line">
      {item.photoUrl ? (
        <img src={cloudinaryThumb(item.photoUrl, 400)} alt="" className="aspect-square w-full bg-neutral-50 object-cover" loading="lazy" />
      ) : (
        <div className="aspect-square w-full bg-neutral-50" />
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium text-regantify-text">{item.name}</p>
        <p className="text-xs text-neutral-500">
          Price {t.priceFrom === t.priceTo ? money(t.priceFrom) : `${money(t.priceFrom)} to ${money(t.priceTo)}`}
          {item.inStock === false && <span className="ml-1 text-red-600">· Out of stock</span>}
        </p>
        <p className="text-sm text-emerald-700">
          You earn {money(t.earningPerPiece)}
          {t.earningUpTo > t.earningPerPiece ? ` to ${money(t.earningUpTo)}` : ''} a piece
        </p>
        <p className="text-xs text-neutral-500">
          Commission {commissionLabel(t)}
          {t.minPrice != null && t.maxPrice != null ? ` · you may sell ${money(t.minPrice)} to ${money(t.maxPrice)}` : ''}
        </p>
        {item.pending && (
          <p className="text-xs text-amber-700">
            From {dhakaDate(item.pending.from)}: you earn {money(item.pending.earningPerPiece)} a piece
          </p>
        )}
        {item.marketingNote && <p className="text-xs italic text-neutral-600">“{item.marketingNote}”</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <button type="button" onClick={onSupplier} className="flex min-w-0 items-center gap-1 text-xs text-neutral-700 hover:underline">
            <Store size={13} aria-hidden className="shrink-0" />
            <span className="truncate">{item.supplier.storeName}</span>
            {item.supplier.verified && <BadgeCheck size={13} className="shrink-0 text-emerald-600" aria-label="Verified" />}
            {item.supplierBadge && (
              <span className={`shrink-0 rounded px-1 text-[10px] ${item.supplierBadge === 'RELIABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                {item.supplierBadge === 'RELIABLE' ? 'Reliable' : 'New'}
              </span>
            )}
          </button>
          {item.listingId ? (
            <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">In your store</span>
          ) : item.partnership?.status === 'APPROVED' ? (
            <button type="button" onClick={onAdd} className="shrink-0 text-xs font-medium text-brand hover:underline">
              Add to my store
            </button>
          ) : chip ? (
            <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700">{chip}</span>
          ) : (
            <button type="button" onClick={onSupplier} className="shrink-0 text-xs font-medium text-brand hover:underline">
              Request to sell
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SupplierDialog({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const { data, isLoading, isError, error } = useQuery({ queryKey: [...RESALE_SELL_KEY, 'supplier', supplierId], queryFn: () => resaleSellApi.supplier(supplierId) });

  const done = (msg: string) => {
    queryClient.invalidateQueries({ queryKey: RESALE_SELL_KEY });
    toast.success(msg);
    setAsking(false);
  };
  const request = useMutation({
    mutationFn: (message: string) => resaleSellApi.request(supplierId, message || undefined),
    onSuccess: (p) => done(p.status === 'APPROVED' ? 'You can now sell this supplier’s products.' : 'Request sent. You will get a note when the supplier answers.'),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the request.')),
  });
  const accept = useMutation({
    mutationFn: (id: string) => resaleSellApi.accept(id),
    onSuccess: () => done('Invitation accepted. You can now sell this supplier’s products.'),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not accept the invitation.')),
  });

  const p = data?.partnership ?? null;
  const terms = data ? (lang === 'bn' ? data.termsBn : data.termsEn) || data.termsBn || data.termsEn : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Supplier" maxWidth="max-w-lg">
      {isLoading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : isError || !data ? (
        <p className="py-6 text-center text-sm text-neutral-600">{apiErrorMessage(error, 'Could not load this supplier.')}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="" className="h-12 w-12 rounded-lg border border-line object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-neutral-50">
                <Store size={20} aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1 font-medium text-regantify-text">
                {data.storeName}
                {data.verified && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-normal text-emerald-700">
                    <BadgeCheck size={12} aria-hidden /> Verified
                  </span>
                )}
              </p>
              <p className="text-xs text-neutral-500">On Regantify since {dhakaDate(data.joinedAt)}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Delivered" value={data.deliveredRate === null ? 'New' : `${data.deliveredRate}%`} hint={`${data.delivered} parcels, last ${data.scoreDays} days`} />
            <Stat label="Ships within" value={`${data.shipWithinDays} day${data.shipWithinDays === 1 ? '' : 's'}`} />
            <Stat label="Returns" value={data.returnWindowDays > 0 ? `${data.returnWindowDays} days` : 'None'} />
            <Stat label="Products" value={String(data.offered)} />
          </dl>

          <ScoreBlock score={data.score} />
          <RatingBlock supplierId={data.id} mine={data.myRating} />

          {terms && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-regantify-text">Terms</p>
                {data.termsBn && data.termsEn && (
                  <div className="flex gap-1 text-xs">
                    {(['bn', 'en'] as const).map((l) => (
                      <button key={l} type="button" onClick={() => setLang(l)} className={`rounded px-2 py-0.5 ${lang === l ? 'bg-brand-lime font-medium' : 'text-neutral-600'}`}>
                        {l === 'bn' ? 'Bangla' : 'English'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p lang={lang} className="max-h-48 overflow-y-auto whitespace-pre-line rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                {terms}
              </p>
            </div>
          )}
          {data.pickupNote && <p className="text-xs text-neutral-600">{data.pickupNote}</p>}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {p?.status === 'APPROVED' ? (
              <span className="text-sm text-emerald-700">You can sell this supplier's products. Adding them to your store comes next.</span>
            ) : p?.status === 'PENDING' && p.invited ? (
              <button type="button" disabled={accept.isPending} onClick={() => accept.mutate(p.id)} className={primaryBtn}>
                Accept invitation
              </button>
            ) : p?.status === 'PENDING' ? (
              <span className="text-sm text-neutral-600">Request sent. Waiting for the supplier.</span>
            ) : (
              <button type="button" onClick={() => setAsking(true)} className={primaryBtn}>
                {data.approval === 'OPEN' ? 'Start selling' : 'Request to sell'}
              </button>
            )}
          </div>
        </div>
      )}
      {asking && data && (
        <ResaleNoteDialog
          title={data.approval === 'OPEN' ? 'Start selling' : 'Request to sell'}
          message={
            data.approval === 'OPEN'
              ? `${data.storeName} takes any allowed store. By going on you agree to their terms.`
              : `${data.storeName} approves each reseller. By asking you agree to their terms.`
          }
          label="A note for the supplier"
          placeholder="Tell them about your store and your customers"
          confirmLabel={data.approval === 'OPEN' ? 'Start selling' : 'Send request'}
          busy={request.isPending}
          onConfirm={(note) => request.mutate(note)}
          onClose={() => setAsking(false)}
        />
      )}
    </Dialog>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2" title={hint}>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="font-medium text-regantify-text">{value}</dd>
    </div>
  );
}

function SuppliersTab({ rows, loading, onSupplier }: { rows: Partnership[]; loading: boolean; onSupplier: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [ending, setEnding] = useState<Partnership | null>(null);
  const refresh = (msg: string) => {
    queryClient.invalidateQueries({ queryKey: RESALE_SELL_KEY });
    toast.success(msg);
  };
  const accept = useMutation({ mutationFn: resaleSellApi.accept, onSuccess: () => refresh('Invitation accepted.'), onError: (e) => toast.error(apiErrorMessage(e, 'Could not accept.')) });
  const decline = useMutation({ mutationFn: resaleSellApi.decline, onSuccess: () => refresh('Invitation declined.'), onError: (e) => toast.error(apiErrorMessage(e, 'Could not decline.')) });
  const end = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => resaleSellApi.end(id, note || undefined),
    onSuccess: () => {
      refresh('Done.');
      setEnding(null);
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not end it.')),
  });

  if (loading) return <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>;
  if (rows.length === 0) return <EmptyState icon={Handshake} title="No suppliers yet" hint="Open a product in the Products tab and ask its supplier." />;

  return (
    <>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {rows.map((p) => {
          const invitation = p.status === 'PENDING' && p.invited;
          const waiting = p.status === 'PENDING' && !p.invited;
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <button type="button" onClick={() => onSupplier(p.supplier.id)} className="flex items-center gap-1 text-sm font-medium text-regantify-text hover:underline">
                  {p.supplier.storeName}
                  {p.supplier.verified && <BadgeCheck size={13} className="text-emerald-600" aria-label="Verified" />}
                </button>
                <p className="text-xs text-neutral-500">
                  {invitation ? 'Invited you' : waiting ? 'Request sent, waiting for the supplier' : PARTNERSHIP_LABEL[p.status]}
                  {p.decidedAt ? ` · ${dhakaDate(p.decidedAt)}` : ` · ${dhakaDate(p.requestedAt)}`}
                </p>
                {p.message && invitation && <p className="mt-0.5 text-xs text-neutral-700">“{p.message}”</p>}
                {p.reason && (p.status === 'REJECTED' || p.status === 'BLOCKED' || p.status === 'ENDED') && <p className="mt-0.5 text-xs text-neutral-600">Reason: {p.reason}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                {invitation && (
                  <>
                    <button type="button" disabled={accept.isPending} onClick={() => accept.mutate(p.id)} className={primaryBtn}>
                      Accept
                    </button>
                    <button type="button" disabled={decline.isPending} onClick={() => decline.mutate(p.id)} className={outlineBtn}>
                      Decline
                    </button>
                  </>
                )}
                {(p.status === 'APPROVED' || waiting) && (
                  <button type="button" onClick={() => setEnding(p)} className={outlineBtn}>
                    {waiting ? 'Take back request' : 'Stop selling'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {ending && (
        <ResaleNoteDialog
          title={ending.status === 'APPROVED' ? `Stop selling for ${ending.supplier.storeName}?` : 'Take back your request?'}
          message={ending.status === 'APPROVED' ? 'Their products stop selling in your store. Money you already earned is still paid.' : undefined}
          label="Why (the supplier sees this)"
          confirmLabel={ending.status === 'APPROVED' ? 'Stop selling' : 'Take back'}
          danger={ending.status === 'APPROVED'}
          busy={end.isPending}
          onConfirm={(note) => end.mutate({ id: ending.id, note })}
          onClose={() => setEnding(null)}
        />
      )}
    </>
  );
}

/** "Add to my store" (Step 4): the product becomes a product of this store that follows the supplier. With a price range, the reseller may set its own price. */
function AddListingDialog({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const t = item.terms;
  const range = t.minPrice != null && t.maxPrice != null ? { min: t.minPrice, max: t.maxPrice } : null;
  const [price, setPrice] = useState(range ? String(t.priceFrom) : '');
  const sell = range && price.trim() !== '' ? Number(price) : t.priceFrom;
  const earn = Math.round((t.earningPerPiece + Math.max(0, sell - t.priceFrom)) * 100) / 100;
  const outside = range ? !(sell >= range.min && sell <= range.max) : false;

  const add = useMutation({
    mutationFn: () => resaleSellApi.addListing(item.offerId, range ? sell : null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESALE_SELL_KEY });
      toast.success(`“${item.name}” is now in your store.`);
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not add it.')),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Add to my store" maxWidth="max-w-md">
      <div className="space-y-3 text-sm">
        <p className="text-neutral-700">
          <span className="font-medium text-regantify-text">{item.name}</span> from {item.supplier.storeName}
        </p>
        {range ? (
          <label className="block text-regantify-text">
            Your selling price (৳{range.min} to ৳{range.max})
            <input type="number" min={range.min} max={range.max} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm focus:border-brand focus:outline-none" />
          </label>
        ) : (
          <p className="text-neutral-600">It sells at the supplier's price, {money(t.priceFrom)}{t.priceTo !== t.priceFrom ? ` to ${money(t.priceTo)}` : ''}.</p>
        )}
        {!outside && <p className="text-emerald-700">You earn about {money(earn)} a piece when a parcel is delivered (Regantify's small share comes out of it).</p>}
        <p className="text-xs text-neutral-500">
          It shows in your store with the supplier's photos, description, options and live stock. You can change its name, photos, description and category later in My listings. The supplier ships every order.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" disabled={outside || add.isPending} onClick={() => add.mutate()} className={primaryBtn}>
            {add.isPending ? 'Adding…' : 'Add to my store'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** Step 13: how the supplier really does on resale orders (last 180 days), worked out from the orders, never typed in. */
function ScoreBlock({ score }: { score: SupplierScore }) {
  const pct = (n: number | null) => (n === null ? '—' : `${n}%`);
  return (
    <div>
      <p className="mb-1 flex items-center gap-2 text-sm font-medium text-regantify-text">
        On resale orders
        {score.badge === 'RELIABLE' && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-normal text-emerald-700">Reliable supplier</span>}
        {score.badge === 'NEW' && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-normal text-neutral-600">New: fewer than 20 delivered</span>}
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="Delivered" value={pct(score.deliveredRate)} hint={`${score.delivered} delivered, ${score.returned} returned`} />
        <Stat label="Sent on time" value={pct(score.onTimeRate)} hint="Handed to the courier within the days it promised" />
        <Stat label="Cancelled" value={String(score.cancelled)} hint={`${score.stockOutCancels} of them as out of stock; ${score.disputesLost} problem${score.disputesLost === 1 ? '' : 's'} decided against it`} />
        <Stat
          label="Rating"
          value={score.rating ? `${score.rating.average} ★` : '—'}
          hint={score.rating ? `${score.rating.count} reseller${score.rating.count === 1 ? '' : 's'}` : 'No ratings yet'}
        />
      </dl>
      {score.avgEarningWaitDays !== null && (
        <p className="mt-1 text-xs text-amber-700">Earnings sometimes waited for this supplier’s wallet: {score.avgEarningWaitDays} days on average.</p>
      )}
    </div>
  );
}

/** Step 13: the reseller's own rating of a supplier, open after 5 of its parcels were delivered. */
function RatingBlock({ supplierId, mine }: { supplierId: string; mine: MyRating }) {
  const queryClient = useQueryClient();
  const [stars, setStars] = useState(mine.stars ?? 0);
  const [comment, setComment] = useState(mine.comment ?? '');
  const save = useMutation({
    mutationFn: () => resaleSellApi.rate(supplierId, stars, comment.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESALE_SELL_KEY });
      toast.success('Thanks. Your rating helps other resellers.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save your rating.')),
  });
  if (!mine.canRate) {
    return mine.deliveredFromSupplier > 0 ? (
      <p className="text-xs text-neutral-500">You can rate this supplier after 5 delivered orders ({mine.deliveredFromSupplier} so far).</p>
    ) : null;
  }
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <p className="text-sm text-regantify-text">Your rating</p>
      <div className="mt-1 flex items-center gap-1" role="radiogroup" aria-label="Stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} onClick={() => setStars(n)} className={`text-xl leading-none ${n <= stars ? 'text-amber-500' : 'text-neutral-300'}`}>
            ★
          </button>
        ))}
      </div>
      <input value={comment} maxLength={300} onChange={(e) => setComment(e.target.value)} placeholder="One line for other resellers (optional)" className="mt-2 block h-9 w-full rounded-lg border border-line px-3 text-sm focus:border-brand focus:outline-none" />
      <div className="mt-2 flex justify-end">
        <button type="button" disabled={stars === 0 || save.isPending} onClick={() => save.mutate()} className={outlineBtn}>
          {mine.stars ? 'Change rating' : 'Save rating'}
        </button>
      </div>
    </div>
  );
}
