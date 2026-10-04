import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Minus, Plus, Search } from 'lucide-react';
import { posApi, TENDER_LABEL, type PosReturnableSale, type PosTender, type PosUnlock } from '../../../lib/posApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Field, PosButton, PosDialog, PosInput, taka } from '../ui';
import { ManagerApprovalDialog, type ApprovalAsk } from './CounterDialogs';
import { round2 } from './cartMath';

/*
 * Returns, exchanges and voids at the counter (POS-system-plan.md Step 8). Find the sale (scan
 * the receipt's QR, type its number or the phone), choose what comes back and whether it goes
 * back on the shelf, then how the money goes back. Store credit makes a gift card, which is
 * also an exchange: the screen can put it straight onto the next sale.
 */

const dhaka = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

type RefundMethod = PosTender;

function errorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
}

export function ReturnsDialog({
  unlock,
  sessionId,
  onClose,
  onExchange,
}: {
  unlock: PosUnlock;
  sessionId: string;
  onClose: () => void;
  /** Store credit made for an exchange: put it on the next sale as a gift card payment. */
  onExchange: (credit: { code: string; amount: number }) => void;
}) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Awaited<ReturnType<typeof posApi.findSales>> | null>(null);
  const [sale, setSale] = useState<PosReturnableSale | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>({});
  const [kind, setKind] = useState<'RETURN' | 'VOID'>('RETURN');
  const [method, setMethod] = useState<RefundMethod>('CASH');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [ask, setAsk] = useState<ApprovalAsk | null>(null);
  const [done, setDone] = useState<{ amount: number; storeCredit: Array<{ code: string; amount: number }> } | null>(null);

  const search = useMutation({
    mutationFn: (text: string) => posApi.findSales(text, unlock.token),
    onSuccess: (sales) => {
      setFound(sales);
      if (sales.length === 1) open.mutate(sales[0].id);
      else if (sales.length === 0) toast.error('No counter sale found for that.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t search. Try again.')),
  });

  const open = useMutation({
    mutationFn: (orderId: string) => posApi.returnableSale(orderId, unlock.token),
    onSuccess: (s) => {
      setSale(s);
      setQty({});
      setRestock(Object.fromEntries(s.lines.map((l) => [l.orderItemId, true])));
      setKind('RETURN');
      // A due sale: lowering the due is the usual way back, so it's picked first.
      setMethod(s.paidWith.includes('DUE') ? 'DUE' : 'CASH');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That sale couldn’t be opened.')),
  });

  // What goes back, worked out the same way as the server: each unit's share of what was paid,
  // and the return that empties the sale gives exactly what's left.
  const chosen = sale ? sale.lines.map((l) => ({ ...l, take: kind === 'VOID' ? l.returnable : Math.min(qty[l.orderItemId] ?? 0, l.returnable) })).filter((l) => l.take > 0) : [];
  const emptiesSale = !!sale && sale.lines.every((l) => l.returnable - (chosen.find((c) => c.orderItemId === l.orderItemId)?.take ?? 0) === 0);
  const amount = !sale ? 0 : emptiesSale ? round2(sale.total - sale.refunded) : round2(chosen.reduce((s, l) => s + round2(l.unitRefund * l.take), 0));
  const canVoid = !!sale && sale.posSessionId === sessionId && sale.status === 'COMPLETED' && sale.returns.length === 0;
  const pastWindow = !!sale?.returnableUntil && new Date(sale.returnableUntil).getTime() < Date.now();
  // A sale (partly) on due can give the money back by lowering that due (Step 9).
  const refundMethods: RefundMethod[] = [
    ...((sale?.paidWith ?? []).includes('DUE') ? (['DUE'] as RefundMethod[]) : []),
    'CASH',
    'GIFT_CARD',
    ...((sale?.paidWith ?? []).filter((m) => m !== 'CASH' && m !== 'GIFT_CARD' && m !== 'DUE') as RefundMethod[]),
  ];
  const methodLabel = (m: RefundMethod) => (m === 'GIFT_CARD' ? 'Store credit' : m === 'DUE' ? 'Lower their due' : TENDER_LABEL[m]);

  const submit = useMutation({
    mutationFn: (approvalId?: string) =>
      posApi.createReturn(
        {
          orderId: sale!.id,
          sessionId,
          kind,
          lines: chosen.map((l) => ({ orderItemId: l.orderItemId, quantity: l.take, restock: kind === 'VOID' ? true : restock[l.orderItemId] !== false })),
          refunds: amount > 0 ? [{ method, amount, reference: reference.trim() || undefined }] : [],
          reason: reason.trim() || undefined,
          approvalId,
        },
        unlock.token,
      ),
    onSuccess: (r) => setDone({ amount: r.amount, storeCredit: r.storeCredit }),
    onError: (err) => {
      if (errorCode(err) === 'POS_APPROVAL_REQUIRED') {
        setAsk({ discountPercent: 0, priceOverride: false, refund: kind === 'RETURN', voidSale: kind === 'VOID' });
        return;
      }
      toast.error(apiErrorMessage(err, 'The return didn’t go through. Try again.'));
    },
  });

  if (done) {
    const credit = done.storeCredit[0];
    return (
      <PosDialog open onOpenChange={(o) => !o && onClose()} title={kind === 'VOID' ? 'Sale voided' : 'Return done'}>
        <div className="space-y-4 text-center">
          <CheckCircle2 size={36} className="mx-auto text-pos-go" aria-hidden />
          <p className="text-sm text-pos-muted">{credit ? 'Store credit made' : method === 'DUE' ? 'Taken off their due' : `Give back by ${TENDER_LABEL[method]}`}</p>
          <p className="text-3xl font-semibold tabular-nums">{taka(done.amount)}</p>
          {credit && (
            <div className="rounded-lg border border-pos-line bg-pos-page p-4">
              <p className="text-xs text-pos-muted">Store credit code (works like a gift card)</p>
              <p className="mt-1 font-mono text-xl font-semibold tracking-wider">{credit.code}</p>
            </div>
          )}
          <div className="flex justify-center gap-2">
            {credit && (
              <PosButton
                variant="primary"
                onClick={() => {
                  onExchange(credit);
                  onClose();
                }}
              >
                Exchange: use it on a new sale
              </PosButton>
            )}
            <PosButton onClick={onClose}>Done</PosButton>
          </div>
        </div>
      </PosDialog>
    );
  }

  return (
    <>
      <PosDialog open onOpenChange={(o) => !o && onClose()} title="Return or exchange" width="max-w-2xl">
        {!sale ? (
          <div className="space-y-4">
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (q.trim()) search.mutate(q.trim());
              }}
              className="flex gap-2"
            >
              <label className="relative flex-1">
                <span className="sr-only">Receipt or phone</span>
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted" aria-hidden />
                <PosInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Scan the receipt QR, or type its number or the phone" className="pl-9" />
              </label>
              <PosButton type="submit" variant="primary" disabled={!q.trim() || search.isPending}>
                Find
              </PosButton>
            </form>
            {found && found.length > 1 && (
              <ul className="divide-y divide-pos-line rounded-lg border border-pos-line">
                {found.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => open.mutate(s.id)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-pos-page">
                      <span>
                        <span className="font-medium">{s.publicCode ?? `#${s.invoiceNumber}`}</span>
                        <span className="block text-xs text-pos-muted">
                          {dhaka(s.createdAt)} · {s.customerName}
                          {s.status !== 'COMPLETED' && ` · ${s.status.toLowerCase()}`}
                        </span>
                      </span>
                      <span className="tabular-nums">{taka(s.total)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-semibold">{sale.publicCode ?? `#${sale.invoiceNumber}`}</p>
                <p className="text-xs text-pos-muted">
                  {dhaka(sale.createdAt)} · {sale.customerName} · paid {taka(sale.total)}
                  {sale.refunded > 0 && ` · ${taka(sale.refunded)} already given back`}
                </p>
              </div>
              <PosButton variant="quiet" className="h-8 text-xs" onClick={() => setSale(null)}>
                Another sale
              </PosButton>
            </div>
            {sale.status !== 'COMPLETED' ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">This sale was already refunded or cancelled.</p>
            ) : (
              <>
                {canVoid && (
                  <div role="group" aria-label="Return or void" className="inline-flex overflow-hidden rounded-md border border-pos-line">
                    {(['RETURN', 'VOID'] as const).map((k) => (
                      <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`h-9 px-3 text-sm ${kind === k ? 'bg-pos-ink text-white' : ''}`}>
                        {k === 'RETURN' ? 'Return items' : 'Void the whole sale'}
                      </button>
                    ))}
                  </div>
                )}
                {pastWindow && kind === 'RETURN' && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">This sale is past your return window (POS settings).</p>
                )}
                <ul className="divide-y divide-pos-line rounded-lg border border-pos-line">
                  {sale.lines.map((l) => {
                    const take = kind === 'VOID' ? l.returnable : Math.min(qty[l.orderItemId] ?? 0, l.returnable);
                    return (
                      <li key={l.orderItemId} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{l.name}</p>
                          <p className="text-xs text-pos-muted">
                            {l.options && `${l.options} · `}bought {l.quantity}
                            {l.returned > 0 && `, ${l.returned} back already`} · {taka(l.unitRefund)} each
                          </p>
                        </div>
                        {l.returnable === 0 ? (
                          <span className="text-xs text-pos-muted">All returned</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {kind === 'RETURN' && (
                              <label className="flex items-center gap-1.5 text-xs text-pos-muted">
                                <input type="checkbox" checked={restock[l.orderItemId] !== false} onChange={(e) => setRestock((r) => ({ ...r, [l.orderItemId]: e.target.checked }))} />
                                Back in stock
                              </label>
                            )}
                            <PosButton className="h-8 w-8 px-0" aria-label="One less" disabled={kind === 'VOID'} onClick={() => setQty((x) => ({ ...x, [l.orderItemId]: Math.max(0, take - 1) }))}>
                              <Minus size={14} />
                            </PosButton>
                            <span className="w-8 text-center text-sm tabular-nums">{take}</span>
                            <PosButton className="h-8 w-8 px-0" aria-label="One more" disabled={kind === 'VOID'} onClick={() => setQty((x) => ({ ...x, [l.orderItemId]: Math.min(l.returnable, take + 1) }))}>
                              <Plus size={14} />
                            </PosButton>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Give the money back by">
                    <div className="flex flex-wrap gap-1.5">
                      {[...new Set(refundMethods)].map((m) => (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={method === m}
                          onClick={() => setMethod(m)}
                          className={`h-9 rounded-md border px-3 text-sm ${method === m ? 'border-pos-ink bg-pos-ink text-white' : 'border-pos-line'}`}
                        >
                          {methodLabel(m)}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {method !== 'CASH' && method !== 'GIFT_CARD' && method !== 'DUE' && (
                    <Field label="Transaction ID (optional)">
                      <PosInput maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} />
                    </Field>
                  )}
                  <Field label={kind === 'VOID' ? 'Why is it being voided?' : 'Reason (optional)'} className="sm:col-span-2">
                    <PosInput maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={kind === 'VOID' ? 'e.g. rang up the wrong item' : 'e.g. wrong size'} />
                  </Field>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg bg-pos-page px-4 py-3">
                  <span className="text-sm">{method === 'GIFT_CARD' ? 'Store credit' : method === 'DUE' ? 'Off their due' : 'Money back'}</span>
                  <span className="text-2xl font-semibold tabular-nums">{taka(amount)}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <PosButton onClick={onClose}>Cancel</PosButton>
                  <PosButton
                    variant="primary"
                    disabled={chosen.length === 0 || submit.isPending || (kind === 'VOID' && !reason.trim()) || (kind === 'RETURN' && pastWindow)}
                    onClick={() => submit.mutate(undefined)}
                  >
                    {submit.isPending ? 'Saving…' : kind === 'VOID' ? 'Void sale' : 'Return'}
                  </PosButton>
                </div>
              </>
            )}
          </div>
        )}
      </PosDialog>
      {ask && (
        <ManagerApprovalDialog
          ask={ask}
          token={unlock.token}
          onApproved={(a) => {
            setAsk(null);
            submit.mutate(a.id);
          }}
          onClose={() => setAsk(null)}
        />
      )}
    </>
  );
}
