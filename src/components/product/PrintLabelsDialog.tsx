import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { productsApi, type Product } from '../../lib/productsApi';
import { printElement } from '../../lib/printElement';
import { toast } from '../../lib/toast';

/*
 * Product > All Products > Print labels (POS-system-plan.md Step 2): price
 * and barcode labels for the shelf or the item itself, for a POS scanner to
 * read. One label row per product, or per variant when it has variants.
 * An item with no barcode gets its SKU as a Code 128 barcode instead, which
 * the POS lookup also understands, so every product can have a label.
 */

type Layout = 'roll' | 'sheet';

const LAYOUTS: Record<Layout, { label: string; hint: string }> = {
  roll: { label: 'Label roll, 38 x 25 mm', hint: 'One label per page, for a thermal label printer.' },
  sheet: { label: 'A4 sheet, 24 labels (3 x 8)', hint: 'For A4 sticker sheets on a normal printer.' },
};

const SHEET_PER_PAGE = 24;

interface LabelRow {
  key: string;
  name: string;
  options: string;
  price: number;
  /** What the barcode encodes: the barcode, or the SKU when there's none. */
  code: string;
  fromSku: boolean;
}

const isEan13 = (code: string) => /^\d{13}$/.test(code);

function money(value: number) {
  return `৳${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? null : Number(v));

/** The regular selling price, picked the same way the storefront and the POS pick it (server pos-pricing.ts, without flash sales). */
function rowsFor(product: Product): LabelRow[] {
  const variants = product.variants ?? [];
  if (variants.length === 0) {
    const code = product.barcode?.trim() || product.sku;
    return [
      {
        key: product.id,
        name: product.name,
        options: '',
        price: num(product.discountPrice) ?? num(product.price) ?? 0,
        code,
        fromSku: !product.barcode?.trim(),
      },
    ];
  }
  return variants.map((v) => ({
    key: `${product.id}:${v.id}`,
    name: product.name,
    options: Object.values(v.optionValues).join(' / '),
    price: num(v.discountPrice) ?? num(v.listPrice) ?? num(product.discountPrice) ?? num(product.price) ?? 0,
    code: v.barcode?.trim() || v.sku,
    fromSku: !v.barcode?.trim(),
  }));
}

function BarcodeSvg({ code, height }: { code: string; height: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, code, { format: isEan13(code) ? 'EAN13' : 'CODE128', displayValue: false, height, width: 1.4, margin: 0 });
    } catch {
      // A code JsBarcode can't draw as EAN-13 (wrong check digit): fall back to Code 128.
      JsBarcode(ref.current, code, { format: 'CODE128', displayValue: false, height, width: 1.4, margin: 0 });
    }
  }, [code, height]);
  return <svg ref={ref} className="mx-auto block h-auto max-w-full" aria-label={`Barcode ${code}`} />;
}

function Label({ row, layout }: { row: LabelRow; layout: Layout }) {
  const roll = layout === 'roll';
  return (
    <div
      className={`flex flex-col justify-between overflow-hidden bg-white text-black ${
        roll ? 'h-[25mm] w-[38mm] break-after-page p-[1.5mm]' : 'h-[33.9mm] w-[63.5mm] p-[2.5mm]'
      }`}
      style={{ fontFamily: "'IBM Plex Sans', 'Hind Siliguri', sans-serif" }}
    >
      <div className="min-w-0 leading-tight">
        <p className={`truncate font-semibold ${roll ? 'text-[6.5pt]' : 'text-[8.5pt]'}`}>{row.name}</p>
        {row.options && <p className={`truncate ${roll ? 'text-[5.5pt]' : 'text-[7pt]'}`}>{row.options}</p>}
      </div>
      <div>
        <BarcodeSvg code={row.code} height={roll ? 26 : 34} />
        <div className={`mt-[0.5mm] flex items-baseline justify-between gap-1 ${roll ? 'text-[5.5pt]' : 'text-[7pt]'}`}>
          <span className="truncate font-mono">{row.code}</span>
          <span className={`shrink-0 font-bold ${roll ? 'text-[7.5pt]' : 'text-[10pt]'}`}>{money(row.price)}</span>
        </div>
      </div>
    </div>
  );
}

export function PrintLabelsDialog({ productIds, onClose }: { productIds: string[]; onClose: () => void }) {
  const queries = useQueries({
    queries: productIds.map((id) => ({ queryKey: ['product', id], queryFn: () => productsApi.findOne(id) })),
  });
  const loading = queries.some((q) => q.isPending);
  const failed = queries.filter((q) => q.isError).length;
  const rows = useMemo(
    () => queries.flatMap((q) => (q.data ? rowsFor(q.data) : [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queries.map((q) => q.dataUpdatedAt).join(',')],
  );

  const [layout, setLayout] = useState<Layout>('roll');
  const [copies, setCopies] = useState<Record<string, string>>({});
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const copiesOf = (key: string) => {
    const n = Number(copies[key] ?? '1');
    return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 0), 500) : 0;
  };
  const labels = rows.flatMap((row) => Array.from({ length: copiesOf(row.key) }, () => row));
  const withoutBarcode = rows.filter((r) => r.fromSku).length;
  const pages = layout === 'sheet' ? Array.from({ length: Math.ceil(labels.length / SHEET_PER_PAGE) }, (_, i) => labels.slice(i * SHEET_PER_PAGE, (i + 1) * SHEET_PER_PAGE)) : [];

  async function print() {
    if (!printRef.current || labels.length === 0) return;
    setPrinting(true);
    try {
      await printElement(
        printRef.current,
        'Product labels',
        layout === 'roll' ? { size: '38mm 25mm', padding: '0' } : // The common 24-up A4 sheet: 63.5 x 33.9 mm labels, 12.9 mm top and 6.4 mm side margins.
        { size: 'A4', padding: '12.9mm 6.4mm 0' },
      );
    } catch {
      toast.error('Could not open the print window. Please try again.');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title="Print labels" maxWidth="max-w-2xl">
      <div className="space-y-4 px-6 pb-6 pt-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-regantify-text">Paper</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(LAYOUTS) as Layout[]).map((key) => (
              <label
                key={key}
                className={`flex cursor-pointer gap-2.5 rounded-lg border p-3 text-sm ${layout === key ? 'border-brand bg-brand/5' : 'border-line'}`}
              >
                <input type="radio" name="label-layout" checked={layout === key} onChange={() => setLayout(key)} className="mt-0.5" />
                <span>
                  <span className="block font-medium text-regantify-text">{LAYOUTS[key].label}</span>
                  <span className="block text-xs text-neutral-500">{LAYOUTS[key].hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {loading ? (
          <p className="text-sm text-neutral-500">Loading products…</p>
        ) : (
          <>
            {failed > 0 && <p className="text-sm text-red-600">{failed} product(s) couldn't load and are left out.</p>}
            {withoutBarcode > 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {withoutBarcode === rows.length ? 'None of these have' : `${withoutBarcode} of these don't have`} a barcode, so
                their label uses the SKU instead. The POS scanner reads both, but a long SKU makes very thin bars on the small
                roll label that some scanners can't read. To give them a barcode, open the product and use Generate.
              </p>
            )}
            <div className="max-h-72 overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-50 text-left text-neutral-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="w-24 px-3 py-2 font-medium">Copies</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-t border-line">
                      <td className="px-3 py-2">
                        <span className="block text-regantify-text">{row.name}</span>
                        {row.options && <span className="block text-xs text-neutral-500">{row.options}</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.code}
                        {row.fromSku && <span className="ml-1 font-sans text-neutral-500">(SKU)</span>}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={500}
                          value={copies[row.key] ?? '1'}
                          onChange={(e) => setCopies((c) => ({ ...c, [row.key]: e.target.value }))}
                          aria-label={`Copies of ${row.name} ${row.options}`}
                          className="w-20 rounded-lg border border-line px-2 py-1.5 text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-neutral-500">{labels.length} label{labels.length === 1 ? '' : 's'}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={outlineBtn}>
              Cancel
            </button>
            <button type="button" onClick={print} disabled={loading || printing || labels.length === 0} className={primaryBtn}>
              <Printer size={15} aria-hidden />
              {printing ? 'Opening…' : 'Print'}
            </button>
          </div>
        </div>
      </div>

      {/* What gets printed: kept off screen, printed through printElement's iframe. */}
      <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0">
        <div ref={printRef}>
          {layout === 'roll'
            ? labels.map((row, i) => <Label key={`${row.key}-${i}`} row={row} layout="roll" />)
            : pages.map((page, p) => (
                <div key={p} className="grid grid-cols-[repeat(3,63.5mm)] gap-x-[2.5mm] break-after-page">
                  {page.map((row, i) => (
                    <Label key={`${row.key}-${i}`} row={row} layout="sheet" />
                  ))}
                </div>
              ))}
        </div>
      </div>
    </Dialog>
  );
}
