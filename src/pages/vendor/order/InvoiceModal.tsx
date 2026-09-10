import type { Order } from '../../../lib/ordersApi';
import { Dialog } from '../../../components/ui/Dialog';

interface InvoiceModalProps {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}

function formatPrice(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * "Download Invoice" / "Print Invoice" from the Actions menu. Rather
 * than generate a PDF on the server (a new dependency + template to
 * maintain), this renders a clean, print-ready invoice and hands off to
 * the browser's own Print dialog — "Save as PDF" there covers "Download"
 * too, which is the standard pattern for this kind of one-page document.
 */
export function InvoiceModal({ order, onOpenChange }: InvoiceModalProps) {
  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange} maxWidth="max-w-2xl">
      {order && (
        <>
          <div className="p-8" id="invoice-print-area">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #invoice-print-area, #invoice-print-area * { visibility: visible; }
                #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>

            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-regantify-text">Invoice</h1>
                <p className="text-sm text-regantify-text-muted mt-1">ORDER-{order.invoiceNumber}</p>
                <p className="text-sm text-regantify-text-muted">{formatDate(order.createdAt)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-xs font-semibold text-regantify-text-muted uppercase mb-1.5">Bill To</p>
                <p className="text-sm text-regantify-text">{order.customerName}</p>
                <p className="text-sm text-regantify-text-muted">{order.customerPhone}</p>
                <p className="text-sm text-regantify-text-muted">{order.shippingAddress}</p>
                {order.shippingCity && <p className="text-sm text-regantify-text-muted">{order.shippingCity}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-regantify-text-muted uppercase mb-1.5">Payment</p>
                <p className="text-sm text-regantify-text">{order.paymentMethod}</p>
              </div>
            </div>

            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-black/10 text-left text-xs font-semibold text-regantify-text-muted uppercase">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b border-black/5">
                    <td className="py-2.5 text-sm text-regantify-text">
                      {item.productName}
                      {Object.entries(item.selectedOptions).length > 0 && (
                        <span className="text-xs text-regantify-text-muted">
                          {' '}
                          ({Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-sm text-right text-regantify-text-muted">{formatPrice(item.unitPrice)}</td>
                    <td className="py-2.5 text-sm text-right text-regantify-text-muted">{item.quantity}</td>
                    <td className="py-2.5 text-sm text-right text-regantify-text">{formatPrice(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-56 space-y-1.5 text-sm">
                <div className="flex justify-between text-regantify-text-muted">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-regantify-text-muted">
                  <span>Delivery</span>
                  <span>{formatPrice(order.deliveryCharge)}</span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-regantify-text-muted">
                    <span>Discount</span>
                    <span>−{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-regantify-text pt-1.5 border-t border-black/10">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-black/5 print:hidden">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl bg-regantify-content text-regantify-text text-sm font-medium hover:bg-black/10"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium"
            >
              Print / Save as PDF
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
