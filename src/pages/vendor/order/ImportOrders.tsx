import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, XCircle } from 'lucide-react';
import { PageHeader, PageSection, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { downloadCsv, toCsv } from '../../../lib/csv';
import { readImportFile, type ImportSheet } from '../../../lib/lmsImport';
import {
  ORDER_IMPORT_FIELDS,
  TEMPLATE_HEADERS,
  TEMPLATE_ROWS,
  autoMatchColumns,
  mapRows,
  orderImportApi,
  type ColumnMapping,
  type ImportCommitResult,
  type ImportPreview,
  type PreviewItem,
} from '../../../lib/orderImport';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
/** Whole orders sent to the server at a time, so a long file shows progress and one slow batch can't time out. */
const CHUNK = 20;

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <PageSection>
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-lime text-sm font-semibold text-brand" aria-hidden>
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-regantify-text">{title}</h2>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </PageSection>
  );
}

/**
 * Orders > Import orders (TellMe idea 22), for shops that keep orders in a sheet or are moving from another tool:
 * 1. download the template, 2. open your file and match its columns, 3. check it (every problem is named, nothing is
 * saved yet), 4. import. Rows with the same reference are the lines of one order, and the reference also stops the same
 * file making the orders twice. The orders arrive Pending like Add Order's; nothing is texted to the customers.
 */
