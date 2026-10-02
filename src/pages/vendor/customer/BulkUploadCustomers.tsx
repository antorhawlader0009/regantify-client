import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronLeft, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import { parseCsvToObjects, toCsv, downloadCsv } from '../../../lib/csv';
import {
  IMPORT_FIELDS,
  autoMatchColumns,
  buildTemplateRows,
  mapCsvRows,
  type ColumnMapping,
  type ParsedCustomerRow,
} from '../../../lib/customerCsvImport';
import { customersApi } from '../../../lib/customersApi';
import { toast } from '../../../lib/toast';
import { useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { PillTabs, TableFrame, outlineBtn, primaryBtn, td, th, theadRow, trClass } from '../../../components/ui/PageKit';

interface RowResult {
  rowNumber: number;
  name: string;
  phone: string;
  status: 'success' | 'error';
  message?: string;
}

/** One numbered step: number (or a tick once done), title, one help line. Later steps stay dim until they can be used. */
function Step({
  n,
  title,
  description,
  done,
  disabled,
  children,
}: {
  n: number;
  title: string;
  description: ReactNode;
  done?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-line bg-white p-4 sm:p-5 ${disabled ? 'opacity-60' : ''}`} aria-disabled={disabled}>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            done ? 'bg-brand text-white' : disabled ? 'bg-neutral-100 text-neutral-500' : 'bg-brand-lime text-brand'
          }`}
          aria-hidden
        >
          {done ? <Check size={15} /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-regantify-text">
            <span className="sr-only">Step {n}: </span>
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
          {!disabled && children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </section>
  );
}

/** A mapping dropdown in the theme's input style (keeps the phone's own picker). */
function ColumnSelect({ value, onChange, headers, label }: { value: string; onChange: (v: string) => void; headers: string[]; label: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Column for ${label}`}
        className="h-10 w-full appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-sm text-regantify-text outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
      >
        <option value="">Don’t import</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-neutral-500" aria-hidden />
    </div>
  );
}

/**
 * Customers > "+ Add New" ▾ > Bulk Upload, as three steps
 * (theme-update-plan.md Step 4): 1. download the template, 2. upload a
 * file and match its columns, 3. check the rows with problems, then
 * import. Any CSV works — headers don't need to match our own, since
 * columns are matched in step 2. Every row with a problem says what to
 * fix, and those rows can be downloaded to fix in the spreadsheet. The
 * import itself is one Add Customer call per row (CustomersService.create),
 * so a phone that's already a customer gets its details updated.
 */
export default function BulkUploadCustomers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);

  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reviewTab, setReviewTab] = useState<'problems' | 'ready'>('problems');

  const [importing, setImporting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RowResult[]>([]);
  const [done, setDone] = useState(false);

  const hasFile = rawRows.length > 0;
  useUnsavedChangesWarning(importing || (hasFile && !done));

  const parsedRows = useMemo<ParsedCustomerRow[]>(() => (hasFile ? mapCsvRows(rawRows, mapping) : []), [hasFile, rawRows, mapping]);
  const validRows = useMemo(() => parsedRows.filter((r) => r.errors.length === 0), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter((r) => r.errors.length > 0), [parsedRows]);
  const missingFields = IMPORT_FIELDS.filter((f) => f.required && !mapping[f.key]);
  const mappingDone = hasFile && missingFields.length === 0;

  const handleDownloadTemplate = () => {
    const { headers, rows } = buildTemplateRows();
    downloadCsv('customer-import-template.csv', toCsv(headers, rows));
  };

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    setParseError(null);
    setDone(false);
    setResults([]);
    setProgress(0);

    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setParseError(`"${file.name}" isn’t a CSV file. In Excel or Google Sheets, use File > Save as (or Download) > CSV, then upload that.`);
      return;
    }

    file
      .text()
      .then((text) => {
        const objects = parseCsvToObjects(text);
        if (objects.length === 0) {
          setParseError('This file has no customer rows under the header row. Add at least one customer and upload it again.');
          setRawRows([]);
          return;
        }
        const headers = Object.keys(objects[0]);
        setFileName(file.name);
        setCsvHeaders(headers);
        setRawRows(objects);
        setMapping(autoMatchColumns(headers));
        setReviewTab('problems');
      })
      .catch(() => setParseError('Couldn’t read this file. Save it again as CSV and upload the new copy.'));
  };

  const handleImport = async () => {
    if (!mappingDone || validRows.length === 0) return;

    setImporting(true);
    setStopping(false);
    stopRef.current = false;
    setProgress(0);
    setDone(false);
    const nextResults: RowResult[] = [];

    for (let i = 0; i < validRows.length; i += 1) {
      if (stopRef.current) break;
      const row = validRows[i];
      const { name, phone } = row.payload!;
      try {
        await customersApi.create(row.payload!);
        nextResults.push({ rowNumber: row.rowNumber, name, phone, status: 'success' });
      } catch (err: any) {
        const message = err?.response?.data?.message;
        nextResults.push({
          rowNumber: row.rowNumber,
          name,
          phone,
          status: 'error',
          message: (Array.isArray(message) ? message[0] : message) ?? 'Couldn’t add this customer. Try importing this row again.',
        });
      }
      setResults([...nextResults]);
      setProgress(i + 1);
    }

    setImporting(false);
    setDone(true);
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    const added = nextResults.filter((r) => r.status === 'success').length;
    toast.success(`${added} customer${added === 1 ? '' : 's'} imported`);
  };

  /** The rows that weren't imported, with their original columns plus a "Problem" column, to fix and upload again. */
  const downloadRowsToFix = () => {
    const failedRowNumbers = new Map(results.filter((r) => r.status === 'error').map((r) => [r.rowNumber, r.message ?? '']));
    const rows = parsedRows
      .filter((r) => r.errors.length > 0 || failedRowNumbers.has(r.rowNumber))
      .map((r) => [...csvHeaders.map((h) => r.raw[h] ?? ''), r.errors.length > 0 ? r.errors.join(' ') : failedRowNumbers.get(r.rowNumber) ?? '']);
    downloadCsv(`${fileName.replace(/\.csv$/i, '') || 'customers'}-to-fix.csv`, toCsv([...csvHeaders, 'Problem'], rows));
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'error');
  const stoppedEarly = done && results.length < validRows.length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <Link to="/vendor/customers" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
          <ChevronLeft size={16} aria-hidden />
          Customers
        </Link>
        <h1 className="text-[15px] font-semibold text-regantify-text">Import customers</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Add many customers at once from a spreadsheet saved as CSV.</p>
      </div>

      <div className="space-y-4">
        {/* 1. Template */}
        <Step
          n={1}
          title="Download the template"
          description="Fill it in with Excel or Google Sheets, one customer per row, and save it as CSV. Your own file works too: you’ll match its columns in the next step."
          done={hasFile}
        >
          <button type="button" onClick={handleDownloadTemplate} className={`${outlineBtn} h-10`}>
            <Download size={15} aria-hidden />
            Download template
          </button>
        </Step>

        {/* 2. Upload + match columns */}
        <Step
          n={2}
          title="Upload your file"
          description="Name and phone are needed for every customer. Everything else is optional."
          done={mappingDone}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              handleFileSelect(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="hidden"
          />

          {!hasFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFileSelect(e.dataTransfer.files?.[0]);
              }}
              className={`flex w-full flex-col items-center rounded-lg border border-dashed px-4 py-8 text-center transition-colors ${
                dragging ? 'border-brand bg-brand-lime/20' : 'border-neutral-300 hover:border-brand hover:bg-neutral-50'
              }`}
            >
              <Upload size={20} className="text-neutral-500" aria-hidden />
              <span className="mt-2 text-sm font-medium text-regantify-text">Choose a CSV file</span>
              <span className="mt-0.5 text-xs text-neutral-500">or drop it here</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2.5">
              <FileSpreadsheet size={18} className="shrink-0 text-brand" aria-hidden />
              <div className="mr-auto min-w-0">
                <p className="truncate text-sm font-medium text-regantify-text">{fileName}</p>
                <p className="text-xs text-neutral-500">
                  {rawRows.length.toLocaleString()} {rawRows.length === 1 ? 'row' : 'rows'}
                </p>
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing} className={outlineBtn}>
                Choose another file
              </button>
            </div>
          )}
          {parseError && <p className="mt-2 text-sm text-red-600">{parseError}</p>}

          {hasFile && (
            <div className="mt-4">
              <p className="text-sm font-medium text-regantify-text">Match the columns</p>
              <p className="mt-0.5 text-xs text-neutral-500">We guessed from your headers. Change any that are wrong.</p>
              <div className="mt-3 divide-y divide-line rounded-lg border border-line">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field.key} className="grid gap-1.5 px-3 py-2.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <p className="text-sm text-regantify-text">
                      {field.label}
                      {field.required && (
                        <span className="ml-0.5 text-red-500" aria-hidden>
                          *
                        </span>
                      )}
                    </p>
                    <ColumnSelect
                      value={mapping[field.key] ?? ''}
                      onChange={(v) => setMapping((prev) => ({ ...prev, [field.key]: v }))}
                      headers={csvHeaders}
                      label={field.label}
                    />
                  </div>
                ))}
              </div>
              {missingFields.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                  <AlertTriangle size={14} className="shrink-0" aria-hidden />
                  Pick the column for {missingFields.map((f) => f.label.toLowerCase()).join(' and ')} to continue.
                </p>
              )}
            </div>
          )}
        </Step>

        {/* 3. Check + import */}
        <Step
          n={3}
          title="Check and import"
          description={
            done
              ? 'Import finished.'
              : 'Rows with a problem are skipped. Fix them in your file and upload it again, or import the rest now. A phone that’s already a customer gets its details updated.'
          }
          done={done && failed.length === 0 && !stoppedEarly}
          disabled={!mappingDone}
        >
          {!done ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-line px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <CheckCircle2 size={13} className="text-emerald-600" aria-hidden />
                    Ready to import
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-regantify-text">{validRows.length.toLocaleString()}</p>
                </div>
                <div className={`rounded-lg border px-3 py-2.5 ${invalidRows.length > 0 ? 'border-red-200 bg-red-50/60' : 'border-line'}`}>
                  <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <XCircle size={13} className={invalidRows.length > 0 ? 'text-red-600' : 'text-neutral-400'} aria-hidden />
                    Need fixing
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-regantify-text">{invalidRows.length.toLocaleString()}</p>
                </div>
              </div>

              <PillTabs
                className="mt-4 mb-3"
                value={invalidRows.length === 0 ? 'ready' : reviewTab}
                onChange={setReviewTab}
                tabs={[
                  { id: 'problems', label: 'Need fixing', count: invalidRows.length },
                  { id: 'ready', label: 'Ready', count: validRows.length },
                ]}
                trailing={
                  invalidRows.length > 0 && (
                    <button type="button" onClick={downloadRowsToFix} className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-neutral-600 hover:bg-neutral-100">
                      <Download size={14} aria-hidden />
                      <span className="hidden sm:inline">Download rows to fix</span>
                    </button>
                  )
                }
              />

              {invalidRows.length > 0 && reviewTab === 'problems' ? (
                <ul className="max-h-[360px] divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {invalidRows.map((row) => (
                    <li key={row.rowNumber} className="px-3 py-2.5">
                      <p className="text-sm text-regantify-text">
                        <span className="font-medium">Row {row.rowNumber}</span>
                        <span className="text-neutral-500"> · {row.raw[mapping.name] || 'no name'} · {row.raw[mapping.phone] || 'no phone'}</span>
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {row.errors.map((error) => (
                          <li key={error} className="flex items-start gap-1.5 text-xs text-red-700">
                            <XCircle size={13} className="mt-px shrink-0" aria-hidden />
                            {error}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : validRows.length === 0 ? (
                <p className="rounded-lg border border-line px-3 py-6 text-center text-sm text-neutral-500">
                  No rows are ready yet. Fix the rows above in your file, then upload it again.
                </p>
              ) : (
                <div className="max-h-[360px] overflow-y-auto">
                  <TableFrame minWidth="min-w-[480px]">
                    <thead>
                      <tr className={theadRow}>
                        <th className={`${th} w-16`}>Row</th>
                        <th className={th}>Name</th>
                        <th className={th}>Phone</th>
                        <th className={th}>District</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.map((row) => (
                        <tr key={row.rowNumber} className={trClass()}>
                          <td className={`${td} text-neutral-500`}>{row.rowNumber}</td>
                          <td className={td}>{row.payload!.name}</td>
                          <td className={`${td} tabular-nums`}>{row.payload!.phone}</td>
                          <td className={`${td} text-neutral-600`}>{row.payload!.district ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </TableFrame>
                </div>
              )}

              {importing && (
                <div className="mt-4" role="status">
                  <div className="mb-1.5 flex items-center justify-between text-sm text-regantify-text">
                    <span>{stopping ? 'Stopping after this customer…' : 'Importing customers…'}</span>
                    <span className="tabular-nums">
                      {progress} / {validRows.length}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full bg-brand transition-all" style={{ width: `${validRows.length ? (progress / validRows.length) * 100 : 0}%` }} />
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                {importing ? (
                  <button
                    type="button"
                    onClick={() => {
                      stopRef.current = true;
                      setStopping(true);
                    }}
                    disabled={stopping}
                    className={`${outlineBtn} h-10`}
                  >
                    Stop import
                  </button>
                ) : (
                  <button type="button" onClick={handleImport} disabled={validRows.length === 0} className={`${primaryBtn} h-10 px-4 font-medium`}>
                    Import {validRows.length.toLocaleString()} {validRows.length === 1 ? 'customer' : 'customers'}
                  </button>
                )}
                {!importing && invalidRows.length > 0 && validRows.length > 0 && (
                  <span className="text-xs text-neutral-500">
                    {invalidRows.length} {invalidRows.length === 1 ? 'row' : 'rows'} with problems will be skipped.
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 size={15} aria-hidden /> {successCount.toLocaleString()} imported
                </span>
                {failed.length > 0 && (
                  <span className="flex items-center gap-1.5 text-red-700">
                    <XCircle size={15} aria-hidden /> {failed.length} couldn’t be added
                  </span>
                )}
                {invalidRows.length > 0 && <span className="text-neutral-500">{invalidRows.length} skipped (need fixing)</span>}
                {stoppedEarly && <span className="text-neutral-500">Stopped before the end</span>}
              </div>

              {failed.length > 0 && (
                <ul className="mt-3 max-h-[280px] divide-y divide-line overflow-y-auto rounded-lg border border-line">
                  {failed.map((r) => (
                    <li key={r.rowNumber} className="px-3 py-2.5">
                      <p className="text-sm text-regantify-text">
                        <span className="font-medium">Row {r.rowNumber}</span>
                        <span className="text-neutral-500">
                          {' '}
                          · {r.name} · {r.phone}
                        </span>
                      </p>
                      {r.message && <p className="mt-0.5 text-xs text-red-700">{r.message}</p>}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => navigate('/vendor/customers')} className={`${primaryBtn} h-10 px-4 font-medium`}>
                  Go to customers
                </button>
                {(failed.length > 0 || invalidRows.length > 0) && (
                  <button type="button" onClick={downloadRowsToFix} className={`${outlineBtn} h-10`}>
                    <Download size={15} aria-hidden />
                    Download rows to fix
                  </button>
                )}
              </div>
            </>
          )}
        </Step>
      </div>
    </div>
  );
}
