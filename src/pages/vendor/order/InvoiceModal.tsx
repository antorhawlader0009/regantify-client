import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { orderRef, paymentMethodLabel, vendorOrderTotal, type Order } from '../../../lib/ordersApi';
import { getVendorSettings } from '../../../lib/vendorApi';
import { invoiceApi, DEFAULT_INVOICE_SETTINGS, type InvoicePrintData } from '../../../lib/invoiceApi';
import { invoicePolicyLine } from '../../../lib/productPolicy';
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

/** The invoice read, shared by the dialog and the bulk print: Store > Invoice, the store header and the warranty default. */
export function useInvoicePrintData(enabled: boolean) {
  return useQuery({
    queryKey: ['invoice-print-data'],
    queryFn: invoiceApi.printData,
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

/** Printed width of an 80 mm receipt roll, and its page setup for printElement. */
export const RECEIPT_PAGE = { size: '80mm auto', padding: '4mm' } as const;

/** The paper options for printElement from the invoice settings. */
export function invoicePage(invoice?: InvoicePrintData) {
  return invoice?.settings.paperSize === 'RECEIPT80' ? RECEIPT_PAGE : undefined;
}

/**
 * One order's invoice, as printed. Shared by the single-order Invoice dialog, the Orders
 * list's "Print invoices" (BulkInvoicePrint) and the preview on Store > Invoice, so all of
 * them print the same page. `invoice` is Store > Invoice plus the store header; without it
 * the page looks as it did before that page existed.
 */
export function InvoiceSheet({
  order,
  store,
  invoice,
}: {
  order: Order;
  store?: { storeName?: string | null; address?: string | null };
  invoice?: InvoicePrintData;
}) {
  const label = 'text-[11px] font-medium uppercase tracking-wider text-neutral-500';
  const s = invoice?.settings ?? DEFAULT_INVOICE_SETTINGS;
  const receipt = s.paperSize === 'RECEIPT80';
  const header = invoice?.store ?? store;
  const address = s.addressOverride || header?.address;
  const discount = Number(order.discountAmount);
  // A gift (TellMe idea 57) can be printed without prices: just the items and how many.
  const hidePrices = order.isGift === true && order.hidePricesOnInvoice === true;
  const giftWrap = Number(order.giftWrapCharge ?? 0);
  const delivery = Number(order.deliveryCharge);
  // A line the store turned off is folded into the subtotal, so the figures still add up to the total.
  const subtotal = Number(order.subtotal) + (s.showDeliveryCharge ? 0 : delivery) - (s.showDiscount ? 0 : discount);
  return (
    <div style={receipt ? { width: '72mm', fontSize: '12px' } : undefined}>
      <div className={`mb-8 flex items-start justify-between gap-6 ${receipt ? 'flex-col !gap-3' : ''}`}>
        <div className="min-w-0">
          {s.showLogo && invoice?.store.logoUrl && (
            <img src={invoice.store.logoUrl} alt="" className="mb-2 h-12 max-w-[160px] object-contain" />
          )}
          {header?.storeName && <p className="text-lg font-semibold text-regantify-text">{header.storeName}</p>}
          {address && <p className="mt-0.5 max-w-xs whitespace-pre-line text-sm text-neutral-600">{address}</p>}
          {s.taxNumber && <p className="mt-0.5 text-sm text-neutral-600">BIN / Trade licence: {s.taxNumber}</p>}
        </div>
        <div className={`shrink-0 ${receipt ? 'text-left' : 'text-right'}`}>
          <p className="text-2xl font-semibold tracking-tight text-regantify-text">Invoice</p>
          <p className="mt-1 text-sm text-neutral-600">{orderRef(order)}</p>
          <p className="text-sm text-neutral-600">Serial #{order.invoiceNumber}</p>
          <p className="text-sm text-neutral-600">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className={`mb-8 grid gap-6 border-y border-line py-5 ${receipt ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className="min-w-0">
          <p className={`${label} mb-1.5`}>Bill to</p>
          <p className="text-sm font-medium text-regantify-text">{order.customerName}</p>
          <p className="text-sm text-neutral-600">{order.customerPhone}</p>
          <p className="text-sm text-neutral-600">{order.shippingAddress}</p>
          {(order.shippingCity || order.shippingDistrict) && (
            <p className="text-sm text-neutral-600">{[order.shippingCity, order.shippingDistrict].filter(Boolean).join(', ')}</p>
          )}
        </div>
        {!hidePrices && (
        <div className={receipt ? 'text-left' : 'text-right'}>
          <p className={`${label} mb-1.5`}>Payment</p>
          <p className="text-sm text-regantify-text">{paymentLabel(order.paymentMethod)}</p>
          {order.paymentMethod === 'COD' && (
            <p className="mt-0.5 text-sm text-neutral-600">
              Due on delivery: <span className="font-medium text-regantify-text">{formatPrice(vendorOrderTotal(order))}</span>
            </p>
          )}
        </div>
        )}
      </div>

      <table className="mb-6 w-full">
        <thead>
          <tr className="border-b border-neutral-300 text-left">
            <th className={`${label} py-2 font-medium`}>Item</th>
            {!hidePrices && <th className={`${label} py-2 text-right font-medium`}>Price</th>}
            <th className={`${label} py-2 text-right font-medium`}>Qty</th>
            {!hidePrices && <th className={`${label} py-2 text-right font-medium`}>Total</th>}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-line">
              <td className="py-2.5 pr-3 text-sm text-regantify-text">
                <div className="flex items-start gap-2">
                  {s.showProductImage && item.productImage && (
                    <img src={item.productImage} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                  )}
                  <div className="min-w-0">
                    {item.productName}
                    {Object.entries(item.selectedOptions).length > 0 && (
                      <span className="text-xs text-neutral-500">
                        {' '}
                        ({Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')})
                      </span>
                    )}
                    {s.showSku && item.productSku && <p className="text-xs text-neutral-500">SKU: {item.productSku}</p>}
                    {item.customValues && item.customValues.length > 0 && (
                      <p className="text-xs text-neutral-600">{item.customValues.map((v) => `${v.label}: ${v.value}`).join(' · ')}</p>
                    )}
                    {/* Warranty and return policy (TellMe idea 54): the buyer's proof. Nothing when none is set. */}
                    {(() => {
                      const policy = invoicePolicyLine(item.product, invoice?.policyDefaults);
                      return policy ? <p className="text-xs text-neutral-500">{policy}</p> : null;
                    })()}
                  </div>
                </div>
              </td>
              {!hidePrices && <td className="py-2.5 text-right text-sm tabular-nums text-neutral-600">{formatPrice(item.unitPrice)}</td>}
              <td className="py-2.5 text-right text-sm tabular-nums text-neutral-600">{item.quantity}</td>
              {!hidePrices && <td className="py-2.5 text-right text-sm tabular-nums text-regantify-text">{formatPrice(item.lineTotal)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {!hidePrices && (
      <div className="avoid-break flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPrice(String(subtotal))}</span>
          </div>
          {s.showDeliveryCharge && (
            <div className="flex justify-between text-neutral-600">
              <span>Delivery</span>
              <span className="tabular-nums">{formatPrice(order.deliveryCharge)}</span>
            </div>
          )}
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
          {giftWrap > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>Gift wrap</span>
              <span className="tabular-nums">{formatPrice(String(giftWrap))}</span>
            </div>
          )}
          {s.showDiscount && discount > 0 && (
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
      )}

      {order.isGift && order.giftMessage && (
        <div className="avoid-break mt-8 rounded border border-neutral-300 px-4 py-3 text-center text-sm italic text-neutral-700">“{order.giftMessage}”</div>
      )}

      {order.customerNote && (
        <div className="avoid-break mt-8">
          <p className={`${label} mb-1`}>Note</p>
          <p className="text-sm text-neutral-700">{order.customerNote}</p>
        </div>
      )}
      {s.paymentInfo && (
        <div className="avoid-break mt-6">
          <p className={`${label} mb-1`}>Pay to</p>
          <p className="whitespace-pre-line text-sm text-neutral-700">{s.paymentInfo}</p>
        </div>
      )}
      {s.terms && (
        <div className="avoid-break mt-6">
          <p className={`${label} mb-1`}>Terms</p>
          <p className="whitespace-pre-line text-xs text-neutral-600">{s.terms}</p>
        </div>
      )}
      {s.signatureUrl && (
        <div className="avoid-break mt-8 flex justify-end">
          <div className="text-center">
            <img src={s.signatureUrl} alt="" className="mx-auto h-14 max-w-[180px] object-contain" />
            <p className="mt-1 border-t border-neutral-300 pt-1 text-xs text-neutral-500">Authorised signature</p>
          </div>
        </div>
      )}
      <p className="mt-10 whitespace-pre-line text-center text-sm text-neutral-500">{s.thankYouMessage || 'Thank you for your order.'}</p>
    </div>
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

  const { data: invoice } = useInvoicePrintData(Boolean(order));

  async function print() {
    if (!printAreaRef.current || !order) return;
    setPrinting(true);
    try {
      await printElement(printAreaRef.current, `Invoice ${orderRef(order)}`, invoicePage(invoice));
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
                <InvoiceSheet order={order} store={store} invoice={invoice} />
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
