import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, X, ImagePlus, Search } from 'lucide-react';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { collectionsApi } from '../../../lib/collectionsApi';
import { categoriesApi } from '../../../lib/categoriesApi';
import { productsApi, type Product } from '../../../lib/productsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface CoverPhotoState {
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

export default function AddCollection() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['collections', id],
    queryFn: () => collectionsApi.findOne(id!),
    enabled: isEdit,
  });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [coverPhoto, setCoverPhoto] = useState<CoverPhotoState | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [hideHeader, setHideHeader] = useState(false);
  const [hideFooter, setHideFooter] = useState(false);
  const [hideSidebar, setHideSidebar] = useState(false);
  const [hideBreadcrumb, setHideBreadcrumb] = useState(false);

  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryFocused, setCategoryFocused] = useState(false);

  const [skuInput, setSkuInput] = useState('');

  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [productFocused, setProductFocused] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const populatedRef = useRef(false);

  // Populate the form once, when editing an existing collection.
  if (isEdit && existing && !populatedRef.current) {
    populatedRef.current = true;
    setName(existing.name);
    setSlug(existing.slug);
    setContent(existing.content ?? '');
    if (existing.coverPhotoUrl) {
      setCoverPhoto({ previewUrl: existing.coverPhotoUrl, uploadedUrl: existing.coverPhotoUrl, uploading: false });
    }
    setHideHeader(existing.hideHeader);
    setHideFooter(existing.hideFooter);
    setHideSidebar(existing.hideSidebar);
    setHideBreadcrumb(existing.hideBreadcrumb);
    setCategoryNames(existing.categoryNames);
    setSelectedProducts(
      existing.products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, photoUrls: p.photoUrls }) as Product),
    );
  }

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const categoryMatches = useMemo(
    () =>
      categoryQuery.trim()
        ? allCategories.filter(
            (c) => c.name.toLowerCase().includes(categoryQuery.trim().toLowerCase()) && !categoryNames.includes(c.name),
          )
        : [],
    [allCategories, categoryQuery, categoryNames],
  );

  const { data: productSearchResults } = useQuery({
    queryKey: ['products-search', productQuery],
    queryFn: () => productsApi.list({ search: productQuery.trim(), perPage: 8 }),
    enabled: productQuery.trim().length > 0,
  });

  const productMatches = (productSearchResults?.products ?? []).filter(
    (p) => !selectedProducts.some((sp) => sp.id === p.id),
  );

  const createMutation = useMutation({
    mutationFn: () => (isEdit ? collectionsApi.update(id!, buildPayload()) : collectionsApi.create(buildPayload())),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success(isEdit ? 'Collection updated.' : 'Collection created.');
      navigate('/vendor/product/collections');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not save the collection. Please try again.');
    },
  });

  function buildPayload() {
    return {
      name: name.trim(),
      slug: slug.trim() || undefined,
      coverPhotoUrl: coverPhoto?.uploadedUrl,
      content: content || undefined,
      hideHeader,
      hideFooter,
      hideSidebar,
      hideBreadcrumb,
      categoryNames,
      productIds: selectedProducts.map((p) => p.id),
    };
  }

  const handleCoverSelect = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) return;

    const previewUrl = URL.createObjectURL(file);
    setCoverPhoto({ previewUrl, uploading: true });

    collectionsApi
      .uploadCoverPhoto(file)
      .then((res) => setCoverPhoto({ previewUrl, uploadedUrl: res.url, uploading: false }))
      .catch((err) => setCoverPhoto({ previewUrl, uploading: false, error: apiErrorMessage(err, 'Upload failed') }));
  };

  const addCategory = (categoryName: string) => {
    if (!categoryNames.includes(categoryName)) setCategoryNames([...categoryNames, categoryName]);
    setCategoryQuery('');
  };

  const handleAddBySku = () => {
    const skus = skuInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skus.length === 0) return;

    Promise.all(skus.map((sku) => productsApi.list({ search: sku, perPage: 1 }))).then((results) => {
      const found = results.flatMap((r) => r.products).filter((p) => !selectedProducts.some((sp) => sp.id === p.id));
      if (found.length > 0) {
        setSelectedProducts((prev) => [...prev, ...found]);
      }
      const notFoundCount = skus.length - found.length;
      if (notFoundCount > 0) {
        toast.error(`${notFoundCount} SKU(s) could not be found.`);
      }
    });
  };

  const addProduct = (product: Product) => {
    setSelectedProducts((prev) => [...prev, product]);
    setProductQuery('');
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Collection name is required.');
      return;
    }
    if (coverPhoto?.uploading) {
      setFormError('Please wait for the cover photo to finish uploading.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/product/collections')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Collection
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">{isEdit ? 'Edit Collection' : 'Add Collection'}</h1>

      <div className="space-y-6">
        <SectionCard title="General Information">
          <div className="space-y-5">
            <Field label="Name">
              <input type="text" value={name} onChange={(e) => setName(e.target.value.slice(0, 150))} maxLength={150} className={inputClass} />
            </Field>

            <Field label="Collection Link" required hint="Dedicated shop listing page for this collection">
              <div className="flex items-center rounded-xl bg-regantify-search overflow-hidden">
                <span className="pl-3.5 pr-1 text-sm text-regantify-text-muted whitespace-nowrap">
                  https://storepal.com.bd/shop/collections/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.slice(0, 200))}
                  maxLength={200}
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

        <SectionCard title="Content">
          <RichTextEditor value={content} onChange={setContent} placeholder="Enter text here…" maxLength={10000} />
        </SectionCard>

        <SectionCard title="Layout Options">
          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 text-sm text-regantify-text cursor-pointer">
              <input type="checkbox" checked={hideHeader} onChange={(e) => setHideHeader(e.target.checked)} />
              Hide header
            </label>
            <label className="flex items-center gap-2.5 text-sm text-regantify-text cursor-pointer">
              <input type="checkbox" checked={hideFooter} onChange={(e) => setHideFooter(e.target.checked)} />
              Hide footer
            </label>
            <label className="flex items-center gap-2.5 text-sm text-regantify-text cursor-pointer">
              <input type="checkbox" checked={hideSidebar} onChange={(e) => setHideSidebar(e.target.checked)} />
              Hide sidebar
            </label>
            <label className="flex items-center gap-2.5 text-sm text-regantify-text cursor-pointer">
              <input type="checkbox" checked={hideBreadcrumb} onChange={(e) => setHideBreadcrumb(e.target.checked)} />
              Hide breadcrumb
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Add from Category">
          <p className="text-xs text-regantify-text-muted mb-2">
            Selected categories will be shown here. All products from selected categories will be added to collection
            automatically.
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {categoryNames.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-regantify-black text-white text-xs font-medium">
                {c}
                <button type="button" onClick={() => setCategoryNames(categoryNames.filter((x) => x !== c))}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              value={categoryQuery}
              onChange={(e) => setCategoryQuery(e.target.value.slice(0, 100))}
              onFocus={() => setCategoryFocused(true)}
              onBlur={() => setTimeout(() => setCategoryFocused(false), 150)}
              placeholder="Search Category"
              maxLength={100}
              className={inputClass}
            />
            {categoryFocused && categoryMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 bg-white rounded-xl shadow-lg border border-black/10 max-h-48 overflow-y-auto py-1">
                {categoryMatches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => addCategory(c.name)}
                    className="w-full text-left px-3.5 py-2 text-sm text-regantify-text hover:bg-regantify-content"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Add Products by SKU">
          <Field label="Add Products by SKU" hint="Enter comma-separated SKU IDs to add multiple products at once">
            <textarea
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value.slice(0, 5000))}
              rows={3}
              maxLength={5000}
              placeholder="Enter comma-separated SKU IDs (e.g., SKU001, SKU002, SKU003)"
              className={`${inputClass} resize-y`}
            />
          </Field>
          <div className="flex gap-2 mt-3">
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
        </SectionCard>

        <SectionCard title="Product List">
          <p className="text-sm font-medium text-regantify-text mb-2">Products</p>
          <div className="space-y-2 mb-3">
            {selectedProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-regantify-content">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src={p.photoUrls[0] ?? ''} alt="" className="w-8 h-8 rounded-lg object-cover bg-white shrink-0" />
                  <span className="text-sm text-regantify-text truncate">{p.name}</span>
                  <span className="text-xs text-regantify-text-muted shrink-0">{p.sku}</span>
                </div>
                <button type="button" onClick={() => removeProduct(p.id)} className="text-regantify-text-muted hover:text-red-600 shrink-0">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value.slice(0, 200))}
              onFocus={() => setProductFocused(true)}
              onBlur={() => setTimeout(() => setProductFocused(false), 150)}
              placeholder="Search products to add"
              maxLength={200}
              className={`${inputClass} pl-10`}
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
        </SectionCard>

        {formError && <p className="text-red-500 text-sm">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="px-8 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium transition-colors disabled:opacity-60"
        >
          {createMutation.isPending ? 'Saving…' : isEdit ? 'Update Collection' : 'Add Collection'}
        </button>
      </div>
    </div>
  );
}
