import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { handoverApi } from '../../../lib/handoverApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/**
 * The printable courier handover sheet (TellMe idea 18), opened in a new tab from Orders > Courier Handover. Mounted
 * outside VendorLayout so only the sheet reaches the printer. It shows the parcels as they were when the sheet was
 * made, the count and cash to collect, and two signature blocks: the store's and the courier's.
 */
export default function HandoverSheetPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { data: sheet, isLoading, isError, error } = useQuery({
    queryKey: ['handover-sheet', id],
    queryFn: () => handoverApi.get(id!),
    enabled: Boolean(id),
  });

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      <style>{`@page { size: A4; margin: 12mm; }
        @media print { body { background: #fff; } .handover-paper { box-shadow: none !important; margin: 0 !important; width: auto !important; padding: 0 !important; } }`}</style>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3 print:hidden">
        <h1 className="text-[15px] font-semibold text-regantify-text">Handover sheet{sheet ? ` ${sheet.number}` : ''}</h1>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!sheet}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm text-white hover:bg-brand-dark disabled:opacity-60"
        >
          <Printer size={14} />
          Print
        </button>
        <Link to="/vendor/orders/handover" className="text-sm text-neutral-600 underline-offset-2 hover:underline">
          Back to Courier Handover
        </Link>
      </div>

      {isLoading && <p className="p-8 text-center text-sm text-neutral-500">Loading…</p>}
      {isError && <p className="p-8 text-center text-sm text-red-600">{apiErrorMessage(error, 'Could not load this sheet.')}</p>}

      {sheet && (
        <div className="handover-paper mx-auto my-6 w-[210mm] max-w-full bg-white p-[12mm] text-[13px] text-black shadow">
          <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-600">Courier handover sheet</p>
              <h2 className="text-[22px] font-bold leading-tight">{sheet.storeName}</h2>
              <p className="mt-1 text-[13px]">
                Courier: <b>{sheet.courier}</b>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[22px] font-bold leading-tight">Sheet {sheet.number}</p>
              <p className="mt-1 text-[12px] text-neutral-700">{formatDhakaDateTime(sheet.createdAt)}</p>
              <p className="text-[12px] text-neutral-700">Made by {sheet.actor}</p>
            </div>
          </div>

          {sheet.note && <p className="mt-3 text-[12.5px]">Note: {sheet.note}</p>}

          <table className="mt-4 w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-y border-black bg-neutral-100 text-left">
                <th className="w-8 px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">Order</th>
                {sheet.courier === 'Mixed' && <th className="px-2 py-1.5">Courier</th>}
                <th className="px-2 py-1.5">Tracking ID</th>
                <th className="px-2 py-1.5">Customer</th>
                <th className="px-2 py-1.5">District</th>
                <th className="px-2 py-1.5 text-right">Cash to collect</th>
                <th className="w-10 px-2 py-1.5 text-center">Got</th>
              </tr>
            </thead>
            <tbody>
              {sheet.rows.map((r, i) => (
                <tr key={r.orderId} className="border-b border-neutral-300 [break-inside:avoid]">
                  <td className="px-2 py-1.5">{i + 1}</td>
                  <td className="px-2 py-1.5 font-medium">{r.orderRef}</td>
                  {sheet.courier === 'Mixed' && <td className="px-2 py-1.5">{r.courier}</td>}
                  <td className="px-2 py-1.5 font-mono text-[11.5px]">{r.trackingId ?? '–'}</td>
                  <td className="px-2 py-1.5">{r.customerName}</td>
                  <td className="px-2 py-1.5">{r.district ?? '–'}</td>
                  <td className="px-2 py-1.5 text-right">{taka(r.codAmount)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className="inline-block h-3.5 w-3.5 border border-black align-middle" />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold">
                <td colSpan={sheet.courier === 'Mixed' ? 6 : 5} className="px-2 py-2">
                  Total: {sheet.parcelCount} {sheet.parcelCount === 1 ? 'parcel' : 'parcels'}
                </td>
                <td className="px-2 py-2 text-right">{taka(Number(sheet.codTotal))}</td>
                <td />
              </tr>
            </tfoot>
          </table>

          <div className="mt-10 grid grid-cols-2 gap-10 [break-inside:avoid]">
            <div>
              <p className="font-bold">Handed over by (store)</p>
              <div className="mt-8 border-b border-black" />
              <p className="mt-1 text-[11px] text-neutral-600">Name and signature</p>
              <div className="mt-6 border-b border-black" />
              <p className="mt-1 text-[11px] text-neutral-600">Date and time</p>
            </div>
            <div>
              <p className="font-bold">Received by (courier)</p>
              <div className="mt-8 border-b border-black" />
              <p className="mt-1 text-[11px] text-neutral-600">Name, phone and signature</p>
              <div className="mt-6 border-b border-black" />
              <p className="mt-1 text-[11px] text-neutral-600">Parcels received (count) and time</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