export default function ImportOrders() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<ImportSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [readError, setReadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<'problems' | 'ready' | 'already'>('problems');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportCommitResult | null>(null);

  const rows = useMemo(() => (sheet ? mapRows(sheet, mapping) : []), [sheet, mapping]);
  const missing = ORDER_IMPORT_FIELDS.filter((f) => f.required && !mapping[f.key]);
  useUnsavedChangesWarning(importing || (preview !== null && result === null));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReadError(null);
    setPreview(null);
    setResult(null);
    try {
      const read = await readImportFile(file);
      if (read.rows.length === 0) {
        setReadError('This file has no order rows under the header row.');
        setSheet(null);
        return;
      }
      setFileName(file.name);
      setSheet(read);
      setMapping(autoMatchColumns(read.headers));
    } catch {
      setReadError('Could not read this file. Use a .csv, .xlsx or .xls file.');
      setSheet(null);
    }
  }

  async function check() {
    setChecking(true);
    setResult(null);
    try {
      const p = await orderImportApi.preview(rows);
      setPreview(p);
      setTab(p.errors > 0 ? 'problems' : p.ready > 0 ? 'ready' : 'already');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not check the file.'));
    } finally {
      setChecking(false);
    }
  }

  async function runImport() {
    if (!preview) return;
    const ready = preview.items.filter((i) => i.status === 'READY');
    const rowSet = new Map(rows.map((r) => [r.rowNumber, r]));
    setImporting(true);
    setProgress(0);
    const total: ImportCommitResult = { created: [], failed: [], skipped: [] };
    try {
      for (let i = 0; i < ready.length; i += CHUNK) {
        const slice = ready.slice(i, i + CHUNK);
        const res = await orderImportApi.commit(slice.flatMap((item) => item.rowNumbers.map((n) => rowSet.get(n)!).filter(Boolean)));
        total.created.push(...res.created);
        total.failed.push(...res.failed);
        total.skipped.push(...res.skipped);
        setProgress(Math.min(ready.length, i + CHUNK));
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'The import stopped part way. Orders already made stay; check the Orders list before trying again.'));
    } finally {
      setImporting(false);
      setResult(total);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  }

  const shown = (preview?.items ?? []).filter((i) => (tab === 'problems' ? i.status === 'ERROR' : tab === 'ready' ? i.status === 'READY' : i.status === 'ALREADY'));
  const noRefCount = preview ? preview.items.filter((i) => i.status === 'READY' && !i.reference).length : 0;

  return (
    <div className="space-y-4">
      <PageSection>
        <PageHeader
          title="Import orders"
          description="Bring orders in from an Excel or CSV file. Every row is checked first and nothing is saved until you press Import."
          actions={
            <Link to="/vendor/orders" className={outlineBtn}>
              Back to orders
            </Link>
          }
        />
      </PageSection>

      <Step n={1} title="Download the template">
        <p className="text-sm text-neutral-600">
          One row per product line. Rows with the same <b>Reference</b> become one order, so an order with two products is two rows. Use the
          product&apos;s <b>SKU</b> (for sizes or colours, the SKU of that exact variant).
        </p>
        <button type="button" onClick={() => downloadCsv('order-import-template.csv', toCsv(TEMPLATE_HEADERS, TEMPLATE_ROWS))} className={`${outlineBtn} mt-3`}>
          <Download size={14} />
          Download template (CSV)
        </button>
      </Step>

      <Step n={2} title="Open your file and match the columns">
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className={outlineBtn}>
          <FileSpreadsheet size={14} />
          {fileName ? 'Choose another file' : 'Choose a file (.csv, .xlsx)'}
        </button>
        {readError && <p className="mt-2 text-sm text-red-600">{readError}</p>}
        {sheet && (
          <>
            <p className="mt-3 text-sm text-neutral-600">
              <b>{fileName}</b>: {rows.length} {rows.length === 1 ? 'row' : 'rows'} found. Check which column holds what.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {ORDER_IMPORT_FIELDS.map((f) => (
                <label key={f.key} className="block text-sm font-medium text-regantify-text">
                  {f.label}
                  {f.required && <span className="text-red-600"> *</span>}
                  <select
                    value={mapping[f.key] ?? ''}
                    onChange={(e) => {
                      setMapping((m) => ({ ...m, [f.key]: e.target.value }));
                      setPreview(null);
                      setResult(null);
                    }}
                    className="mt-1 block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-regantify-text focus:border-brand focus:outline-none"
                  >
                    <option value="">Don’t import</option>
                    {sheet.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  {f.hint && <span className="mt-1 block text-xs font-normal text-neutral-500">{f.hint}</span>}
                </label>
              ))}
            </div>
            {missing.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-amber-800">
                <AlertTriangle size={14} />
                Still to match: {missing.map((f) => f.label).join(', ')}.
              </p>
            )}
          </>
        )}
      </Step>

      <Step n={3} title="Check the file">
        <button type="button" onClick={check} disabled={!sheet || missing.length > 0 || rows.length === 0 || checking} className={primaryBtn}>
          {checking && <Loader2 size={14} className="animate-spin" />}
          {checking ? 'Checking…' : 'Check the file'}
        </button>
        {rows.length > 1000 && <p className="mt-2 text-sm text-red-600">That is more than 1,000 rows. Split the file and import it in parts.</p>}

        {preview && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-regantify-text">
              <b>{preview.total}</b> {preview.total === 1 ? 'order' : 'orders'} in the file: <b className="text-green-700">{preview.ready} ready</b>
              {preview.errors > 0 && <>, <b className="text-red-600">{preview.errors} with a problem</b></>}
              {preview.already > 0 && <>, {preview.already} already imported</>}.
            </p>
            {noRefCount > 0 && (
              <p className="text-xs text-amber-800">
                {noRefCount} {noRefCount === 1 ? 'order has' : 'orders have'} no reference, so importing the same file again would make {noRefCount === 1 ? 'it' : 'them'} twice.
              </p>
            )}
            <div className="flex gap-1 rounded-lg border border-line p-1 text-sm">
              {([
                ['problems', `Problems (${preview.errors})`],
                ['ready', `Ready (${preview.ready})`],
                ['already', `Already imported (${preview.already})`],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-md px-3 py-1.5 ${tab === id ? 'bg-neutral-100 font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {shown.length === 0 ? (
              <p className="py-4 text-center text-sm text-neutral-500">Nothing here.</p>
            ) : (
              <ul className="max-h-96 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                {shown.map((item) => (
                  <OrderLine key={item.key} item={item} />
                ))}
              </ul>
            )}
          </div>
        )}
      </Step>

      <Step n={4} title="Import">
        {!preview || preview.ready === 0 ? (
          <p className="text-sm text-neutral-500">Check the file first. Orders without problems can then be imported.</p>
        ) : result ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle2 size={16} />
              {result.created.length} {result.created.length === 1 ? 'order' : 'orders'} imported.
            </p>
            {result.skipped.length > 0 && <p className="text-sm text-neutral-600">{result.skipped.length} skipped because they were already imported.</p>}
            {result.failed.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p className="mb-1 flex items-center gap-1.5 font-medium">
                  <XCircle size={14} />
                  {result.failed.length} could not be made:
                </p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {result.failed.slice(0, 20).map((f) => (
                    <li key={f.key}>
                      Row {f.rowNumbers.join(', ')}: {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link to="/vendor/orders" className={primaryBtn}>
              Go to Orders
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <button type="button" onClick={runImport} disabled={importing} className={primaryBtn}>
              {importing && <Loader2 size={14} className="animate-spin" />}
              {importing ? `Importing… ${progress} of ${preview.ready}` : `Import ${preview.ready} ${preview.ready === 1 ? 'order' : 'orders'}`}
            </button>
            <p className="text-xs text-neutral-500">
              The orders arrive as Pending, with stock taken like any order. No SMS or alert is sent to customers or to you. Problem rows are left out; fix them in
              the file and import again, the ones already imported are skipped.
            </p>
          </div>
        )}
      </Step>
    </div>
  );
}

function OrderLine({ item }: { item: PreviewItem }) {
  return (
    <li className="px-4 py-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-regantify-text">
          {item.customerName || 'No name'} <span className="font-normal text-neutral-500">{item.customerPhone || ''}</span>
        </p>
        <p className="text-xs text-neutral-500">
          Row {item.rowNumbers.join(', ')}
          {item.reference ? ` · ${item.reference}` : ''}
        </p>
      </div>
      {item.lines.length > 0 && (
        <p className="mt-0.5 text-xs text-neutral-600">
          {item.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ')} · {taka(item.subtotal)}
          {item.status !== 'ALREADY' && ` + ${item.deliveryCharge !== null ? taka(item.deliveryCharge) : item.zone === 'DHAKA' ? 'Inside Dhaka' : 'Outside Dhaka'} delivery`}
        </p>
      )}
      {item.alreadyAs && <p className="mt-1 text-xs text-neutral-600">Already imported as {item.alreadyAs}.</p>}
      {item.errors.map((e) => (
        <p key={e} className="mt-1 text-xs text-red-600">
          {e}
        </p>
      ))}
      {item.status !== 'ERROR' &&
        item.warnings
          .filter((w) => !w.startsWith('No reference'))
          .map((w) => (
            <p key={w} className="mt-1 text-xs text-amber-800">
              {w}
            </p>
          ))}
    </li>
  );
}
