import { parseCsv, toCsv, downloadCsv } from './csv';
import type { LmsFieldDef, LmsImportRow } from './lmsApi';

/*
 * LMS > Leads > Import (LMS-plan.md Step 10): reading a CSV or Excel file,
 * matching its columns to ours (with the old LMS's header names), and
 * checking each row the same way the server will, so the preview shows
 * every problem before anything is sent.
 */

export type ImportColumnKey =
  | 'date'
  | 'name'
  | 'phone'
  | 'phoneAlt'
  | 'email'
  | 'product'
  | 'price'
  | 'quantity'
  | 'address'
  | 'district'
  | 'area'
  | 'note'
  | 'ref';

export interface ImportColumn {
  /** One of ours, or `field:<key>` for an extra field. */
  key: ImportColumnKey | `field:${string}`;
  label: string;
  hint?: string;
  required?: boolean;
  /** Header names that match this column, written the way normalizeHeader() leaves them. */
  aliases: string[];
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  { key: 'phone', label: 'Phone', required: true, aliases: ['phone', 'number', 'mobile', 'phone_number', 'mobile_number', 'contact', 'contact_number', 'customer_phone', 'cell'] },
  { key: 'name', label: 'Name', hint: 'Blank names are saved as "No name given".', aliases: ['name', 'customer_name', 'customer', 'full_name', 'client_name'] },
  { key: 'date', label: 'Date', hint: 'When they reached out. Blank means today.', aliases: ['date', 'placed_at', 'order_date', 'created_at', 'created', 'lead_date'] },
  { key: 'product', label: 'Product', aliases: ['product', 'product_name', 'products', 'item', 'items', 'item_name'] },
  { key: 'price', label: 'Price', hint: 'Saved as what the lead is worth.', aliases: ['price', 'price_1', 'price1', 'unit_price', 'amount', 'value', 'total'] },
  { key: 'quantity', label: 'Quantity', aliases: ['quantity', 'qty', 'qty_1', 'quantity_1'] },
  { key: 'address', label: 'Address', aliases: ['address', 'full_address', 'shipping_address', 'customer_address'] },
  { key: 'district', label: 'District', aliases: ['district', 'zilla', 'zila', 'city'] },
  { key: 'area', label: 'Area', aliases: ['area', 'thana', 'upazila', 'upazilla', 'zone'] },
  { key: 'note', label: 'Note', hint: "Saved as the lead's first note.", aliases: ['note', 'notes', 'comment', 'comments', 'remark', 'remarks', 'message'] },
  { key: 'phoneAlt', label: 'Second phone', aliases: ['second_phone', 'alt_phone', 'alternative_phone', 'phone_2', 'phone2', 'other_phone'] },
  { key: 'email', label: 'Email', aliases: ['email', 'e_mail', 'email_address'] },
  {
    key: 'ref',
    label: 'Reference ID',
    hint: 'Your own ID for the row. A row whose ID was imported before is skipped.',
    aliases: ['reference', 'reference_id', 'ref', 'ref_id', 'external_id', 'external_ref', 'order_id', 'lead_id'],
  },
];

/** Our columns plus the store's extra fields. */
export function importColumns(fields: LmsFieldDef[]): ImportColumn[] {
  return [
    ...IMPORT_COLUMNS,
    ...fields.map((f) => ({ key: `field:${f.key}` as const, label: f.label, aliases: [normalizeHeader(f.key), normalizeHeader(f.label)] })),
  ];
}

/** "Customer Name" / "customer-name" / "customer_name" all become "customer_name". */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s\-.]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/** Column key → the header index it reads from (-1 = not in the file). */
export type ImportMapping = Record<string, number>;

export function autoMatch(headers: string[], columns: ImportColumn[]): ImportMapping {
  const normalized = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: ImportMapping = {};
  for (const col of columns) {
    const index = normalized.findIndex((h, i) => !used.has(i) && h !== '' && col.aliases.includes(h));
    mapping[col.key] = index;
    if (index >= 0) used.add(index);
  }
  return mapping;
}

// ---------------------------------------------------------------- reading

export interface ImportSheet {
  headers: string[];
  /** Data rows as text, with each row's line in the file. */
  rows: { line: number; cells: string[] }[];
}

/**
 * Reads a .csv, .xlsx or .xls file. Excel is read by SheetJS, loaded only
 * here (it's large). The first sheet with any data is used and its first
 * non-blank row is the header, like the old LMS.
 */
