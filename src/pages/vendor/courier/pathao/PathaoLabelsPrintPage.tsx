import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { courierApi, type PathaoLabel } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { PathaoShippingLabel } from '../../../../components/courier/PathaoShippingLabel';

type LabelSize = '4x6' | 'a4';

// Printed exactly at these sizes; the on-screen preview shows the same boxes.
const PAGE_CSS: Record<LabelSize, string> = {
  '4x6': `@page { size: 4in 6in; margin: 0; }
    .label-sheet { display: block; }
    .label-cell { width: 4in; height: 6in; padding: 0.15in; box-sizing: border-box; break-after: page; }`,
  a4: `@page { size: A4; margin: 0; }
    .label-sheet { width: 210mm; height: 297mm; display: grid; grid-template-columns: 105mm 105mm; grid-template-rows: 148.5mm 148.5mm; break-after: page; }
    .label-cell { padding: 5mm; box-sizing: border-box; border: 1px dashed #999; }`,
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Pathao shipping labels print page (pathao-plan.md Step 12), opened in a
 * new tab by "Print label" (Orders, Parcels, Order Detail). Mounted
 * outside VendorLayout so nothing but the labels reaches the printer.
 * ?ids=a,b,c picks the orders, ?size=4x6|a4 the paper: one 4×6 in label
 * per page, or four per A4 sheet with dashed cut lines.
 */
export default function PathaoLabelsPrintPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean);
  const size: LabelSize = searchParams.get('size') === 'a4' ? 'a4' : '4x6';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pathao-labels', ids],
    queryFn: () => courierApi.getPathaoLabels(ids),
    enabled: ids.length > 0,
  });

  const labels = data?.labels ?? [];
  const sheets: PathaoLabel[][] = size === 'a4' ? chunk(labels, 4) : labels.map((l) => [l]);

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      <style>{`${PAGE_CSS[size]}
        @media print { body { background: #fff; } .label-sheet, .label-cell { margin: 0 !important; box-shadow: none !important; } }`}</style>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3 print:hidden">
        <h1 className="text-[15px] font-semibold text-regantify-text">Pathao labels{labels.length > 0 && ` (${labels.length})`}</h1>
        <div role="radiogroup" aria-label="Paper size" className="flex gap-1 rounded-lg border border-line bg-white p-1 text-sm">
          {(['4x6', 'a4'] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={size === s}
              onClick={() => setSearchParams({ ids: ids.join(','), size: s })}
              className={`h-8 rounded-md px-3 ${size === s ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              {s === '4x6' ? '4×6 in label' : 'A4 (4 per page)'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={labels.length === 0}
          className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          <Printer size={15} aria-hidden /> Print labels
        </button>
      </div>

      <div className="space-y-1 px-4 pt-3 print:hidden">
        {ids.length === 0 && <p className="text-sm text-neutral-500">No orders chosen. Pick orders on the Orders page, then choose Print label.</p>}
        {isLoading && <p className="text-sm text-neutral-500">Preparing labels…</p>}
        {isError && <p className="text-sm text-red-600">{apiErrorMessage(error, 'Couldn’t load these labels. Refresh the page to try again.')}</p>}
        {data && data.skipped.length > 0 && (
          <p className="text-sm text-amber-700">
            No label for{' '}
            {data.skipped.map((s) => (s.invoiceNumber ? `ORDER-${s.invoiceNumber}` : 'an unknown order')).join(', ')} . Only orders sent to Pathao
            get one.
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 py-4 print:p-0 print:gap-0 print:block">
        {sheets.map((sheet, i) => (
          <div key={i} className="label-sheet bg-white shadow-sm print:shadow-none">
            {sheet.map((label) => (
              <div key={label.orderId} className="label-cell bg-white">
                {data && <PathaoShippingLabel label={label} from={data.from} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
