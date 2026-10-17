import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, ExternalLink, PackageOpen, Pencil, Star, Trash2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState, outlineBtn, primaryBtn } from '../ui/PageKit';
import { RichTextEditor } from '../editor/RichTextEditor';
import { dhakaDate } from './ResaleOfferDialogs';
import { api, apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useAuthStore } from '../../store/authStore';
import { storefrontProductUrl } from '../../lib/storefrontUrl';
import { imageThumb } from '../../lib/imageThumb';
import { commissionLabel } from '../../lib/resaleSupplyApi';
import { RESALE_SELL_KEY, resaleSellApi, type ResaleListing, type UpdateListingInput } from '../../lib/resaleSellApi';

const money = (n: number) => `৳${n.toLocaleString()}`;
const fieldClass = 'mt-1 block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';

/** A download link for an uploaded photo: the server sends it as a file, so the browser saves it instead of opening it. */
function downloadUrl(url: string): string {
  const key = /(Regantify\/[^/?#]+)(?:[?#].*)?$/.exec(url)?.[1];
  return key ? `${api.defaults.baseURL ?? ''}/v1/image/download?k=${encodeURIComponent(key)}` : url;
}

/**
 * Find products to sell > My listings (RESELLER-plan.md Step 4): the supplier products in this store. The reseller can give one its own
 * name, description, photos (a choice of the supplier's), category and, when the supplier allows a range, its own price; options, stock
 * and weight always follow the supplier. Removing it deletes the product from the store; orders already placed are kept.
 */
export function ResaleListingsPanel() {
  const queryClient = useQueryClient();
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const [editing, setEditing] = useState<ResaleListing | null>(null);
  const [removing, setRemoving] = useState<ResaleListing | null>(null);
  const { data, isLoading } = useQuery({ queryKey: [...RESALE_SELL_KEY, 'listings'], queryFn: resaleSellApi.listings });

  const remove = useMutation({
    mutationFn: (id: string) => resaleSellApi.removeListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESALE_SELL_KEY });
      toast.success('Removed from your store.');
      setRemoving(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not remove it.')),
  });

  if (isLoading) return <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>;
  const items = data?.items ?? [];
  if (items.length === 0)
    return <EmptyState icon={PackageOpen} title="Nothing in your store yet" hint="Open the Products tab and press “Add to my store” on a product of a supplier that approved you." />;

  return (
    <>
      <p className="mb-2 text-xs text-neutral-500">
        {items.length} of {data?.max ?? 0} products you can resell.
      </p>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {items.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            {l.photoUrl ? (
              <img src={imageThumb(l.photoUrl, 120)} alt="" className="h-12 w-12 shrink-0 rounded-md border border-line object-cover" loading="lazy" />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-md border border-line bg-neutral-50" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-regantify-text">{l.name}</p>
              <p className="text-xs text-neutral-500">
                From {l.supplier.storeName} · sells at {money(l.sellPrice)}
                {l.terms?.earningPerPiece != null ? ` · you earn ${money(l.terms.earningPerPiece)} a piece` : ''}
                {l.terms ? ` (commission ${commissionLabel(l.terms)})` : ''}
              </p>
              {l.pausedReason ? (
                <p className="mt-0.5 text-xs text-red-700">Hidden from your store: {l.pausedReason}</p>
              ) : l.visibility !== 'PUBLIC' ? (
                <p className="mt-0.5 text-xs text-neutral-500">Draft: not shown in your store.</p>
              ) : null}
              {l.pendingFrom && <p className="mt-0.5 text-xs text-amber-700">Lower terms from {dhakaDate(l.pendingFrom)}.</p>}
              {l.performance.orders > 0 && (
                <p className="mt-0.5 text-xs text-neutral-600">
                  {l.performance.orders} order{l.performance.orders === 1 ? '' : 's'} · {l.performance.delivered} delivered
                  {l.performance.returned > 0 ? ` · ${l.performance.returned} returned` : ''} · earned {money(l.performance.earned)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {subdomain && l.visibility === 'PUBLIC' && (
                <a href={storefrontProductUrl(subdomain, l.slug)} target="_blank" rel="noreferrer" className={outlineBtn} title="See it in your store">
                  <ExternalLink size={14} aria-hidden />
                </a>
              )}
              <button type="button" onClick={() => setEditing(l)} className={outlineBtn}>
                <Pencil size={14} aria-hidden /> Edit
              </button>
              <button type="button" onClick={() => setRemoving(l)} className={outlineBtn} aria-label="Remove from my store">
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-neutral-500">
        Resold products also show in <Link to="/vendor/product/all" className="underline">All Products</Link>; their options and stock always follow the supplier.
      </p>
      {editing && <EditListingDialog listing={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove from your store?"
        message={`“${removing?.name ?? ''}” leaves your store. Orders already placed carry on, and you can add it again later.`}
        confirmLabel="Remove"
        danger
        busy={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </>
  );
}

function EditListingDialog({ listing, onClose }: { listing: ResaleListing; onClose: () => void }) {
  const queryClient = useQueryClient();
  const range = listing.terms && listing.terms.minPrice != null && listing.terms.maxPrice != null ? { min: listing.terms.minPrice, max: listing.terms.maxPrice } : null;
  const [name, setName] = useState(listing.name);
  const [description, setDescription] = useState(listing.description ?? '');
  const [category, setCategory] = useState(listing.category ?? '');
  const [price, setPrice] = useState(listing.ownPrice != null ? String(listing.ownPrice) : '');
  const [photos, setPhotos] = useState<string[]>(listing.photoUrls);
  const [reset, setReset] = useState<Record<keyof ResaleListing['own'] | 'price', boolean>>({ name: false, description: false, photos: false, category: false, price: false });

  const save = useMutation({
    mutationFn: () => {
      const body: UpdateListingInput = {};
      if (reset.name) body.name = null;
      else if (name.trim() !== listing.name) body.name = name.trim();
      if (reset.description) body.description = null;
      else if (description !== (listing.description ?? '')) body.description = description;
      if (reset.category) body.category = null;
      else if (category.trim() !== (listing.category ?? '')) body.category = category.trim();
      if (reset.photos) body.photoUrls = null;
      else if (JSON.stringify(photos) !== JSON.stringify(listing.photoUrls)) body.photoUrls = photos;
      if (range) {
        if (reset.price || price.trim() === '') {
          if (listing.ownPrice != null) body.price = null;
        } else if (Number(price) !== listing.ownPrice) body.price = Number(price);
      }
      return resaleSellApi.updateListing(listing.id, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESALE_SELL_KEY });
      toast.success('Saved. Your store shows it in a moment.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });

  const all = listing.supplierPhotos;
  const togglePhoto = (url: string) => setPhotos((p) => (p.includes(url) ? p.filter((u) => u !== url) : [...p, url]));
  const makeCover = (url: string) => setPhotos((p) => [url, ...p.filter((u) => u !== url)]);
  const resetBox = (k: keyof typeof reset, own: boolean) =>
    own || k === 'price' ? (
      <label className="mt-1 flex items-center gap-1.5 text-xs text-neutral-600">
        <input type="checkbox" checked={reset[k]} onChange={(e) => setReset((r) => ({ ...r, [k]: e.target.checked }))} className="h-3.5 w-3.5 accent-brand" />
        {k === 'price' ? "Sell at the supplier's price" : "Use the supplier's again"}
      </label>
    ) : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Edit resold product" maxWidth="max-w-2xl">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <label className="block text-sm text-regantify-text">
          Name
          <input value={name} maxLength={200} disabled={reset.name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
          {resetBox("name", listing.own.name)}
        </label>

        {range && (
          <label className="block text-sm text-regantify-text">
            Your price (৳{range.min} to ৳{range.max})
            <input type="number" min={range.min} max={range.max} step="0.01" value={price} disabled={reset.price} onChange={(e) => setPrice(e.target.value)} placeholder={String(listing.terms?.supplierPrice ?? '')} className={fieldClass} />
            <span className="mt-1 block text-xs text-neutral-500">What you sell above the supplier's price (৳{listing.terms?.supplierPrice}) is yours too.</span>
            {resetBox("price", true)}
          </label>
        )}

        <label className="block text-sm text-regantify-text">
          Category
          <input value={category} maxLength={120} disabled={reset.category} onChange={(e) => setCategory(e.target.value)} placeholder={listing.supplierCategory ?? ''} className={fieldClass} />
          {resetBox("category", listing.own.category)}
        </label>

        <div>
          <p className="text-sm text-regantify-text">Photos</p>
          <p className="text-xs text-neutral-500">Tick the supplier's photos to show; the star makes one the first photo.</p>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {all.map((url) => {
              const on = photos.includes(url);
              return (
                <div key={url} className={`relative overflow-hidden rounded-md border ${on ? 'border-brand' : 'border-line opacity-60'}`}>
                  <button type="button" onClick={() => togglePhoto(url)} disabled={reset.photos} className="block w-full" aria-pressed={on} aria-label={on ? 'Hide this photo' : 'Show this photo'}>
                    <img src={imageThumb(url, 160)} alt="" className="aspect-square w-full object-cover" />
                  </button>
                  {on && (
                    <button type="button" onClick={() => makeCover(url)} disabled={reset.photos} className="absolute left-1 top-1 rounded bg-white/90 p-0.5" aria-label="Make it the first photo">
                      <Star size={12} className={photos[0] === url ? 'fill-amber-400 text-amber-500' : 'text-neutral-500'} aria-hidden />
                    </button>
                  )}
                  <a href={downloadUrl(url)} className="absolute bottom-1 right-1 rounded bg-white/90 p-0.5" aria-label="Download this photo for your posts">
                    <Download size={12} aria-hidden />
                  </a>
                </div>
              );
            })}
          </div>
          {resetBox("photos", listing.own.photos)}
        </div>

        <div className="text-sm text-regantify-text">
          Description
          {reset.description ? (
            <p className="mt-1 text-xs text-neutral-500">The supplier's description will be used.</p>
          ) : (
            <div className="mt-1">
              <RichTextEditor value={description} onChange={setDescription} placeholder="Describe the product" maxLength={10000} />
            </div>
          )}
          {resetBox("description", listing.own.description)}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={outlineBtn}>
          Cancel
        </button>
        <button type="button" disabled={save.isPending || (!reset.photos && photos.length === 0)} onClick={() => save.mutate()} className={primaryBtn}>
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}
