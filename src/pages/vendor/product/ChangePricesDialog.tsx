import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, History, Tag } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import {
  productsApi,
  type ListProductsParams,
  type PriceChangeOptions,
  type PriceChangePreview,
  type PriceChangePreviewItem,
  type PriceChangeResult,
} from '../../../lib/productsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const MAX_PRODUCTS = 500;

const fieldClass =
  'block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-regantify-text focus:outline-none focus:border-brand';

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** What a change was, in a sentence: "Raised regular prices by 10%". */
export function describePriceChange(p: PriceChangeOptions): string {
  const what = p.target === 'PRICE' ? 'regular prices' : p.target === 'DISCOUNT' ? 'sale prices' : 'regular and sale prices';
  const amount = p.mode === 'PERCENT' ? `${p.value}%` : `${taka(p.value)}`;
  const rounding = p.rounding === 'NONE' ? '' : `, rounded to the nearest ${p.rounding === 'ONE' ? '৳1' : p.rounding === 'FIVE' ? '৳5' : '৳10'}`;
  return `${p.direction === 'INCREASE' ? 'Raised' : 'Lowered'} ${what} by ${amount}${rounding}`;
}

function PriceCell({ oldValue, newValue }: { oldValue: number | null; newValue: number | null }) {
  if (oldValue === null) return <span className="text-neutral-400">–</span>;
  if (newValue === null || newValue === oldValue) return <span>{taka(oldValue)}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-neutral-400 line-through">{taka(oldValue)}</span>
      <ArrowRight size={11} className="text-neutral-400" aria-hidden />
      <span className="font-semibold text-regantify-text">{taka(newValue)}</span>
    </span>
  );
}

