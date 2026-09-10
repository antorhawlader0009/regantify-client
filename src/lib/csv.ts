/**
 * Minimal RFC4180-style CSV parser/serializer — no external dependency.
 * Handles quoted fields, escaped quotes ("") inside quotes, commas and
 * newlines inside quoted fields, and both \n and \r\n line endings.
 * Good enough for a simple "Product Name, Price, SKU, ..." import file;
 * not a full CSV spec implementation (no BOM handling beyond stripping it).
 */

/** Parses raw CSV text into rows of string cells (no header handling here). */
export function parseCsv(text: string): string[][] {
  // Strip a leading UTF-8 BOM, which Excel adds when saving "CSV UTF-8".
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (char === '\r') {
      // Peek for \r\n; either way this ends the row.
      if (input[i + 1] === '\n') i += 1;
      pushRow();
      i += 1;
      continue;
    }
    if (char === '\n') {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Final field/row, if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) pushRow();

  // Drop fully blank trailing rows (common with a trailing newline in the file).
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

/** Parses CSV text with a header row into an array of objects keyed by header. */
export function parseCsvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = (cells[idx] ?? '').trim();
    });
    return obj;
  });
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serializes header + rows back into CSV text (used for the downloadable template). */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsvCell).join(','));
  return lines.join('\r\n');
}

export function downloadCsv(filename: string, csvText: string) {
  // Prefix a BOM so Excel opens UTF-8 content (e.g. ৳ or non-Latin names) correctly.
  const blob = new Blob(['\ufeff' + csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
