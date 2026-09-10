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

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  description?: string | null;
  note?: string | null;
  creator?: string | null;
  category?: string | null;
  secondaryCategories: string[];
  brand?: string | null;
  summary?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  visibility: 'PUBLIC' | 'DRAFT';
  photoSize: 'SQUARE' | 'PORTRAIT';
  photoUrls: string[];
  videoUrl?: string | null;
  price: string; // Decimal, serialized as string — see server schema notes
  discountPrice?: string | null;
  cost?: string | null;
  sku: string;
  isPreOrder: boolean;
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
  brand?: string;
  summary?: string;
  metaTitle?: string;
  metaDescription?: string;
  // Search engine listing — editable storefront URL slug. Auto-generated
  // from `name` on the server when omitted/blank.
  slug?: string;
  visibility?: 'PUBLIC' | 'DRAFT';
  photoSize?: 'SQUARE' | 'PORTRAIT';
  photoUrls?: string[];
  videoUrl?: string;
  price: number;
  discountPrice?: number;
  cost?: number;
  sku: string;
  isPreOrder?: boolean;
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

// Every field optional — a PATCH can update just one section (e.g. only
// the variants table) without resending the whole form.
export interface UpdateProductPayload {
  name?: string;
  slug?: string;
  description?: string;
  note?: string;
  creator?: string;
  category?: string;
  secondaryCategories?: string[];
  brand?: string;
  summary?: string;
  metaTitle?: string;
  metaDescription?: string;
  visibility?: 'PUBLIC' | 'DRAFT';
  photoSize?: 'SQUARE' | 'PORTRAIT';
  photoUrls?: string[];
  videoUrl?: string;
  price?: number;
  discountPrice?: number;
  cost?: number;
  sku?: string;
  isPreOrder?: boolean;
  stockQuantity?: number;
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
}

export interface LowStockResponse {
  products: LowStockProduct[];
  total: number;
  threshold: number;
}

export const productsApi = {
  list: (params: ListProductsParams = {}) =>
    api.get<ProductListResponse>('/api/v1/products', { params }).then((r) => r.data),

  // Low Stock page — products with effective stock (variant stock summed,
  // or stockQuantity when no variants) below `threshold` (default 5).
  lowStock: (threshold?: number) =>
    api
      .get<LowStockResponse>('/api/v1/products/low-stock', { params: threshold ? { threshold } : {} })
      .then((r) => r.data),

  // Distinct category names currently in use, for the "All Categories" filter dropdown.
  categoriesInUse: () => api.get<string[]>('/api/v1/products/categories-in-use').then((r) => r.data),

  findOne: (id: string) => api.get<Product>(`/api/v1/products/${id}`).then((r) => r.data),

  create: (payload: CreateProductPayload) =>
    api.post<Product>('/api/v1/products', payload).then((r) => r.data),

  update: (id: string, payload: UpdateProductPayload) =>
    api.patch<Product>(`/api/v1/products/${id}`, payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/api/v1/products/${id}`).then((r) => r.data),

  // "Change Status" from the Actions menu — toggles Public/Draft.
  updateVisibility: (id: string, visibility: 'PUBLIC' | 'DRAFT') =>
    api.patch<Product>(`/api/v1/products/${id}/visibility`, { visibility }).then((r) => r.data),

  // "Create Stock Product" from the Actions menu — clones a pre-order
  // product into a new in-stock product with the given per-combination
  // stock quantities. `sku` overrides the default "stk_<source sku>".
  createStockProduct: (
    id: string,
    payload: { sku?: string; variantStocks: { optionValues: Record<string, string>; stock?: number }[] },
  ) => api.post<Product>(`/api/v1/products/${id}/stock-product`, payload).then((r) => r.data),

  // Uploads one product photo and returns its Cloudinary URL. Called once
  // per selected file — the Add/Edit Product form collects the resulting
  // URLs and sends them together as photoUrls in the create()/update() call.
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api
      .post<{ url: string }>('/api/v1/products/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
