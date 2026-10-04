import { forwardRef, useRef, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Printer, Search } from 'lucide-react';
import { posApi, TENDER_LABEL, type DuePaymentMethod, type PosDueLookup, type PosDuePayment, type PosReceiptProfile, type PosTender, type PosUnlock } from '../../../lib/posApi';
import { printElement } from '../../../lib/printElement';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Field, PosButton, PosDialog, PosInput, taka } from '../ui';
import { round2 } from './cartMath';

/*
 * "Collect due" at the counter (POS-system-plan.md Step 9): find the customer by phone, see what
 * they owe, take some or all of it (cash goes into this shift's drawer), and print a payment slip.
 */

export function CollectDueDialog({
  unlock,
  sessionId,
  methods,
  profile,
  onClose,
}: {
  unlock: PosUnlock;
  sessionId: string;
  /** The counter's tenders (POS settings); a due is paid back in cash or one of these. */
  methods: PosTender[];
  profile: PosReceiptProfile | undefined;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [who, setWho] = useState<PosDueLookup | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<DuePaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [done, setDone] = useState<PosDuePayment | null>(null);
  const payMethods = (['CASH', ...methods.filter((m) => m !== 'CASH' && m !== 'GIFT_CARD' && m !== 'DUE')] as DuePaymentMethod[]).filter((m, i, all) => all.indexOf(m) === i);

  const find = useMutation({
    mutationFn: (p: string) => posApi.dueLookup(p, unlock.token),
    onSuccess: (r) => {
      setWho(r);
      setAmount(r.balance > 0 ? String(r.balance) : '');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t look that up. Try again.')),
  });

  const value = Number(amount);
  const valid = !!who && who.balance > 0 && value > 0 && value <= who.balance + 0.001 && (method !== 'OTHER' || !!reference.trim());

  const collect = useMutation({
    mutationFn: () => posApi.collectDue({ sessionId, phone: who!.phone, amount: round2(value), method, reference: reference.trim() || undefined }, unlock.token),
    onSuccess: setDone,
    onError: (err) => toast.error(apiErrorMessage(err, 'The payment didn’t go through. Try again.')),
  });

  // The slip prints from an off-screen copy, on the store's paper width.
  const slipRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const print = () => {
    if (!slipRef.current || !profile || !done) return;
    setPrinting(true);
    printElement(slipRef.current, `Due payment ${done.phone}`, { size: `${profile.widthMm}mm auto`, padding: '0' })
      .catch(() => toast.error('Could not open the print window. Please try again.'))
      .finally(() => setPrinting(false));
  };

  if (done) {
    return (
      <PosDialog open onOpenChange={(o) => !o && onClose()} title="Due payment taken">
        <div className="space-y-4 text-center">
          <CheckCircle2 size={36} className="mx-auto text-pos-go" aria-hidden />
          <p className="text-sm text-pos-muted">
            {done.name ?? done.phone} paid by {TENDER_LABEL[done.method]}
          </p>
          <p className="text-3xl font-semibold tabular-nums">{taka(done.amount)}</p>
          <p className="text-sm">
            Still owes <span className="font-semibold tabular-nums">{taka(done.balanceAfter)}</span>
          </p>
          <div className="flex justify-center gap-2">
            <PosButton onClick={print} disabled={printing || !profile}>
              <Printer size={15} aria-hidden />
              {printing ? 'Opening…' : 'Print slip'}
            </PosButton>
            <PosButton variant="primary" onClick={onClose}>
              Done
            </PosButton>
          </div>
        </div>
        {profile && (
          <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0">
            <DuePaymentSlip ref={slipRef} payment={done} profile={profile} />
          </div>
        )}
      </PosDialog>
    );
  }

  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title="Collect due">
      <div className="space-y-4">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (phone.trim()) find.mutate(phone.trim());
          }}
          className="flex gap-2"
        >
          <label className="relative flex-1">
            <span className="sr-only">Customer phone</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted" aria-hidden />
            <PosInput autoFocus inputMode="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Customer phone, 01XXXXXXXXX" className="pl-9" />
          </label>
          <PosButton type="submit" variant="primary" disabled={!phone.trim() || find.isPending}>
            Find
          </PosButton>
        </form>

        {who && (
          <>
            <div className="flex items-baseline justify-between rounded-lg bg-pos-page px-4 py-3">
              <span className="text-sm">
                {who.name ?? 'Customer'} <span className="text-pos-muted">({who.phone})</span> owes
              </span>
              <span className="text-2xl font-semibold tabular-nums">{taka(who.balance)}</span>
            </div>
            {who.balance <= 0 ? (
              <p className="text-sm text-pos-muted">Nothing to collect.</p>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (valid && !collect.isPending) collect.mutate();
                }}
              >
                <Field label="Amount paid now" hint={value > who.balance ? `More than they owe (${taka(who.balance)}).` : undefined}>
                  <div className="flex gap-2">
                    <PosInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg tabular-nums" />
                    <PosButton className="h-12" onClick={() => setAmount(String(who.balance))}>
                      All
                    </PosButton>
                  </div>
                </Field>
                <Field label="Paid by">
                  <div className="flex flex-wrap gap-1.5">
                    {payMethods.map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={method === m}
                        onClick={() => setMethod(m)}
                        className={`h-9 rounded-md border px-3 text-sm ${method === m ? 'border-pos-ink bg-pos-ink text-white' : 'border-pos-line'}`}
                      >
                        {TENDER_LABEL[m]}
                      </button>
                    ))}
                  </div>
                </Field>
                {method !== 'CASH' && (
                  <Field label={method === 'OTHER' ? 'Which method?' : 'Transaction ID (optional)'}>
                    <PosInput maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} />
                  </Field>
                )}
                {value > 0 && value <= who.balance && (
                  <p className="text-sm text-pos-muted">
                    They’ll still owe <span className="font-medium text-pos-ink tabular-nums">{taka(round2(who.balance - value))}</span>.
                  </p>
                )}
                <PosButton type="submit" variant="primary" className="h-12 w-full text-base" disabled={!valid || collect.isPending}>
                  {collect.isPending ? 'Saving…' : `Take ${value > 0 ? taka(value) : 'payment'}`}
                </PosButton>
              </form>
            )}
          </>
        )}
      </div>
    </PosDialog>
  );
}