export async function readImportFile(file: File): Promise<ImportSheet> {
  const name = file.name.toLowerCase();
  let grid: string[][];
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    grid = [];
    for (const sheetName of book.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName], { header: 1, raw: true, defval: '', blankrows: true });
      grid = rows.map((r) => r.map(cellText));
      if (grid.some((r) => r.some((c) => c.trim() !== ''))) break;
    }
  } else {
    grid = parseCsv(await file.text());
  }

  const blank = (r: string[]) => r.every((c) => c.trim() === '');
  const headerIndex = grid.findIndex((r) => !blank(r));
  if (headerIndex < 0) return { headers: [], rows: [] };
  // Blank rows at the end (formatted but never filled in) aren't rows anyone wrote.
  while (grid.length > headerIndex + 1 && blank(grid[grid.length - 1])) grid.pop();
  return {
    headers: grid[headerIndex].map((h) => h.trim()),
    rows: grid.slice(headerIndex + 1).map((cells, i) => ({ line: headerIndex + i + 2, cells })),
  };
}

/** Excel cells as text. Dates stay as Excel's day numbers here; parseDate() reads them. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
  return String(value);
}

// ---------------------------------------------------------------- checking

export interface ParsedImportRow {
  line: number;
  cells: string[];
  /** What goes to the server when the row has no errors. */
  row: LmsImportRow | null;
  errors: string[];
  /** The earlier line with the same phone: this one is skipped (the old LMS did the same). */
  repeatOf: number | null;
  empty: boolean;
}

const MAX_LENGTH: Partial<Record<ImportColumnKey, number>> = {
  name: 120,
  product: 500,
  address: 1000,
  district: 60,
  area: 120,
  note: 2000,
  ref: 100,
  email: 120,
};

export function checkRows(sheet: ImportSheet, mapping: ImportMapping, fields: LmsFieldDef[], today: string): ParsedImportRow[] {
  const firstLine = new Map<string, number>();
  return sheet.rows.map(({ line, cells }) => {
    const get = (key: string) => {
      const i = mapping[key];
      return i === undefined || i < 0 ? '' : (cells[i] ?? '').trim();
    };
    const mapped = Object.values(mapping).filter((i) => i >= 0);
    const empty = mapped.every((i) => (cells[i] ?? '').trim() === '');
    const result: ParsedImportRow = { line, cells, row: null, errors: [], repeatOf: null, empty };
    if (empty) return result;

    const errors = result.errors;
    const text = (key: ImportColumnKey) => {
      const value = get(key);
      const max = MAX_LENGTH[key];
      return max ? value.slice(0, max) : value;
    };

    const phone = localBdPhone(get('phone'));
    if (!get('phone')) errors.push('No phone number.');
    else if (!phone) errors.push("The phone isn't a Bangladeshi mobile number.");

    const row: LmsImportRow = { line, phone: get('phone') };
    const name = text('name');
    if (name) row.name = name;

    const dateRaw = get('date');
    if (dateRaw) {
      const date = parseDate(dateRaw);
      if (!date) errors.push(`The date "${dateRaw}" isn't one we can read. Use 24-09-2026 or 2026-09-24.`);
      else if (date > today) errors.push('The date is in the future.');
      else row.date = date;
    }

    const priceRaw = get('price');
    if (priceRaw) {
      const price = Number(priceRaw.replace(/[,৳\s]|tk|bdt|taka/gi, ''));
      if (!Number.isFinite(price) || price < 0 || price > 1_000_000_000) errors.push(`The price "${priceRaw}" isn't a number.`);
      else row.price = Math.round(price * 100) / 100;
    }

    const qtyRaw = get('quantity');
    if (qtyRaw) {
      const qty = Number(qtyRaw.replace(/,/g, ''));
      if (!Number.isInteger(qty) || qty < 1 || qty > 100000) errors.push(`The quantity "${qtyRaw}" isn't a whole number.`);
      else row.quantity = qty;
    }

    const email = text('email');
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("The email address isn't valid.");
      else row.email = email;
    }

    const alt = get('phoneAlt');
    if (alt) {
      if (!localBdPhone(alt)) errors.push("The second phone isn't a Bangladeshi mobile number.");
      else row.phoneAlt = alt;
    }

    for (const key of ['product', 'address', 'district', 'area', 'note', 'ref'] as const) {
      const value = text(key);
      if (value) row[key] = value;
    }

    const extra: Record<string, string> = {};
    for (const f of fields) {
      const raw = get(`field:${f.key}`);
      if (!raw) continue;
      const checked = checkExtraValue(f, raw);
      if (checked.error) errors.push(checked.error);
      else extra[f.key] = checked.value!;
    }
    if (Object.keys(extra).length) row.fields = extra;

    if (!errors.length && phone) {
      const earlier = firstLine.get(phone);
      if (earlier !== undefined) result.repeatOf = earlier;
      else {
        firstLine.set(phone, line);
        result.row = row;
      }
    }
    return result;
  });
}

