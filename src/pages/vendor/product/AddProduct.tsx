import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2, Plus, Sparkles, UploadCloud } from 'lucide-react';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import {
  PhotoManager,
  PriceFields,
  ProductSideCard,
  QuickAddButton,
  SaveBar,
  SearchListingCard,
  StatusCard,
  type ProductSchedule,
  ToggleRow,
  htmlToText,
  moveItem,
  useUnsavedChangesWarning,
} from '../../../components/product/ProductFormKit';
import { VariationsEditor } from '../../../components/product/VariationsEditor';
import { SizeGuideField } from '../../../components/product/SizeGuideField';
import { SearchWordsField } from '../../../components/product/SearchWordsField';
import { categoriesApi } from '../../../lib/categoriesApi';
import { AddCategoryModal } from './AddCategoryModal';
import { AddBrandModal } from './AddBrandModal';
import { ImportCsvModal } from './ImportCsvModal';
import { productsApi, type VariationOptionInput, type ProductVariantInput, type VariationValuePhotoInput } from '../../../lib/productsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useAuthStore } from '../../../store/authStore';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { BarcodeInput } from '../../../components/product/BarcodeField';

type PhotoSize = 'SQUARE' | 'PORTRAIT';
type WeightUnit = 'KG' | 'G' | 'LB';

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

