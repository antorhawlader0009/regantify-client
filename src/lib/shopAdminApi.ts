import { api } from './api';

// Mirrors server/src/marketplace/shop-admin.controller.ts (Super Admin > Platform > Shop, SHOP-plan.md Step 9).

export type ShopSoldOut = 'LAST' | 'HIDE';
export interface ShopRules {
  verifiedStoresOnly: boolean;
  minPublicProducts: number;
  minDeliveredOrders: number;
  soldOut: ShopSoldOut;
  perStoreCap: number;
  topPerStore: number;
}
export type ShopWeightKey = 'sales' | 'quality' | 'completeness' | 'storeTrust' | 'freshness';
export interface ShopRanking {
  weights: Record<ShopWeightKey, number>;
  halfLifeDays: number;
  scoreShare: number;
}
export interface ShopJob {
  name: string;
  lastRunAt: string | null;
  lastOkAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}
export interface ShopOverview {
  switchOn: boolean;
  flag: { mode: string; percent: number; listedStores: number; planCodes: string[] } | null;
  rules: ShopRules;
  ranking: ShopRanking;
  synonyms: string[][];
  index: {
    products: number;
    size: string | null;
    stores: Array<{ eligible: boolean; refusal: string | null; text: string | null; count: number }>;
    lastStorePassAt: string | null;
    lastFullPassAt: string | null;
  };
  jobs: ShopJob[];
  /** Step 13: the go-live checklist, in the order to do it (server/src/marketplace/shop-go-live.ts). */
  goLive: Array<{ key: string; label: string; state: 'DONE' | 'TODO' | 'CHECK'; detail: string }>;
}
export type ShopSettingsUpdate = Partial<ShopRules> & { ranking?: ShopRanking; synonyms?: string[][] };

export interface ShopAdminStore {
  id: string;
  storeName: string;
  subdomain: string;
  status: string;
  shopListed: boolean;
  shopBlockedAt: string | null;
  shopBlockReason: string | null;
  verifiedAt: string | null;
  shopStore: { eligible: boolean; refusal: string | null; publicProducts: number; deliveredOrders: number; indexedProducts: number; trust: number; checkedAt: string } | null;
  refusalText: string | null;
}

export interface ShopProductControl {
  productId: string;
  hiddenAt: string | null;
  hiddenReason: string | null;
  hiddenBy: string | null;
  pinRank: number | null;
  pinUntil: string | null;
  featuredUntil: string | null;
  updatedAt: string;
}
export interface ShopAdminProduct {
  productId: string;
  name: string;
  storeName: string;
  storeSubdomain: string;
  price: number;
  inStock: boolean;
  score: number;
  photoUrl: string | null;
  control: ShopProductControl | null;
}
export type ShopControlRow = ShopProductControl & { name: string; storeName: string; storeSubdomain: string };
export interface ShopControlUpdate {
  hidden?: boolean;
  hiddenReason?: string | null;
  pinRank?: number | null;
  pinUntil?: string | null;
  featuredUntil?: string | null;
}

export interface ShopWordRow {
  term: string;
  searches: number;
  noResults: number;
}

export type ShopBannerTone = 'GREEN' | 'DARK' | 'AMBER';
export interface ShopBanner {
  id: string;
  title: string;
  text: string | null;
  linkUrl: string | null;
  tone: ShopBannerTone;
  startsAt: string | null;
  endsAt: string | null;
  position: number;
  active: boolean;
  createdBy: string | null;
}
export type ShopBannerInput = Partial<Omit<ShopBanner, 'id' | 'createdBy'>>;

export interface ShopCollection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  productIds: string[];
  active: boolean;
  showOnHome: boolean;
  endsAt: string | null;
  position: number;
  createdBy: string | null;
}
export type ShopCollectionInput = Partial<Omit<ShopCollection, 'id' | 'createdBy'>>;

export interface ShopCategoryRow {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string | null;
  parentId: string | null;
  position: number;
  keywords: string[];
  active: boolean;
  productCount: number;
  aliasCount: number;
}
export type ShopCategoryTree = ShopCategoryRow & { children: ShopCategoryRow[] };
export interface ShopCategoryInput {
  nameEn?: string;
  nameBn?: string | null;
  slug?: string;
  parentId?: string | null;
  position?: number;
  keywords?: string[];
  active?: boolean;
}
export interface ShopAlias {
  aliasText: string;
  shopCategoryId: string;
  shopCategory: { slug: string; nameEn: string };
}

