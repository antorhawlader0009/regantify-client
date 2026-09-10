import { api } from './api';

// Public storefront endpoints — no auth token required (the interceptor in
// api.ts attaches one if present, but the server never requires it here).

export interface StorefrontInfo {
  id: string;
  storeName: string;
  subdomain: string;
}

export interface StorefrontVariationOption {
  id: string;
  name: string;
  values: string[];
  position: number;
}

export interface StorefrontVariant {
  id: string;
  optionValues: Record<string, string>;
  stock: number;
  listPrice?: string | null;
  discountPrice?: string | null;
}

// Per-value photo set for ONE variation option (e.g. every "Color" value
// gets its own photos) — mirrors the same field in the storefront app's
// copy of this file (see that file's header comment: both must stay in
// lockstep since they read the same backend response).
export interface StorefrontVariationValuePhoto {
  optionName: string;
  optionValue: string;
  photoUrls: string[];
}

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  secondaryCategories: string[];
  brand?: string | null;
  summary?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  photoSize: string;
  photoUrls: string[];
  videoUrl?: string | null;
  price: string;
  discountPrice?: string | null;
  isPreOrder: boolean;
  stockQuantity?: number | null;
  weight?: string | null;
  weightUnit: string;
  variationOptions: StorefrontVariationOption[];
  variants: StorefrontVariant[];
  // Optional: see the same field in the storefront app's copy of this
  // file for why (not-yet-deployed backend / stale cached response).
  variationPhotos?: StorefrontVariationValuePhoto[];
  createdAt: string;
}

export interface StorefrontListData {
  store: StorefrontInfo;
  products: StorefrontProduct[];
  categories: string[];
}

export interface StorefrontDetailData {
  store: StorefrontInfo;
  product: StorefrontProduct;
}

export const storefrontApi = {
  getStoreProducts: async (subdomain: string): Promise<StorefrontListData> => {
    const { data } = await api.get(`/api/v1/store/${subdomain}/products`);
    return data;
  },
  getStoreProduct: async (subdomain: string, slug: string): Promise<StorefrontDetailData> => {
    const { data } = await api.get(`/api/v1/store/${subdomain}/products/${slug}`);
    return data;
  },
};
