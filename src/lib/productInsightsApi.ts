import { api } from './api';

// Mirrors server/src/product-insights/product-insights.service.ts.

export interface InsightProduct {
  key: string;
  productId: string | null;
  name: string;
  category: string | null;
  vendorId: string;
  storeName: string;
  subdomain: string | null;
  slug: string | null;
  photoUrl: string | null;
  units: number;
  orders: number;
  revenue: number;
  avgPrice: number | null;
  prevUnits: number;
  unitsChange: number | null;
}

export interface ProductInsights {
  days: number;
  from: string;
  generatedAt: string;
  totals: { units: number; revenue: number; orders: number; stores: number; products: number; prevUnits: number; prevRevenue: number; revenueChange: number | null };
  topByUnits: InsightProduct[];
  topByRevenue: InsightProduct[];
  rising: InsightProduct[];
  categories: Array<{ label: string; units: number; revenue: number; stores: number; products: number; revenueChange: number | null; share: number }>;
  acrossStores: Array<{ name: string; stores: number; units: number; revenue: number; minPrice: number; maxPrice: number; unitsChange: number | null }>;
  priceBands: Array<{ label: string; units: number; revenue: number; orders: number; unitsChange: number | null }>;
}

export const productInsightsApi = {
  get: (days: number) => api.get<ProductInsights>('/v1/admin/product-insights', { params: { days } }).then((r) => r.data),
};