function PreviewRow({ item }: { item: PriceChangePreviewItem }) {
  const muted = item.status !== 'CHANGE';
  return (
    <tr className={`border-t border-line align-top ${muted ? 'bg-neutral-50 text-neutral-500' : ''}`}>
      <td className="max-w-[220px] px-3 py-2">
        <p className="truncate font-medium">{item.name}</p>
        {item.status === 'SKIPPED' && <p className="text-xs text-red-600">Left as it is: {item.reason}</p>}
        {item.status === 'SAME' && <p className="text-xs">Nothing to change</p>}
        {item.status === 'CHANGE' && item.variants.length > 0 && (
          <p className="text-xs text-neutral-500">
            + {item.variants.length} variant {item.variants.length === 1 ? 'price' : 'prices'}
          </p>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <PriceCell oldValue={item.oldPrice} newValue={item.status === 'CHANGE' ? item.newPrice : null} />
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <PriceCell oldValue={item.oldDiscountPrice} newValue={item.status === 'CHANGE' ? item.newDiscountPrice : null} />
      </td>
    </tr>
  );
}

/**
 * All Products > "Change prices" (TellMe idea 14): raise or lower the selling prices of the selected products, or of
 * everything matching the page's filters, by a percentage or a flat amount, with rounding. Nothing is saved until the
 * preview (old and new price side by side) is confirmed, and the finished change can be undone. Cost is never changed.
 */
export function ChangePricesDialog({
  open,
  onOpenChange,
  selectedIds,
  filter,
  filterTotal,
  onDone,
  onShowHistory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  filter: Pick<ListProductsParams, 'search' | 'category' | 'visibility' | 'stockType'>;
  /** How many products the page's filters match. */
  filterTotal: number;
  onDone: () => void;
  onShowHistory: () => void;
}) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<'SELECTED' | 'FILTERED'>(selectedIds.length > 0 ? 'SELECTED' : 'FILTERED');
  const [direction, setDirection] = useState<PriceChangeOptions['direction']>('INCREASE');
  const [valueText, setValueText] = useState('');
  const [mode, setMode] = useState<PriceChangeOptions['mode']>('PERCENT');
  const [target, setTarget] = useState<PriceChangeOptions['target']>('PRICE');
  const [rounding, setRounding] = useState<PriceChangeOptions['rounding']>('NONE');
  const [preview, setPreview] = useState<PriceChangePreview | null>(null);
  const [result, setResult] = useState<PriceChangeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);

  const value = Number(valueText);
  const valueOk = valueText.trim() !== '' && Number.isFinite(value) && value > 0 && Math.round(value * 100) / 100 === value;
  const filteredTooMany = filterTotal > MAX_PRODUCTS;
  const scopeOk = scope === 'SELECTED' ? selectedIds.length > 0 : filterTotal > 0 && !filteredTooMany;
  const options: PriceChangeOptions = { target, mode, direction, value, rounding };
  const request = { ...options, ...(scope === 'SELECTED' ? { productIds: selectedIds } : { filter }) };

  // Any change to the settings makes an old preview wrong, so it goes.
  const edit = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPreview(null);
  };

  async function runPreview() {
    setBusy(true);
    try {
      setPreview(await productsApi.previewPriceChange(request));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not work out the new prices. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  async function runApply() {
    setBusy(true);
    try {
      const done = await productsApi.applyPriceChange(request);
      setResult(done);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not change the prices. Nothing was changed.'));
    } finally {
      setBusy(false);
    }
  }

  async function runUndo(batchId: string) {
    setUndoing(true);
    try {
      const r = await productsApi.undoPriceChange(batchId);
      setUndone(true);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(
        `${r.restored} ${r.restored === 1 ? 'product' : 'products'} back to the old price${r.skipped ? `, ${r.skipped} left alone because their price was changed since` : ''}.`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not undo the change.'));
    } finally {
      setUndoing(false);
    }
  }

  // -- After the change --
  if (result) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-md">
        <div className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-semibold text-regantify-text">
            <Tag size={16} aria-hidden />
            {result.changed > 0 ? 'Prices changed' : 'Nothing was changed'}
          </h2>
          <p className="text-sm text-neutral-700">
            {result.changed} {result.changed === 1 ? 'product' : 'products'} changed
            {result.unchanged > 0 && `, ${result.unchanged} had nothing to change`}
            {result.skipped > 0 && `, ${result.skipped} left as they were`}. Your storefront shows the new prices shortly.
          </p>
          {result.skippedList.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
              {result.skippedList.map((s, i) => (
                <li key={i}>
                  <b>{s.name}</b>: {s.reason}
                </li>
              ))}
            </ul>
          )}
          {undone && <p className="text-sm font-medium text-green-700">This change was undone.</p>}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
          {result.batchId && !undone ? (
            <button
              type="button"
              onClick={() => runUndo(result.batchId as string)}
              disabled={undoing}
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
            >
              {undoing ? 'Undoing…' : 'Undo this change'}
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark">
            Done
          </button>
        </div>
      </Dialog>
    );
  }

  const radio = 'flex items-center gap-2 text-sm text-regantify-text cursor-pointer';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-2xl">
      <div className="space-y-5 p-6">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-regantify-text">
            <Tag size={16} aria-hidden />
            Change prices
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Raise or lower selling prices in one go. You see the old and new price of every product before anything changes. Cost price is never changed.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-regantify-text">Which products</legend>
          <label className={`${radio} ${selectedIds.length === 0 ? 'opacity-50' : ''}`}>
            <input type="radio" checked={scope === 'SELECTED'} disabled={selectedIds.length === 0} onChange={() => edit(setScope)('SELECTED')} className="accent-brand" />
            The {selectedIds.length} selected {selectedIds.length === 1 ? 'product' : 'products'}
          </label>
          <label className={`${radio} ${filterTotal === 0 ? 'opacity-50' : ''}`}>
            <input type="radio" checked={scope === 'FILTERED'} disabled={filterTotal === 0} onChange={() => edit(setScope)('FILTERED')} className="accent-brand" />
            All {filterTotal} {filterTotal === 1 ? 'product' : 'products'} matching the current search and filters
          </label>
          {scope === 'FILTERED' && filteredTooMany && (
            <p className="text-xs text-red-600">More than {MAX_PRODUCTS} products match. Narrow the filters (a category helps) and change them in parts.</p>
          )}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-regantify-text">Change</legend>
            <div className="flex gap-5">
              <label className={radio}>
                <input type="radio" checked={direction === 'INCREASE'} onChange={() => edit(setDirection)('INCREASE')} className="accent-brand" />
                Increase
              </label>
              <label className={radio}>
                <input type="radio" checked={direction === 'DECREASE'} onChange={() => edit(setDirection)('DECREASE')} className="accent-brand" />
                Decrease
              </label>
            </div>
          </fieldset>

          <label className="block text-sm font-medium text-regantify-text">
            By
            <div className="mt-1 flex gap-2">
              <input
                inputMode="decimal"
                value={valueText}
                onChange={(e) => edit(setValueText)(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="10"
                className={fieldClass}
                aria-label="Amount"
              />
              <select value={mode} onChange={(e) => edit(setMode)(e.target.value as PriceChangeOptions['mode'])} className={`${fieldClass} w-28`} aria-label="Percent or taka">
                <option value="PERCENT">%</option>
                <option value="AMOUNT">৳ (taka)</option>
              </select>
            </div>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-sm font-medium text-regantify-text">Which price</legend>
            <label className={radio}>
              <input type="radio" checked={target === 'PRICE'} onChange={() => edit(setTarget)('PRICE')} className="accent-brand" />
              Regular price
            </label>
            <label className={radio}>
              <input type="radio" checked={target === 'DISCOUNT'} onChange={() => edit(setTarget)('DISCOUNT')} className="accent-brand" />
              Sale price only (where one is set)
            </label>
            <label className={radio}>
              <input type="radio" checked={target === 'BOTH'} onChange={() => edit(setTarget)('BOTH')} className="accent-brand" />
              Both together
            </label>
          </fieldset>

          <label className="block text-sm font-medium text-regantify-text">
            Round the new price
            <select value={rounding} onChange={(e) => edit(setRounding)(e.target.value as PriceChangeOptions['rounding'])} className={`${fieldClass} mt-1`}>
              <option value="NONE">Don’t round (keep paisa)</option>
              <option value="ONE">To the nearest ৳1</option>
              <option value="FIVE">To the nearest ৳5</option>
              <option value="TEN">To the nearest ৳10</option>
            </select>
            <span className="mt-1 block text-xs font-normal text-neutral-500">
              Variants with their own price change the same way. Variants that follow the product price follow the new price.
            </span>
          </label>
        </div>

        {preview && (
          <div>
            <p className="mb-2 text-sm text-regantify-text">
              <b>{preview.willChange}</b> will change
              {preview.unchanged > 0 && <>, {preview.unchanged} have nothing to change</>}
              {preview.skipped > 0 && <>, <span className="text-red-600">{preview.skipped} will be left as they are</span></>}.
            </p>
            <div className="max-h-72 overflow-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-50 text-left text-xs text-neutral-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Sale price</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((item) => (
                    <PreviewRow key={item.productId} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
        <button type="button" onClick={onShowHistory} className="inline-flex items-center gap-1.5 text-sm text-neutral-600 underline-offset-2 hover:text-regantify-text hover:underline">
          <History size={14} aria-hidden />
          Recent price changes
        </button>
        {preview ? (
          <button
            type="button"
            onClick={runApply}
            disabled={busy || preview.willChange === 0}
            className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Changing…' : `Change ${preview.willChange} ${preview.willChange === 1 ? 'product' : 'products'}`}
          </button>
        ) : (
          <button
            type="button"
            onClick={runPreview}
            disabled={busy || !valueOk || !scopeOk}
            className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? 'Working it out…' : 'Preview new prices'}
          </button>
        )}
      </div>
    </Dialog>
  );
}
