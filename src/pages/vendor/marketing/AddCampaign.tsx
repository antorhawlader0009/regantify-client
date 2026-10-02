import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ImagePlus, ListPlus, Search, X } from 'lucide-react';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { SaveBar, Segmented, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { outlineBtn } from '../../../components/ui/PageKit';
import { campaignsApi, type CampaignItemInput, type SkuLookupProduct } from '../../../lib/campaignsApi';
import { productsApi, type Product } from '../../../lib/productsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useAuthStore } from '../../../store/authStore';
import { FormHeader, OfferSummary, copyText, latinNumber, taka } from './MarketingKit';
import { campaignPageUrl } from './Campaigns';

interface CoverPhotoState {
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

/** One row in the campaign's product list — a product's own base row (variantId undefined) or one specific variant's row. */
interface CampaignRow {
  productId: string;
  variantId?: string;
  name: string;
  sku: string;
  photoUrl?: string;
  freeShipping: boolean;
  listPrice: string; // display only
  discountPrice: string; // editable — '' means not set
}

function productToRows(product: {
  id: string;
  name: string;
  sku: string;
  photoUrls: string[];
  price: string;
  freeShipping: boolean;
  variants?: { id: string; sku: string; listPrice?: string | null }[];
}): CampaignRow[] {
  const base: CampaignRow = {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    photoUrl: product.photoUrls[0],
    freeShipping: product.freeShipping,
    listPrice: product.price,
    discountPrice: '',
  };
  const variantRows: CampaignRow[] = (product.variants ?? []).map((v) => ({
    productId: product.id,
    variantId: v.id,
    name: product.name,
    sku: v.sku,
    freeShipping: product.freeShipping,
    listPrice: v.listPrice ?? product.price,
    discountPrice: '',
  }));
  return [base, ...variantRows];
}

/** "eid collection 2026" -> "eid-collection-2026". */
function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '');
}

/** "25% off", or null when the price isn't set or isn't lower. */
function percentOff(listPrice: string, price: string) {
  const list = Number(listPrice);
  const p = Number(price);
  if (!price.trim() || !list || p >= list || p < 0) return null;
  return `${Math.round((1 - p / list) * 100)}% off`;
}

/**
 * Marketing > Campaigns "+ Add New" (and Edit, via the :id param). A
 * name and page link, a cover photo, and the products with their
 * campaign prices: add them by search, by a list of SKUs, or all at
 * once, then type a price per product/variant or set "% off" for all.
 */
