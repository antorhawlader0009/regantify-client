import { api } from './api';

export interface VariationOption {
  id: string;
  productId: string;
  name: string;
  values: string[];
  position: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  /** What a scanner reads (POS); unique per store across products and variants. */
  barcode?: string | null;
  optionValues: Record<string, string>;
  stock: number;
  listPrice?: string | null;
  discountPrice?: string | null;
  cost?: string | null;
  weight?: string | null;
}

export interface VariationValuePhoto {
  id: string;
  productId: string;
  optionName: string;
  optionValue: string;
  photoUrls: string[];
}

// Add/Edit Product's "AI Generate" result — see AiService.generateProductInfo.
// Deliberately excludes price/stock (the vendor's own business decision,
// never inferred).
export interface GeneratedProductInfo {
  description: string;
  category: string;
  brand: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  weight: number | null;
  weightUnit: 'KG' | 'G' | 'LB';
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  description?: string | null;
  note?: string | null;
  creator?: string | null;
  category?: string | null;
  // Optional link to a real Category row — see Product.categoryId's
  // own schema comment on why this is additive alongside `category`
  // (the free-text field above, which still drives the storefront's
  // category filter/nav). Mainly exists so Marketing > Coupons'
  // category restriction has something on Product it can actually match.
  categoryId?: string | null;
  secondaryCategories: string[];
  brand?: string | null;
  summary?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  visibility: 'PUBLIC' | 'DRAFT';
  /** Scheduled: a Draft product goes Public at this time. Null = not scheduled. */
  publishAt?: string | null;
  /** Scheduled: a Public product goes Draft at this time. Null = not scheduled. */
  unpublishAt?: string | null;
  photoSize: 'SQUARE' | 'PORTRAIT';
  photoUrls: string[];
  videoUrl?: string | null;
  price: string; // Decimal, serialized as string — see server schema notes
  discountPrice?: string | null;
  cost?: string | null;
  // Shown as a read-only column on Marketing > Campaigns' product table.
  freeShipping: boolean;
  sku: string;
  /** What a scanner reads (POS); unique per store across products and variants. */
  barcode?: string | null;
  isPreOrder: boolean;
  quoteOnly?: boolean;
  /** Fewest a shopper may order in one cart line; null = no minimum. */
  minOrderQuantity?: number | null;
  /** Low stock alert below this many; null = the store default (Stock Settings), 0 = never. */
  lowStockThreshold?: number | null;
  /** The size guide shown beside the Size choice; null = the category's guide, if any. */
  sizeGuideId?: string | null;
  /** Hidden words that also find this product in the store's search ("also found as"). */
  searchKeywords?: string[];
  stockQuantity?: number | null;
  weight?: string | null;
  weightUnit: 'KG' | 'G' | 'LB';
  variationOptions?: VariationOption[];
  variants?: ProductVariant[];
  variationPhotos?: VariationValuePhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  note?: string;
  category?: string;
  categoryId?: string;
  brand?: string;
  summary?: string;
  metaTitle?: string;
  metaDescription?: string;
  // Search engine listing — editable storefront URL slug. Auto-generated
  // from `name` on the server when omitted/blank.
  slug?: string;
  visibility?: 'PUBLIC' | 'DRAFT';
  publishAt?: string | null;
  unpublishAt?: string | null;
  photoSize?: 'SQUARE' | 'PORTRAIT';
  photoUrls?: string[];
  videoUrl?: string;
  price: number;
  discountPrice?: number;
  cost?: number;
  sku: string;
  barcode?: string;
  isPreOrder?: boolean;
  quoteOnly?: boolean;
  /** Fewest a shopper may order in one cart line; null = no minimum. */
  minOrderQuantity?: number | null;
  /** Low stock alert below this many; null = the store default (Stock Settings), 0 = never. */
  lowStockThreshold?: number | null;
  /** The size guide shown beside the Size choice; null = the category's guide, if any. */
  sizeGuideId?: string | null;
  /** Hidden words that also find this product in the store's search ("also found as"). */
  searchKeywords?: string[];
  stockQuantity?: number;
  weight?: number;
  weightUnit?: 'KG' | 'G' | 'LB';
  variationOptions?: VariationOptionInput[];
  variants?: ProductVariantInput[];
  variationPhotos?: VariationValuePhotoInput[];
}

export interface VariationOptionInput {
  name: string;
  values: string[];
}

export interface ProductVariantInput {
  sku: string;
  barcode?: string;
  optionValues: Record<string, string>;
  stock?: number;
  listPrice?: number;
  discountPrice?: number;
  cost?: number;
  weight?: number;
}

// Per-value photo set for ONE variation option (e.g. every "Color" value
// gets its own photos). See VariationValuePhoto (server model) for why
// this is keyed by a single option's value rather than a full variant
// combination.
export interface VariationValuePhotoInput {
  optionName: string;
  optionValue: string;
  photoUrls: string[];
}