export const shopAdminApi = {
  overview: () => api.get<ShopOverview>('/v1/admin/shop/overview').then((r) => r.data),
  updateSettings: (body: ShopSettingsUpdate) => api.patch<ShopOverview>('/v1/admin/shop/settings', body).then((r) => r.data),
  recomputeRanking: () => api.post<{ products: number; stores: number; ms: number } | { skipped: string }>('/v1/admin/shop/ranking-recompute').then((r) => r.data),

  stores: (q?: string) => api.get<ShopAdminStore[]>('/v1/admin/shop/stores', { params: { q: q || undefined } }).then((r) => r.data),
  blockStore: (vendorId: string, reason: string) => api.post(`/v1/admin/shop/stores/${vendorId}/block`, { reason }).then((r) => r.data),
  unblockStore: (vendorId: string) => api.delete(`/v1/admin/shop/stores/${vendorId}/block`).then((r) => r.data),

  products: (q: string) => api.get<ShopAdminProduct[]>('/v1/admin/shop/products', { params: { q } }).then((r) => r.data),
  controls: () => api.get<ShopControlRow[]>('/v1/admin/shop/product-controls').then((r) => r.data),
  setControl: (productId: string, body: ShopControlUpdate) => api.put<ShopProductControl>(`/v1/admin/shop/products/${productId}/control`, body).then((r) => r.data),

  searchWords: (days: number) => api.get<{ since: string; top: ShopWordRow[]; missing: ShopWordRow[] }>('/v1/admin/shop/search-words', { params: { days } }).then((r) => r.data),

  banners: () => api.get<ShopBanner[]>('/v1/admin/shop/banners').then((r) => r.data),
  createBanner: (body: ShopBannerInput) => api.post<ShopBanner>('/v1/admin/shop/banners', body).then((r) => r.data),
  updateBanner: (id: string, body: ShopBannerInput) => api.patch<ShopBanner>(`/v1/admin/shop/banners/${id}`, body).then((r) => r.data),
  deleteBanner: (id: string) => api.delete(`/v1/admin/shop/banners/${id}`).then((r) => r.data),

  collections: () => api.get<ShopCollection[]>('/v1/admin/shop/collections').then((r) => r.data),
  createCollection: (body: ShopCollectionInput) => api.post<ShopCollection>('/v1/admin/shop/collections', body).then((r) => r.data),
  updateCollection: (id: string, body: ShopCollectionInput) => api.patch<ShopCollection>(`/v1/admin/shop/collections/${id}`, body).then((r) => r.data),
  deleteCollection: (id: string) => api.delete(`/v1/admin/shop/collections/${id}`).then((r) => r.data),

  categories: () => api.get<{ categories: ShopCategoryTree[]; otherCount: number }>('/v1/admin/shop/categories').then((r) => r.data),
  createCategory: (body: ShopCategoryInput) => api.post('/v1/admin/shop/categories', body).then((r) => r.data),
  updateCategory: (id: string, body: ShopCategoryInput) => api.patch(`/v1/admin/shop/categories/${id}`, body).then((r) => r.data),
  deleteCategory: (id: string) => api.delete(`/v1/admin/shop/categories/${id}`).then((r) => r.data),
  unmapped: () =>
    api
      .get<{ texts: Array<{ text: string; products: number; stores: number; examples: string[] }>; withoutCategoryText: number }>('/v1/admin/shop/categories-unmapped')
      .then((r) => r.data),
  recategorize: () => api.post<{ checked: number; changed: number }>('/v1/admin/shop/categories-recategorize').then((r) => r.data),
  aliases: () => api.get<ShopAlias[]>('/v1/admin/shop/category-aliases').then((r) => r.data),
  setAlias: (text: string, shopCategoryId: string) => api.put('/v1/admin/shop/category-aliases', { text, shopCategoryId }).then((r) => r.data),
  removeAlias: (text: string) => api.delete(`/v1/admin/shop/category-aliases/${encodeURIComponent(text)}`).then((r) => r.data),
};
