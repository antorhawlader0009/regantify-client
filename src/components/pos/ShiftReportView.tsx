import { forwardRef, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { BDT_NOTES, posApi, TENDER_LABEL, type PosReceiptProfile, type PosShiftReport, type PosTender } from '../../lib/posApi';
import { printSlip } from '../../lib/posHardware';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { RECEIPT_PROFILE_KEY } from './receipt/useReceiptPrinter';
import { PosButton, PosDialog } from './ui';

/*
 * The X and Z reports (POS-system-plan.md Step 10), drawn as a slip in the receipt's width so the
 * same thing shows on screen and prints on the counter's thermal printer (through the OS print
 * dialog, like the sale receipt). Plain black on white, "Tk" and Latin digits like PosReceiptSlip.
 */

const money = (n: number) => `Tk ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dhaka = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const methodName = (m: string) => TENDER_LABEL[m as PosTender] ?? m;
const MOVE: Record<string, string> = { PAY_IN: 'Pay in', PAY_OUT: 'Pay out', NO_SALE: 'No sale' };

function Row({ left, right, bold }: { left: React.ReactNode; right?: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-[2mm] ${bold ? 'font-bold' : ''}`}>
      <span className="min-w-0 break-words">{left}</span>
      {right !== undefined && <span className="shrink-0 tabular-nums">{right}</span>}
    </div>
  );
}

