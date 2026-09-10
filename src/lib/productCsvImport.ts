import type { CreateProductPayload } from './productsApi';

/**
 * One importable product field — shown as a row in the Column Mapping
 * step, matched against the user's own CSV headers (auto-matched by
 * `aliases`, but always changeable via dropdown). `required` fields must
 * be mapped to a CSV column before Preview/Import can proceed.
 */
export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
  /** Lowercase header strings this field auto-matches against, in priority order. */
  aliases: string[];
}

export const IMPORT_FIELDS: ImportField[] = [
  { key: 'name', label: 'Product Name', required: true, aliases: ['product name', 'name', 'title'] },
  { key: 'sku', label: 'SKU', required: true, aliases: ['sku', 'sku code', 'product sku'] },
  { key: 'price', label: 'Price', required: true, aliases: ['price', 'list price', 'selling price'] },
  { key: 'description', label: 'Description', aliases: ['description', 'product description', 'details'] },
  { key: 'category', label: 'Category', aliases: ['category', 'product category'] },
  { key: 'brand', label: 'Brand', aliases: ['brand'] },
  { key: 'summary', label: 'Summary', aliases: ['summary', 'short description'] },
  { key: 'discountPrice', label: 'Discount Price', aliases: ['discount price', 'sale price', 'discounted price'] },
  { key: 'cost', label: 'Cost', hint: 'Private, used only for reports', aliases: ['cost', 'purchase cost', 'cost price'] },
  {
    key: 'isPreOrder',
    label: 'Is Pre-Order?',
    hint: 'yes/no',
    aliases: ['is pre-order', 'pre-order', 'preorder', 'is this a pre-order item'],
  },
  { key: 'stockQuantity', label: 'Stock Quantity', aliases: ['stock quantity', 'stock', 'quantity', 'qty'] },
  { key: 'weight', label: 'Weight', aliases: ['weight'] },
  { key: 'weightUnit', label: 'Weight Unit', hint: 'KG / G / LB', aliases: ['weight unit', 'unit'] },
  { key: 'visibility', label: 'Visibility', hint: 'PUBLIC / DRAFT', aliases: ['visibility', 'status'] },
];

/** field key -> the user's CSV header it's mapped to (or '' if unmapped). */
export type ColumnMapping = Record<string, string>;

/**
 * Guesses a mapping from the user's own CSV headers to our fields by
 * matching against each field's aliases (case-insensitive, punctuation-
 * insensitive). Never assumes the user's exact header text - this is
 * always a starting point the user can override in the mapping UI.
 */
export function autoMatchColumns(csvHeaders: string[]): ColumnMapping {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const normalizedHeaders = csvHeaders.map((h) => ({ original: h, normalized: normalize(h) }));

  const mapping: ColumnMapping = {};
  for (const field of IMPORT_FIELDS) {
    const match = normalizedHeaders.find((h) => field.aliases.some((alias) => h.normalized === normalize(alias)));
    mapping[field.key] = match?.original ?? '';
  }
  return mapping;
}

const SAMPLE_HEADERS = [
  'Product Name',
  'Description',
  'Category',
  'Brand',
  'Summary',
  'Price',
  'Discount Price',
  'Cost',
  'SKU',
  'Is Pre-Order (yes/no)',
  'Stock Quantity',
  'Weight',
  'Weight Unit (KG/G/LB)',
  'Visibility (PUBLIC/DRAFT)',
];

const SAMPLE_ROWS: string[][] = [
  [
    'Pure Organic Sundarban Honey',
    '100% natural raw honey, no preservatives, no added sugar.',
    'Organic Food',
    'NatureFresh',
    'Raw, unprocessed honey straight from the hive',
    '650',
    '600',
    '400',
    'ORG-HNY-007',
    'no',
    '60',
    '500',
    'G',
    'PUBLIC',
  ],
  [
    'Shockproof Silicone Phone Case',
    'Soft silicone case with shockproof corners, matte finish.',
    'Phone',
    'CaseMate',
    'Protect your phone in style',
    '350',
    '',
    '120',
    'PHN-CASE-006',
    'no',
    '100',
    '25',
    'G',
    'PUBLIC',
  ],
];

/**
 * Template CSV - a helpful starting point with our suggested headers, but
 * NOT a required format. Any CSV works, since columns are mapped by the
 * user in the next step regardless of header names.
 */