const SLIP = {
  en: { title: 'Due payment', date: 'Date', customer: 'Customer', paid: 'Paid', by: 'By', owes: 'Still owes', counter: 'Counter', cashier: 'Cashier', thanks: 'Thank you' },
  bn: { title: 'বাকি পরিশোধ', date: 'তারিখ', customer: 'ক্রেতা', paid: 'পরিশোধ', by: 'মাধ্যম', owes: 'বাকি রইল', counter: 'কাউন্টার', cashier: 'ক্যাশিয়ার', thanks: 'ধন্যবাদ' },
} as const;

const money = (n: number) => `Tk ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The printed slip for a due payment: same paper, font and "Tk" as the sale receipt (PosReceiptSlip). */
export const DuePaymentSlip = forwardRef<HTMLDivElement, { payment: PosDuePayment; profile: PosReceiptProfile }>(function DuePaymentSlip({ payment, profile }, ref) {
  const t = SLIP[profile.language];
  const narrow = profile.widthMm === 58;
  const date = new Date(payment.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const row = (left: string, right?: string) => (
    <div className="flex justify-between gap-[2mm]">
      <span className="min-w-0 break-words">{left}</span>
      {right !== undefined && <span className="shrink-0 tabular-nums">{right}</span>}
    </div>
  );
  const rule = <div className="my-[1.5mm] border-t border-dashed border-black" />;
  return (
    <div
      ref={ref}
      className="bg-white text-black"
      style={{
        width: `${profile.widthMm - (narrow ? 6 : 8)}mm`,
        margin: '0 auto',
        padding: '2mm 0 4mm',
        fontFamily: "'Hind Siliguri', 'IBM Plex Sans', Arial, sans-serif",
        fontSize: narrow ? '8pt' : '9pt',
        lineHeight: 1.35,
      }}
    >
      <div className="text-center">
        <p style={{ fontSize: narrow ? '11pt' : '13pt' }} className="font-bold leading-tight">
          {profile.storeName}
        </p>
        {profile.phone && <p>{profile.phone}</p>}
        <p className="mt-[1mm] font-bold">{t.title}</p>
      </div>
      {rule}
      {row(`${t.date}: ${date}`)}
      {row(`${t.customer}: ${payment.name ? `${payment.name} ` : ''}${payment.phone}`)}
      {row(`${t.counter}: ${payment.registerName}`)}
      {row(`${t.cashier}: ${payment.cashierName}`)}
      {rule}
      <div style={{ fontSize: narrow ? '10pt' : '12pt' }} className="font-bold">
        {row(t.paid, money(payment.amount))}
      </div>
      {row(`${t.by}: ${TENDER_LABEL[payment.method]}${payment.reference ? ` (${payment.reference})` : ''}`)}
      {rule}
      {row(t.owes, money(payment.balanceAfter))}
      <p className="mt-[1.5mm] text-center">{t.thanks}</p>
    </div>
  );
});