/** One change to a stock count (Products > Edit > Stock history). */
export interface StockMovement {
  id: string;
  variantLabel: string | null;
  /** Negative = went out, positive = came in. */
  delta: number;
  stockBefore: number;
  stockAfter: number;
  /** ORDER, ORDER_BACK, RETURN_DAMAGED, RETURN_MISSING, ITEMS_EDITED, POS_SALE, POS_RETURN, CREATED, RECEIVED, DAMAGED, COUNT, EDIT, API. */
  reason: string;
  orderId: string | null;
  orderRef: string | null;
  actor: string | null;
  note: string | null;
  createdAt: string;
}

export interface StockHistoryPage {
  productName: string;
  items: StockMovement[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Every field optional — a PATCH can update just one section (e.g. only
// the variants table) without resending the whole form.
export interface UpdateProductPayload {
  name?: string;
  slug?: string;
  description?: string;
  note?: string;
  creator?: string;
  category?: string;
  categoryId?: string;
  secondaryCategories?: string[];
  brand?: string;
  summary?: string;
  metaTitle?: string;
  metaDescription?: string;
  visibility?: 'PUBLIC' | 'DRAFT';
  publishAt?: string | null;
  unpublishAt?: string | null;
  photoSize?: 'SQUARE' | 'PORTRAIT';
  photoUrls?: string[];
  videoUrl?: string;
  price?: number;
  discountPrice?: number;
  cost?: number;
  sku?: string;
  /** An empty string removes it. */
  barcode?: string;
  isPreOrder?: boolean;
  quoteOnly?: boolean;
  /** Fewest a shopper may order in one cart line; null = no minimum. */
  minOrderQuantity?: number | null;
  /** Low stock alert below this many; null = the store default (Stock Settings), 0 = never. */
  lowStockThreshold?: number | null;
  /** The size guide shown beside the Size choice; null = the category's guide, if any. */
  sizeGuideId?: string | null;
  /** Hidden words that also find this product in the store's search ("also found as"). */
  searchKeywords?: string[];
  stockQuantity?: number;
  /** Why stock was changed by hand in this save (kept in the stock history). */
  stockReason?: 'RECEIVED' | 'DAMAGED' | 'COUNT' | 'OTHER';
  stockNote?: string;
  weight?: number;
  weightUnit?: 'KG' | 'G' | 'LB';
  // When provided, REPLACES the product's full existing set — always
  // send the complete current table, not a diff.
  variationOptions?: VariationOptionInput[];
  variants?: ProductVariantInput[];
  variationPhotos?: VariationValuePhotoInput[];
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
}

export interface ListProductsParams {
  search?: string;
  category?: string;
  visibility?: 'PUBLIC' | 'DRAFT';
  stockType?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNLIMITED';
  page?: number;
  perPage?: number;
}

export interface LowStockProduct extends Omit<Product, 'variants'> {
  stock: number;
  /** The limit it was checked against: its own, the store's, or the page's "Show stock under". */
  lowStockLimit: number;
}

export interface LowStockResponse {
  products: LowStockProduct[];
  total: number;
  /** The page's "Show stock under" number; null = each product's own limit. */
  threshold: number | null;
  /** Stock Settings > Low Stock Alert, for products without their own limit. */
  storeThreshold: number;
}

// All Products > Change prices (server: products/bulk-price.service.ts).
export interface PriceChangeOptions {
  /** PRICE = the regular price, DISCOUNT = the sale price (only where one is set), BOTH = both. */
  target: 'PRICE' | 'DISCOUNT' | 'BOTH';
  mode: 'PERCENT' | 'AMOUNT';
  direction: 'INCREASE' | 'DECREASE';
  value: number;
  rounding: 'NONE' | 'ONE' | 'FIVE' | 'TEN';
}

/** Which products: the ticked ones, or everything matching the page's filters. */
export interface PriceChangeScope {
  productIds?: string[];
  filter?: Pick<ListProductsParams, 'search' | 'category' | 'visibility' | 'stockType'>;
}

export type PriceChangeRequest = PriceChangeOptions & PriceChangeScope;

export interface PriceChangeVariant {
  id: string;
  label: string;
  oldListPrice: number | null;
  newListPrice: number | null;
  oldDiscountPrice: number | null;
  newDiscountPrice: number | null;
}

export interface PriceChangePreviewItem {
  productId: string;
  name: string;
  sku: string;
  /** CHANGE = will change, SKIPPED = would give a bad price (see reason), SAME = nothing to change. */
  status: 'CHANGE' | 'SKIPPED' | 'SAME';
  reason: string | null;
  oldPrice: number;
  newPrice: number;
  oldDiscountPrice: number | null;
  newDiscountPrice: number | null;
  variantCount: number;
  /** Only the variants whose own price moves. */
  variants: PriceChangeVariant[];
}

export interface PriceChangePreview {
  total: number;
  willChange: number;
  skipped: number;
  unchanged: number;
  items: PriceChangePreviewItem[];
}

export interface PriceChangeResult {
  batchId: string | null;
  changed: number;
  skipped: number;
  unchanged: number;
  skippedList: { name: string; reason: string }[];
}

export interface PriceChangeBatch {
  id: string;
  actor: string;
  params: PriceChangeOptions;
  productCount: number;
  createdAt: string;
  undoneAt: string | null;
  undoneBy: string | null;
}

export const productsApi = {
  /** Adds one hidden search word to a product (Analytics > "searched but not found" > Add to a product). */
  addSearchWord: (id: string, word: string) =>
    api.post<{ id: string; name: string; searchKeywords: string[]; added: boolean }>(`/v1/products/${id}/search-words`, { word }).then((r) => r.data),

  previewPriceChange: (body: PriceChangeRequest) =>
    api.post<PriceChangePreview>('/v1/products/price-changes/preview', body).then((r) => r.data),

  applyPriceChange: (body: PriceChangeRequest) =>
    api.post<PriceChangeResult>('/v1/products/price-changes', body).then((r) => r.data),

  listPriceChanges: () => api.get<PriceChangeBatch[]>('/v1/products/price-changes').then((r) => r.data),

  undoPriceChange: (batchId: string) =>
    api.post<{ restored: number; skipped: number }>(`/v1/products/price-changes/${batchId}/undo`).then((r) => r.data),

  list: (params: ListProductsParams = {}) =>
    api.get<ProductListResponse>('/v1/products', { params }).then((r) => r.data),

  // Low Stock page — products with effective stock (variant stock summed,
  // or stockQuantity when no variants) below `threshold`, or without it
  // below each product's own low stock limit.
  lowStock: (threshold?: number) =>
    api
      .get<LowStockResponse>('/v1/products/low-stock', { params: threshold ? { threshold } : {} })
      .then((r) => r.data),

  // Distinct category names currently in use, for the "All Categories" filter dropdown.
  categoriesInUse: () => api.get<string[]>('/v1/products/categories-in-use').then((r) => r.data),

  // Add/Edit Product's "AI Generate" button — see AiService.generateProductInfo
  // on the server. photoUrl must already be an uploaded (Cloudinary) URL,
  // not a local file — the form always uploads a photo before this is
  // ever callable (see the button's disabled condition).
  aiGenerate: (name: string, photoUrl: string) =>
    api.post<GeneratedProductInfo>('/v1/products/ai-generate', { name, photoUrl }).then((r) => r.data),

  // "Generate" next to a barcode field: in-store EAN-13 codes nothing in this store uses yet.
  generateBarcodes: (count = 1) =>
    api.post<{ barcodes: string[] }>('/v1/products/barcodes/generate', { count }).then((r) => r.data.barcodes),

  findOne: (id: string) => api.get<Product>(`/v1/products/${id}`).then((r) => r.data),

  /** Every change to the product's stock count, newest first. */
  stockHistory: (id: string, page = 1) =>
    api.get<StockHistoryPage>(`/v1/products/${id}/stock-history`, { params: { page } }).then((r) => r.data),

  create: (payload: CreateProductPayload) =>
    api.post<Product>('/v1/products', payload).then((r) => r.data),

  update: (id: string, payload: UpdateProductPayload) =>
    api.patch<Product>(`/v1/products/${id}`, payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/v1/products/${id}`).then((r) => r.data),

  /** "Duplicate": a Draft copy named "<name> (copy)", stock 0, no barcodes. */
  duplicate: (id: string) => api.post<Product>(`/v1/products/${id}/duplicate`).then((r) => r.data),

  // "Change Status" from the Actions menu — toggles Public/Draft.
  /** Change Status. `schedule`: ISO instants, null clears, absent leaves alone (the server drops one that no longer makes sense). */
  updateVisibility: (id: string, visibility: 'PUBLIC' | 'DRAFT', schedule: { publishAt?: string | null; unpublishAt?: string | null } = {}) =>
    api.patch<Product>(`/v1/products/${id}/visibility`, { visibility, ...schedule }).then((r) => r.data),

  // "Create Stock Product" from the Actions menu — clones a pre-order
  // product into a new in-stock product with the given per-combination
  // stock quantities. `sku` overrides the default "stk_<source sku>".
  createStockProduct: (
    id: string,
    payload: { sku?: string; variantStocks: { optionValues: Record<string, string>; stock?: number }[] },
  ) => api.post<Product>(`/v1/products/${id}/stock-product`, payload).then((r) => r.data),

  // Uploads one product photo and returns its Cloudinary URL. Called once
  // per selected file — the Add/Edit Product form collects the resulting
  // URLs and sends them together as photoUrls in the create()/update() call.
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api
      .post<{ url: string }>('/v1/products/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