export function buildTemplateRows(): { headers: string[]; rows: string[][] } {
  return { headers: SAMPLE_HEADERS, rows: SAMPLE_ROWS };
}

export interface ParsedCsvRow {
  /** 1-indexed data row number (excluding header), for user-facing messages. */
  rowNumber: number;
  raw: Record<string, string>;
  payload?: CreateProductPayload;
  errors: string[];
}

function toOptionalNumber(value: string, field: string, errors: string[]): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (Number.isNaN(num)) {
    errors.push(field + ' must be a number ("' + value + '" given).');
    return undefined;
  }
  if (num < 0) {
    errors.push(field + " can't be negative.");
    return undefined;
  }
  return num;
}

function toYesNo(value: string): boolean {
  return /^(y|yes|true|1)$/i.test(value.trim());
}

/** Reads a mapped field's raw string value for one CSV row, or '' if that field isn't mapped to any column. */
function getMapped(raw: Record<string, string>, mapping: ColumnMapping, key: string): string {
  const header = mapping[key];
  if (!header) return '';
  return (raw[header] ?? '').trim();
}

/**
 * Validates and maps one raw CSV row into a CreateProductPayload, using
 * the user-confirmed column mapping (field key -> their CSV header).
 */
export function mapCsvRow(raw: Record<string, string>, mapping: ColumnMapping, rowNumber: number): ParsedCsvRow {
  const errors: string[] = [];

  const name = getMapped(raw, mapping, 'name');
  if (!name) errors.push('Product Name is required.');
  else if (name.length < 2) errors.push('Product Name is too short.');

  const sku = getMapped(raw, mapping, 'sku');
  if (!sku) errors.push('SKU is required.');

  const priceRaw = getMapped(raw, mapping, 'price');
  let price: number | undefined;
  if (!priceRaw) {
    errors.push('Price is required.');
  } else {
    price = toOptionalNumber(priceRaw, 'Price', errors);
  }

  const discountPrice = toOptionalNumber(getMapped(raw, mapping, 'discountPrice'), 'Discount Price', errors);
  const cost = toOptionalNumber(getMapped(raw, mapping, 'cost'), 'Cost', errors);
  const stockQuantity = toOptionalNumber(getMapped(raw, mapping, 'stockQuantity'), 'Stock Quantity', errors);
  const weight = toOptionalNumber(getMapped(raw, mapping, 'weight'), 'Weight', errors);

  const weightUnitRaw = getMapped(raw, mapping, 'weightUnit').toUpperCase();
  let weightUnit: 'KG' | 'G' | 'LB' | undefined;
  if (weightUnitRaw) {
    if (weightUnitRaw === 'KG' || weightUnitRaw === 'G' || weightUnitRaw === 'LB') {
      weightUnit = weightUnitRaw;
    } else {
      errors.push('Weight Unit must be KG, G, or LB ("' + getMapped(raw, mapping, 'weightUnit') + '" given).');
    }
  }

  const visibilityRaw = getMapped(raw, mapping, 'visibility').toUpperCase();
  let visibility: 'PUBLIC' | 'DRAFT' | undefined;
  if (visibilityRaw) {
    if (visibilityRaw === 'PUBLIC' || visibilityRaw === 'DRAFT') {
      visibility = visibilityRaw;
    } else {
      errors.push('Visibility must be PUBLIC or DRAFT ("' + getMapped(raw, mapping, 'visibility') + '" given).');
    }
  }

  if (errors.length > 0 || price === undefined) {
    return { rowNumber, raw, errors };
  }

  const payload: CreateProductPayload = {
    name,
    description: getMapped(raw, mapping, 'description') || undefined,
    category: getMapped(raw, mapping, 'category') || undefined,
    brand: getMapped(raw, mapping, 'brand') || undefined,
    summary: getMapped(raw, mapping, 'summary') || undefined,
    price,
    discountPrice,
    cost,
    sku,
    isPreOrder: toYesNo(getMapped(raw, mapping, 'isPreOrder')),
    stockQuantity,
    weight,
    weightUnit,
    visibility,
  };

  return { rowNumber, raw, payload, errors };
}

export function mapCsvRows(rawRows: Record<string, string>[], mapping: ColumnMapping): ParsedCsvRow[] {
  return rawRows.map((raw, i) => mapCsvRow(raw, mapping, i + 1));
}
