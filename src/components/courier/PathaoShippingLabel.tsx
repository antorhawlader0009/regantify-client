import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import type { PathaoLabel, PathaoLabelsResponse } from '../../lib/courierApi';

function formatTaka(value: number) {
  return `৳${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Code128 barcode of `value`, stretched to the container's width (bars keep their proportions, so it still scans). */
function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    JsBarcode(ref.current, value, { format: 'CODE128', displayValue: false, height: 70, width: 2, margin: 0 });
    const width = ref.current.getAttribute('width');
    const height = ref.current.getAttribute('height');
    if (width && height) {
      ref.current.setAttribute('viewBox', `0 0 ${parseFloat(width)} ${parseFloat(height)}`);
      ref.current.setAttribute('preserveAspectRatio', 'none');
      ref.current.removeAttribute('width');
      ref.current.removeAttribute('height');
    }
  }, [value]);
  return <svg ref={ref} className="block w-full h-[0.7in]" aria-label={`Barcode ${value}`} />;
}

/** QR code of `value` as inline SVG (generated locally — no network call). */
function QrCode({ value }: { value: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then((out) => {
      if (!cancelled) setSvg(out);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);
  return (
    <div
      className="w-[1.05in] h-[1.05in] [&>svg]:w-full [&>svg]:h-full"
      aria-label={`QR code ${value}`}
      // Our own library output, never user HTML.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}

/**
 * One Pathao shipping label (pathao-plan.md Step 12). Laid out for a 4×6 in
 * thermal label; an A4 quarter (105×148 mm) is almost the same shape, so
 * the print page uses this same component for both. Black on white only,
 * so thermal printers and photocopies keep everything readable.
 */
export function PathaoShippingLabel({ label, from }: { label: PathaoLabel; from: PathaoLabelsResponse['from'] }) {
  const shownItems = label.items.slice(0, 3);
  const moreItems = label.items.length - shownItems.length;

  return (
    <div className="h-full w-full flex flex-col text-black bg-white text-[9pt] leading-snug">
      <div className="flex items-start justify-between gap-2 pb-1.5 border-b-2 border-black">
        <div className="min-w-0">
          <p className="text-[7pt] font-semibold uppercase tracking-wide">From</p>
          <p className="font-bold text-[10pt] truncate">{from.storeName}</p>
          {from.phone && <p>{from.phone}</p>}
        </div>
        <p className="text-[13pt] font-black tracking-tight shrink-0">PATHAO</p>
      </div>

      <div className="py-1.5 border-b-2 border-black">
        <Barcode value={label.consignmentId} />
        <p className="text-center font-mono font-bold text-[11pt] tracking-wider mt-0.5">{label.consignmentId}</p>
      </div>

      <div className="py-1.5 border-b-2 border-black flex-1 min-h-0">
        <p className="text-[7pt] font-semibold uppercase tracking-wide">To</p>
        <p className="font-bold text-[12pt] leading-tight">{label.recipient.name}</p>
        <p className="font-semibold">
          {label.recipient.phone}
          {label.recipient.secondaryPhone && <> / {label.recipient.secondaryPhone}</>}
        </p>
        <p className="mt-0.5 line-clamp-3">{label.recipient.address}</p>
        {label.recipient.area && <p className="mt-0.5 font-bold">{label.recipient.area}</p>}
      </div>

      <div className="py-1.5 border-b-2 border-black flex items-center justify-between gap-2">
        <div>
          {label.codAmount > 0 ? (
            <>
              <p className="text-[7pt] font-semibold uppercase tracking-wide">Collect on delivery</p>
              <p className="text-[20pt] font-black leading-none">{formatTaka(label.codAmount)}</p>
            </>
          ) : (
            <>
              <p className="text-[7pt] font-semibold uppercase tracking-wide">Payment</p>
              <p className="text-[16pt] font-black leading-none">PAID — ৳0</p>
            </>
          )}
        </div>
        <QrCode value={label.consignmentId} />
      </div>

      <div className="pt-1.5 text-[8pt]">
        <p className="font-semibold">
          ORDER-{label.invoiceNumber} · {label.itemCount} {label.itemCount === 1 ? 'item' : 'items'}
          {label.bookedAt && <> · {new Date(label.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</>}
        </p>
        {shownItems.map((item, i) => (
          <p key={i} className="truncate">
            {item.quantity} × {item.name}
          </p>
        ))}
        {moreItems > 0 && <p>+ {moreItems} more</p>}
      </div>
    </div>
  );
}
