import { CloudOff, Printer, RefreshCw } from 'lucide-react';
import type { PosReceipt } from '../../../lib/posApi';
import type { QueuedSale } from '../../../lib/posOffline';
import { PosButton, PosDialog, taka } from '../ui';

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' });

/** The counter's offline sales (POS-system-plan.md Step 13): waiting to be sent, or refused by the server with the reason. */
export function SyncListDialog({
  online,
  syncing,
  waiting,
  failed,
  onSync,
  onRetry,
  onReprint,
  onClose,
}: {
  online: boolean;
  syncing: boolean;
  waiting: QueuedSale[];
  failed: QueuedSale[];
  onSync: () => void;
  onRetry: (id: string) => void;
  onReprint: (receipt: PosReceipt) => void;
  onClose: () => void;
}) {
  const row = (q: QueuedSale, extra?: React.ReactNode) => (
    <li key={q.clientSaleId} className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {q.receipt.publicCode} <span className="font-normal text-pos-muted">· {time(q.queuedAt)}</span>
        </p>
        <p className="text-xs text-pos-muted">
          {q.receipt.lines.reduce((s, l) => s + l.quantity, 0)} items · {q.receipt.cashierName}
        </p>
        {q.error && <p className="mt-1 text-xs text-pos-alert">{q.error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-sm tabular-nums">{taka(q.receipt.total)}</span>
        <PosButton variant="quiet" className="h-8 px-2" onClick={() => onReprint(q.receipt)} aria-label={`Reprint ${q.receipt.publicCode}`}>
          <Printer size={14} />
        </PosButton>
        {extra}
      </div>
    </li>
  );

  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title="Offline sales" width="max-w-lg">
      <div className="space-y-4">
        <p className="flex items-start gap-2 text-sm">
          {online ? <RefreshCw size={16} className="mt-0.5 shrink-0" aria-hidden /> : <CloudOff size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />}
          {online
            ? 'Back online. Waiting sales are being sent, oldest first.'
            : 'No internet. Keep selling: sales are kept on this computer and sent by themselves when the internet is back. Don’t clear the browser’s data meanwhile.'}
        </p>
        {waiting.length === 0 && failed.length === 0 ? (
          <p className="text-sm text-pos-muted">Nothing waiting.</p>
        ) : (
          <>
            {waiting.length > 0 && (
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wide text-pos-muted">Waiting ({waiting.length})</h3>
                <ul className="divide-y divide-pos-line">{waiting.map((q) => row(q))}</ul>
              </section>
            )}
            {failed.length > 0 && (
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wide text-pos-alert">Refused by the server ({failed.length})</h3>
                <p className="mb-1 text-xs text-pos-muted">These were sold and paid. Fix what the message says (e.g. bring back a deleted product), then try again; or ask the store owner.</p>
                <ul className="divide-y divide-pos-line">
                  {failed.map((q) =>
                    row(
                      q,
                      <PosButton className="h-8 px-2 text-xs" onClick={() => onRetry(q.clientSaleId)} disabled={!online}>
                        Try again
                      </PosButton>,
                    ),
                  )}
                </ul>
              </section>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          {waiting.length > 0 && (
            <PosButton onClick={onSync} disabled={syncing}>
              {syncing ? 'Sending…' : 'Send now'}
            </PosButton>
          )}
          <PosButton variant="primary" onClick={onClose}>
            Close
          </PosButton>
        </div>
      </div>
    </PosDialog>
  );
}
