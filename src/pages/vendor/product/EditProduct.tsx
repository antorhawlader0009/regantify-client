import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, ChevronLeft, Trash2, Sparkles, Loader2, PackageX, ExternalLink } from 'lucide-react';
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
  ToggleRow,
  htmlToText,
  moveItem,
  useUnsavedChangesWarning,
} from '../../../components/product/ProductFormKit';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { BarcodeInput } from '../../../components/product/BarcodeField';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { VariationsEditor } from '../../../components/product/VariationsEditor';
import { CategoryCombobox } from '../../../components/product/CategoryCombobox';
import { categoriesApi } from '../../../lib/categoriesApi';
import { AddCategoryModal } from './AddCategoryModal';
import { AddBrandModal } from './AddBrandModal';
import { productsApi, type VariationOptionInput, type ProductVariantInput, type VariationValuePhotoInput } from '../../../lib/productsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useAuthStore } from '../../../store/authStore';
import { storefrontProductUrl } from '../../../lib/storefrontUrl';
import { useCan } from '../../../lib/useStaffAccess';

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

/** Jump links at the top of a long form. */
const JUMP_LINKS = [
  { id: 'photos', label: 'Photos' },
  { id: 'price', label: 'Price' },
  { id: 'stock', label: 'Stock' },
  { id: 'variations', label: 'Variations' },
];

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storeSubdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  // What this person's role allows here (rule-plan.md Step 10); the server checks each again.
  const canEdit = useCan('products.edit');
  const canDelete = useCan('products.delete');
  const canPrice = useCan('products.price');
  const storeName = useAuthStore((s) => s.user?.vendor?.storeName);

  const { data: product, isLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.findOne(id!),
    enabled: Boolean(id),
  });

  // Store > Categories' real category tree — drives the Main/Sub Category
  // selects below.
  const { data: categoryOptions = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 60_000,
  });

  // Quick-create modals for Main Category / Sub Category / Brand — reuses
  // the same modals as the Categories/Brands pages, opened inline here so
  // a vendor doesn't have to leave the product form to add a missing one.
  const [showAddMainCategory, setShowAddMainCategory] = useState(false);
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [showAddBrand, setShowAddBrand] = useState(false);

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
  // for filtering/breadcrumbs — picking a Main/Sub Category keeps it in
  // sync with the chosen name. Only touched by an actual pick here, so an
  // older product's free-typed category text is left alone until the
  // vendor deliberately changes it via these selects.
  const handleMainCategoryChange = (id: string) => {
    setCategoryId(id);
    setCategory(categoryOptions.find((c) => c.id === id)?.name ?? '');
  };
  const handleSubCategoryChange = (id: string) => {
    const resolvedId = id || mainCategoryId;
    setCategoryId(resolvedId);
    setCategory(categoryOptions.find((c) => c.id === resolvedId)?.name ?? '');
  };

  // Photos / Video
  const [photoSize, setPhotoSize] = useState<PhotoSize>('SQUARE');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [videoUrl, setVideoUrl] = useState('');

  // Pricing
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [cost, setCost] = useState('');

  // Stock
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [editingSku, setEditingSku] = useState(false);
  const [isPreOrder, setIsPreOrder] = useState(false);
  // LMS-plan.md Step 9: StorePal shows "Request a price" instead of the price.
  const [quoteOnly, setQuoteOnly] = useState(false);
  const [minOrderQuantity, setMinOrderQuantity] = useState('');
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
      // Same keys, same order and same types as buildSnapshot(), or the
      // form looks "changed" the moment it loads.
      categoryId: p.categoryId ?? '',
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
      barcode: p.barcode ?? '',
      isPreOrder: p.isPreOrder,
      quoteOnly: p.quoteOnly ?? false,
      minOrderQuantity: p.minOrderQuantity ? String(p.minOrderQuantity) : '',
      stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : '',
      weight: (p.weight ?? '').toString(),
      weightUnit: p.weightUnit,
      variationOptions: (p.variationOptions ?? []).map((o) => ({ name: o.name, values: o.values })),
      variants: (p.variants ?? []).map((v) => ({
        sku: v.sku,
        barcode: v.barcode ?? undefined,
        optionValues: v.optionValues,
        stock: v.stock,
        // Numbers, as applyProduct() puts them into state.
        listPrice: v.listPrice != null ? Number(v.listPrice) : undefined,
        discountPrice: v.discountPrice != null ? Number(v.discountPrice) : undefined,
        cost: v.cost != null ? Number(v.cost) : undefined,
        weight: v.weight != null ? Number(v.weight) : undefined,
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
      barcode,
      isPreOrder,
      quoteOnly,
      minOrderQuantity,
      stockQuantity,
      weight: weight.toString(),
      weightUnit,
      variationOptions,
      variants,
      variationPhotos,
    });

  const isDirty = savedSnapshot !== null && savedSnapshot !== buildSnapshot();
  useUnsavedChangesWarning(isDirty);

  // Field errors show only after the first Save attempt, then update as you type.
  const [triedSave, setTriedSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameError = triedSave && !name.trim() ? 'Enter a product name.' : null;
  const priceError = triedSave && (!price.toString().trim() || Number.isNaN(Number(price))) ? 'Enter the price shoppers pay.' : null;
  const skuError = triedSave && !sku.trim() ? 'Enter a SKU code (any short code you use for this product).' : null;

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
    setBarcode(p.barcode ?? '');
    setIsPreOrder(p.isPreOrder);
    setQuoteOnly(p.quoteOnly ?? false);
    setMinOrderQuantity(p.minOrderQuantity ? String(p.minOrderQuantity) : '');
    setStockQuantity(p.stockQuantity != null ? String(p.stockQuantity) : '');
    setWeight(p.weight ?? '');
    setWeightUnit(p.weightUnit);
    setVariationOptions((p.variationOptions ?? []).map((o) => ({ name: o.name, values: o.values })));
    setVariants(
      (p.variants ?? []).map((v) => ({
        sku: v.sku,
        barcode: v.barcode ?? undefined,
        optionValues: v.optionValues,
        stock: v.stock,
        // The server serializes these Decimal fields as strings (see
        // ProductVariant); ProductVariantInput (the PATCH payload this
        // state feeds back into on Save) expects numbers, same
        // string-in/number-out convention as price/discountPrice/cost
        // above on the product itself.
        listPrice: v.listPrice != null ? Number(v.listPrice) : undefined,
        discountPrice: v.discountPrice != null ? Number(v.discountPrice) : undefined,
        cost: v.cost != null ? Number(v.cost) : undefined,
        weight: v.weight != null ? Number(v.weight) : undefined,
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

  // "AI Generate" — needs a name and at least one already-uploaded photo
  // (not still uploading, not a local-only preview) since the server
  // fetches the photo by URL to hand to a vision model. See
  // AiService.generateProductInfo for what it does and doesn't fill in —
  // price/stock are deliberately never touched.
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
      toast.success('AI-generated info added — review before saving.');
    },
    onError: () => toast.error('Could not generate product info. Please try again.'),
  });

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
        // Always sent: an empty field removes the barcode.
        barcode: barcode.trim(),
        isPreOrder,
        quoteOnly,
        // Always sent: an empty field removes the minimum.
        minOrderQuantity: Number(minOrderQuantity) > 1 ? Number(minOrderQuantity) : null,
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
      toast.success('Changes saved.');
      setTriedSave(false);
      if (updated) {
        applyProduct(updated);
        setSavedSnapshot(snapshotFromProduct(updated));
      }
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not save your changes. Please try again.');
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
        .catch((err) => {
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, uploading: false, error: apiErrorMessage(err, 'Upload failed') } : p)),
          );
        });
    });
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleSubmit = () => {
    setFormError(null);
    setTriedSave(true);
    if (!name.trim() || !price.toString().trim() || Number.isNaN(Number(price)) || !sku.trim()) {
      setFormError('Fill in the fields marked in red.');
      return;
    }
    if (photos.some((p) => p.uploading)) {
      setFormError('Wait for the photos to finish uploading.');
      return;
    }
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4" aria-busy="true" aria-label="Loading product">
        <div className="h-8 w-48 animate-pulse rounded-md bg-neutral-200" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="h-96 animate-pulse rounded-xl border border-line bg-white" />
          <div className="h-64 animate-pulse rounded-xl border border-line bg-white" />
        </div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="mx-auto max-w-6xl rounded-xl border border-line bg-white">
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
            <PackageX size={20} aria-hidden />
          </div>
          <p className="mt-2 text-sm font-medium text-regantify-text">This product wasn’t found</p>
          <p className="mt-1 text-xs text-neutral-500">It may have been deleted.</p>
          <Link to="/vendor/product/all" className={`${primaryBtn} mt-4`}>
            Back to all products
          </Link>
        </div>
      </div>
    );
  }

  const urlBase = `${typeof window !== 'undefined' ? window.location.host : ''}/store/${storeSubdomain ?? '…'}`;

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/vendor/product/all" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
        <ChevronLeft size={16} />
        All products
      </Link>

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto min-w-0 truncate text-xl font-semibold text-regantify-text">{product.name}</h1>
        {storeSubdomain && product.slug && (
          // The saved link, so it opens the live page even while the URL field is being edited.
          <a
            href={storefrontProductUrl(storeSubdomain, product.slug)}
            target="_blank"
            rel="noopener noreferrer"
            title={product.visibility === 'PUBLIC' ? 'Open this product in your store' : 'Hidden products don’t show in your store'}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-brand hover:bg-neutral-50"
          >
            <ExternalLink size={14} />
            View in store
          </a>
        )}
      </div>
      <nav aria-label="Jump to" className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-neutral-500">Jump to:</span>
        {JUMP_LINKS.map((link) => (
          <a key={link.id} href={`#${link.id}`} className="font-medium text-brand hover:underline">
            {link.label}
          </a>
        ))}
      </nav>

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
                <input type="text" value={name} onChange={(e) => setName(e.target.value.slice(0, 200))} maxLength={200} className={productInputClass} />
              </Field>
              <Field label="Description">
                <RichTextEditor value={description} onChange={setDescription} placeholder="Describe your product…" maxLength={10000} />
              </Field>
              <Field label="Short summary" hint="Shown near the price on the product page.">
                <RichTextEditor value={summary} onChange={setSummary} placeholder="Short summary shown on the storefront…" maxLength={500} />
              </Field>
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

          <SectionCard title="Price" id="price">
            <PriceFields
              price={price}
              onPrice={setPrice}
              discountPrice={discountPrice}
              onDiscountPrice={setDiscountPrice}
              cost={cost}
              onCost={setCost}
              priceError={priceError}
              priceLocked={!canPrice}
            />
          </SectionCard>

          <SectionCard title="Stock" id="stock">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU code" required tooltip="A unique code you use to identify this product." error={skuError}>
                {editingSku ? (
                  <input type="text" value={sku} onChange={(e) => setSku(e.target.value.slice(0, 50))} maxLength={50} className={productInputClass} autoFocus />
                ) : (
                  <div className="flex gap-2">
                    <input type="text" value={sku} disabled className={productInputClass} aria-label="SKU code" />
                    <button type="button" onClick={() => setEditingSku(true)} className={`${outlineBtn} h-auto shrink-0`}>
                      Change
                    </button>
                  </div>
                )}
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
              <Field
                label="Weight"
                hint={variationOptions.length > 0 ? 'Variations can also have their own weight.' : 'Used to work out the delivery charge.'}
              >
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
            </div>
            <div className="mt-4 space-y-4 border-t border-line pt-4">
              <ToggleRow checked={isPreOrder} onChange={setIsPreOrder} label="Pre-order" hint="Shoppers can order it before it’s in stock." />
              <ToggleRow
                checked={quoteOnly}
                onChange={setQuoteOnly}
                label="Price on request"
                hint="Hides the price and Buy buttons (StorePal theme) and shows a “Request a price” form. Requests come into your LMS."
              />
            </div>
          </SectionCard>

          <SectionCard title="Variations" id="variations" description="Sizes, colours and so on, each with its own stock and price.">
            <VariationsEditor
              productSku={sku}
              weightUnit={weightUnit}
              options={variationOptions}
              onOptionsChange={setVariationOptions}
              variants={variants}
              onVariantsChange={setVariants}
              variationPhotos={variationPhotos}
              onVariationPhotosChange={setVariationPhotos}
              priceLocked={!canPrice}
            />
          </SectionCard>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <StatusCard visibility={visibility} onChange={setVisibility} />

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
              <Field label="More categories" hint="Show this product in up to 10 more categories. Type a name, then press Enter.">
                {secondaryCategories.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {secondaryCategories.map((c) => (
                      <span key={c} className="inline-flex items-center gap-1 rounded border border-brand-lime bg-brand-lime/40 px-2 py-0.5 text-xs font-medium text-brand">
                        {c}
                        <button
                          type="button"
                          aria-label={`Remove ${c}`}
                          onClick={() => setSecondaryCategories(secondaryCategories.filter((x) => x !== c))}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <CategoryCombobox
                  value={secondaryCategoryInput}
                  onChange={setSecondaryCategoryInput}
                  onSubmit={(name) => {
                    if (!secondaryCategories.includes(name) && secondaryCategories.length < 10) {
                      setSecondaryCategories([...secondaryCategories, name]);
                    }
                    setSecondaryCategoryInput('');
                  }}
                  placeholder="Search categories"
                  exclude={[category, ...secondaryCategories]}
                />
              </Field>
              <Field label="Brand">
                <div className="flex items-center gap-2">
                  <input type="text" value={brand} onChange={(e) => setBrand(e.target.value.slice(0, 100))} maxLength={100} className={productInputClass} />
                  <QuickAddButton title="Add brand" onClick={() => setShowAddBrand(true)} />
                </div>
              </Field>
            </div>
          </ProductSideCard>

          <ProductSideCard title="Internal">
            <div className="space-y-3">
              <Field label="Note" hint="Only you and your staff see this.">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                  rows={3}
                  maxLength={1000}
                  className={`${productInputClass} resize-y`}
                />
              </Field>
              <Field label="Added by">
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
            onSlug={(v) => setSlug(slugify(v).slice(0, 200))}
            slugPlaceholder={slugify(name) || 'product-url'}
            descriptionFallback={htmlToText(description)}
          />

          {canDelete && (
            <ProductSideCard title="Delete product">
              <p className="text-xs text-neutral-500">Removes it from your store and your product list. Past orders keep their details.</p>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 size={15} />
                Delete product
              </button>
            </ProductSideCard>
          )}
        </div>
      </div>

      {!canEdit ? (
        <SaveBar message={<span className="text-neutral-500">Your role can look at this product, not change it.</span>}>
          <Link to="/vendor/product/all" className={outlineBtn}>
            Back to products
          </Link>
        </SaveBar>
      ) : (
      <SaveBar
        message={
          formError ? (
            <span className="text-red-600">{formError}</span>
          ) : isDirty ? (
            <span className="font-medium text-amber-700">You have unsaved changes</span>
          ) : (
            <span className="text-neutral-500">All changes saved</span>
          )
        }
      >
        {isDirty && (
          <button type="button" onClick={handleDiscard} disabled={updateMutation.isPending} className={outlineBtn}>
            Discard
          </button>
        )}
        <button type="button" onClick={handleSubmit} disabled={!isDirty || updateMutation.isPending} className={primaryBtn}>
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </SaveBar>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${product.name}?`}
        message="It disappears from your store and your product list. This can’t be undone. Orders that already have it keep their details."
        confirmLabel="Delete product"
        onConfirm={() => deleteMutation.mutate()}
        busy={deleteMutation.isPending}
        danger
      />

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
