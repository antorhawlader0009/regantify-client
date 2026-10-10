import { api } from './api';
import { downloadCsv, toCsv } from './csv';

// All Products > Export (TellMe idea 34): the store's products as a CSV for Excel. The columns follow the product
// import's own headers (productCsvImport.ts auto-matches them), so an exported file can be edited and brought back in.
// Mirrors the server's ProductExportService (server/src/products/product-export.service.ts).

export interface ProductExportRow {
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  discountPrice: number | null;
  /** Left out by the server for a role without products.cost. */
  cost?: number | null;
  category: string | null;
  brand: string | null;
  summary: string | null;
  description: string | null;
  /** Variants added up; null = unlimited stock. */
  stockQuantity: number | null;
  isPreOrder: boolean;
  weight: number | null;
  weightUnit: string;
  visibility: string;
  slug: string;
  imageUrl: string | null;
  /** "Red / M: 5 (SKU X); Red / L: 3 (SKU Y)", or empty. */
  variants: string;
  createdAt: string;
}

export interface ProductExportParams {
  search?: string;
  category?: string;
  visibility?: 'PUBLIC' | 'DRAFT';
  stockType?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNLIMITED';
  /** The products picked; without them, everything matching the filters. */
  ids?: string[];
}

export const productExportApi = {
  fetch: ({ ids, ...filters }: ProductExportParams) =>
    api.get<{ products: ProductExportRow[]; truncated: boolean }>('/v1/products/export', { params: { ...filters, ids: ids?.length ? ids.join(',') : undefined } }).then((r) => r.data),
};

const text = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v));

/** The CSV text for these rows. The Cost column is there only when the server sent costs (the role may see them). */
export function productsToCsv(products: ProductExportRow[]): string {
  const withCost = products.some((p) => p.cost !== undefined);
  const headers = [
    'Product Name',
    'Description',
    'Category',
    'Brand',
    'Summary',
    'Price',
    'Discount Price',
    ...(withCost ? ['Cost'] : []),
    'SKU',
    'Barcode',
    'Is Pre-Order?',
    'Stock Quantity',
    'Weight',
    'Weight Unit',
    'Visibility',
    'Options (variants)',
    'Image URL',
    'Page slug',
    'Created',
  ];
  const rows = products.map((p) => [
    p.name,
    text(p.description),
    text(p.category),
    text(p.brand),
    text(p.summary),
    text(p.price),
    text(p.discountPrice),
    ...(withCost ? [text(p.cost)] : []),
    p.sku,
    text(p.barcode),
    p.isPreOrder ? 'yes' : 'no',
    // Unlimited stock is an empty cell, like the import's.
    text(p.stockQuantity),
    text(p.weight),
    p.weightUnit,
    p.visibility,
    p.variants,
    text(p.imageUrl),
    p.slug,
    p.createdAt.slice(0, 10),
  ]);
  return toCsv(headers, rows);
}

/** Fetches and downloads. Returns how many products were in the file, and whether the store had more than the limit. */
export async function downloadProducts(params: ProductExportParams): Promise<{ count: number; truncated: boolean }> {
  const { products, truncated } = await productExportApi.fetch(params);
  if (products.length > 0) downloadCsv('products.csv', productsToCsv(products));
  return { count: products.length, truncated };
}
