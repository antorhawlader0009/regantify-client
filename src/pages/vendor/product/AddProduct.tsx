import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, X, ChevronLeft, UploadCloud, Sparkles, Loader2, Plus } from 'lucide-react';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { VariationsEditor } from '../../../components/product/VariationsEditor';
import { categoriesApi } from '../../../lib/categoriesApi';
import { AddCategoryModal } from './AddCategoryModal';
import { AddBrandModal } from './AddBrandModal';
import { ImportCsvModal } from './ImportCsvModal';
import { productsApi, type VariationOptionInput, type ProductVariantInput, type VariationValuePhotoInput } from '../../../lib/productsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useAuthStore } from '../../../store/authStore';

/** Small ghost circular icon button — matches Categories.tsx's own
 * "Add subcategory" (+) button — used to quick-create a Main/Sub
 * Category or Brand without leaving the product form. */
function QuickAddButton({ title, disabled, onClick }: { title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="w-6 h-6 flex items-center justify-center rounded-full border border-black/15
        text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
    >
      <Plus size={12} />
    </button>
  );
}

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

  // General Information
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'DRAFT'>('PUBLIC');
  const [showCategory, setShowCategory] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [summary, setSummary] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Search engine listing — slug defaults to a live slugify of the
  // product name, but once the vendor edits it manually we stop
  // auto-updating it from name changes.
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const displaySlug = slug.trim() || slugify(name) || 'your-product';

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };


  // Photos / Video
  const [photoSize, setPhotoSize] = useState<PhotoSize>('SQUARE');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);

  // Pricing
  const [price, setPrice] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountPrice, setDiscountPrice] = useState('');
  const [cost, setCost] = useState('');

  // Stock
  const [sku, setSku] = useState('');
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('KG');

  // Variations
  const [variationOptions, setVariationOptions] = useState<VariationOptionInput[]>([]);
  const [variants, setVariants] = useState<ProductVariantInput[]>([]);
  const [variationPhotos, setVariationPhotos] = useState<VariationValuePhotoInput[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  // Quick-create modals for Main Category / Sub Category / Brand — reuses
  // the same modals as the Categories/Brands pages, opened inline here so
  // a vendor doesn't have to leave the product form to add a missing one.
  const [showAddMainCategory, setShowAddMainCategory] = useState(false);
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const queryClient = useQueryClient();

  // Store > Categories' real category tree — drives the Main/Sub Category
  // selects below.
  const { data: categoryOptions = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 60_000,
  });

  // Main/Sub Category are just two views onto the same `categoryId` FK —
  // derived from it (and from `categoryOptions`) rather than tracked as
  // their own state, so there's only ever one source of truth.
  const mainCategoryOptions = categoryOptions.filter((c) => !c.parentId);
  const selectedProductCategory = categoryOptions.find((c) => c.id === categoryId);
  const mainCategoryId = selectedProductCategory
    ? (selectedProductCategory.parentId ?? selectedProductCategory.id)
    : '';
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

  // "AI Generate" — needs a name and at least one already-uploaded photo
  // (not still uploading) since the server fetches the photo by URL for
  // a vision model. See AiService.generateProductInfo on the server for
  // what it does and doesn't fill in — price/stock are never touched.
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
      // Reveal the optional sections AI Generate just filled in — they're
      // collapsed by default (see showCategory/showBrand/showSummary),
      // so a vendor who never expanded them would otherwise not see the
      // generated values at all.
      setShowCategory(true);
      setShowBrand(true);
      setShowSummary(true);
      toast.success('AI-generated info added — review before saving.');
    },
    onError: () => toast.error('Could not generate product info. Please try again.'),
  });

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-categories-in-use'] });
      toast.success('Product created.');
      navigate('/vendor/product/all');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not create the product. Please try again.');
    },
  });

  const handlePhotoFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
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
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, uploadedUrl: res.url, uploading: false } : p)),
          );
        })
        .catch((err) => {
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, uploading: false, error: apiErrorMessage(err, 'Upload failed') } : p)),
          );
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

    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!price.trim() || Number.isNaN(Number(price))) {
      setFormError('Enter a valid product price.');
      return;
    }
    if (!sku.trim()) {
      setFormError('SKU code is required.');
      return;
    }
    if (photos.some((p) => p.uploading)) {
      setFormError('Please wait for all photos to finish uploading.');
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      description: description || undefined,
      note: note.trim() || undefined,
      category: showCategory ? category.trim() || undefined : undefined,
      categoryId: showCategory ? categoryId || undefined : undefined,
      brand: showBrand ? brand.trim() || undefined : undefined,
      summary: showSummary ? summary.trim() || undefined : undefined,
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      slug: slug.trim() || undefined,
      visibility,
      photoSize,
      photoUrls: photos.filter((p) => p.uploadedUrl).map((p) => p.uploadedUrl!),
      videoUrl: videoUrl.trim() || undefined,
      price: Number(price),
      discountPrice: showDiscount && discountPrice.trim() ? Number(discountPrice) : undefined,
      cost: cost.trim() ? Number(cost) : undefined,
      sku: sku.trim(),
      isPreOrder,
      stockQuantity: variationOptions.length === 0 && stockQuantity.trim() ? Number(stockQuantity) : undefined,
      weight: weight.trim() ? Number(weight) : undefined,
      weightUnit,
      variationOptions: variationOptions.length > 0 ? variationOptions : undefined,
      variants: variants.length > 0 ? variants : undefined,
      variationPhotos: (() => {
        // Drop entries with no actual photos — e.g. a stale leftover from
        // switching "Photos by" from one option to another before
        // uploading anything for the first one (see the same filter in
        // EditProduct.tsx for why this matters: an empty entry ending up
        // first in the array can make the storefront pick the wrong
        // option as "the one with photos").
        const withPhotos = variationPhotos.filter((vp) => vp.photoUrls.length > 0);
        return withPhotos.length > 0 ? withPhotos : undefined;
      })(),
    });
  };

  return (
    <div className="max-w-6xl">
      <button
        onClick={() => navigate('/vendor/product/all')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Products
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Add Product</h1>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'DRAFT')}
          className="px-3 py-1.5 rounded-lg border border-black/10 bg-white text-sm text-regantify-text"
        >
          <option value="PUBLIC">Public</option>
          <option value="DRAFT">Draft</option>
        </select>
        <button
          type="button"
          onClick={() => aiGenerateMutation.mutate()}
          disabled={!canAiGenerate || aiGenerateMutation.isPending}
          title={canAiGenerate ? undefined : 'Add a product name and at least one photo first'}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-regantify-cta/30 bg-regantify-cta/10 text-regantify-cta text-sm font-medium hover:bg-regantify-cta/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {aiGenerateMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {aiGenerateMutation.isPending ? 'Generating…' : 'AI Generate'}
        </button>
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-black/10 bg-white text-sm text-regantify-text hover:bg-regantify-content"
        >
          <UploadCloud size={15} />
          Import from CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-6 max-w-3xl">
        {/* General Information */}
        <SectionCard title="General Information">
          <div className="space-y-5">
            <Field label="Product Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value.slice(0, 200))}
                placeholder="ie. Cotton T-shirt, 3 Pcs Embroidery Lawn Dress"
                maxLength={200}
                className={productInputClass}
              />
            </Field>

            <Field label="Photos">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-regantify-text mb-2">Photo Size</p>
                  <div className="flex items-center gap-5">
                    <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                      <input type="radio" checked={photoSize === 'SQUARE'} onChange={() => setPhotoSize('SQUARE')} />
                      Square
                    </label>
                    <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                      <input type="radio" checked={photoSize === 'PORTRAIT'} onChange={() => setPhotoSize('PORTRAIT')} />
                      Portrait
                    </label>
                  </div>
                  <p className="text-xs text-regantify-text-muted mt-1.5">
                    Recommended size: Square photos = 800px x 800px, Portrait photos = 800px x 1200px.
                  </p>
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-regantify-content border border-black/5">
                        <img src={photo.uploadedUrl ?? photo.previewUrl} alt="" className="w-full h-full object-cover" />
                        {photo.uploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {photo.error && (
                          <div className="absolute inset-0 bg-red-600/70 flex items-center justify-center text-white text-xs text-center px-1">
                            {photo.error}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full py-14 rounded-2xl border-2 border-dashed border-black/15 bg-regantify-content
                    flex flex-col items-center justify-center gap-2 text-regantify-text hover:border-black/25 transition-colors"
                >
                  <Camera size={28} />
                  <span className="font-medium">Upload Photos</span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    handlePhotoFiles(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>
            </Field>

            <Field label="Product Description">
              <RichTextEditor value={description} onChange={setDescription} placeholder="Describe your product…" maxLength={10000} />
            </Field>

            <div>
              <p className="text-sm font-medium text-regantify-text mb-2">More Options:</p>
              <div className="flex flex-wrap gap-2">
                {!showCategory && (
                  <button type="button" onClick={() => setShowCategory(true)} className="px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
                    Add Category
                  </button>
                )}
                {!showBrand && (
                  <button type="button" onClick={() => setShowBrand(true)} className="px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
                    Add Brand
                  </button>
                )}
                {!showSummary && (
                  <button type="button" onClick={() => setShowSummary(true)} className="px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
                    Add Product Summary
                  </button>
                )}
              </div>
            </div>

            {showCategory && (
              <Field label="Main Category">
                <div className="flex items-center gap-2">
                  <select
                    value={mainCategoryId}
                    onChange={(e) => handleMainCategoryChange(e.target.value)}
                    className={productInputClass}
                  >
                    <option value="">Select a main category</option>
                    {mainCategoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <QuickAddButton title="Add main category" onClick={() => setShowAddMainCategory(true)} />
                </div>
              </Field>
            )}
            {showCategory && (
              <Field label="Sub Category">
                <div className="flex items-center gap-2">
                  <select
                    value={subCategoryId}
                    onChange={(e) => handleSubCategoryChange(e.target.value)}
                    disabled={!mainCategoryId || subCategoryOptions.length === 0}
                    className={productInputClass}
                  >
                    <option value="">
                      {!mainCategoryId
                        ? 'Select a main category first'
                        : subCategoryOptions.length > 0
                          ? 'None'
                          : 'No subcategories'}
                    </option>
                    {subCategoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <QuickAddButton
                    title="Add sub category"
                    disabled={!mainCategoryId}
                    onClick={() => setShowAddSubCategory(true)}
                  />
                </div>
              </Field>
            )}
            {showBrand && (
              <Field label="Brand">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value.slice(0, 100))}
                    placeholder="ie. Regantify Basics"
                    maxLength={100}
                    className={productInputClass}
                  />
                  <QuickAddButton title="Add brand" onClick={() => setShowAddBrand(true)} />
                </div>
              </Field>
            )}
            {showSummary && (
              <Field label="Product Summary">
                <RichTextEditor value={summary} onChange={setSummary} placeholder="A short summary shown in listings" maxLength={500} />
              </Field>
            )}

            <Field label="Note" hint="This note is only visible to staff">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                rows={2}
                maxLength={1000}
                placeholder="Internal note about this product"
                className={`${productInputClass} resize-y`}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Video */}
        <SectionCard title="Video">
          {videoUrl ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-regantify-content">
              <span className="text-sm text-regantify-text truncate">{videoUrl}</span>
              <button type="button" onClick={() => setVideoUrl('')} className="text-regantify-text-muted hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          ) : addingVideo ? (
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="https://youtube.com/..."
                maxLength={500}
                className={productInputClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setAddingVideo(false);
                }}
                onChange={(e) => setVideoUrl(e.target.value.slice(0, 500))}
              />
              <button type="button" onClick={() => setAddingVideo(false)} className="px-4 py-2.5 rounded-xl bg-regantify-black text-white text-sm font-medium">
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingVideo(true)}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-black/15 flex flex-col items-center justify-center gap-1.5 text-regantify-text-muted hover:border-black/25"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-xs">Add Video</span>
            </button>
          )}
        </SectionCard>

        {/* Pricing Information */}
        <SectionCard title="Pricing Information">
          <div className="space-y-5">
            <Field label="Price" required>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted">৳</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Product price"
                    min={0}
                    max={10000000}
                    className={`${productInputClass} pl-7`}
                  />
                </div>
                {!showDiscount && (
                  <button type="button" onClick={() => setShowDiscount(true)} className="px-4 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text whitespace-nowrap hover:bg-regantify-content">
                    Add Discount Price
                  </button>
                )}
              </div>
            </Field>

            {showDiscount && (
              <Field label="Discount Price">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted">৳</span>
                  <input
                    type="number"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    placeholder="Discounted price"
                    min={0}
                    max={10000000}
                    className={`${productInputClass} pl-7`}
                  />
                </div>
              </Field>
            )}

            <Field label="Cost" hint="This field is private and will only be used to calculate stock and sales reports">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted">৳</span>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="Purchase cost"
                  min={0}
                  max={10000000}
                  className={`${productInputClass} pl-7`}
                />
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* Stock Information */}
        <SectionCard title="Stock Information">
          <div className="space-y-5">
            <Field label="SKU Code" required tooltip="A unique code you use to identify this product.">
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value.slice(0, 50))} placeholder="ie. mt-01, 3pc20-10" maxLength={50} className={productInputClass} />
            </Field>

            <Field label="Is this a Pre-Order Item?" required tooltip="Pre-order items can be sold before they're in stock.">
              <div className="flex items-center gap-5">
                <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                  <input type="radio" checked={isPreOrder} onChange={() => setIsPreOrder(true)} />
                  Yes
                </label>
                <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                  <input type="radio" checked={!isPreOrder} onChange={() => setIsPreOrder(false)} />
                  No
                </label>
              </div>
            </Field>

            <Field label="Stock Quantity" tooltip="Leave blank for unlimited stock.">
              <input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="ie. 100" min={0} max={1000000} className={productInputClass} />
            </Field>

            <Field label="Weight" tooltip="Used to calculate shipping cost.">
              <div className="flex gap-2">
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ie. 100" min={0} max={10000} className={`${productInputClass} flex-1`} />
                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                  className="px-3 rounded-xl bg-regantify-search text-regantify-text text-sm focus:outline-none"
                >
                  <option value="KG">KG</option>
                  <option value="G">G</option>
                  <option value="LB">LB</option>
                </select>
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* Product Variations */}
        <SectionCard title="Product Variations (ie. size, color... etc)">
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

        {formError && <p className="text-red-500 text-sm">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="px-8 py-3 rounded-xl bg-regantify-black text-white font-medium hover:bg-black transition-colors disabled:opacity-60"
        >
          {createMutation.isPending ? 'Creating…' : 'Create'}
        </button>
      </div>

      {/* Sidebar */}
      <div className="space-y-6 lg:sticky lg:top-6">
        {/* Search engine listing */}
        <section className="bg-white rounded-2xl border border-black/5 p-6">
          <h2 className="text-sm font-semibold text-regantify-text mb-4">Search engine listing</h2>

          <div className="pb-4 border-b border-black/5">
            <p className="text-sm font-medium text-regantify-text">{storeName ?? 'My Store'}</p>
            <p className="text-xs text-regantify-text-muted break-all">
              {typeof window !== 'undefined' ? window.location.origin.replace(/^https?:\/\//, '') : ''}
              /store/{storeSubdomain ?? '…'} › products › {displaySlug}
            </p>
            <p className="text-sm text-regantify-cta mt-1 break-all">{metaTitle.trim() || name.trim() || displaySlug}</p>
          </div>

          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-regantify-text mb-1.5">Page title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value.slice(0, 70))}
                placeholder={name || 'Page title'}
                maxLength={70}
                className={productInputClass}
              />
              <p className="text-xs text-regantify-text-muted mt-1">{metaTitle.length} of 70 characters used</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-regantify-text mb-1.5">Meta description</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value.slice(0, 160))}
                rows={3}
                maxLength={160}
                className={`${productInputClass} resize-y`}
              />
              <p className="text-xs text-regantify-text-muted mt-1">{metaDescription.length} of 160 characters used</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-regantify-text mb-1.5">URL handle</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted text-sm pointer-events-none">
                  products/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value).slice(0, 200));
                  }}
                  placeholder={slugify(name) || 'product-url'}
                  maxLength={200}
                  className={`${productInputClass} pl-[4.6rem]`}
                />
              </div>
              <p className="text-xs text-regantify-text-muted mt-1 break-all">
                {typeof window !== 'undefined' ? window.location.origin.replace(/^https?:\/\//, '') : ''}
                /store/{storeSubdomain ?? '…'}/product/{displaySlug}
              </p>
            </div>
          </div>
        </section>
      </div>
      </div>

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
      {showAddBrand && (
        <AddBrandModal onCreated={(b) => setBrand(b.name)} onClose={() => setShowAddBrand(false)} />
      )}
    </div>
  );
}
