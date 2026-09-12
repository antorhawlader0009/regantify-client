import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Download, HelpCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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

const selectClass =
  'w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-black';

interface RowResult {
  rowNumber: number;
  name: string;
  status: 'success' | 'error';
  message?: string;
}

/**
 * Customers > "+ Add New" ▾ > Bulk Upload — one row per customer, same
 * upload -> map columns -> preview -> import shape as the Products CSV
 * import (see ImportCsvModal.tsx), laid out as its own page instead of
 * a modal, and split across "Manage Data" (column mapping) and "Review
 * Data" (validated preview) sections to match the reference. Any
 * CSV works — headers don't need to match our own, since columns are
 * mapped by the vendor before anything is uploaded.
 */
export default function BulkUploadCustomers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RowResult[]>([]);
  const [done, setDone] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);

  const hasFile = rawRows.length > 0;

  const parsedRows = useMemo<ParsedCustomerRow[]>(
    () => (hasFile ? mapCsvRows(rawRows, mapping) : []),
    [hasFile, rawRows, mapping],
  );
  const validRows = useMemo(() => parsedRows.filter((r) => r.errors.length === 0), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter((r) => r.errors.length > 0), [parsedRows]);

  const requiredFieldsMapped = useMemo(
    () => IMPORT_FIELDS.filter((f) => f.required).every((f) => !!mapping[f.key]),
    [mapping],
  );

  const handleDownloadTemplate = () => {
    const { headers, rows } = buildTemplateRows();
    downloadCsv('customer-import-template.csv', toCsv(headers, rows));
  };

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    setParseError(null);
    setFileName(file.name);
    setDone(false);
    setResults([]);

    file
      .text()
      .then((text) => {
        const objects = parseCsvToObjects(text);
        if (objects.length === 0) {
          setParseError('This file has no data rows. Please check the file and try again.');
          setRawRows([]);
          return;
        }
        const headers = Object.keys(objects[0]);
        setCsvHeaders(headers);
        setRawRows(objects);
        setMapping(autoMatchColumns(headers));
      })
      .catch(() => setParseError('Could not read this file. Please make sure it is a valid CSV file.'));
  };

  const handleBeginUpload = async () => {
    if (!requiredFieldsMapped || validRows.length === 0) return;

    setImporting(true);
    setCancelRequested(false);
    setProgress(0);
    setDone(false);
    const nextResults: RowResult[] = [];

    for (let i = 0; i < validRows.length; i += 1) {
      if (cancelRequested) break;
      const row = validRows[i];
      try {
        await customersApi.create(row.payload!);
        nextResults.push({ rowNumber: row.rowNumber, name: row.payload!.name, status: 'success' });
      } catch (err: any) {
        const message = err?.response?.data?.message ?? 'Could not add this customer.';
        nextResults.push({ rowNumber: row.rowNumber, name: row.payload!.name, status: 'error', message });
      }
      setResults([...nextResults]);
      setProgress(i + 1);
    }

    setImporting(false);
    setDone(true);
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const failCount = results.filter((r) => r.status === 'error').length;

  return (
    <div className="max-w-5xl">
      <button
        onClick={() => navigate('/vendor/customers')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Customers
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Bulk Upload</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="text-base font-semibold text-regantify-text mb-3">Download Sample CSV file</h2>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-black/10 text-sm text-regantify-cta hover:bg-regantify-content"
            >
              <Download size={14} />
              Download
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="text-base font-semibold text-regantify-text mb-4">File Upload</h2>
            <label className="flex items-center gap-1.5 text-sm font-medium text-regantify-text mb-1.5">
              Upload File
              <span title="Any CSV works — you'll match your own column headers to our fields below.">
                <HelpCircle size={14} className="text-regantify-text-muted cursor-help" />
              </span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center rounded-xl border border-black/10 overflow-hidden text-left hover:border-black/20"
            >
              <span className="px-4 py-2.5 bg-regantify-content text-sm text-regantify-text border-r border-black/10">
                Choose File
              </span>
              <span className="px-3.5 text-sm text-regantify-text-muted truncate">{fileName || 'No file chosen'}</span>
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
            {parseError && <p className="text-red-500 text-sm mt-2">{parseError}</p>}
          </div>

          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="text-base font-semibold text-regantify-text-muted mb-4">Manage Data</h2>
            {!hasFile ? (
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-6 text-center text-sm text-amber-700">
                Upload a file to preview data.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-regantify-text-muted">
                  Match each field to a column from{' '}
                  <span className="font-medium text-regantify-text">{fileName}</span>. We've guessed a few based on
                  your headers — check them and adjust anything that's wrong.
                </p>
                <div className="rounded-xl border border-black/10 divide-y divide-black/5">
                  {IMPORT_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-4 px-4 py-3">
                      <div className="w-32 shrink-0">
                        <p className="text-sm font-medium text-regantify-text">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </p>
                      </div>
                      <select
                        value={mapping[field.key] ?? ''}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className={selectClass}
                      >
                        <option value="">— Don't include —</option>
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
                    Name and Phone must both be mapped to continue.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <h2 className="text-base font-semibold text-regantify-text-muted mb-4">Review Data</h2>
            {!hasFile ? (
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-6 text-center text-sm text-amber-700">
                Upload a file to preview data.
              </div>
            ) : !done ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-regantify-text">
                    <CheckCircle2 size={15} className="text-green-600" />
                    {validRows.length} ready to upload
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="flex items-center gap-1.5 text-regantify-text">
                      <XCircle size={15} className="text-red-500" />
                      {invalidRows.length} with errors (will be skipped)
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-black/10 max-h-[320px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="bg-regantify-content text-left text-regantify-text-muted">
                        <th className="px-3 py-2.5 font-medium">Row</th>
                        <th className="px-3 py-2.5 font-medium">Name</th>
                        <th className="px-3 py-2.5 font-medium">Phone</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row) => (
                        <tr key={row.rowNumber} className="border-t border-black/5 align-top">
                          <td className="px-3 py-2 text-regantify-text-muted">{row.rowNumber}</td>
                          <td className="px-3 py-2 text-regantify-text">{row.payload?.name || row.raw[mapping.name] || '—'}</td>
                          <td className="px-3 py-2 text-regantify-text">{row.payload?.phone || row.raw[mapping.phone] || '—'}</td>
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

                {importing && (
                  <div>
                    <div className="flex items-center justify-between text-sm text-regantify-text mb-1.5">
                      <span>Uploading customers…</span>
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
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 size={15} /> {successCount} added
                  </span>
                  {failCount > 0 && (
                    <span className="flex items-center gap-1.5 text-red-500">
                      <XCircle size={15} /> {failCount} failed
                    </span>
                  )}
                </div>
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

          <div className="flex items-center gap-3">
            {!done ? (
              <button
                type="button"
                onClick={handleBeginUpload}
                disabled={!hasFile || !requiredFieldsMapped || validRows.length === 0 || importing}
                className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium
                  transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing ? 'Uploading…' : 'Begin Bulk Upload'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  toast.success(`${successCount} customer${successCount === 1 ? '' : 's'} added.`);
                  navigate('/vendor/customers');
                }}
                className="px-6 py-2.5 rounded-xl bg-regantify-black text-white text-sm font-medium hover:bg-black transition-colors"
              >
                Done
              </button>
            )}
            {importing && (
              <button
                type="button"
                onClick={() => setCancelRequested(true)}
                disabled={cancelRequested}
                className="px-5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-40"
              >
                {cancelRequested ? 'Stopping…' : 'Stop Upload'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-black/5 p-5">
          <h2 className="text-base font-semibold text-regantify-text mb-3">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-regantify-text-muted">
            <li>Upload CSV file</li>
            <li>Select which values to include</li>
            <li>Click 'Begin Bulk Upload' to start uploading.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