export default function AddCampaign() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignsApi.findOne(id!),
    enabled: isEdit,
  });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  // The page link follows the name until the seller types their own.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [coverPhoto, setCoverPhoto] = useState<CoverPhotoState | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [skuInput, setSkuInput] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [productFocused, setProductFocused] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const populatedRef = useRef(false);

  // Populate the form once, when editing an existing campaign.
  if (isEdit && existing && !populatedRef.current) {
    populatedRef.current = true;
    setName(existing.name);
    setSlug(existing.slug);
    if (existing.coverPhotoUrl) {
      setCoverPhoto({ previewUrl: existing.coverPhotoUrl, uploadedUrl: existing.coverPhotoUrl, uploading: false });
    }
    // Group the campaign's flat CampaignItem list back into rows — one
    // base row per product (from the variantId: null item, if any) plus
    // one row per variant item, matching productToRows' own shape.
    const byProduct = new Map<string, typeof existing.items>();
    for (const item of existing.items) {
      const list = byProduct.get(item.productId) ?? [];
      list.push(item);
      byProduct.set(item.productId, list);
    }
    const loadedRows: CampaignRow[] = [];
    for (const items of byProduct.values()) {
      const baseItem = items.find((i) => !i.variantId);
      const product = items[0].product;
      // Only show/re-save a base product row if the campaign actually
      // has one — a vendor can add just a specific variant without its
      // base product row, and reloading must not invent one.
      if (baseItem) {
        loadedRows.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          photoUrl: product.photoUrls[0],
          freeShipping: product.freeShipping,
          listPrice: product.price,
          discountPrice: baseItem.discountPrice ? String(Number(baseItem.discountPrice)) : '',
        });
      }
      for (const item of items.filter((i) => i.variantId)) {
        loadedRows.push({
          productId: product.id,
          variantId: item.variantId!,
          name: product.name,
          sku: item.variant!.sku,
          photoUrl: product.photoUrls[0],
          freeShipping: product.freeShipping,
          listPrice: item.variant!.listPrice ?? product.price,
          discountPrice: item.discountPrice ? String(Number(item.discountPrice)) : '',
        });
      }
    }
    setRows(loadedRows);
  }

  const { data: productSearchResults } = useQuery({
    queryKey: ['products-search', productQuery],
    queryFn: () => productsApi.list({ search: productQuery.trim(), perPage: 8 }),
    enabled: productQuery.trim().length > 0,
  });
  const productMatches = (productSearchResults?.products ?? []).filter((p) => !rows.some((r) => r.productId === p.id));

  function buildPayload() {
    const items: CampaignItemInput[] = rows.map((r) => ({
      productId: r.productId,
      variantId: r.variantId,
      discountPrice: r.discountPrice.trim() ? Number(r.discountPrice) : undefined,
    }));
    return { name: name.trim(), slug: slug.trim() || undefined, coverPhotoUrl: coverPhoto?.uploadedUrl, items };
  }

  const saveMutation = useMutation({
    mutationFn: () => (isEdit ? campaignsApi.update(id!, buildPayload()) : campaignsApi.create(buildPayload())),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(isEdit ? 'Campaign saved' : 'Campaign added');
      navigate('/vendor/marketing/campaigns');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError((Array.isArray(message) ? message[0] : message) ?? 'Couldn’t save this campaign. Check your connection and try again.');
    },
  });

  const handleCoverSelect = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) {
      toast.error('Choose a JPG, PNG, WebP or GIF photo.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setCoverPhoto({ previewUrl, uploading: true });
    campaignsApi
      .uploadCoverPhoto(file)
      .then((res) => setCoverPhoto({ previewUrl, uploadedUrl: res.url, uploading: false }))
      .catch((err) => setCoverPhoto({ previewUrl, uploading: false, error: apiErrorMessage(err, 'The photo didn’t upload. Choose it again.') }));
  };

  const addRowsForProduct = (product: Parameters<typeof productToRows>[0]) => {
    setRows((prev) => (prev.some((r) => r.productId === product.id) ? prev : [...prev, ...productToRows(product)]));
  };

  const handleAddBySku = () => {
    const skus = skuInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skus.length === 0) return;
    campaignsApi.lookupBySkus(skus).then((found: SkuLookupProduct[]) => {
      for (const product of found) addRowsForProduct(product);
      const foundSkuSet = new Set(found.flatMap((p) => [p.sku.toLowerCase(), ...p.variants.map((v) => v.sku.toLowerCase())]));
      const notFound = skus.filter((s) => !foundSkuSet.has(s.toLowerCase())).length;
      if (notFound > 0) toast.error(`${notFound} ${notFound === 1 ? 'SKU wasn’t' : 'SKUs weren’t'} found. Check the spelling.`);
      setSkuInput('');
    });
  };

  const addProduct = async (product: Product) => {
    setProductQuery('');
    // The search results don't include variants — fetch the full product
    // once it's picked so its variant rows can be added too.
    try {
      const full = await productsApi.findOne(product.id);
      addRowsForProduct({ id: full.id, name: full.name, sku: full.sku, photoUrls: full.photoUrls, price: full.price, freeShipping: full.freeShipping, variants: full.variants });
    } catch {
      toast.error('Couldn’t add that product. Try again in a minute.');
    }
  };

  const handleAddAll = async () => {
    try {
      // The server caps perPage at 100 — page through the whole catalog.
      const allProducts: Product[] = [];
      let page = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { products, total } = await productsApi.list({ page, perPage: 100 });
        allProducts.push(...products);
        if (allProducts.length >= total || products.length === 0) break;
        page += 1;
      }
      const toAdd = allProducts.filter((p) => !rows.some((r) => r.productId === p.id));
      const fullProducts = await Promise.all(toAdd.map((p) => productsApi.findOne(p.id)));
      for (const full of fullProducts) {
        addRowsForProduct({ id: full.id, name: full.name, sku: full.sku, photoUrls: full.photoUrls, price: full.price, freeShipping: full.freeShipping, variants: full.variants });
      }
      toast.success(toAdd.length ? `${toAdd.length} products added` : 'Every product is already in the list');
    } catch {
      toast.error('Couldn’t add all products. Try again in a minute.');
    }
  };

  const removeProduct = (productId: string) => setRows((prev) => prev.filter((r) => r.productId !== productId));
  const updateRowDiscount = (productId: string, variantId: string | undefined, value: string) =>
    setRows((prev) => prev.map((r) => (r.productId === productId && r.variantId === variantId ? { ...r, discountPrice: value } : r)));

  // "Set prices for all" — the same % off (worked out per row from its
  // list price) or the same price on every row at once.
  const [bulkMode, setBulkMode] = useState<'percent' | 'price'>('percent');
  const [bulkValue, setBulkValue] = useState('');
  const applyBulk = () => {
    const v = Number(bulkValue);
    if (!bulkValue.trim() || v < 0 || (bulkMode === 'percent' && (v <= 0 || v >= 100))) return;
    setRows((prev) =>
      prev.map((r) => ({ ...r, discountPrice: bulkMode === 'percent' ? String(Math.round(Number(r.listPrice) * (1 - v / 100))) : String(v) })),
    );
    setBulkValue('');
  };

  // Unsaved-changes warning.
  const snapshot = JSON.stringify({ name, slug, cover: coverPhoto?.uploadedUrl ?? null, rows: rows.map((r) => [r.productId, r.variantId, r.discountPrice]) });
  const initial = useRef<string | null>(null);
  useEffect(() => {
    if (initial.current == null && (!isEdit || existing)) initial.current = snapshot;
  }, [snapshot, isEdit, existing]);
  const dirty = !saved && initial.current != null && initial.current !== snapshot;
  useUnsavedChangesWarning(dirty);

  const filteredRows = skuSearch.trim() ? rows.filter((r) => r.sku.toLowerCase().includes(skuSearch.trim().toLowerCase())) : rows;
  // Group filtered rows back by product, base row first.
  const productIds = [...new Set(filteredRows.map((r) => r.productId))];
  const groupedRows = productIds.map((pid) => ({
    base: filteredRows.find((r) => r.productId === pid && !r.variantId),
    variants: filteredRows.filter((r) => r.productId === pid && r.variantId),
  }));

  const notLower = rows.filter((r) => r.discountPrice.trim() && Number(r.discountPrice) >= Number(r.listPrice)).length;
  const errors = {
    name: !name.trim() ? 'Give the campaign a name, e.g. Eid collection.' : null,
    slug: !slug.trim() ? 'Type a page link, e.g. eid-collection.' : null,
    cover: coverPhoto?.uploading ? 'Wait for the cover photo to finish uploading.' : coverPhoto?.error ? 'The cover photo didn’t upload. Choose it again.' : null,
    prices: notLower > 0 ? `${notLower} ${notLower === 1 ? 'price is' : 'prices are'} not lower than the regular price.` : null,
  };
  const shown = (k: keyof typeof errors) => (submitted ? errors[k] : null);
  const valid = Object.values(errors).every((e) => !e);
  const pageUrl = subdomain && slug.trim() ? campaignPageUrl(subdomain, slug.trim().replace(/-$/, '')) : null;
  const priced = rows.filter((r) => r.discountPrice.trim()).length;
  const productCount = new Set(rows.map((r) => r.productId)).size;

  const priceInput = (row: CampaignRow) => {
    const off = percentOff(row.listPrice, row.discountPrice);
    const bad = Boolean(row.discountPrice.trim()) && Number(row.discountPrice) >= Number(row.listPrice);
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-32 shrink-0">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">৳</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={row.discountPrice}
            onChange={(e) => updateRowDiscount(row.productId, row.variantId, latinNumber(e.target.value))}
            placeholder="Regular"
            aria-label={`Campaign price for ${row.sku}`}
            className={`${productInputClass} py-2 pl-7 ${bad ? 'border-red-400' : ''}`}
          />
        </div>
        <span className={`w-16 text-xs ${bad ? 'text-red-600' : 'text-emerald-700'}`}>{bad ? 'Not lower' : off}</span>
      </div>
    );
  };

  if (isEdit && isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4" aria-busy>
        <div className="h-12 w-48 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-48 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-4xl"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        setSubmitted(true);
        if (valid) saveMutation.mutate();
      }}
    >
      <FormHeader
        backTo="/vendor/marketing/campaigns"
        backLabel="Campaigns"
        title={isEdit ? `Edit ${existing?.name ?? 'campaign'}` : 'New campaign'}
        description="A page of products at campaign prices, with its own link to share."
      />

      <div className="space-y-4">
        <SectionCard title="Name and link">
          <div className="space-y-4">
            <Field label="Name" required error={shown('name')}>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value).replace(/-$/, ''));
                }}
                placeholder="e.g. Eid collection"
                className={productInputClass}
              />
            </Field>
            <Field label="Page link" required error={shown('slug')} hint="Small letters, numbers and dashes.">
              <div className="flex min-w-0 items-center overflow-hidden rounded-lg border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
                <span className="shrink-0 border-r border-line bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500">/campaigns/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  onBlur={() => setSlug((v) => v.replace(/-$/, ''))}
                  aria-label="Page link"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-regantify-text outline-none"
                />
              </div>
              {pageUrl && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-neutral-50 py-1 pl-3 pr-1">
                  <span className="min-w-0 flex-1 truncate text-xs text-neutral-600">{pageUrl}</span>
                  <button type="button" onClick={() => copyText(pageUrl, 'Page link')} className={`${outlineBtn} h-8 shrink-0`}>
                    <Copy size={13} aria-hidden />
                    Copy
                  </button>
                </div>
              )}
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Cover photo" description="Shown at the top of the page and when the link is shared on Facebook. At least 1200 by 633 pixels.">
          <div className="flex flex-wrap items-start gap-3">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex aspect-[1200/633] w-full max-w-xs items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-neutral-50 hover:border-brand"
            >
              {coverPhoto ? (
                <span className="relative block h-full w-full">
                  <img src={coverPhoto.uploadedUrl ?? coverPhoto.previewUrl} alt="Cover photo" className="h-full w-full object-cover" />
                  {coverPhoto.uploading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex flex-col items-center gap-1 text-sm text-neutral-500">
                  <ImagePlus size={20} aria-hidden />
                  Choose a photo
                </span>
              )}
            </button>
            {coverPhoto && !coverPhoto.uploading && (
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => coverInputRef.current?.click()} className={outlineBtn}>
                  Change photo
                </button>
                <button type="button" onClick={() => setCoverPhoto(null)} className={`${outlineBtn} text-red-600`}>
                  Remove
                </button>
              </div>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              handleCoverSelect(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="hidden"
          />
          {(shown('cover') || coverPhoto?.error) && <p className="mt-2 text-xs text-red-600">{shown('cover') ?? coverPhoto?.error}</p>}
        </SectionCard>

        <SectionCard
          title="Products"
          description="Leave a price empty to keep the product’s regular price on the campaign page."
          action={rows.length > 0 ? <span className="whitespace-nowrap text-xs text-neutral-500">{productCount} products · {priced} priced</span> : undefined}
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" aria-hidden />
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  onFocus={() => setProductFocused(true)}
                  onBlur={() => setTimeout(() => setProductFocused(false), 150)}
                  placeholder="Search products to add"
                  aria-label="Search products to add"
                  className={`${productInputClass} pl-10`}
                />
                {productFocused && productMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg">
                    {productMatches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => addProduct(p)}
                        className="flex min-h-10 w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-regantify-text hover:bg-neutral-50"
                      >
                        <span className="h-7 w-7 shrink-0 overflow-hidden rounded bg-neutral-100">
                          {p.photoUrls[0] && <img src={p.photoUrls[0]} alt="" className="h-full w-full object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        <span className="shrink-0 text-xs text-neutral-500">{p.sku}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={handleAddAll} className={`${outlineBtn} h-[42px] shrink-0`}>
                <ListPlus size={15} aria-hidden />
                Add all products
              </button>
            </div>

            <details className="rounded-lg border border-line">
              <summary className="cursor-pointer select-none px-3 py-2.5 text-sm text-regantify-text">Add many by SKU</summary>
              <div className="border-t border-line p-3">
                <textarea
                  value={skuInput}
                  onChange={(e) => setSkuInput(e.target.value)}
                  rows={2}
                  placeholder="SKU001, SKU002, SKU003"
                  aria-label="SKUs, separated by commas"
                  className={`${productInputClass} resize-y`}
                />
                <button type="button" onClick={handleAddBySku} disabled={!skuInput.trim()} className={`${outlineBtn} mt-2`}>
                  Add these SKUs
                </button>
              </div>
            </details>

            {rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line py-8 text-center text-sm text-neutral-500">No products yet. Search above, or add them all.</p>
            ) : (
              <>
                <div className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 sm:flex-row sm:items-center">
                  <span className="text-sm text-regantify-text">Set prices for all</span>
                  <Segmented<'percent' | 'price'>
                    ariaLabel="How to set prices"
                    value={bulkMode}
                    onChange={setBulkMode}
                    options={[
                      { id: 'percent', label: '% off' },
                      { id: 'price', label: 'Same price' },
                    ]}
                  />
                  <div className="flex gap-2">
                    <div className="relative w-28">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">{bulkMode === 'percent' ? '%' : '৳'}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={bulkValue}
                        onChange={(e) => setBulkValue(latinNumber(e.target.value))}
                        aria-label={bulkMode === 'percent' ? 'Percent off for all' : 'Price for all'}
                        className={`${productInputClass} py-2 pl-7`}
                      />
                    </div>
                    <button type="button" onClick={applyBulk} disabled={!bulkValue.trim()} className={outlineBtn}>
                      Apply
                    </button>
                  </div>
                </div>

                {rows.length > 6 && (
                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" aria-hidden />
                    <input
                      type="text"
                      value={skuSearch}
                      onChange={(e) => setSkuSearch(e.target.value)}
                      placeholder="Find a SKU in this list"
                      aria-label="Find a SKU in this list"
                      className={`${productInputClass} pl-10`}
                    />
                  </div>
                )}

                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {groupedRows.map(({ base, variants }) => {
                    const first = base ?? variants[0];
                    return (
                      <Fragment key={first.productId}>
                        <li className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-100">
                            {first.photoUrl && <img src={first.photoUrl} alt="" className="h-full w-full object-cover" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-regantify-text">{first.name}</p>
                            <p className="text-xs text-neutral-500">
                              {base ? `${base.sku} · regular ${taka(base.listPrice)}` : 'Chosen sizes/colours only'}
                              {first.freeShipping && ' · free delivery'}
                            </p>
                          </div>
                          {base && priceInput(base)}
                          <button
                            type="button"
                            onClick={() => removeProduct(first.productId)}
                            aria-label={`Remove ${first.name}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <X size={15} />
                          </button>
                        </li>
                        {variants.map((v) => (
                          <li key={`${v.productId}-${v.variantId}`} className="flex flex-wrap items-center gap-3 bg-neutral-50/60 py-2 pl-[64px] pr-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-regantify-text">{v.sku}</p>
                              <p className="text-xs text-neutral-500">regular {taka(v.listPrice)}</p>
                            </div>
                            {priceInput(v)}
                            <span className="w-9 shrink-0" aria-hidden />
                          </li>
                        ))}
                      </Fragment>
                    );
                  })}
                </ul>
                {skuSearch.trim() && (
                  <p className="text-xs text-neutral-500">
                    Showing {filteredRows.length} of {rows.length}.
                  </p>
                )}
                {shown('prices') && <p className="text-xs text-red-600">{shown('prices')}</p>}
              </>
            )}
          </div>
        </SectionCard>
      </div>

      <SaveBar
        message={
          formError ? (
            <span className="text-red-600">{formError}</span>
          ) : submitted && !valid ? (
            <span className="text-red-600">Fix the fields marked in red.</span>
          ) : (
            <OfferSummary>
              {productCount === 0
                ? 'Add products to fill the campaign page.'
                : `${productCount} ${productCount === 1 ? 'product' : 'products'} on the page, ${priced} ${priced === 1 ? 'price' : 'prices'} lowered.`}
            </OfferSummary>
          )
        }
      >
        <Link to="/vendor/marketing/campaigns" className={`${outlineBtn} h-10`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save campaign' : 'Add campaign'}
        </button>
      </SaveBar>
    </form>
  );
}
