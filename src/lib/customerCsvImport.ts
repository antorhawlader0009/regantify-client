import type { CreateCustomerPayload } from './customersApi';
import { normalizeBdPhone } from './bdPhone';

/**
 * One importable customer field — shown as a row in the "Select which
 * values to include" mapping step, matched against the vendor's own
 * CSV/Excel headers (auto-matched by `aliases`, but always changeable
 * via dropdown). Only `required` fields must be mapped before the
 * upload can begin — mirrors productCsvImport.ts's shape exactly, just
 * for customer fields instead of product fields.
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
  { key: 'name', label: 'Name', required: true, aliases: ['name', 'customer name', 'full name'] },
  { key: 'phone', label: 'Phone', required: true, aliases: ['phone', 'mobile', 'phone number', 'mobile phone number'] },
  { key: 'email', label: 'Email', aliases: ['email', 'email address', 'valid email address'] },
  { key: 'address', label: 'Address', aliases: ['address', 'shipping address'] },
  { key: 'city', label: 'City / thana', aliases: ['city', 'city/thana', 'thana'] },
  { key: 'district', label: 'District', aliases: ['district'] },
  { key: 'zip', label: 'Zip code', aliases: ['zip', 'zip code', 'postcode', 'postal code'] },
];

/** field key -> the vendor's own CSV/Excel header it's mapped to (or '' if unmapped). */
export type ColumnMapping = Record<string, string>;

/**
 * Guesses a mapping from the vendor's own headers to our fields by
 * matching against each field's aliases (case-insensitive, punctuation-
 * insensitive). Always a starting point the vendor can override, never
 * assumed to be exactly right.
 */
export function autoMatchColumns(headers: string[]): ColumnMapping {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const normalizedHeaders = headers.map((h) => ({ original: h, normalized: normalize(h) }));

  const mapping: ColumnMapping = {};
  for (const field of IMPORT_FIELDS) {
    const match = normalizedHeaders.find((h) => field.aliases.some((alias) => h.normalized === normalize(alias)));
    mapping[field.key] = match?.original ?? '';
  }
  return mapping;
}

const SAMPLE_HEADERS = ['Name', 'Phone', 'Email', 'Address', 'City/Thana', 'District', 'Zip Code'];

const SAMPLE_ROWS: string[][] = [
  ['Wafi Sharker', '01632387426', '', 'Chortha, Golden Tower', 'Cumilla Sadar', 'Cumilla', '3500'],
  ['Opu Obaida', '01927476598', 'opu@example.com', '78 Nawabpur Road', 'Sutrapur', 'Dhaka', '1100'],
];

/**
 * Template CSV — a helpful starting point with our suggested headers,
 * but NOT a required format. Any CSV/Excel file works, since columns
 * are mapped by the vendor in the next step regardless of header names.
 */
export function buildTemplateRows(): { headers: string[]; rows: string[][] } {
  return { headers: SAMPLE_HEADERS, rows: SAMPLE_ROWS };
}

export interface ParsedCustomerRow {
  /** The row number as the spreadsheet shows it (the header is row 1), for vendor-facing messages. */
  rowNumber: number;
  raw: Record<string, string>;
  payload?: CreateCustomerPayload;
  errors: string[];
}

/** Reads a mapped field's raw string value for one row, or '' if that field isn't mapped to any column. */
function getMapped(raw: Record<string, string>, mapping: ColumnMapping, key: string): string {
  const header = mapping[key];
  if (!header) return '';
  return (raw[header] ?? '').trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and maps one raw row into a CreateCustomerPayload, using
 * the vendor-confirmed column mapping (field key -> their own header).
 * Each error says what to change in the file. Phones are stored as
 * 01XXXXXXXXX (Bangla digits and +880 are accepted).
 */
export function mapCsvRow(raw: Record<string, string>, mapping: ColumnMapping, rowNumber: number): ParsedCustomerRow {
  const errors: string[] = [];

  const name = getMapped(raw, mapping, 'name');
  if (!name) errors.push('Name is empty. Add the customer’s name.');

  const rawPhone = getMapped(raw, mapping, 'phone');
  const phone = normalizeBdPhone(rawPhone);
  if (!rawPhone) errors.push('Phone is empty. Add an 11-digit number starting with 01.');
  else if (!phone) errors.push(`Phone "${rawPhone}" isn’t a full mobile number. Use 11 digits starting with 01.`);

  const email = getMapped(raw, mapping, 'email');
  if (email && !EMAIL_RE.test(email)) errors.push(`Email "${email}" doesn’t look right. Fix it or leave it empty.`);

  if (errors.length > 0) {
    return { rowNumber, raw, errors };
  }

  const payload: CreateCustomerPayload = {
    name,
    phone: phone!,
    email: email || undefined,
    address: getMapped(raw, mapping, 'address') || undefined,
    city: getMapped(raw, mapping, 'city') || undefined,
    district: getMapped(raw, mapping, 'district') || undefined,
    zip: getMapped(raw, mapping, 'zip') || undefined,
  };

  return { rowNumber, raw, payload, errors };
}

/** Every row, plus a check that the same phone isn't in the file twice (the later one would overwrite the first). */
export function mapCsvRows(rawRows: Record<string, string>[], mapping: ColumnMapping): ParsedCustomerRow[] {
  const firstRowByPhone = new Map<string, number>();
  return rawRows.map((raw, i) => {
    const row = mapCsvRow(raw, mapping, i + 2);
    const phone = row.payload?.phone;
    if (!phone) return row;
    const first = firstRowByPhone.get(phone);
    if (first == null) {
      firstRowByPhone.set(phone, row.rowNumber);
      return row;
    }
    return { rowNumber: row.rowNumber, raw, errors: [`Same phone as row ${first}. Keep only one of the two rows.`] };
  });
}
