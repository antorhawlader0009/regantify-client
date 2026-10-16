import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { Barcode, QrCode } from '../courier/PathaoShippingLabel';
import { codDue, orderRef, ordersApi, type Order } from '../../lib/ordersApi';
import { getVendorSettings } from '../../lib/vendorApi';
import { printElement } from '../../lib/printElement';
import { toast } from '../../lib/toast';

type Size = 'LABEL' | 'A4';

const PRINTED_KEY = 'parcel-label-printed:';
const taka = (n: number) => `৳${n.toLocaleString('en-US')}`;
const courierName = (o: Order) => {
  const c = o.courierProvider !== 'NONE' ? String(o.courierProvider) : (o.manualCourierName ?? '');
  return c ? c.charAt(0) + c.slice(1).toLowerCase() : '';
};
const wasPrinted = (id: string) => {
  try {
    return localStorage.getItem(PRINTED_KEY + id) !== null;
  } catch {
    return false;
  }
};

/** The scannable value: the tracking ID when there is one, else the order number (the Courier Handover screen accepts both). */
const scanValue = (o: Order) => o.courierTrackingCode ?? o.courierConsignmentId ?? o.manualTrackingId ?? orderRef(o);

/** One sticker: black on white only, so thermal printers and photocopies keep everything readable. */
function Sticker({ order, store }: { order: Order; store: string }) {
  const cash = codDue(order);
  const tracking = order.courierTrackingCode ?? order.manualTrackingId ?? order.courierConsignmentId;
  const courier = courierName(order);
  const value = scanValue(order);
  return (
    <div className="flex h-full w-full flex-col bg-white p-[3mm] text-[9pt] leading-snug text-black">
      <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-1">
        <p className="min-w-0 truncate text-[11pt] font-bold">{store}</p>
        <p className="shrink-0 text-[9pt] font-bold">{orderRef(order)}</p>
      </div>

      <div className="min-h-0 flex-1 border-b-2 border-black py-1.5">
        <p className="text-[7pt] font-semibold uppercase tracking-wide">To</p>
        <p className="text-[13pt] font-black leading-tight">{order.customerName}</p>
        <p className="font-bold">
          {order.customerPhone}
          {order.customerPhoneAlt ? ` / ${order.customerPhoneAlt}` : ''}
        </p>
        <p className="mt-0.5 line-clamp-4">{order.shippingAddress}</p>
        {order.preferredDeliveryDate && (
          <p className="mt-0.5 font-bold">
            Deliver on {new Date(order.preferredDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}
            {order.preferredSlot ? `, ${order.preferredSlot}` : ''}
          </p>
        )}
        {order.shippingDistrict && <p className="mt-0.5 font-bold">{[order.shippingCity, order.shippingDistrict].filter(Boolean).join(', ')}</p>}
      </div>

      <div className="flex items-center justify-between gap-2 border-b-2 border-black py-1.5">
        <div>
          {order.paymentMethod === 'COD' && cash > 0 ? (
            <>
              <p className="text-[7pt] font-semibold uppercase tracking-wide">Collect</p>
              <p className="text-[20pt] font-black leading-none">{taka(order.courierCodAmount ? Math.round(Number(order.courierCodAmount)) : cash)}</p>
            </>
          ) : (
            <>
              <p className="text-[7pt] font-semibold uppercase tracking-wide">Payment</p>
              <p className="text-[16pt] font-black leading-none">PAID</p>
            </>
          )}
          {(courier || tracking) && (
            <p className="mt-1 text-[8pt] font-semibold">
              {courier}
              {courier && tracking ? ' · ' : ''}
              {tracking}
            </p>
          )}
        </div>
        <QrCode value={value} />
      </div>

      <div className="pt-1.5">
        <Barcode value={value} />
        <p className="mt-0.5 text-center font-mono text-[9pt] font-bold tracking-wider">{value}</p>
      </div>
    </div>
  );
}

/**
 * Orders list "Parcel stickers" (TellMe idea 81): a sticker for any courier or your own rider. Name, phone, full address, district, the
 * courier and tracking ID, the order number, and the cash to collect in big type. The barcode and QR hold the tracking ID (else the order
 * number), the same thing Courier Handover scans. 100 x 150 mm label, or 6 to an A4 page. A phone number you may not see stays masked,
 * as everywhere. Nothing is saved on the server; the "printed" mark is kept in this browser.
 */
export function ParcelLabelPrint({ ids, open, onOpenChange }: { ids: string[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>('LABEL');
  const [printing, setPrinting] = useState(false);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['parcel-label-orders', ids],
    queryFn: () => Promise.all(ids.map((id) => ordersApi.findOne(id))),
    enabled: open && ids.length > 0,
  });
  const { data: store } = useQuery({ queryKey: ['vendor-settings'], queryFn: getVendorSettings, enabled: open, retry: false, staleTime: 5 * 60_000 });
  const sorted = useMemo(() => [...(orders ?? [])].sort((a, b) => a.invoiceNumber - b.invoiceNumber), [orders]);
  const already = sorted.filter((o) => wasPrinted(o.id)).length;

  async function print() {
    if (!sheetRef.current || !orders) return;
    setPrinting(true);
    try {
      // The barcodes and QR codes draw themselves just after mounting; give them a moment before the page is copied.
      await new Promise((resolve) => setTimeout(resolve, 400));
      await printElement(sheetRef.current, `Parcel stickers (${orders.length})`, size === 'LABEL' ? { size: '100mm 150mm', padding: '0' } : { size: 'A4', padding: '6mm' });
      try {
        for (const o of orders) localStorage.setItem(PRINTED_KEY + o.id, new Date().toISOString());
      } catch {
        // Storage blocked: the printed mark is only a convenience.
      }
    } catch {
      toast.error('Could not open the print window. Please try again.');
    } finally {
      setPrinting(false);
    }
  }

  const storeName = store?.storeName ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Print parcel stickers" maxWidth="max-w-md">
      <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
        <p className="text-neutral-600">
          {isLoading
            ? `Getting ${ids.length} ${ids.length === 1 ? 'order' : 'orders'} ready…`
            : isError
              ? 'Could not load the orders. Close this and try again.'
              : `${sorted.length} ${sorted.length === 1 ? 'sticker' : 'stickers'}${already > 0 ? `, ${already} printed before from this browser` : ''}.`}
        </p>
        <div className="space-y-2">
          {([
            ['LABEL', '100 × 150 mm label', 'One sticker per label, for a thermal label printer.'],
            ['A4', 'A4 sheet, 6 stickers', 'Two columns, three rows. Cut them out and stick them on.'],
          ] as const).map(([value, label, hint]) => (
            <label key={value} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${size === value ? 'border-brand bg-brand/5' : 'border-line'}`}>
              <input type="radio" name="sticker-size" checked={size === value} onChange={() => setSize(value)} className="mt-1" />
              <span>
                <span className="block text-sm font-medium text-regantify-text">{label}</span>
                <span className="block text-xs text-neutral-500">{hint}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Close
          </button>
          <button type="button" onClick={print} disabled={!orders || printing} className={primaryBtn}>
            <Printer size={15} />
            {printing ? 'Preparing…' : 'Print'}
          </button>
        </div>
      </div>

      {orders && (
        <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 w-[210mm]">
          <div ref={sheetRef}>
            {size === 'LABEL' ? (
              sorted.map((o) => (
                <div key={o.id} style={{ width: '100mm', height: '150mm', breakAfter: 'page', overflow: 'hidden' }}>
                  <Sticker order={o} store={o.resale?.role === 'SUPPLIER' && o.resale.whiteLabel ? o.resale.whiteLabel.storeName : storeName} />
                </div>
              ))
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '94mm', gap: '0' }}>
                {sorted.map((o) => (
                  <div key={o.id} style={{ border: '1px dashed #777', overflow: 'hidden', breakInside: 'avoid' }}>
                    <Sticker order={o} store={o.resale?.role === 'SUPPLIER' && o.resale.whiteLabel ? o.resale.whiteLabel.storeName : storeName} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
