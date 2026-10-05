import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { posApi, type PosCashMovementType, type PosReceiptProfile, type PosUnlock } from '../../../lib/posApi';
import { kickDrawer, printSlip } from '../../../lib/posHardware';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { ShiftReportDialog } from '../ShiftReportView';
import { Field, PosButton, PosDialog, PosInput, taka } from '../ui';
import { ManagerApprovalDialog } from './CounterDialogs';
import { round2 } from './cartMath';

/*
 * The counter's "Cash" (POS-system-plan.md Step 10): put cash in, take cash out, or open the
 * drawer without a sale, each with a reason, and the X report of the shift so far. A cashier
 * without "Open the drawer" needs a manager's PIN. "No sale" prints a tiny slip: a receipt printer
 * whose Windows driver has "open the cash drawer" on kicks the drawer open on any print.
 */

const QUICK: Record<PosCashMovementType, string[]> = {
  PAY_IN: ['More change', 'Owner added cash'],
  PAY_OUT: ['Tea and snacks', 'Delivery man', 'Supplier', 'Owner took cash'],
  NO_SALE: ['Change for a customer', 'Checking the drawer'],
};
const TITLE: Record<PosCashMovementType, string> = { PAY_IN: 'Pay in', PAY_OUT: 'Pay out', NO_SALE: 'No sale' };

function errorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
}

export function CashDialog({
  unlock,
  sessionId,
  profile,
  onClose,
}: {
  unlock: PosUnlock;
  sessionId: string;
  profile: PosReceiptProfile | undefined;
  onClose: () => void;
}) {
  const [type, setType] = useState<PosCashMovementType>('PAY_OUT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [asking, setAsking] = useState(false);
  const [showX, setShowX] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);
  const value = Number(amount);
  const valid = !!reason.trim() && (type === 'NO_SALE' || value > 0);

  const save = useMutation({
    mutationFn: (approvalId?: string) => posApi.addMovement(sessionId, { type, amount: type === 'NO_SALE' ? undefined : round2(value), reason: reason.trim(), approvalId }, unlock.token),
    onSuccess: (row) => {
      toast.success(type === 'NO_SALE' ? 'Drawer opening recorded' : `${TITLE[type]} of ${taka(row.amount)} saved. The drawer should now hold ${taka(row.expectedCash)}.`);
      // Open the drawer: straight through a connected printer (Step 12); without one, "No sale"
      // prints the small slip so the printer driver's "open drawer" setting opens it.
      void kickDrawer()
        .then((kicked) => {
          if (!kicked && type === 'NO_SALE' && slipRef.current && profile) return printSlip(slipRef.current, 'No sale', profile.widthMm);
        })
        .catch(() => toast.error('The drawer couldn’t be opened from here. Check the printer.'));
      onClose();
    },
    onError: (err) => {
      if (errorCode(err) === 'POS_APPROVAL_REQUIRED') {
        setAsking(true);
        return;
      }
      toast.error(apiErrorMessage(err, 'That didn’t save. Try again.'));
    },
  });

  if (showX) return <ShiftReportDialog sessionId={sessionId} token={unlock.token} onClose={onClose} />;

  return (
    <>
      <PosDialog open onOpenChange={(o) => !o && onClose()} title="Cash drawer">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !save.isPending) save.mutate(undefined);
          }}
        >
          <div role="group" aria-label="What happened" className="inline-flex overflow-hidden rounded-md border border-pos-line">
            {(['PAY_IN', 'PAY_OUT', 'NO_SALE'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => {
                  setType(t);
                  setReason('');
                }}
                className={`h-9 px-3 text-sm ${type === t ? 'bg-pos-ink text-white' : ''}`}
              >
                {TITLE[t]}
              </button>
            ))}
          </div>
          <p className="text-sm text-pos-muted">
            {type === 'PAY_IN'
              ? 'Cash put into the drawer that isn’t a sale.'
              : type === 'PAY_OUT'
                ? 'Cash taken out of the drawer for the shop.'
                : 'Opening the drawer without a sale. No money moves; it’s only recorded.'}
          </p>
          {type !== 'NO_SALE' && (
            <Field label="Amount">
              <PosInput autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg tabular-nums" />
            </Field>
          )}
          <Field label="What for">
            <PosInput maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {QUICK[type].map((q) => (
              <button key={q} type="button" onClick={() => setReason(q)} className="h-8 rounded-full border border-pos-line px-3 text-xs hover:border-pos-ink">
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <PosButton variant="quiet" onClick={() => setShowX(true)}>
              <FileText size={15} aria-hidden />
              X report
            </PosButton>
            <div className="flex gap-2">
              <PosButton onClick={onClose}>Cancel</PosButton>
              <PosButton type="submit" variant="primary" disabled={!valid || save.isPending}>
                {save.isPending ? 'Saving…' : type === 'NO_SALE' ? 'Open drawer' : `Save ${value > 0 ? taka(value) : ''}`}
              </PosButton>
            </div>
          </div>
        </form>
        {profile && (
          <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0">
            <div ref={slipRef} className="bg-white text-center text-black" style={{ width: `${profile.widthMm - 8}mm`, padding: '2mm 0', fontFamily: 'Arial, sans-serif', fontSize: '9pt' }}>
              <p className="font-bold">{profile.storeName}</p>
              <p>NO SALE</p>
              <p>{unlock.cashier.displayName}</p>
              <p>{new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</p>
            </div>
          </div>
        )}
      </PosDialog>
      {asking && (
        <ManagerApprovalDialog
          ask={{ discountPercent: 0, priceOverride: false, cashMovement: true }}
          token={unlock.token}
          onApproved={(a) => {
            setAsking(false);
            save.mutate(a.id);
          }}
          onClose={() => setAsking(false)}
        />
      )}
    </>
  );
}