function checkExtraValue(f: LmsFieldDef, raw: string): { value?: string; error?: string } {
  switch (f.type) {
    case 'NUMBER':
      return Number.isFinite(Number(raw.replace(/,/g, ''))) ? { value: raw.replace(/,/g, '') } : { error: `${f.label}: "${raw}" isn't a number.` };
    case 'DATE': {
      const date = parseDate(raw);
      return date ? { value: date } : { error: `${f.label}: "${raw}" isn't a date we can read.` };
    }
    case 'PHONE':
      return localBdPhone(raw) ? { value: raw } : { error: `${f.label}: "${raw}" isn't a Bangladeshi mobile number.` };
    case 'SELECT': {
      const choice = f.options.find((o) => o.toLowerCase() === raw.toLowerCase());
      return choice ? { value: choice } : { error: `${f.label}: "${raw}" isn't one of the choices (${f.options.join(', ')}).` };
    }
    default:
      return { value: raw.slice(0, 500) };
  }
}

/** The same rule as the server's toLocalBdPhone: 01XXXXXXXXX, or null. Excel drops the leading 0, which is fine. */
export function localBdPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (/^8801[3-9]\d{8}$/.test(digits)) return digits.slice(2);
  if (/^01[3-9]\d{8}$/.test(digits)) return digits;
  if (/^1[3-9]\d{8}$/.test(digits)) return `0${digits}`;
  return null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * A date as "YYYY-MM-DD", or null. Reads 2026-09-24, 24-09-2026,
 * 24/09/2026, 24.09.26 (day first, the Bangladeshi way), 24 Sep 2026,
 * Sep 24, 2026, an Excel day number, and any of those with a time after.
 */
export function parseDate(raw: string): string | null {
  const s = raw.trim().replace(/[T\s]+\d{1,2}:\d{2}(:\d{2})?(\.\d+)?\s*(am|pm)?\s*(z|[+-]\d{2}:?\d{2})?$/i, '');
  let y: number, m: number, d: number;
  let match: RegExpMatchArray | null;
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    // Excel's day number: days since 30 Dec 1899.
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86_400_000);
    return date.toISOString().slice(0, 10);
  } else if ((match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{1,2})[-\s]([a-z]{3})[a-z]*[-\s,]+(\d{2}|\d{4})$/i))) {
    [d, m, y] = [Number(match[1]), MONTHS.indexOf(match[2].toLowerCase()) + 1, Number(match[3])];
  } else if ((match = s.match(/^([a-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})$/i))) {
    [m, d, y] = [MONTHS.indexOf(match[1].toLowerCase()) + 1, Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  if (y < 100) y += 2000;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (m < 1 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- template

const TEMPLATE_HEADERS = ['Date', 'Name', 'Phone', 'Product', 'Price', 'Quantity', 'Address', 'District', 'Note'];
const TEMPLATE_EXAMPLE = ['24-09-2026', 'Rahim Uddin', '01712345678', 'Cotton Panjabi', '1450', '1', 'House 12, Road 5, Mirpur', 'Dhaka', 'Wants size L'];

export function downloadCsvTemplate(fields: LmsFieldDef[]) {
  const headers = [...TEMPLATE_HEADERS, ...fields.map((f) => f.label)];
  downloadCsv('lms-import-template.csv', toCsv(headers, [[...TEMPLATE_EXAMPLE, ...fields.map(() => '')]]));
}

export async function downloadXlsxTemplate(fields: LmsFieldDef[]) {
  const XLSX = await import('xlsx');
  const headers = [...TEMPLATE_HEADERS, ...fields.map((f) => f.label)];
  // The example is text, so its phone keeps the leading 0. (A typed phone that loses it still imports.)
  const sheet = XLSX.utils.aoa_to_sheet([headers, [...TEMPLATE_EXAMPLE, ...fields.map(() => '')]]);
  sheet['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Leads');
  XLSX.writeFile(book, 'lms-import-template.xlsx');
}
