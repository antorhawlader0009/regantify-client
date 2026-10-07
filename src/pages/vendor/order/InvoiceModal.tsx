import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { orderRef, paymentMethodLabel, vendorOrderTotal, type Order } from '../../../lib/ordersApi';
import { getVendorSettings } from '../../../lib/vendorApi';
import { Dialog } from '../../../components/ui/Dialog';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { printElement } from '../../../lib/printElement';
import { toast } from '../../../lib/toast';

interface InvoiceModalProps {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}

function formatPrice(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' });
}

const paymentLabel = paymentMethodLabel;

/**
 * One order's invoice, as printed. Shared by the single-order Invoice dialog and the Orders
 * list's "Print invoices" (BulkInvoicePrint), so both print the same page.
 */
export function InvoiceSheet({ order, store }: { order: Order; store?: { storeName?: string | null; address?: string | null } }) {
  const label = 'text-[11px] font-medium uppercase tracking-wider text-neutral-500';
  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-6">
        <div className="min-w-0">
          {store?.storeName && <p className="text-lg font-semibold text-regantify-text">{store.storeName}</p>}
          {store?.address && <p className="mt-0.5 max-w-xs whitespace-pre-line text-sm text-neutral-600">{store.address}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-semibold tracking-tight text-regantify-text">Invoice</p>
          <p className="mt-1 text-sm text-neutral-600">{orderRef(order)}</p>
          <p className="text-sm text-neutral-600">Serial #{order.invoiceNumber}</p>
          <p className="text-sm text-neutral-600">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-6 border-y border-line py-5">
        <div className="min-w-0">
          <p className={`${label} mb-1.5`}>Bill to</p>
          <p className="text-sm font-medium text-regantify-text">{order.customerName}</p>
          <p className="text-sm text-neutral-600">{order.customerPhone}</p>
          <p className="text-sm text-neutral-600">{order.shippingAddress}</p>
          {(order.shippingCity || order.shippingDistrict) && (
            <p className="text-sm text-neutral-600">{[order.shippingCity, order.shippingDistrict].filter(Boolean).join(', ')}</p>
          )}
        </div>
        <div className="text-right">
          <p className={`${label} mb-1.5`}>Payment</p>
          <p className="text-sm text-regantify-text">{paymentLabel(order.paymentMethod)}</p>
          {order.paymentMethod === 'COD' && (
            <p className="mt-0.5 text-sm text-neutral-600">
              Due on delivery: <span className="font-medium text-regantify-text">{formatPrice(vendorOrderTotal(order))}</span>
            </p>
          )}
        </div>
      </div>

      <table className="mb-6 w-full">
        <thead>
          <tr className="border-b border-neutral-300 text-left">
            <th className={`${label} py-2 font-medium`}>Item</th>
            <th className={`${label} py-2 text-right font-medium`}>Price</th>
            <th className={`${label} py-2 text-right font-medium`}>Qty</th>
            <th className={`${label} py-2 text-right font-medium`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-line">
              <td className="py-2.5 pr-3 text-sm text-regantify-text">
                {item.productName}
                {Object.entries(item.selectedOptions).length > 0 && (
                  <span className="text-xs text-neutral-500">
                    {' '}
                    ({Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')})
                  </span>
                )}
              </td>
              <td className="py-2.5 text-right text-sm tabular-nums text-neutral-600">{formatPrice(item.unitPrice)}</td>
              <td className="py-2.5 text-right text-sm tabular-nums text-neutral-600">{item.quantity}</td>
              <td className="py-2.5 text-right text-sm tabular-nums text-regantify-text">{formatPrice(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="avoid-break flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Delivery</span>
            <span className="tabular-nums">{formatPrice(order.deliveryCharge)}</span>
          </div>
          {Number(order.vatAmount) > 0 && (
            <div className="flex justify-between text-neutral-600">
              {/* A POS sale with VAT-inclusive prices: the VAT is inside the subtotal, not added. */}
              <span>{order.vatIncluded ? 'Includes VAT' : 'COD charge'}</span>
              <span className="tabular-nums">{formatPrice(order.vatAmount)}</span>
            </div>
          )}
          {/* Platform Charge — shown regardless of "Fee From"
              (order.platformChargePayer). Never for ONLINE_PAYMENT:
              its fee (Payment Gateway Fee) is hidden from the vendor
              entirely, and vendorOrderTotal takes it out of Total. */}
          {order.paymentMethod !== 'ONLINE_PAYMENT' && Number(order.platformChargeAmount) > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>
                Platform charge
                {order.platformChargePayer === 'VENDOR' ? ' (paid by you)' : ''}
              </span>
              <span className="tabular-nums">{formatPrice(order.platformChargeAmount)}</span>
            </div>
          )}
          {Number(order.discountAmount) > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>Discount</span>
              <span className="tabular-nums">−{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-semibold text-regantify-text">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(vendorOrderTotal(order))}</span>
          </div>
        </div>
      </div>

      {order.customerNote && (
        <div className="avoid-break mt-8">
          <p className={`${label} mb-1`}>Note</p>
          <p className="text-sm text-neutral-700">{order.customerNote}</p>
        </div>
      )}
      <p className="mt-10 text-center text-sm text-neutral-500">Thank you for your order.</p>
    </>
  );
}

/**
 * "Download Invoice" / "Print Invoice" from the Actions menu. Rather
 * than generate a PDF on the server (a new dependency + template to
 * maintain), this renders a clean, print-ready invoice and hands off to
 * the browser's own Print dialog — "Save as PDF" there covers "Download"
 * too, which is the standard pattern for this kind of one-page document.
 * Only the invoice itself is printed (printElement), never the page or
 * the dialog around it.
 */
export function InvoiceModal({ order, onOpenChange }: InvoiceModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  // The store's name and address for the invoice header. Owner-only
  // route: for staff it fails quietly and the header just says "Invoice".
  const { data: store } = useQuery({
    queryKey: ['vendor-settings'],
    queryFn: getVendorSettings,
    enabled: Boolean(order),
    retry: false,
    staleTime: 5 * 60_000,
  });

  async function print() {
    if (!printAreaRef.current || !order) return;
    setPrinting(true);
    try {
      await printElement(printAreaRef.current, `Invoice ${orderRef(order)}`);
    } catch {
      toast.error('Could not open the print window. Please try again.');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange} title="Invoice" maxWidth="max-w-2xl">
      {order && (
        <>
          <div className="px-4 pb-2 pt-4 sm:px-6">
            <div className="rounded-lg border border-line">
              <div className="p-6 sm:p-8" ref={printAreaRef}>
                <InvoiceSheet order={order} store={store} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-4 pb-5 pt-3 sm:px-6">
            <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
              Close
            </button>
            <button type="button" onClick={print} disabled={printing} className={primaryBtn}>
              <Printer size={15} />
              {printing ? 'Preparing…' : 'Print / Save as PDF'}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
