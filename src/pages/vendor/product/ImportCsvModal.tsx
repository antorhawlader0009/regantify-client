import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, UploadCloud, Download, ChevronLeft, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { parseCsvToObjects, toCsv, downloadCsv } from '../../../lib/csv';
import {
  IMPORT_FIELDS,
  autoMatchColumns,
  buildTemplateRows,
  mapCsvRows,
  type ColumnMapping,
  type ParsedCsvRow,
} from '../../../lib/productCsvImport';
import { productsApi } from '../../../lib/productsApi';
import { toast } from '../../../lib/toast';

interface ImportCsvModalProps {
  onClose: () => void;
}

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-regantify-search text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black text-sm';

const selectClass =
  'w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-black';

interface RowResult {
  rowNumber: number;
  name: string;
  status: 'success' | 'error';
  message?: string;
}

/**
 * "Import Products from CSV" — Add Product page.
 *
 * Any CSV works: we don't require exact header names. Step order is
 * Upload -> Map Columns (dropdown per field, auto-matched where
 * possible) -> Preview (row-by-row validation before anything is
 * created) -> Import (sequential creates with progress + a per-row
 * result summary, since a partial failure — e.g. a duplicate SKU —
 * shouldn't silently lose the rest of the batch).
 *
 * Variations (Size/Color/Custom + per-variant stock) are out of scope
 * for CSV import — those still get added on the Add/Edit Product page
 * after import, since a flat CSV row doesn't map cleanly onto that table.
 */
