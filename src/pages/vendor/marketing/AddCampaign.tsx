import { Fragment, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, X, ImagePlus, Search } from 'lucide-react';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { campaignsApi, type CampaignItemInput, type SkuLookupProduct } from '../../../lib/campaignsApi';
import { productsApi, type Product } from '../../../lib/productsApi';
import { toast } from '../../../lib/toast';

interface CoverPhotoState {
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

/** One row in the campaign's product table — a product's own base row (variantId undefined) or one specific variant's row. */
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

/**
 * Marketing > Campaigns "+ Add New" (and Edit, via the :id param — same
 * page, same shape as AddCollection.tsx) — matches the reference New/
 * Edit Campaign forms field-for-field: General Information, Cover
 * Photo, and Campaign Products (Add Products by SKU, a per-row editable
 * Discount Price table with product base rows and variant sub-rows, and
 * a product search picker).
 */
export default function AddCampaign() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => campaignsApi.findOne(id!),
    enabled: isEdit,
  });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [coverPhoto, setCoverPhoto] = useState<CoverPhotoState | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [skuInput, setSkuInput] = useState('');
  const [skuSearch, setSkuSearch] = useState('');

  const [rows, setRows] = useState<CampaignRow[]>([]);

  const [productQuery, setProductQuery] = useState('');
  const [productFocused, setProductFocused] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const populatedRef = useRef(false);

  // Populate the form once, when editing an existing campaign.
  if (isEdit && existing && !populatedRef.current) {
    populatedRef.current = true;
    setName(existing.name);
    setSlug(existing.slug);
    if (existing.coverPhotoUrl) {
      setCoverPhoto({ previewUrl: existing.coverPhotoUrl, uploadedUrl: existing.coverPhotoUrl, uploading: false });
    }
    // Group the campaign's flat CampaignItem list back into rows —
    // one base row per product (from the variantId: null item, if any)
    // plus one row per variant item, matching productToRows' own shape
    // so the same table renderer works for both a fresh pick and a
    // reload.
    const byProduct = new Map<string, typeof existing.items>();
    for (const item of existing.items) {
      const list = byProduct.get(item.productId) ?? [];
      list.push(item);
      byProduct.set(item.productId, list);
    }
    const loadedRows: CampaignRow[] = [];
    for (const items of byProduct.values()) {
      const baseItem = items.find((i) => !i.variantId);
      const first = items[0];
      const product = first.product;
      // Only show/re-save a base product row if the campaign actually
      // has one — a vendor can add just a specific variant (e.g.
      // spc1387-brown) without its base product row, and reloading
      // must not silently invent one that would then get created for
      // real on the next save.
      if (baseItem) {
        loadedRows.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          photoUrl: product.photoUrls[0],
          freeShipping: product.freeShipping,
          listPrice: product.price,
          discountPrice: baseItem.discountPrice ?? '',
        });
      }
      for (const item of items.filter((i) => i.variantId)) {
        loadedRows.push({
          productId: product.id,
          variantId: item.variantId!,
          name: product.name,
          sku: item.variant!.sku,
          freeShipping: product.freeShipping,
          listPrice: item.variant!.listPrice ?? product.price,
          discountPrice: item.discountPrice ?? '',
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

  const productMatches = (productSearchResults?.products ?? []).filter(
    (p) => !rows.some((r) => r.productId === p.id),
  );

  const saveMutation = useMutation({
    mutationFn: () => (isEdit ? campaignsApi.update(id!, buildPayload()) : campaignsApi.create(buildPayload())),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(isEdit ? 'Campaign updated.' : 'Campaign created.');
      navigate('/vendor/marketing/campaigns');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not save the campaign. Please try again.');
    },
  });

  function buildPayload() {
    const items: CampaignItemInput[] = rows.map((r) => ({
      productId: r.productId,
      variantId: r.variantId,
      discountPrice: r.discountPrice.trim() ? Number(r.discountPrice) : undefined,
    }));
    return {
      name: name.trim(),
      slug: slug.trim() || undefined,
      coverPhotoUrl: coverPhoto?.uploadedUrl,
      items,
    };
  }

  const handleCoverSelect = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) return;

    const previewUrl = URL.createObjectURL(file);
    setCoverPhoto({ previewUrl, uploading: true });

    campaignsApi
      .uploadCoverPhoto(file)
      .then((res) => setCoverPhoto({ previewUrl, uploadedUrl: res.url, uploading: false }))
      .catch(() => setCoverPhoto({ previewUrl, uploading: false, error: 'Upload failed' }));
  };

  const addRowsForProduct = (product: {
    id: string;
    name: string;
    sku: string;
    photoUrls: string[];
    price: string;
    freeShipping: boolean;
    variants?: { id: string; sku: string; listPrice?: string | null }[];
  }) => {
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
      const foundSkuSet = new Set(
        found.flatMap((p) => [p.sku.toLowerCase(), ...p.variants.map((v) => v.sku.toLowerCase())]),
      );
      const notFoundCount = skus.filter((s) => !foundSkuSet.has(s.toLowerCase())).length;
      if (notFoundCount > 0) {
        toast.error(`${notFoundCount} SKU(s) could not be found.`);
      }
      setSkuInput('');
    });
  };

  const addProduct = async (product: Product) => {
    setProductQuery('');
    // The search picker's results don't include variants (a lean list
    // shape — see productsApi.list) — fetch the full product once it's
    // picked so its variant rows can be added too, same reasoning as
    // Edit Product needing a full findOne.
    try {
      const full = await productsApi.findOne(product.id);
      addRowsForProduct({
        id: full.id,
        name: full.name,
        sku: full.sku,
        photoUrls: full.photoUrls,
        price: full.price,
        freeShipping: full.freeShipping,
        variants: full.variants,
      });
    } catch {
      toast.error('Could not load that product. Please try again.');
    }
  };

  const handleAddAll = async () => {
    try {
      // The server caps perPage at 100 (see products.controller.ts) — a
      // single large request would silently only ever return the first
      // 100 products, which "Add All" must not do. Page through the
      // whole catalog instead, same pattern any "export everything"
      // flow needs against a capped list endpoint.
      const allProducts: Product[] = [];
      let page = 1;
      const perPage = 100;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { products, total } = await productsApi.list({ page, perPage });
        allProducts.push(...products);
        if (allProducts.length >= total || products.length === 0) break;
        page += 1;
      }

      const toAdd = allProducts.filter((p) => !rows.some((r) => r.productId === p.id));
      const fullProducts = await Promise.all(toAdd.map((p) => productsApi.findOne(p.id)));
      for (const full of fullProducts) {
        addRowsForProduct({
          id: full.id,
          name: full.name,
          sku: full.sku,
          photoUrls: full.photoUrls,
          price: full.price,
          freeShipping: full.freeShipping,
          variants: full.variants,
        });
      }
    } catch {
      toast.error('Could not load all products. Please try again.');
    }
  };

  const removeProduct = (productId: string) => {
    setRows((prev) => prev.filter((r) => r.productId !== productId));
  };

  const updateRowDiscount = (productId: string, variantId: string | undefined, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.productId === productId && r.variantId === variantId ? { ...r, discountPrice: value } : r)),
    );
  };

  // "Apply Discount" — a quick way to set the same discount on every row
  // currently in the list at once (base rows and variant rows alike),
  // rather than typing the same number into each input individually.
  const [bulkDiscount, setBulkDiscount] = useState('');
  const [bulkDiscountOpen, setBulkDiscountOpen] = useState(false);
  const applyBulkDiscount = () => {
    if (!bulkDiscount.trim()) return;
    setRows((prev) => prev.map((r) => ({ ...r, discountPrice: bulkDiscount.trim() })));
    setBulkDiscountOpen(false);
    setBulkDiscount('');
  };

  const filteredRows = skuSearch.trim()
    ? rows.filter((r) => r.sku.toLowerCase().includes(skuSearch.trim().toLowerCase()))
    : rows;

  // Group filtered rows back by product, base row first, so variant
  // sub-rows always render directly under their own product.
  const productIds = [...new Set(filteredRows.map((r) => r.productId))];
  const groupedRows = productIds.map((pid) => ({
    base: filteredRows.find((r) => r.productId === pid && !r.variantId),
    variants: filteredRows.filter((r) => r.productId === pid && r.variantId),
  }));

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Campaign name is required.');
      return;
    }
    if (!slug.trim()) {
      setFormError('Page link is required.');
      return;
    }
    if (coverPhoto?.uploading) {
      setFormError('Please wait for the cover photo to finish uploading.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => navigate('/vendor/marketing/campaigns')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Campaigns
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">{isEdit ? 'Edit Campaign' : 'New Campaign'}</h1>

      <div className="space-y-6">
        <SectionCard title="General Information">
          <div className="space-y-5">
            <Field label="Name" required>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>

            <Field label="Page Link" required hint="Dedicated shop listing page for this campaign">
              <div className="flex items-center rounded-xl bg-regantify-search overflow-hidden">
                <span className="pl-3.5 pr-1 text-sm text-regantify-text-muted whitespace-nowrap">
                  https://storepal.com.bd/shop/campaigns/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 py-2.5 pr-3.5 bg-transparent text-regantify-text text-sm focus:outline-none"
                />
              </div>
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Cover Photo">
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="w-full max-w-xs aspect-[4/3] rounded-xl border-2 border-dashed border-black/15 bg-regantify-content
              flex items-center justify-center overflow-hidden hover:border-black/25"
          >
            {coverPhoto ? (
              <div className="relative w-full h-full">
                <img src={coverPhoto.uploadedUrl ?? coverPhoto.previewUrl} alt="" className="w-full h-full object-cover" />
                {coverPhoto.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <ImagePlus size={22} className="text-regantify-text-muted" />
            )}
          </button>
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
          <p className="text-xs text-regantify-text-muted mt-1.5">
            Cover photo size should be at least 1200x633. This photo will be shown on category page and on facebook.
          </p>
        </SectionCard>

        <SectionCard title="Campaign Products">
          <Field label="Add Products by SKU" hint="Enter comma-separated SKU IDs to add multiple products at once">
            <textarea
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              rows={3}
              placeholder="Enter comma-separated SKU IDs (e.g., SKU001, SKU002, SKU003)"
              className={`${inputClass} resize-y`}
            />
          </Field>
          <div className="flex gap-2 mt-3 mb-5">
            <button
              type="button"
              onClick={handleAddBySku}
              className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium"
            >
              Add to List
            </button>
            <button
              type="button"
              onClick={() => setSkuInput('')}
              className="px-4 py-2 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-regantify-content"
            >
              Clear
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="text-center text-sm text-regantify-text-muted py-6">No products added to this campaign</p>
          ) : (
            <div className="mb-5">
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
                <input
                  type="text"
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  placeholder="Search products by SKU from this list"
                  className={`${inputClass} pl-10`}
                />
              </div>
              <p className="text-xs text-regantify-text-muted mb-3">Showing {filteredRows.length} products</p>

              <div className="border border-black/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-regantify-content text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide">
                      <th className="p-3 w-10" />
                      <th className="p-3">SKU</th>
                      <th className="p-3">Free Shipping</th>
                      <th className="p-3">List Price</th>
                      <th className="p-3">Discount Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRows.map(({ base, variants }) => (
                      <Fragment key={base?.productId ?? variants[0]?.productId}>
                        {base && (
                          <tr key={base.productId} className="border-t border-black/5 align-top">
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => removeProduct(base.productId)}
                                className="w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                                aria-label="Remove product"
                              >
                                <X size={11} />
                              </button>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                {base.photoUrl && (
                                  <img src={base.photoUrl} alt="" className="w-9 h-9 rounded-lg object-cover bg-regantify-content shrink-0" />
                                )}
                                <span className="text-regantify-cta">{base.sku}</span>
                              </div>
                            </td>
                            <td className="p-3 text-regantify-text">{base.freeShipping ? 'Yes' : 'No'}</td>
                            <td className="p-3 text-regantify-text">{Number(base.listPrice).toLocaleString()}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                min={0}
                                value={base.discountPrice}
                                onChange={(e) => updateRowDiscount(base.productId, undefined, e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-regantify-search text-regantify-text text-sm focus:outline-none"
                              />
                            </td>
                          </tr>
                        )}
                        {variants.map((v) => (
                          <tr key={`${v.productId}-${v.variantId}`} className="border-t border-black/5">
                            <td className="p-3" />
                            <td className="p-3 pl-11 text-regantify-cta">{v.sku}</td>
                            <td className="p-3" />
                            <td className="p-3" />
                            <td className="p-3">
                              <input
                                type="number"
                                min={0}
                                value={v.discountPrice}
                                onChange={(e) => updateRowDiscount(v.productId, v.variantId, e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-regantify-search text-regantify-text text-sm focus:outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select className="px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none" defaultValue="Product">
              <option>Product</option>
            </select>
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                onFocus={() => setProductFocused(true)}
                onBlur={() => setTimeout(() => setProductFocused(false), 150)}
                placeholder="Search product(s) to add"
                className={inputClass}
              />
              {productFocused && productMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 bg-white rounded-xl shadow-lg border border-black/10 max-h-56 overflow-y-auto py-1">
                  {productMatches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => addProduct(p)}
                      className="w-full text-left px-3.5 py-2 text-sm text-regantify-text hover:bg-regantify-content flex items-center gap-2.5"
                    >
                      <img src={p.photoUrls[0] ?? ''} alt="" className="w-6 h-6 rounded object-cover bg-regantify-content" />
                      <span className="truncate">{p.name}</span>
                      <span className="text-xs text-regantify-text-muted ml-auto shrink-0">{p.sku}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddAll}
              className="px-4 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-cta hover:bg-regantify-content whitespace-nowrap"
            >
              Add All
            </button>
          </div>

          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setBulkDiscountOpen((v) => !v)}
              className="px-4 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-cta hover:bg-regantify-content"
            >
              Apply Discount
            </button>
            {bulkDiscountOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-10 bg-white rounded-xl shadow-lg border border-black/10 p-3 flex items-center gap-2 w-64">
                <input
                  type="number"
                  min={0}
                  value={bulkDiscount}
                  onChange={(e) => setBulkDiscount(e.target.value)}
                  placeholder="Discount price"
                  className="flex-1 px-3 py-2 rounded-lg bg-regantify-search text-regantify-text text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={applyBulkDiscount}
                  className="px-3 py-2 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium whitespace-nowrap"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </SectionCard>

        {formError && <p className="text-red-500 text-sm">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="px-8 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Campaign' : 'Create Campaign'}
        </button>
      </div>
    </div>
  );
}