export const ShiftReportSlip = forwardRef<HTMLDivElement, { report: PosShiftReport; profile: Pick<PosReceiptProfile, 'storeName' | 'widthMm'> }>(function ShiftReportSlip(
  { report: r, profile },
  ref,
) {
  const narrow = profile.widthMm === 58;
  const rule = <div className="my-[1.5mm] border-t border-dashed border-black" />;
  const z = r.kind === 'Z';
  return (
    <div
      ref={ref}
      className="bg-white text-black"
      style={{ width: `${profile.widthMm - (narrow ? 6 : 8)}mm`, margin: '0 auto', padding: '2mm 0 4mm', fontFamily: "'IBM Plex Sans', Arial, sans-serif", fontSize: narrow ? '8pt' : '9pt', lineHeight: 1.35 }}
    >
      <div className="text-center">
        <p style={{ fontSize: narrow ? '11pt' : '13pt' }} className="font-bold leading-tight">
          {profile.storeName}
        </p>
        <p className="mt-[0.5mm] font-bold">{z ? 'Z report (shift closed)' : 'X report (shift so far)'}</p>
        {r.rebuilt && <p>Rebuilt from the shift's records</p>}
      </div>
      {rule}
      <Row left={`Counter: ${r.register}`} />
      <Row left={`Opened: ${dhaka(r.openedAt)}`} />
      <Row left={`By: ${r.openedByName}`} />
      {z && r.closedAt && <Row left={`Closed: ${dhaka(r.closedAt)}`} />}
      {z && r.closedByName && <Row left={`By: ${r.closedByName}`} />}
      {!z && <Row left={`Printed: ${dhaka(r.generatedAt)}`} />}
      {rule}
      <Row left={<b>Sales</b>} right={`${r.sales.count} (${r.sales.items} items)`} />
      <Row left="Subtotal" right={money(r.sales.subtotal)} />
      {r.sales.discounts > 0 && <Row left="Discounts" right={`-${money(r.sales.discounts)}`} />}
      {r.sales.vatAdded > 0 && <Row left="VAT added" right={money(r.sales.vatAdded)} />}
      <Row left="Sales total" right={money(r.sales.total)} bold />
      {r.sales.vat > 0 && <Row left="  of which VAT" right={money(r.sales.vat)} />}
      {r.returns.count > 0 && <Row left={`Returns (${r.returns.count})`} right={`-${money(r.returns.amount)}`} />}
      {r.returns.voids > 0 && <Row left={`Voids (${r.returns.voids})`} right={`-${money(r.returns.voidAmount)}`} />}
      <Row left="Net" right={money(r.net)} bold />
      {r.onDue > 0 && <Row left="  put on customers' due" right={money(r.onDue)} />}
      {rule}
      <Row left={<b>By payment</b>} />
      {r.byMethod.length === 0 && <Row left="Nothing yet" />}
      {r.byMethod.map((m) => (
        <div key={m.method} className="mt-[0.5mm]">
          <Row left={methodName(m.method)} right={money(m.net)} />
          {(m.dueCollected > 0 || m.refunds > 0) && (
            <p className="pl-[2mm]">
              sales {money(m.sales)}
              {m.dueCollected > 0 && `, due paid ${money(m.dueCollected)}`}
              {m.refunds > 0 && `, refunds -${money(m.refunds)}`}
            </p>
          )}
        </div>
      ))}
      {r.byCashier.length > 0 && (
        <>
          {rule}
          <Row left={<b>By cashier</b>} />
          {r.byCashier.map((c) => (
            <Row key={c.name} left={`${c.name} (${c.count})`} right={money(c.total)} />
          ))}
        </>
      )}
      {rule}
      <Row left={<b>Cash drawer</b>} />
      <Row left="Opening float" right={money(r.cash.float)} />
      <Row left="+ Cash sales" right={money(r.cash.sales)} />
      {r.cash.dueCollected > 0 && <Row left="+ Due paid in cash" right={money(r.cash.dueCollected)} />}
      {r.cash.payIns > 0 && <Row left="+ Pay ins" right={money(r.cash.payIns)} />}
      {r.cash.refunds > 0 && <Row left="- Cash refunds" right={money(r.cash.refunds)} />}
      {r.cash.payOuts > 0 && <Row left="- Pay outs" right={money(r.cash.payOuts)} />}
      <Row left="Expected in drawer" right={money(r.cash.expected)} bold />
      {z && r.countedCash !== undefined && (
        <>
          <Row left="Counted" right={money(r.countedCash)} bold />
          <Row left={(r.variance ?? 0) === 0 ? 'Difference' : (r.variance ?? 0) < 0 ? 'SHORT' : 'OVER'} right={money(Math.abs(r.variance ?? 0))} bold />
          {r.countedNotes && Object.keys(r.countedNotes).length > 0 && (
            <div className="mt-[0.5mm]">
              {BDT_NOTES.filter((n) => r.countedNotes?.[String(n)]).map((n) => (
                <Row key={n} left={`  ${n} x ${r.countedNotes![String(n)]}`} right={money(n * r.countedNotes![String(n)])} />
              ))}
            </div>
          )}
          {r.closingNote && <p className="mt-[0.5mm] whitespace-pre-line">Note: {r.closingNote}</p>}
        </>
      )}
      {r.movements.length > 0 && (
        <>
          {rule}
          <Row left={<b>Cash in and out</b>} right={r.noSales > 0 ? `${r.noSales} no sale` : undefined} />
          {r.movements.map((m, i) => (
            <div key={i} className="mt-[0.5mm]">
              <Row left={`${MOVE[m.type]}: ${m.reason}`} right={m.type === 'NO_SALE' ? '' : `${m.type === 'PAY_OUT' ? '-' : ''}${money(m.amount)}`} />
              <p className="pl-[2mm]">
                {dhaka(m.createdAt).slice(-5)} {m.byName}
                {m.approvedByName && `, ok ${m.approvedByName}`}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
});

/** Shows a shift's X or Z report and prints it on the counter's paper. */
export function ShiftReportDialog({ sessionId, token, onClose }: { sessionId: string; /** The counter's unlock, so a cashier can read their shift's X. */ token?: string; onClose: () => void }) {
  const report = useQuery({ queryKey: ['pos', 'shift-report', sessionId], queryFn: () => posApi.shiftReport(sessionId, token), staleTime: 0 });
  const profile = useQuery({ queryKey: RECEIPT_PROFILE_KEY, queryFn: posApi.receiptProfile, staleTime: 60_000 });
  const slipRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const paper = profile.data ?? { storeName: '', widthMm: 80 as const };

  const print = () => {
    if (!slipRef.current || !report.data) return;
    setPrinting(true);
    printSlip(slipRef.current, `${report.data.kind} report ${report.data.register}`, paper.widthMm)
      .catch(() => toast.error('Could not open the print window. Please try again.'))
      .finally(() => setPrinting(false));
  };

  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title={report.data ? `${report.data.kind} report` : 'Shift report'} width="max-w-md">
      {report.isPending ? (
        <p className="text-sm text-pos-muted">Loading…</p>
      ) : report.isError ? (
        <p className="text-sm text-pos-alert">{apiErrorMessage(report.error, 'The report couldn’t load.')}</p>
      ) : (
        <>
          {report.data.kind === 'X' && <p className="mb-3 text-xs text-pos-muted">The shift so far. Reading it changes nothing; the Z report is made when the register is closed.</p>}
          <div className="max-h-[60vh] overflow-y-auto rounded-md border border-pos-line bg-white py-2">
            <ShiftReportSlip ref={slipRef} report={report.data} profile={paper} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {report.data.kind === 'X' && <PosButton onClick={() => void report.refetch()}>Refresh</PosButton>}
            <PosButton variant="primary" onClick={print} disabled={printing}>
              <Printer size={15} aria-hidden />
              {printing ? 'Opening…' : 'Print'}
            </PosButton>
          </div>
        </>
      )}
    </PosDialog>
  );
}