export function ImportCsvModal({ onClose }: ImportCsvModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);

  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RowResult[]>([]);
  const [cancelRequested, setCancelRequested] = useState(false);

  const validRows = useMemo(() => parsedRows.filter((r) => r.errors.length === 0), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter((r) => r.errors.length > 0), [parsedRows]);

  const requiredFieldsMapped = useMemo(
    () => IMPORT_FIELDS.filter((f) => f.required).every((f) => !!mapping[f.key]),
    [mapping],
  );

  const handleDownloadTemplate = () => {
    const { headers, rows } = buildTemplateRows();
    downloadCsv('product-import-template.csv', toCsv(headers, rows));
  };

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    setParseError(null);
    setFileName(file.name);

    file
      .text()
      .then((text) => {
        const objects = parseCsvToObjects(text);
        if (objects.length === 0) {
          setParseError('This file has no data rows. Please check the file and try again.');
          return;
        }
        const headers = Object.keys(objects[0]);
        setCsvHeaders(headers);
        setRawRows(objects);
        setMapping(autoMatchColumns(headers));
        setStep('map');
      })
      .catch(() => setParseError('Could not read this file. Please make sure it is a valid CSV file.'));
  };

  const handleContinueToPreview = () => {
    setParsedRows(mapCsvRows(rawRows, mapping));
    setStep('preview');
  };

  const handleImport = async () => {
    setStep('importing');
    setImporting(true);
    setCancelRequested(false);
    setProgress(0);
    const nextResults: RowResult[] = [];

    for (let i = 0; i < validRows.length; i += 1) {
      if (cancelRequested) break;
      const row = validRows[i];
      try {
        await productsApi.create(row.payload!);
        nextResults.push({ rowNumber: row.rowNumber, name: row.payload!.name, status: 'success' });
      } catch (err: any) {
        const message = err?.response?.data?.message ?? 'Could not create this product.';
        nextResults.push({ rowNumber: row.rowNumber, name: row.payload!.name, status: 'error', message });
      }
      setResults([...nextResults]);
      setProgress(i + 1);
    }

    setImporting(false);
    setStep('done');
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-categories-in-use'] });
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const failCount = results.filter((r) => r.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={step === 'importing' ? undefined : onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 shrink-0">
          <div className="flex items-center gap-2">
            {(step === 'map' || step === 'preview') && (
              <button
                onClick={() => setStep(step === 'map' ? 'upload' : 'map')}
                className="text-regantify-text-muted hover:text-regantify-text"
                title="Back"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-semibold text-regantify-text">Import Products from CSV</h2>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} className="text-regantify-text-muted hover:text-regantify-text">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex items-center gap-2 text-xs text-regantify-text-muted shrink-0">
          {(['Upload', 'Map Columns', 'Preview', 'Import'] as const).map((label, i) => {
            const stepIndex = ['upload', 'map', 'preview', 'importing'].indexOf(step);
            const isDone = step === 'done' ? true : i < stepIndex;
            const isCurrent = i === stepIndex || (step === 'done' && i === 3);
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    isCurrent
                      ? 'bg-regantify-black text-white'
                      : isDone
                        ? 'bg-regantify-black/70 text-white'
                        : 'bg-regantify-content text-regantify-text-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <span className={isCurrent ? 'text-regantify-text font-medium' : ''}>{label}</span>
                {i < 3 && <span className="w-4 h-px bg-black/10" />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {step === 'upload' && (
            <div className="space-y-5">
              <p className="text-sm text-regantify-text-muted">
                Upload a CSV of your products. Any spreadsheet works — you'll match your own column headers to our
                fields in the next step, so there's no fixed format to follow.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-14 rounded-2xl border-2 border-dashed border-black/15 bg-regantify-content
                  flex flex-col items-center justify-center gap-2 text-regantify-text hover:border-black/25 transition-colors"
              >
                <UploadCloud size={28} />
                <span className="font-medium">Upload CSV File</span>
                <span className="text-xs text-regantify-text-muted">.csv files only</span>
              </button>
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

              {parseError && <p className="text-red-500 text-sm">{parseError}</p>}

              <div className="flex items-center justify-between pt-2 border-t border-black/5">
                <p className="text-xs text-regantify-text-muted">Not sure where to start?</p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 text-sm text-regantify-cta hover:underline"
                >
                  <Download size={14} />
                  Download example CSV
                </button>
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-sm text-regantify-text-muted">
                Match each field to a column from <span className="font-medium text-regantify-text">{fileName}</span>
                . We've guessed a few based on your headers — check them and adjust anything that's wrong.
              </p>

              <div className="rounded-xl border border-black/10 divide-y divide-black/5">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-40 shrink-0">
                      <p className="text-sm font-medium text-regantify-text">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </p>
                      {field.hint && <p className="text-xs text-regantify-text-muted">{field.hint}</p>}
                    </div>
                    <select
                      value={mapping[field.key] ?? ''}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className={selectClass}
                    >
                      <option value="">— Don't import —</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!requiredFieldsMapped && (
                <p className="text-amber-600 text-sm flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Product Name, SKU, and Price must all be mapped to continue.
                </p>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-regantify-text">
                  <CheckCircle2 size={15} className="text-green-600" />
                  {validRows.length} ready to import
                </span>
                {invalidRows.length > 0 && (
                  <span className="flex items-center gap-1.5 text-regantify-text">
                    <XCircle size={15} className="text-red-500" />
                    {invalidRows.length} with errors (will be skipped)
                  </span>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-black/10 max-h-[360px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-regantify-content text-left text-regantify-text-muted">
                      <th className="px-3 py-2.5 font-medium">Row</th>
                      <th className="px-3 py-2.5 font-medium">Name</th>
                      <th className="px-3 py-2.5 font-medium">SKU</th>
                      <th className="px-3 py-2.5 font-medium">Price</th>
                      <th className="px-3 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row) => (
                      <tr key={row.rowNumber} className="border-t border-black/5 align-top">
                        <td className="px-3 py-2 text-regantify-text-muted">{row.rowNumber}</td>
                        <td className="px-3 py-2 text-regantify-text">{row.payload?.name || row.raw[mapping.name] || '—'}</td>
                        <td className="px-3 py-2 text-regantify-text">{row.payload?.sku || row.raw[mapping.sku] || '—'}</td>
                        <td className="px-3 py-2 text-regantify-text">
                          {row.payload?.price !== undefined ? `৳${row.payload.price}` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {row.errors.length === 0 ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle2 size={13} /> Ready
                            </span>
                          ) : (
                            <span className="text-red-500 flex items-start gap-1">
                              <XCircle size={13} className="mt-0.5 shrink-0" />
                              <span>{row.errors.join(' ')}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validRows.length === 0 && (
                <p className="text-red-500 text-sm">No valid rows to import — fix the errors above or go back and remap columns.</p>
              )}
            </div>
          )}

          {(step === 'importing' || step === 'done') && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm text-regantify-text mb-1.5">
                  <span>{step === 'importing' ? 'Importing products…' : 'Import finished'}</span>
                  <span>
                    {progress} / {validRows.length}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-regantify-content overflow-hidden">
                  <div
                    className="h-full bg-regantify-black transition-all"
                    style={{ width: `${validRows.length ? (progress / validRows.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {step === 'done' && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 size={15} /> {successCount} created
                  </span>
                  {failCount > 0 && (
                    <span className="flex items-center gap-1.5 text-red-500">
                      <XCircle size={15} /> {failCount} failed
                    </span>
                  )}
                </div>
              )}

              <div className="overflow-y-auto max-h-[280px] rounded-xl border border-black/10 divide-y divide-black/5">
                {results.map((r) => (
                  <div key={r.rowNumber} className="flex items-start gap-2 px-4 py-2.5 text-sm">
                    {r.status === 'success' ? (
                      <CheckCircle2 size={15} className="text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-regantify-text">
                        Row {r.rowNumber} — {r.name}
                      </p>
                      {r.message && <p className="text-red-500 text-xs mt-0.5">{r.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-black/5 px-6 py-4 flex justify-end gap-3 shrink-0">
          {step === 'upload' && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-regantify-content"
            >
              Cancel
            </button>
          )}

          {step === 'map' && (
            <button
              type="button"
              onClick={handleContinueToPreview}
              disabled={!requiredFieldsMapped}
              className="px-6 py-2.5 rounded-xl bg-regantify-black text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to Preview
            </button>
          )}

          {step === 'preview' && (
            <button
              type="button"
              onClick={handleImport}
              disabled={validRows.length === 0}
              className="px-6 py-2.5 rounded-xl bg-regantify-black text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Import {validRows.length} Product{validRows.length === 1 ? '' : 's'}
            </button>
          )}

          {step === 'importing' && (
            <button
              type="button"
              onClick={() => setCancelRequested(true)}
              disabled={cancelRequested}
              className="px-5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-40"
            >
              {cancelRequested ? 'Stopping…' : 'Stop Import'}
            </button>
          )}

          {step === 'done' && (
            <button
              type="button"
              onClick={() => {
                toast.success(`${successCount} product${successCount === 1 ? '' : 's'} imported.`);
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-regantify-black text-white text-sm font-medium hover:bg-black transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
