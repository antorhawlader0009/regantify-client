import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Printer, ReceiptText } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState, PageHeader, PageSection, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { paymentReceiptsApi, type Receipt, type ReceiptRow } from '../../../lib/paymentReceiptsApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { printElement } from '../../../lib/printElement';

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** The printed receipt: store, what was bought, how much and how it was paid, and the platform company's details. */
function ReceiptSheet({ receipt }: { receipt: Receipt }) {
  const c = receipt.company;
  return (
    <div className="bg-white p-8 text-sm text-neutral-800" style={{ minWidth: 520 }}>
      <div className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-4">
        <div>
          <p className="text-lg font-semibold">{c.companyName ?? 'Regantify'}</p>
          {c.address && <p className="text-neutral-600">{c.address}</p>}
          {(c.phone || c.email) && <p className="text-neutral-600">{[c.phone, c.email].filter(Boolean).join(' · ')}</p>}
          {c.taxNumber && <p className="text-neutral-600">BIN / TIN: {c.taxNumber}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tracking-wide">RECEIPT</p>
          <p className="font-medium">{receipt.number}</p>
          <p className="text-neutral-600">{formatDhakaDateTime(receipt.date)}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Received from</p>
        <p className="font-medium">{receipt.store.name}</p>
        {receipt.store.address && <p className="text-neutral-600">{receipt.store.address}</p>}
        {receipt.store.phone && <p className="text-neutral-600">{receipt.store.phone}</p>}
      </div>

      <table className="mt-5 w-full border-collapse">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-2 font-normal">For</th>
            <th className="py-2 text-right font-normal">Amount paid</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-neutral-200">
            <td className="py-3">{receipt.description}</td>
            <td className="py-3 text-right tabular-nums">{taka(receipt.amount)}</td>
          </tr>
          <tr>
            <td className="py-3 text-right font-semibold">Total paid</td>
            <td className="py-3 text-right text-base font-semibold tabular-nums">{taka(receipt.amount)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 space-y-0.5 text-xs text-neutral-600">
        <p>Paid by: {receipt.paymentMethod ?? 'PayStation'}</p>
        {receipt.transactionId && <p>Transaction ID: {receipt.transactionId}</p>}
        <p>Payment reference: {receipt.invoiceNumber}</p>
      </div>

      <p className="mt-6 border-t border-neutral-200 pt-3 text-xs text-neutral-500">
        This receipt shows the amount paid. {c.footerNote ?? ''}
      </p>
    </div>
  );
}

function ReceiptDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useQuery({ queryKey: ['payment-receipt', id], queryFn: () => paymentReceiptsApi.get(id) });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={data ? `Receipt ${data.number}` : 'Receipt'} maxWidth="max-w-2xl">
      <div className="space-y-3 p-4">
        {isLoading || !data ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-neutral-400" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-line" ref={sheetRef}>
              <ReceiptSheet receipt={data} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className={outlineBtn}>
                Close
              </button>
              <button type="button" onClick={() => sheetRef.current && void printElement(sheetRef.current, `Receipt ${data.number}`)} className={`${primaryBtn} inline-flex items-center gap-1.5`}>
                <Printer size={15} />
                Print
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

/**
 * Finance > Receipts (TellMe idea 157): a numbered receipt for everything the store paid the platform for (a plan, SMS, AI credits, a wallet top-up),
 * to print for the store's books. Owner only, like billing. Shoppers' order payments are not here.
 */
export default function Receipts() {
  const { data, isLoading } = useQuery({ queryKey: ['payment-receipts'], queryFn: paymentReceiptsApi.list });
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <PageSection>
      <PageHeader title="Receipts" description="A receipt for every plan, SMS package, AI credit pack and wallet top-up you paid for. Open one to print it." />
      {isLoading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No receipts yet" hint="When you pay for a plan, SMS, AI credits or add money to your wallet, the receipt appears here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line bg-neutral-50 text-left text-xs text-neutral-600">
                <th className="px-4 py-2.5 font-normal">Receipt</th>
                <th className="px-4 py-2.5 font-normal">Date</th>
                <th className="px-4 py-2.5 font-normal">For</th>
                <th className="px-4 py-2.5 text-right font-normal">Amount</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {data.map((r: ReceiptRow) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium">{r.number}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{formatDhakaDateTime(r.date)}</td>
                  <td className="px-4 py-2.5">{r.description}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{taka(r.amount)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button type="button" onClick={() => setOpenId(r.id)} className="text-sm font-medium text-brand hover:underline">
                      View / print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openId && <ReceiptDialog id={openId} onClose={() => setOpenId(null)} />}
    </PageSection>
  );
}
