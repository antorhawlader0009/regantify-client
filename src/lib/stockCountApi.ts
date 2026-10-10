import { api } from './api';
import type { StockMovement } from './productsApi';

// Product > Stock count and Stock history — mirrors the server's StockCountService (server/src/products/stock-count.service.ts).

/** One thing to count: a product, or one option (variant) of it. */
export interface CountRow {
  productId: string;
  variantId: string | null;
  /** "Red / M" for an option, null for a plain product. */
  variantLabel: string | null;
  sku: string;
  barcode: string | null;
  /** What the system says is on the shelf now. */
  stock: number;
}

export interface CountProduct {
  id: string;
  name: string;
  image: string | null;
  category: string | null;
  rows: CountRow[];
}

export interface CountListPage {
  items: CountProduct[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/** A counted line: the stock the page showed when counting began, and what was found. */
export interface CountLine {
  productId: string;
  variantId?: string;
  expected: number;
  counted: number;
}

export interface CountResult {
  counted: number;
  changed: number;
  unitsAdded: number;
  unitsRemoved: number;
}

/** One change in the store-wide stock history. */
export interface StoreStockMovement extends StockMovement {
  productId: string;
  productName: string;
  productSku: string;
  productImage: string | null;
}

export interface StoreStockHistoryPage {
  items: StoreStockMovement[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface StockHistoryParams {
  reason?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

export const stockCountApi = {
  list: (params: { search?: string; categoryId?: string; page?: number; perPage?: number }) =>
    api.get<CountListPage>('/v1/products/stock-count', { params }).then((r) => r.data),

  apply: (lines: CountLine[], note?: string) =>
    api.post<CountResult>('/v1/products/stock-count', { lines, note: note?.trim() || undefined }).then((r) => r.data),

  history: (params: StockHistoryParams) => api.get<StoreStockHistoryPage>('/v1/products/stock-movements', { params }).then((r) => r.data),
};
