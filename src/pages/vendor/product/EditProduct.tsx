import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, X, ChevronLeft, Trash2 } from 'lucide-react';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { VariationsEditor } from '../../../components/product/VariationsEditor';
import { CategoryCombobox } from '../../../components/product/CategoryCombobox';
import { categoriesApi } from '../../../lib/categoriesApi';
import { productsApi, type VariationOptionInput, type ProductVariantInput, type VariationValuePhotoInput } from '../../../lib/productsApi';
import { toast } from '../../../lib/toast';
import { useAuthStore } from '../../../store/authStore';

type PhotoSize = 'SQUARE' | 'PORTRAIT';
type WeightUnit = 'KG' | 'G' | 'LB';

interface PendingPhoto {
  id: string;
  uploadedUrl: string;
  previewUrl: string;
  uploading: boolean;
  error?: string;
  file?: File; // only set for a photo picked in this session, not one loaded from the server
}

/** Mirrors the server's slugify (see ProductsService) for the live preview. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

const JUMP_LINKS = [
  { id: 'photos', label: 'Photos' },
  { id: 'stock', label: 'Stock' },
  { id: 'variations', label: 'Variations' },
];

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storeSubdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const storeName = useAuthStore((s) => s.user?.vendor?.storeName);

  const { data: product, isLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.findOne(id!),
    enabled: Boolean(id),
  });

  // Store > Categories' real category list — for the optional "Link to
  // Category" dropdown (see AddProduct.tsx's own comment on why this
  // is separate from the free-text Category combobox above it).
  const { data: categoryOptions = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 60_000,
  });

  // General Information
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [creator, setCreator] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'DRAFT'>('PUBLIC');
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [secondaryCategories, setSecondaryCategories] = useState<string[]>([]);
  const [secondaryCategoryInput, setSecondaryCategoryInput] = useState('');
  const [brand, setBrand] = useState('');
  const [summary, setSummary] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Photos / Video
  const [photoSize, setPhotoSize] = useState<PhotoSize>('SQUARE');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);

  // Pricing
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [cost, setCost] = useState('');

  // Stock
  const [sku, setSku] = useState('');
  const [editingSku, setEditingSku] = useState(false);
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('KG');

  // Variations
  const [variationOptions, setVariationOptions] = useState<VariationOptionInput[]>([]);
  const [variants, setVariants] = useState<ProductVariantInput[]>([]);
  const [variationPhotos, setVariationPhotos] = useState<VariationValuePhotoInput[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const displaySlug = slug.trim() || slugify(name) || 'your-product';

  // Snapshot of the form immediately after the product loads (or after a
  // successful save) — compared against current field values to know
  // whether "Update"/"Discard" should show. Kept as a JSON string so the
  // comparison is a single cheap equality check instead of tracking each
  // field's dirty state individually.
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  /** Builds the same shape as buildSnapshot(), but straight from a Product
   * record — used right after load/save so it never reads stale state
   * (state setters from applyProduct haven't necessarily committed yet
   * within the same effect). */
  const snapshotFromProduct = (p: NonNullable<typeof product>) =>
    JSON.stringify({
      name: p.name,
      slug: p.slug,
      description: p.description ?? '',
      note: p.note ?? '',
      creator: p.creator ?? '',
      visibility: p.visibility,
      category: p.category ?? '',
      secondaryCategories: p.secondaryCategories ?? [],
      brand: p.brand ?? '',
      summary: p.summary ?? '',
      metaTitle: p.metaTitle ?? '',
      metaDescription: p.metaDescription ?? '',
      photoSize: p.photoSize,
      photoUrls: p.photoUrls,
      videoUrl: p.videoUrl ?? '',
      price: p.price.toString(),
      discountPrice: (p.discountPrice ?? '').toString(),
      cost: (p.cost ?? '').toString(),
      sku: p.sku,
      isPreOrder: p.isPreOrder,
      stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : '',
      weight: (p.weight ?? '').toString(),
      weightUnit: p.weightUnit,
      variationOptions: (p.variationOptions ?? []).map((o) => ({ name: o.name, values: o.values })),
      variants: (p.variants ?? []).map((v) => ({
        sku: v.sku,
        optionValues: v.optionValues,
        stock: v.stock,
        listPrice: v.listPrice ?? undefined,
        discountPrice: v.discountPrice ?? undefined,
        cost: v.cost ?? undefined,
        weight: v.weight ?? undefined,
      })),
      variationPhotos: (p.variationPhotos ?? []).map((vp) => ({
        optionName: vp.optionName,
        optionValue: vp.optionValue,
        photoUrls: vp.photoUrls,
      })),
    });

  const buildSnapshot = () =>
    JSON.stringify({
      name,
      slug,
      description,
      note,
      creator,
      visibility,
      category,
      categoryId,
      secondaryCategories,
      brand,
      summary,
      metaTitle,
      metaDescription,
      photoSize,
      photoUrls: photos.map((p) => p.uploadedUrl),
      videoUrl,
      price: price.toString(),
      discountPrice: discountPrice.toString(),
      cost: cost.toString(),
      sku,
      isPreOrder,
      stockQuantity,
      weight: weight.toString(),
      weightUnit,
      variationOptions,
      variants,
      variationPhotos,
    });

  const isDirty = savedSnapshot !== null && savedSnapshot !== buildSnapshot();

  /** Loads the given product's fields into the form (initial load, or Discard). */
  const applyProduct = (p: NonNullable<typeof product>) => {
    setName(p.name);
    setSlug(p.slug);
    setDescription(p.description ?? '');
    setNote(p.note ?? '');
    setCreator(p.creator ?? '');
    setVisibility(p.visibility);
    setCategory(p.category ?? '');
    setCategoryId(p.categoryId ?? '');
    setSecondaryCategories(p.secondaryCategories ?? []);
    setBrand(p.brand ?? '');
    setSummary(p.summary ?? '');
    setMetaTitle(p.metaTitle ?? '');
    setMetaDescription(p.metaDescription ?? '');
    setPhotoSize(p.photoSize);
    setPhotos(
      p.photoUrls.map((url, i) => ({
        id: `${i}-${url}`,
        uploadedUrl: url,
        previewUrl: url,
        uploading: false,
      })),
    );
    setVideoUrl(p.videoUrl ?? '');
    setPrice(p.price);
    setDiscountPrice(p.discountPrice ?? '');
    setCost(p.cost ?? '');
    setSku(p.sku);
    setIsPreOrder(p.isPreOrder);
    setStockQuantity(p.stockQuantity != null ? String(p.stockQuantity) : '');
    setWeight(p.weight ?? '');
    setWeightUnit(p.weightUnit);
    setVariationOptions((p.variationOptions ?? []).map((o) => ({ name: o.name, values: o.values })));
    setVariants(
      (p.variants ?? []).map((v) => ({
        sku: v.sku,
        optionValues: v.optionValues,
        stock: v.stock,
        listPrice: v.listPrice ?? undefined,
        discountPrice: v.discountPrice ?? undefined,
        cost: v.cost ?? undefined,
        weight: v.weight ?? undefined,
      })),
    );
    setVariationPhotos(
      (p.variationPhotos ?? []).map((vp) => ({
        optionName: vp.optionName,
        optionValue: vp.optionValue,
        photoUrls: vp.photoUrls,
      })),
    );
  };

  // Populate the form once the product loads, and take the "clean"
  // snapshot straight from the loaded record (not from state, which
  // hasn't committed yet inside this same effect).
  useEffect(() => {
    if (!product) return;
    applyProduct(product);
    setSavedSnapshot(snapshotFromProduct(product));
  }, [product]);

  const handleDiscard = () => {
    if (!product) return;
    applyProduct(product);
    setFormError(null);
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      productsApi.update(id!, {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description || undefined,
        note: note.trim() || undefined,
        creator: creator.trim() || undefined,
        category: category.trim() || undefined,
        categoryId,
        secondaryCategories,
        brand: brand.trim() || undefined,
        summary: summary || undefined,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        visibility,
        photoSize,
        photoUrls: photos.filter((p) => p.uploadedUrl && !p.uploading).map((p) => p.uploadedUrl),
        videoUrl: videoUrl.trim() || undefined,
        price: Number(price),
        discountPrice: discountPrice.toString().trim() ? Number(discountPrice) : undefined,
        cost: cost.toString().trim() ? Number(cost) : undefined,
        sku: sku.trim(),
        isPreOrder,
        stockQuantity: variationOptions.length === 0 && stockQuantity.trim() ? Number(stockQuantity) : undefined,
        weight: weight.toString().trim() ? Number(weight) : undefined,
        weightUnit,
        variationOptions: variationOptions.filter((o) => o.values.length > 0),
        variants: variationOptions.length > 0 ? variants : [],
        variationPhotos:
          variationOptions.length > 0
            ? variationPhotos.filter((vp) => {
                const option = variationOptions.find((o) => o.name === vp.optionName);
                // Also drop entries with no actual photos — e.g. a stale
                // leftover from switching "Photos by" from one option to
                // another before uploading anything for the first one.
                // An empty entry has no use once saved, and its presence
                // (especially if it ends up first) can make storefront
                // code that reads variationPhotos[0] as "the photo option"
                // pick the wrong option entirely.
                return option && option.values.includes(vp.optionValue) && vp.photoUrls.length > 0;
              })
            : [],
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-categories-in-use'] });
      toast.success('Product updated.');
      if (updated) {
        applyProduct(updated);
        setSavedSnapshot(snapshotFromProduct(updated));
      }
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not update the product. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => productsApi.remove(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted.');
      navigate('/vendor/product/all');
    },
    onError: () => toast.error('Could not delete the product. Please try again.'),
  });

  const handlePhotoFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newPhotos: PendingPhoto[] = Array.from(files)
      .filter((f) => /^image\/(jpe?g|png|webp|gif)$/.test(f.type))
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uploadedUrl: '',
        previewUrl: URL.createObjectURL(file),
        uploading: true,
        file,
      }));

    setPhotos((prev) => [...prev, ...newPhotos]);

    newPhotos.forEach((photo) => {
      productsApi
        .uploadPhoto(photo.file!)
        .then((res) => {
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, uploadedUrl: res.url, uploading: false } : p)),
          );
        })
        .catch(() => {
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, uploading: false, error: 'Upload failed' } : p)),
          );
        });
    });
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!price.toString().trim() || Number.isNaN(Number(price))) {
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
    updateMutation.mutate();
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${product?.name}"? This cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return <div className="text-regantify-text-muted">Loading…</div>;
  }
  if (!product) {
    return <div className="text-regantify-text-muted">Product not found.</div>;
  }

  return (
    <div className="max-w-6xl">
      <div className="pt-8 pb-3 bg-regantify-content border-b border-black/5">
        <button
          onClick={() => navigate('/vendor/product/all')}
          className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
        >
          <ChevronLeft size={16} />
          Products
        </button>

        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1 className="text-2xl font-semibold text-regantify-text">Edit Product</h1>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'DRAFT')}
            className="px-3 py-1.5 rounded-lg border border-black/10 bg-white text-sm text-regantify-text"
          >
            <option value="PUBLIC">Public</option>
            <option value="DRAFT">Draft</option>
          </select>
          <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">
            Delete
          </button>

          {isDirty && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
                className="px-5 py-2 rounded-xl bg-regantify-black text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-60"
              >
                {updateMutation.isPending ? 'Updating…' : 'Update'}
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={updateMutation.isPending}
                className="px-5 py-2 rounded-xl border border-orange-200 text-orange-500 text-sm font-medium hover:bg-orange-50 disabled:opacity-60"
              >
                Discard
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-regantify-text-muted">Jump To:</span>
          {JUMP_LINKS.map((link, i) => (
            <a key={link.id} href={`#${link.id}`} className="text-regantify-cta hover:underline">
              {link.label}
              {i < JUMP_LINKS.length - 1 && <span className="text-regantify-text-muted ml-4">|</span>}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="space-y-6 max-w-3xl">
        {/* General Information */}
        <SectionCard title="General Information">
          <div className="space-y-5">
            <Field label="Product Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 200))}
                maxLength={200}
                className={productInputClass}
              />
            </Field>

            <Field label="Product Description">
              <RichTextEditor value={description} onChange={setDescription} placeholder="Describe your product…" maxLength={10000} />
            </Field>

            <Field label="Category">
              <CategoryCombobox value={category} onChange={setCategory} placeholder="ie. Women Shoes" />
            </Field>

            {categoryOptions.length > 0 && (
              <Field
                label="Link to Category"
                hint="Optional — lets Marketing > Coupons' category restriction apply to this product"
              >
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={productInputClass}
                >
                  <option value="">None</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Secondary Categories">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {secondaryCategories.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-regantify-black text-white text-xs font-medium">
                    {c}
                    <button type="button" onClick={() => setSecondaryCategories(secondaryCategories.filter((x) => x !== c))}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <CategoryCombobox
                value={secondaryCategoryInput}
                onChange={setSecondaryCategoryInput}
                onSubmit={(name) => {
                  if (!secondaryCategories.includes(name) && secondaryCategories.length < 10) {
                    setSecondaryCategories([...secondaryCategories, name]);
                  }
                  setSecondaryCategoryInput('');
                }}
                placeholder="Search Category"
                exclude={[category, ...secondaryCategories]}
              />
              <p className="text-xs text-regantify-text-muted mt-1.5">
                Pick a suggestion or type a name, then press Enter to add it. Up to 10 categories.
              </p>
            </Field>

            <Field label="Product Summary">
              <RichTextEditor value={summary} onChange={setSummary} placeholder="Short summary shown on the storefront…" maxLength={500} />
            </Field>

            <Field label="Brand">
              <input type="text" value={brand} onChange={(e) => setBrand(e.target.value.slice(0, 100))} maxLength={100} className={productInputClass} />
            </Field>

            <Field label="Note" hint="This note is only visible to staff">
              <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} rows={2} maxLength={1000} className={`${productInputClass} resize-y`} />
            </Field>

            <Field label="Creator">
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value.slice(0, 100))}
                placeholder="Staff member name"
                maxLength={100}
                className={productInputClass}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Photos */}
        <SectionCard title="Photos" id="photos">
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
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-regantify-content border border-black/5">
                  <img src={photo.uploadedUrl || photo.previewUrl} alt="" className="w-full h-full object-cover" />
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
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-black/15 bg-regantify-content
                  flex flex-col items-center justify-center gap-1 text-regantify-text-muted hover:border-black/25"
              >
                <Camera size={20} />
                <span className="text-xs">Add More</span>
              </button>
            </div>
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
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted">৳</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min={0}
                  max={10000000}
                  className={`${productInputClass} pl-7`}
                />
              </div>
            </Field>

            <Field label="Discount Price">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted">৳</span>
                <input
                  type="number"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  min={0}
                  max={10000000}
                  className={`${productInputClass} pl-7`}
                />
              </div>
            </Field>

            <Field label="Cost" hint="This field is private and will only be used to calculate stock and sales reports">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted">৳</span>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  min={0}
                  max={10000000}
                  className={`${productInputClass} pl-7`}
                />
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* Stock Information */}
        <SectionCard title="Stock Information" id="stock">
          <div className="space-y-5">
            <Field label="SKU Code" required tooltip="A unique code you use to identify this product.">
              {editingSku ? (
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value.slice(0, 50))} maxLength={50} className={productInputClass} autoFocus />
              ) : (
                <div className="flex gap-2">
                  <input type="text" value={sku} disabled className={`${productInputClass} opacity-60`} />
                  <button
                    type="button"
                    onClick={() => setEditingSku(true)}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-sm text-red-600 whitespace-nowrap hover:bg-red-50"
                  >
                    Change SKU
                  </button>
                </div>
              )}
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

            {variationOptions.length === 0 && (
              <Field label="Stock Quantity" tooltip="Leave blank for unlimited stock.">
                <input type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="ie. 100" min={0} max={1000000} className={productInputClass} />
              </Field>
            )}

            <Field
              label="Weight"
              tooltip="Used to calculate shipping cost."
              hint={variationOptions.length > 0 ? 'This product has variations. You can also set variation-specific weights.' : undefined}
            >
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
        <SectionCard title="Product Variations (ie. size, color... etc)" id="variations">
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

        <div className="flex items-center gap-3">
          {isDirty && (
            <>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={updateMutation.isPending}
                className="px-8 py-3 rounded-xl bg-regantify-black text-white font-medium hover:bg-black transition-colors disabled:opacity-60"
              >
                {updateMutation.isPending ? 'Updating…' : 'Update'}
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={updateMutation.isPending}
                className="px-8 py-3 rounded-xl border border-orange-200 text-orange-500 font-medium hover:bg-orange-50 disabled:opacity-60"
              >
                Discard
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50"
          >
            <Trash2 size={16} />
            Delete Product
          </button>
        </div>
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
                  onChange={(e) => setSlug(slugify(e.target.value).slice(0, 200))}
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
    </div>
  );
}
