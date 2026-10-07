import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { ordersApi } from '../../lib/ordersApi';
import { getVendorSettings } from '../../lib/vendorApi';
import { printElement } from '../../lib/printElement';
import { toast } from '../../lib/toast';
import { InvoiceSheet } from '../../pages/vendor/order/InvoiceModal';

/**
 * Orders list "Print invoices": every selected order's invoice in one print, one per page, for
 * stores packing parcels for their own rider or a courier without labels. Same page as the
 * single-order Invoice dialog (InvoiceSheet).
 */
export function BulkInvoicePrint({ ids, open, onOpenChange }: { ids: string[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const sheetsRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['bulk-invoice-orders', ids],
    queryFn: () => Promise.all(ids.map((id) => ordersApi.findOne(id))),
    enabled: open && ids.length > 0,
  });
  // Store name and address for the header; owner-only, so for staff it quietly stays empty.
  const { data: store } = useQuery({
    queryKey: ['vendor-settings'],
    queryFn: getVendorSettings,
    enabled: open,
    retry: false,
    staleTime: 5 * 60_000,
  });

  async function print() {
    if (!sheetsRef.current || !orders) return;
    setPrinting(true);
    try {
      await printElement(sheetsRef.current, `Invoices (${orders.length})`);
    } catch {
      toast.error('Could not open the print window. Please try again.');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Print invoices" maxWidth="max-w-md">
      <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
        <p className="text-neutral-600">
          {isLoading
            ? `Getting ${ids.length} ${ids.length === 1 ? 'invoice' : 'invoices'} ready…`
            : isError
              ? 'Could not load the orders. Close this and try again.'
              : `${orders?.length ?? 0} ${orders?.length === 1 ? 'invoice' : 'invoices'}, one per page. Choose “Save as PDF” in the print window to download them instead.`}
        </p>
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

      {/* What gets printed: kept off-screen, printElement copies it into its own page. */}
      {orders && (
        <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0 w-[210mm]">
          <div ref={sheetsRef}>
            {orders.map((order, i) => (
              <div key={order.id} style={i < orders.length - 1 ? { breakAfter: 'page' } : undefined}>
                <InvoiceSheet order={order} store={store} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}
