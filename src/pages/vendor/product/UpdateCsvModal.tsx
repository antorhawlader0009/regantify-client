import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, UploadCloud, ChevronLeft, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { parseCsvToObjects } from '../../../lib/csv';
import { productsApi, type CsvUpdatePreview } from '../../../lib/productsApi';
import { useCan } from '../../../lib/useStaffAccess';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

type Step = 'upload' | 'map' | 'preview' | 'done';

const selectClass = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15';
const MAX_ROWS = 1000;

interface FieldDef {
  key: 'price' | 'discountPrice' | 'stock' | 'cost' | 'badge' | 'visibility';
  label: string;
  hint?: string;
  aliases: string[];
  need?: 'price' | 'cost';
}

const FIELDS: FieldDef[] = [
  { key: 'price', label: 'Price', aliases: ['price', 'list price', 'selling price'], need: 'price' },
  { key: 'discountPrice', label: 'Sale price', aliases: ['discount price', 'sale price', 'discounted price'], need: 'price' },
  { key: 'stock', label: 'Stock', hint: 'Sets the stock to this number (a stock-history line is written)', aliases: ['stock quantity', 'stock', 'quantity', 'qty'] },
  { key: 'cost', label: 'Cost (buying price)', aliases: ['cost', 'purchase cost', 'cost price'], need: 'cost' },
  { key: 'badge', label: 'Badge', hint: 'Up to 15 letters; a blank cell keeps the old badge', aliases: ['badge'] },
  { key: 'visibility', label: 'Status (PUBLIC / DRAFT)', aliases: ['visibility', 'status'] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const taka = (v: string | number | null) => (v === null ? '–' : `৳${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);

function show(field: string, v: string | number | null) {
  return field === 'price' || field === 'discountPrice' || field === 'cost' ? taka(v) : v === null ? '–' : String(v);
}

/**
 * All Products > Import > "Update existing products" (TellMe idea 124): upload a sheet, say which column is the SKU and which columns to apply (price, sale price,
 * stock, cost, badge, status), see every row's old and new value (and the rows with an unknown SKU or a bad number), then apply. A blank cell changes
 * nothing. Price changes can be undone from "Recent price changes"; the rest cannot. Up to 1,000 rows.
 */
export function UpdateCsvModal({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const queryClient = useQueryClient();
  const canPrice = useCan('products.price');
  const canCost = useCan('products.cost');
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [skuCol, setSkuCol] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<CsvUpdatePreview | null>(null);
  const [applied, setApplied] = useState<{ changed: number; batchId: string | null } | null>(null);

  const fields = useMemo(() => FIELDS.filter((f) => (f.need === 'price' ? canPrice : f.need === 'cost' ? canCost : true)), [canPrice, canCost]);
  const chosen = fields.filter((f) => mapping[f.key]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setFileName(file.name);
    file
      .text()
      .then((text) => {
        const rows = parseCsvToObjects(text);
        if (rows.length === 0) return setError('This file has no data rows.');
        if (rows.length > MAX_ROWS) return setError(`This file has ${rows.length} rows. Up to ${MAX_ROWS} at a time: please split it.`);
        const h = Object.keys(rows[0]);
        setHeaders(h);
        setRawRows(rows);
        setSkuCol(h.find((x) => ['sku', 'sku code', 'product sku'].includes(norm(x))) ?? '');
        const auto: Record<string, string> = {};
        for (const f of FIELDS) auto[f.key] = h.find((x) => f.aliases.includes(norm(x))) ?? '';
        setMapping(auto);
        setStep('map');
      })
      .catch(() => setError('Could not read this file. Please make sure it is a valid CSV file.'));
  };

  // The rows as the server wants them: only the SKU and the chosen columns.
  const payload = () => ({
    fields: chosen.map((f) => f.key),
    rows: rawRows.map((r) => {
      const out: Record<string, string> = { sku: r[skuCol] ?? '' };
      for (const f of chosen) out[f.key] = r[mapping[f.key]] ?? '';
      return out;
    }),
  });

  const runPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = payload();
      setPreview(await productsApi.csvUpdatePreview(p.fields, p.rows));
      setStep('preview');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not check the file.'));
    } finally {
      setBusy(false);
    }
  };

  const runApply = async () => {
    setBusy(true);
    try {
      const p = payload();
      const res = await productsApi.csvUpdateApply(p.fields, p.rows);
      setApplied({ changed: res.changed, batchId: res.batchId });
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['price-changes'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update the products.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={busy ? undefined : onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2">
            {(step === 'upload' || step === 'map' || step === 'preview') && (
              <button onClick={() => (step === 'upload' ? onBack() : setStep(step === 'map' ? 'upload' : 'map'))} className="text-regantify-text-muted hover:text-regantify-text" title="Back">
                <ChevronLeft size={18} />
              </button>
            )}
            <h2 className="text-base font-semibold text-regantify-text">Update existing products from CSV</h2>
          </div>
          {!busy && (
            <button onClick={onClose} className="text-regantify-text-muted hover:text-regantify-text">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-regantify-text-muted">
                Upload a sheet with a SKU column and the new values (for example the file from Export, with the prices changed, or your supplier’s new price list). Products are matched by SKU (a variation’s own SKU works too). A blank cell changes nothing. Nothing is created and nothing is deleted.
              </p>
              <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-14 text-regantify-text">
                <UploadCloud size={28} />
                <span className="font-medium">Upload CSV File</span>
                <span className="text-xs text-regantify-text-muted">.csv files only, up to {MAX_ROWS} rows</span>
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-sm text-regantify-text-muted">
                Pick the SKU column of <span className="font-medium text-regantify-text">{fileName}</span>, then pick a column for each thing you want to change. Leave “Don’t change” on the rest.
              </p>
              <div className="divide-y divide-line rounded-lg border border-line">
                <div className="flex items-center gap-4 px-4 py-3">
                  <p className="w-44 shrink-0 text-sm font-medium text-regantify-text">
                    SKU <span className="text-red-500">*</span>
                  </p>
                  <select value={skuCol} onChange={(e) => setSkuCol(e.target.value)} className={selectClass}>
                    <option value="">— Pick the SKU column —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                {fields.map((f) => (
                  <div key={f.key} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-44 shrink-0">
                      <p className="text-sm font-medium text-regantify-text">{f.label}</p>
                      {f.hint && <p className="text-xs text-regantify-text-muted">{f.hint}</p>}
                    </div>
                    <select value={mapping[f.key] ?? ''} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))} className={selectClass}>
                      <option value="">— Don’t change —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {chosen.length === 0 && (
                <p className="flex items-center gap-1.5 text-sm text-amber-600">
                  <AlertTriangle size={14} />
                  Pick at least one column to change.
                </p>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-regantify-text">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-green-600" />
                  {preview.willChange} will change
                </span>
                <span className="text-neutral-500">{preview.unchanged} already the same</span>
                {preview.notFound > 0 && (
                  <span className="flex items-center gap-1.5">
                    <XCircle size={15} className="text-amber-600" />
                    {preview.notFound} SKU not found
                  </span>
                )}
                {preview.invalid > 0 && (
                  <span className="flex items-center gap-1.5">
                    <XCircle size={15} className="text-red-500" />
                    {preview.invalid} with a problem (skipped)
                  </span>
                )}
              </div>
              <div className="max-h-[360px] overflow-auto rounded-lg border border-line">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-neutral-50 text-left text-regantify-text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">What changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((it) => (
                      <tr key={it.rowNumber} className={`border-t border-line align-top ${it.status === 'CHANGE' ? '' : 'bg-neutral-50 text-neutral-500'}`}>
                        <td className="px-3 py-2">{it.rowNumber}</td>
                        <td className="px-3 py-2">
                          <span className="block">{it.name ?? '—'}{it.label ? ` · ${it.label}` : ''}</span>
                          <span className="block font-mono text-xs text-neutral-500">{it.sku || '(no SKU)'}</span>
                        </td>
                        <td className="px-3 py-2">
                          {it.status === 'CHANGE' ? (
                            <ul className="space-y-0.5">
                              {it.changes.map((c) => (
                                <li key={c.field} className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-xs text-neutral-500">{FIELDS.find((f) => f.key === c.field)?.label}:</span>
                                  <span className="text-neutral-400 line-through">{show(c.field, c.old)}</span>
                                  <ArrowRight size={11} className="text-neutral-400" aria-hidden />
                                  <span className="font-semibold text-regantify-text">{show(c.field, c.new)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : it.status === 'SAME' ? (
                            'Already the same'
                          ) : (
                            <span className={it.status === 'NOT_FOUND' ? 'text-amber-700' : 'text-red-600'}>{it.reason}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-500">Price and sale price changes can be undone from “Recent price changes”. Stock changes show in each product’s stock history. Cost, badge and status changes can’t be undone.</p>
            </div>
          )}

          {step === 'done' && applied && (
            <div className="space-y-2 py-6 text-center">
              <CheckCircle2 size={36} className="mx-auto text-green-600" />
              <p className="text-base font-semibold text-regantify-text">{applied.changed} product{applied.changed === 1 ? '' : 's'} updated</p>
              {applied.batchId && <p className="text-sm text-neutral-600">You can undo the price changes from All Products &gt; Change prices &gt; Recent price changes.</p>}
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-line px-6 py-4">
          {step === 'map' && (
            <button type="button" onClick={runPreview} disabled={!skuCol || chosen.length === 0 || busy} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40">
              {busy ? 'Checking…' : 'Continue to Preview'}
            </button>
          )}
          {step === 'preview' && preview && (
            <button type="button" onClick={runApply} disabled={preview.willChange === 0 || busy} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40">
              {busy ? 'Updating…' : `Update ${preview.willChange} product${preview.willChange === 1 ? '' : 's'}`}
            </button>
          )}
          {step === 'done' && (
            <button type="button" onClick={onClose} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