/** Mirrors the server's slugify (see ProductsService) for the live preview. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function AddProduct() {
  const navigate = useNavigate();
  const storeSubdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const storeName = useAuthStore((s) => s.user?.vendor?.storeName);

  // Details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'DRAFT'>('PUBLIC');
  // Optional schedule (Status card): go live / hide by itself at a time, in Dhaka time.
  const [schedule, setSchedule] = useState<ProductSchedule>({ publishAt: null, unpublishAt: null });
  const [showSummary, setShowSummary] = useState(false);
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [summary, setSummary] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  // Hidden words that also find the product in the store's search ("also found as").
  const [searchKeywords, setSearchKeywords] = useState<string[]>([]);
  const [metaDescription, setMetaDescription] = useState('');

  // Web address: follows the name until the vendor edits it.
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const displaySlug = slug.trim() || slugify(name) || 'your-product';

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  // Photos / video
  const [photoSize, setPhotoSize] = useState<PhotoSize>('SQUARE');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [videoUrl, setVideoUrl] = useState('');

  // Price
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [cost, setCost] = useState('');

  // Stock
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [isPreOrder, setIsPreOrder] = useState(false);
  // LMS-plan.md Step 9: StorePal shows "Request a price" instead of the price.
  const [quoteOnly, setQuoteOnly] = useState(false);
  const [minOrderQuantity, setMinOrderQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  // The size guide beside the Size choice on the store; empty = the category's guide.
  const [sizeGuideId, setSizeGuideId] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('KG');

  // Variations
  const [variationOptions, setVariationOptions] = useState<VariationOptionInput[]>([]);
  const [variants, setVariants] = useState<ProductVariantInput[]>([]);
  const [variationPhotos, setVariationPhotos] = useState<VariationValuePhotoInput[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  // Field errors show only after the first Save attempt, then update as you type.
  const [triedSave, setTriedSave] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddMainCategory, setShowAddMainCategory] = useState(false);
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const queryClient = useQueryClient();

  const nameError = triedSave && !name.trim() ? 'Enter a product name.' : null;
  const priceError = triedSave && (!price.trim() || Number.isNaN(Number(price))) ? 'Enter the price shoppers pay.' : null;
  const skuError = triedSave && !sku.trim() ? 'Enter a SKU code (any short code you use for this product).' : null;

  const dirty = Boolean(name || description || price || sku || photos.length || variationOptions.length);
  const [saved, setSaved] = useState(false);
  useUnsavedChangesWarning(dirty && !saved);

  // Store > Categories' real category tree — drives the Main/Sub Category selects.
  const { data: categoryOptions = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 60_000,
  });

  // Main/Sub Category are two views onto the same `categoryId`.
  const mainCategoryOptions = categoryOptions.filter((c) => !c.parentId);
  const selectedProductCategory = categoryOptions.find((c) => c.id === categoryId);
  const mainCategoryId = selectedProductCategory ? (selectedProductCategory.parentId ?? selectedProductCategory.id) : '';
  const subCategoryId = selectedProductCategory?.parentId ? selectedProductCategory.id : '';
  const subCategoryOptions = mainCategoryId ? categoryOptions.filter((c) => c.parentId === mainCategoryId) : [];

  // `category` (plain text) is the legacy field the storefront still reads
  // for filtering/breadcrumbs — picking a Main/Sub Category keeps it in sync.
  const handleMainCategoryChange = (id: string) => {
    setCategoryId(id);
    setCategory(categoryOptions.find((c) => c.id === id)?.name ?? '');
  };
  const handleSubCategoryChange = (id: string) => {
    const resolvedId = id || mainCategoryId;
    setCategoryId(resolvedId);
    setCategory(categoryOptions.find((c) => c.id === resolvedId)?.name ?? '');
  };

  // "AI Generate" needs a name and one uploaded photo (the server reads the
  // photo by URL). It never touches price or stock (AiService.generateProductInfo).
  const firstUploadedPhotoUrl = photos.find((p) => p.uploadedUrl && !p.uploading)?.uploadedUrl;
  const canAiGenerate = Boolean(name.trim()) && Boolean(firstUploadedPhotoUrl);

  const aiGenerateMutation = useMutation({
    mutationFn: () => productsApi.aiGenerate(name.trim(), firstUploadedPhotoUrl!),
    onSuccess: (info) => {
      setDescription(info.description);
      setCategory(info.category);
      setBrand(info.brand);
      setSummary(info.summary);
      setMetaTitle(info.metaTitle);
      setMetaDescription(info.metaDescription);
      if (info.weight != null) setWeight(String(info.weight));
      setWeightUnit(info.weightUnit);
      setShowSummary(true);
      toast.success('Product info filled in. Check it before saving.');
    },
    onError: () => toast.error('Could not generate product info. Please try again.'),
  });

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-categories-in-use'] });
      toast.success('Product saved.');
      navigate('/vendor/product/all');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not save the product. Please try again.');
    },
  });

  const handlePhotoFiles = (files: FileList) => {
    const newPhotos: PendingPhoto[] = Array.from(files)
      .filter((f) => /^image\/(jpe?g|png|webp|gif)$/.test(f.type))
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        uploading: true,
      }));

    setPhotos((prev) => [...prev, ...newPhotos]);

    newPhotos.forEach((photo) => {
      productsApi
        .uploadPhoto(photo.file)
        .then((res) => {
          setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, uploadedUrl: res.url, uploading: false } : p)));
        })
        .catch((err) => {
          setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, uploading: false, error: apiErrorMessage(err, 'Upload failed') } : p)));
        });
    });
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = () => {
    setFormError(null);
    setTriedSave(true);

    if (!name.trim() || !price.trim() || Number.isNaN(Number(price)) || !sku.trim()) {
      setFormError('Fill in the fields marked in red.');
      return;
    }
    if (photos.some((p) => p.uploading)) {
      setFormError('Wait for the photos to finish uploading.');
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      description: description || undefined,
      note: note.trim() || undefined,
      category: category.trim() || undefined,
      categoryId: categoryId || undefined,
      brand: brand.trim() || undefined,
      summary: showSummary ? summary.trim() || undefined : undefined,
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      searchKeywords: searchKeywords.length > 0 ? searchKeywords : undefined,
      slug: slug.trim() || undefined,
      visibility,
      // The server drops the one that doesn't fit the status (a go-live time on a Public product).
      publishAt: visibility === 'DRAFT' ? schedule.publishAt : null,
      unpublishAt: visibility === 'PUBLIC' || schedule.publishAt ? schedule.unpublishAt : null,
      photoSize,
      photoUrls: photos.filter((p) => p.uploadedUrl).map((p) => p.uploadedUrl!),
      videoUrl: videoUrl.trim() || undefined,
      price: Number(price),
      discountPrice: discountPrice.trim() ? Number(discountPrice) : undefined,
      cost: cost.trim() ? Number(cost) : undefined,
      sku: sku.trim(),
      barcode: barcode.trim() || undefined,
      isPreOrder,
      quoteOnly,
      minOrderQuantity: Number(minOrderQuantity) > 1 ? Number(minOrderQuantity) : undefined,
      lowStockThreshold: lowStockThreshold.trim() ? Number(lowStockThreshold) : undefined,
      sizeGuideId: sizeGuideId || undefined,
      stockQuantity: variationOptions.length === 0 && stockQuantity.trim() ? Number(stockQuantity) : undefined,
      weight: weight.trim() ? Number(weight) : undefined,
      weightUnit,
      variationOptions: variationOptions.length > 0 ? variationOptions : undefined,
      variants: variants.length > 0 ? variants : undefined,
      variationPhotos: (() => {
        // Drop entries with no photos (a leftover from switching "Photos by"
        // before uploading): an empty first entry can make the storefront
        // pick the wrong option as "the one with photos".
        const withPhotos = variationPhotos.filter((vp) => vp.photoUrls.length > 0);
        return withPhotos.length > 0 ? withPhotos : undefined;
      })(),
    });
  };

  const urlBase = `${typeof window !== 'undefined' ? window.location.host : ''}/store/${storeSubdomain ?? '…'}`;

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/vendor/product/all" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
        <ChevronLeft size={16} />
        All products
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold text-regantify-text">Add product</h1>
        <button type="button" onClick={() => setShowImportModal(true)} className={outlineBtn}>
          <UploadCloud size={15} />
          Import from CSV
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          <SectionCard
            title="Product details"
            action={
              <button
                type="button"
                onClick={() => aiGenerateMutation.mutate()}
                disabled={!canAiGenerate || aiGenerateMutation.isPending}
                title={canAiGenerate ? 'Fill in description, category, brand and search listing from the name and first photo' : 'Add a name and one photo first'}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-brand-lime bg-brand-lime/40 px-3 text-sm font-medium text-brand transition-colors hover:bg-brand-lime/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiGenerateMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {aiGenerateMutation.isPending ? 'Generating…' : 'AI Generate'}
              </button>
            }
          >
            <div className="space-y-4">
              <Field label="Product name" required error={nameError}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value.slice(0, 200))}
                  placeholder="e.g. Cotton T-shirt, 3 pcs embroidered lawn dress"
                  maxLength={200}
                  className={productInputClass}
                />
              </Field>
              <Field label="Description" hint="Tip: add a name and a photo, then use AI Generate to write this for you.">
                <RichTextEditor value={description} onChange={setDescription} placeholder="Describe your product…" maxLength={10000} />
              </Field>
              {showSummary ? (
                <Field label="Short summary" hint="Shown near the price on the product page.">
                  <RichTextEditor value={summary} onChange={setSummary} placeholder="A short summary shown in listings" maxLength={500} />
                </Field>
              ) : (
                <button type="button" onClick={() => setShowSummary(true)} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                  <Plus size={14} />
                  Add a short summary
                </button>
              )}
              <SearchWordsField value={searchKeywords} onChange={setSearchKeywords} />
            </div>
          </SectionCard>

          <SectionCard title="Photos and video" id="photos" description="Clear photos sell better. The first photo is the one shoppers see first.">
            <PhotoManager
              photos={photos}
              onFiles={handlePhotoFiles}
              onRemove={removePhoto}
              onReorder={(from, to) => setPhotos((prev) => moveItem(prev, from, to))}
              photoSize={photoSize}
              onPhotoSizeChange={setPhotoSize}
            />
            <div className="mt-4">
              <Field label="Video link" hint="A YouTube link, shown with the photos.">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value.slice(0, 500))}
                  placeholder="https://youtube.com/watch?v=…"
                  maxLength={500}
                  className={productInputClass}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Price">
            <PriceFields
              price={price}
              onPrice={setPrice}
              discountPrice={discountPrice}
              onDiscountPrice={setDiscountPrice}
              cost={cost}
              onCost={setCost}
              priceError={priceError}
            />
          </SectionCard>

          <SectionCard title="Stock" id="stock">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU code" required tooltip="A unique code you use to identify this product." error={skuError}>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.slice(0, 50))}
                  placeholder="e.g. mt-01, 3pc20-10"
                  maxLength={50}
                  className={productInputClass}
                />
              </Field>
              <Field label="Barcode" tooltip="What a barcode scanner reads at your POS counter. Use the code printed on the pack, or Generate one for your own goods." hint="Optional.">
                <BarcodeInput value={barcode} onChange={setBarcode} />
              </Field>
              {variationOptions.length === 0 ? (
                <Field label="Stock quantity" hint="Leave empty for unlimited stock.">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder="e.g. 100"
                    min={0}
                    max={1000000}
                    className={productInputClass}
                  />
                </Field>
              ) : (
                <Field label="Stock quantity">
                  <p className="rounded-lg border border-dashed border-line px-3.5 py-2.5 text-sm text-neutral-500">Set per variation below.</p>
                </Field>
              )}
              <Field label="Weight" hint="Used to work out the delivery charge.">
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 0.5"
                    min={0}
                    max={10000}
                    className={`${productInputClass} flex-1`}
                  />
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                    aria-label="Weight unit"
                    className={`${productInputClass.replace("w-full ", "")} w-24 shrink-0`}
                  >
                    <option value="KG">KG</option>
                    <option value="G">G</option>
                    <option value="LB">LB</option>
                  </select>
                </div>
              </Field>
              <Field label="Minimum order" hint="Fewest a shopper can order, e.g. 10 bags. Leave empty for no minimum.">
                <input
                  type="number"
                  inputMode="numeric"
                  value={minOrderQuantity}
                  onChange={(e) => setMinOrderQuantity(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 10"
                  min={1}
                  max={100000}
                  className={productInputClass}
                />
              </Field>
              <Field label="Low stock alert" hint="Tell me when fewer than this are left. Empty uses the store's number (Stock Settings); 0 never alerts.">
                <input
                  type="number"
                  inputMode="numeric"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value.replace(/\D/g, ''))}
                  placeholder="Store default"
                  min={0}
                  max={1000000}
                  className={productInputClass}
                />
              </Field>
            </div>
            <div className="mt-4 space-y-4 border-t border-line pt-4">
              <ToggleRow
                checked={isPreOrder}
                onChange={setIsPreOrder}
                label="Pre-order"
                hint="Shoppers can order it before it’s in stock."
              />
              <ToggleRow
                checked={quoteOnly}
                onChange={setQuoteOnly}
                label="Price on request"
                hint="Hides the price and Buy buttons (StorePal theme) and shows a “Request a price” form. Requests come into your LMS."
              />
            </div>
          </SectionCard>

          <SectionCard title="Variations" id="variations" description="Sizes, colours and so on, each with its own stock and price.">
            <SizeGuideField value={sizeGuideId} onChange={setSizeGuideId} />
            <VariationsEditor
              productSku={sku}
              weightUnit={weightUnit}
              options={variationOptions}
              onOptionsChange={setVariationOptions}
              variants={variants}
              onVariantsChange={setVariants}
              variationPhotos={variationPhotos}
              onVariationPhotosChange={setVariationPhotos}
            />
          </SectionCard>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <StatusCard visibility={visibility} onChange={setVisibility} schedule={schedule} onSchedule={setSchedule} />

          <ProductSideCard title="Category and brand">
            <div className="space-y-3">
              <Field label="Main category">
                <div className="flex items-center gap-2">
                  <select value={mainCategoryId} onChange={(e) => handleMainCategoryChange(e.target.value)} className={productInputClass}>
                    <option value="">No category</option>
                    {mainCategoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <QuickAddButton title="Add main category" onClick={() => setShowAddMainCategory(true)} />
                </div>
              </Field>
              <Field label="Sub category">
                <div className="flex items-center gap-2">
                  <select
                    value={subCategoryId}
                    onChange={(e) => handleSubCategoryChange(e.target.value)}
                    disabled={!mainCategoryId || subCategoryOptions.length === 0}
                    className={productInputClass}
                  >
                    <option value="">{!mainCategoryId ? 'Pick a main category first' : subCategoryOptions.length > 0 ? 'None' : 'No sub categories'}</option>
                    {subCategoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <QuickAddButton title="Add sub category" disabled={!mainCategoryId} onClick={() => setShowAddSubCategory(true)} />
                </div>
              </Field>
              <Field label="Brand">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value.slice(0, 100))}
                    placeholder="e.g. Aarong"
                    maxLength={100}
                    className={productInputClass}
                  />
                  <QuickAddButton title="Add brand" onClick={() => setShowAddBrand(true)} />
                </div>
              </Field>
            </div>
          </ProductSideCard>

          <ProductSideCard title="Internal note">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 1000))}
              rows={3}
              maxLength={1000}
              placeholder="Only you and your staff see this."
              className={`${productInputClass} resize-y`}
            />
          </ProductSideCard>

          <SearchListingCard
            storeName={storeName ?? 'My store'}
            urlBase={urlBase}
            displaySlug={displaySlug}
            name={name}
            metaTitle={metaTitle}
            onMetaTitle={setMetaTitle}
            metaDescription={metaDescription}
            onMetaDescription={setMetaDescription}
            slug={slug}
            onSlug={(v) => {
              setSlugTouched(true);
              setSlug(slugify(v).slice(0, 200));
            }}
            slugPlaceholder={slugify(name) || 'product-url'}
            descriptionFallback={htmlToText(description)}
          />
        </div>
      </div>

      <SaveBar message={formError ? <span className="text-red-600">{formError}</span> : visibility === 'DRAFT' ? 'Saved as a draft: hidden from your store.' : undefined}>
        <button type="button" onClick={() => navigate('/vendor/product/all')} className={outlineBtn}>
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={createMutation.isPending} className={primaryBtn}>
          {createMutation.isPending ? 'Saving…' : 'Save product'}
        </button>
      </SaveBar>

      {showImportModal && <ImportCsvModal onClose={() => setShowImportModal(false)} />}

      {showAddMainCategory && (
        <AddCategoryModal
          categories={categoryOptions}
          hideParentField
          onCreated={(c) => handleMainCategoryChange(c.id)}
          onClose={() => setShowAddMainCategory(false)}
        />
      )}
      {showAddSubCategory && (
        <AddCategoryModal
          categories={categoryOptions}
          initialParentId={mainCategoryId}
          initialParentName={mainCategoryOptions.find((c) => c.id === mainCategoryId)?.name}
          onCreated={(c) => handleSubCategoryChange(c.id)}
          onClose={() => setShowAddSubCategory(false)}
        />
      )}
      {showAddBrand && <AddBrandModal onCreated={(b) => setBrand(b.name)} onClose={() => setShowAddBrand(false)} />}
    </div>
  );
}
