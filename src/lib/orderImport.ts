import { api } from './api';
import type { ImportSheet } from './lmsImport';

// Orders > Import orders (TellMe idea 22) — mirrors the server's OrderImportService (server/src/orders/order-import*.ts).
// The dashboard reads the spreadsheet; the server checks every row and makes the orders.

export interface ImportRow {
  rowNumber: number;
  reference?: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingDistrict?: string;
  shippingCity?: string;
  sku: string;
  quantity: number | null;
  unitPrice?: number | null;
  deliveryCharge?: number | null;
  note?: string;
  staffNote?: string;
}

export interface ImportField {
  key: keyof Omit<ImportRow, 'rowNumber'>;
  label: string;
  required?: boolean;
  hint?: string;
  /** Header texts this field matches on its own, compared without case or punctuation. */
  aliases: string[];
}

export const ORDER_IMPORT_FIELDS: ImportField[] = [
  { key: 'reference', label: 'Reference', hint: 'Your own order number. Rows with the same one are one order, and the same file can’t be imported twice.', aliases: ['reference', 'ref', 'order id', 'order no', 'order number', 'invoice', 'serial'] },
  { key: 'customerName', label: 'Customer name', required: true, aliases: ['customer name', 'name', 'customer', 'full name'] },
  { key: 'customerPhone', label: 'Phone', required: true, aliases: ['phone', 'mobile', 'phone number', 'mobile number', 'contact', 'contact number'] },
  { key: 'shippingAddress', label: 'Address', required: true, aliases: ['address', 'shipping address', 'delivery address'] },
  { key: 'shippingDistrict', label: 'District', required: true, hint: 'Decides the delivery charge (Dhaka or outside).', aliases: ['district', 'zila', 'jela'] },
  { key: 'shippingCity', label: 'Thana / area', aliases: ['thana', 'upazila', 'area', 'city', 'city thana'] },
  { key: 'sku', label: 'Product SKU', required: true, hint: 'For a product with sizes or colours, the SKU of that exact variant.', aliases: ['sku', 'product sku', 'product code', 'item code', 'code', 'variant sku'] },
  { key: 'quantity', label: 'Quantity', required: true, aliases: ['quantity', 'qty', 'pcs', 'pieces'] },
  { key: 'unitPrice', label: 'Price each', hint: 'Leave empty for the catalog price.', aliases: ['price', 'unit price', 'price each', 'rate'] },
  { key: 'deliveryCharge', label: 'Delivery charge', hint: 'Leave empty for your store’s charge.', aliases: ['delivery charge', 'delivery', 'shipping', 'shipping charge'] },
  { key: 'note', label: 'Customer note', aliases: ['note', 'customer note', 'comment', 'remarks'] },
  { key: 'staffNote', label: 'Internal note', hint: 'Only you and your staff see it.', aliases: ['staff note', 'internal note', 'private note'] },
];

/** field key -> the spreadsheet header it reads (or '' for none). */
export type ColumnMapping = Record<string, string>;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function autoMatchColumns(headers: string[]): ColumnMapping {
  const normalized = headers.map((h) => ({ original: h, normalized: norm(h) }));
  const mapping: ColumnMapping = {};
  for (const field of ORDER_IMPORT_FIELDS) {
    const hit = normalized.find((h) => field.aliases.some((alias) => h.normalized === norm(alias)));
    mapping[field.key] = hit?.original ?? '';
  }
  return mapping;
}

/** "৳1,200", "1200 tk", "12.5" -> 1200 / 12.5; empty or unreadable -> null. */
function toNumber(text: string): number | null {
  const cleaned = text.replace(/[,৳]|tk|taka/gi, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** The sheet's rows read through the mapping. A row with nothing in the mapped columns is dropped. */
export function mapRows(sheet: ImportSheet, mapping: ColumnMapping): ImportRow[] {
  const indexOf = (key: string) => {
    const header = mapping[key];
    return header ? sheet.headers.indexOf(header) : -1;
  };
  const idx = Object.fromEntries(ORDER_IMPORT_FIELDS.map((f) => [f.key, indexOf(f.key)])) as Record<string, number>;
  const rows: ImportRow[] = [];
  for (const row of sheet.rows) {
    const cell = (key: string) => (idx[key] >= 0 ? (row.cells[idx[key]] ?? '').trim() : '');
    if (ORDER_IMPORT_FIELDS.every((f) => !cell(f.key))) continue;
    rows.push({
      rowNumber: row.line,
      reference: cell('reference') || undefined,
      customerName: cell('customerName'),
      customerPhone: cell('customerPhone'),
      shippingAddress: cell('shippingAddress'),
      shippingDistrict: cell('shippingDistrict') || undefined,
      shippingCity: cell('shippingCity') || undefined,
      sku: cell('sku'),
      quantity: toNumber(cell('quantity')),
      unitPrice: toNumber(cell('unitPrice')),
      deliveryCharge: toNumber(cell('deliveryCharge')),
      note: cell('note') || undefined,
      staffNote: cell('staffNote') || undefined,
    });
  }
  return rows;
}

export const TEMPLATE_HEADERS = ['Reference', 'Customer name', 'Phone', 'Address', 'District', 'Thana', 'Product SKU', 'Quantity', 'Price each', 'Delivery charge', 'Customer note'];
export const TEMPLATE_ROWS: string[][] = [
  ['A-1001', 'Rahim Uddin', '01712345678', 'House 12, Road 5, Dhanmondi', 'Dhaka', 'Dhanmondi', 'SHIRT-BLUE-M', '2', '', '', 'Call before delivery'],
  ['A-1001', 'Rahim Uddin', '01712345678', 'House 12, Road 5, Dhanmondi', 'Dhaka', 'Dhanmondi', 'CAP-01', '1', '350', '', ''],
  ['A-1002', 'Karim Hossain', '01911223344', 'Agrabad, Chattogram city', 'Chattogram', 'Kotwali', 'SHIRT-RED-L', '1', '', '150', ''],
];

// -- The server's answers --

export interface PreviewItem {
  key: string;
  rowNumbers: number[];
  reference: string | null;
  /** READY = will be made, ERROR = has a problem to fix in the file, ALREADY = this reference was imported before. */
  status: 'READY' | 'ERROR' | 'ALREADY';
  alreadyAs: string | null;
  customerName: string;
  customerPhone: string;
  district: string;
  zone: 'DHAKA' | 'OUTSIDE_DHAKA';
  subtotal: number;
  deliveryCharge: number | null;
  lines: { rowNumber: number; name: string; quantity: number; unitPrice: number }[];
  errors: string[];
  warnings: string[];
}

export interface ImportPreview {
  total: number;
  ready: number;
  errors: number;
  already: number;
  items: PreviewItem[];
}

export interface ImportCommitResult {
  created: { key: string; orderId: string; orderRef: string }[];
  failed: { key: string; rowNumbers: number[]; message: string }[];
  skipped: { key: string; rowNumbers: number[]; reason: string }[];
}

export const orderImportApi = {
  preview: (rows: ImportRow[]) => api.post<ImportPreview>('/v1/order-imports/preview', { rows }).then((r) => r.data),
  commit: (rows: ImportRow[]) => api.post<ImportCommitResult>('/v1/order-imports/commit', { rows }).then((r) => r.data),
};
