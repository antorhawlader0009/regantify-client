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
 *
 * TellMe idea 116 added: a 50 x 30 mm roll and a 39-label A4 sheet next to the
 * first two, a choice of what each label shows (name, size/colour, barcode,
 * code number, price), and "as many labels as stock" for the copies. The price is
 * the regular selling price (never a campaign or flash sale price, a label lasts)
 * and the cost is never printed.
 */

type Layout = 'roll38' | 'roll50' | 'sheet24' | 'sheet39';

interface LayoutDef {
  label: string;
  hint: string;
  /** Label size in mm. */
  w: number;
  h: number;
  /** Labels per A4 page (sheets only). */
  perPage?: number;
  /** printElement's paper. */
  page: { size: string; padding: string };
  /** Text sizes in pt and the barcode height in bars' units. */
  fs: { name: number; opt: number; code: number; price: number };
  bar: number;
}

const LAYOUTS: Record<Layout, LayoutDef> = {
  roll38: {
    label: 'Label roll, 38 x 25 mm',
    hint: 'One label per page, for a thermal label printer.',
    w: 38, h: 25, page: { size: '38mm 25mm', padding: '0' }, fs: { name: 6.5, opt: 5.5, code: 5.5, price: 7.5 }, bar: 26,
  },
  roll50: {
    label: 'Label roll, 50 x 30 mm',
    hint: 'One label per page, a bigger thermal label.',
    w: 50, h: 30, page: { size: '50mm 30mm', padding: '0' }, fs: { name: 8, opt: 6.5, code: 6.5, price: 10 }, bar: 32,
  },
  sheet24: {
    label: 'A4 sheet, 24 labels (3 x 8)',
    hint: 'For A4 sticker sheets on a normal printer.',
    // The common 24-up A4 sheet: 63.5 x 33.9 mm labels, 12.9 mm top and 6.4 mm side margins.
    w: 63.5, h: 33.9, perPage: 24, page: { size: 'A4', padding: '12.9mm 6.4mm 0' }, fs: { name: 8.5, opt: 7, code: 7, price: 10 }, bar: 34,
  },
  sheet39: {
    label: 'A4 sheet, 39 labels (3 x 13)',
    hint: 'Smaller stickers, 63.5 x 21.2 mm, for A4 sticker sheets.',
    w: 63.5, h: 21.2, perPage: 39, page: { size: 'A4', padding: '10.7mm 6.4mm 0' }, fs: { name: 7, opt: 6, code: 6, price: 9 }, bar: 20,
  },
};

/** What a label shows (TellMe idea 116). The barcode and the code number below it are separate, so a label can hold just a name and a price. */
interface Show {
  name: boolean;
  options: boolean;
  barcode: boolean;
  code: boolean;
  price: boolean;
}
const SHOW_LABELS: { key: keyof Show; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'options', label: 'Size / colour' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'code', label: 'Code number' },
  { key: 'price', label: 'Price' },
];

interface LabelRow {
  key: string;
  name: string;
  options: string;
  price: number;
  /** What the barcode encodes: the barcode, or the SKU when there's none. */
  code: string;
  fromSku: boolean;
  /** Pieces in stock; null when the item has no stock count (not tracked). */
  stock: number | null;
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
        stock: product.stockQuantity ?? null,
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
    stock: typeof v.stock === 'number' ? v.stock : null,
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

function Label({ row, layout, show }: { row: LabelRow; layout: Layout; show: Show }) {
  const def = LAYOUTS[layout];
  const roll = !def.perPage;
  return (
    <div
      className={`flex flex-col justify-between overflow-hidden bg-white text-black ${roll ? 'break-after-page p-[1.5mm]' : 'p-[2mm]'}`}
      style={{ width: `${def.w}mm`, height: `${def.h}mm`, fontFamily: "'IBM Plex Sans', 'Hind Siliguri', sans-serif" }}
    >
      <div className="min-w-0 leading-tight">
        {show.name && (
          <p className="truncate font-semibold" style={{ fontSize: `${def.fs.name}pt` }}>
            {row.name}
          </p>
        )}
        {show.options && row.options && (
          <p className="truncate" style={{ fontSize: `${def.fs.opt}pt` }}>
            {row.options}
          </p>
        )}
      </div>
      <div>
        {show.barcode && <BarcodeSvg code={row.code} height={def.bar} />}
        {(show.code || show.price) && (
          <div className={`flex items-baseline gap-1 ${show.barcode ? 'mt-[0.5mm]' : ''} ${show.code ? 'justify-between' : 'justify-end'}`} style={{ fontSize: `${def.fs.code}pt` }}>
            {show.code && <span className="truncate font-mono">{row.code}</span>}
            {show.price && (
              <span className="shrink-0 font-bold" style={{ fontSize: `${def.fs.price}pt` }}>
                {money(row.price)}
              </span>
            )}
          </div>
        )}
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

  const [layout, setLayout] = useState<Layout>('roll38');
  const [show, setShow] = useState<Show>({ name: true, options: true, barcode: true, code: true, price: true });
  // How many labels each item gets until a number is typed: one, or as many as it has in stock.
  const [copyMode, setCopyMode] = useState<'one' | 'stock'>('one');
  const [copies, setCopies] = useState<Record<string, string>>({});
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const defaultCopies = (row: LabelRow) => (copyMode === 'stock' && row.stock !== null ? Math.min(Math.max(row.stock, 0), 500) : 1);
  const copiesOf = (row: LabelRow) => {
    const typed = copies[row.key];
    const n = typed === undefined ? defaultCopies(row) : Number(typed);
    return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 0), 500) : 0;
  };
  const labels = rows.flatMap((row) => Array.from({ length: copiesOf(row) }, () => row));
  const withoutBarcode = rows.filter((r) => r.fromSku).length;
  const perPage = LAYOUTS[layout].perPage;
  const pages = perPage ? Array.from({ length: Math.ceil(labels.length / perPage) }, (_, i) => labels.slice(i * perPage, (i + 1) * perPage)) : [];

  async function print() {
    if (!printRef.current || labels.length === 0) return;
    setPrinting(true);
    try {
      await printElement(printRef.current, 'Product labels', LAYOUTS[layout].page);
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

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-regantify-text">What to print</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {SHOW_LABELS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-1.5 text-sm text-regantify-text">
                <input type="checkbox" checked={show[key]} onChange={(e) => setShow((cur) => ({ ...cur, [key]: e.target.checked }))} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-regantify-text">How many labels</legend>
          <div className="flex flex-wrap gap-4 text-sm text-regantify-text">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="label-copies" checked={copyMode === 'one'} onChange={() => { setCopyMode('one'); setCopies({}); }} />
              One for each item
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="label-copies" checked={copyMode === 'stock'} onChange={() => { setCopyMode('stock'); setCopies({}); }} />
              As many as the stock (a label for every piece)
            </label>
          </div>
          <p className="mt-1 text-xs text-neutral-500">You can still change the number for each item below. An item with no stock count gets one.</p>
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
                          value={copies[row.key] ?? String(defaultCopies(row))}
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
          {!perPage
            ? labels.map((row, i) => <Label key={`${row.key}-${i}`} row={row} layout={layout} show={show} />)
            : pages.map((page, p) => (
                <div key={p} className="grid grid-cols-[repeat(3,63.5mm)] gap-x-[2.5mm] break-after-page">
                  {page.map((row, i) => (
                    <Label key={`${row.key}-${i}`} row={row} layout={layout} show={show} />
                  ))}
                </div>
              ))}
        </div>
      </div>
    </Dialog>
  );
}
