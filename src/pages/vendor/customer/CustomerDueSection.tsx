import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HandCoins, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { posApi, TENDER_LABEL, type DueEntryType, type DuePaymentMethod, type PosDueAccount } from '../../../lib/posApi';
import { apiErrorMessage } from '../../../lib/api';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { toast } from '../../../lib/toast';
import { productInputClass } from '../../../components/product/ProductFormPieces';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';

/*
 * Customer Detail > Due (baki), POS-system-plan.md Step 9: what the customer owes the shop from
 * counter sales paid by "Due", its history (never edited), and for the owner and POS managers:
 * take a payment, correct it, set a limit, and text a reminder. Shown only on a plan with the POS.
 */

const formatMoney = (n: number) => `৳${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TYPE_LABEL: Record<DueEntryType, string> = {
  SALE_ON_DUE: 'Sale on due',
  PAYMENT: 'Paid',
  RETURN: 'Return',
  ADJUSTMENT: 'Correction',
};

const PAY_METHODS: DuePaymentMethod[] = ['CASH', 'BKASH', 'NAGAD', 'CARD', 'BANGLA_QR', 'BANK', 'OTHER'];

export function CustomerDueSection({ phone }: { phone: string }) {
  const queryClient = useQueryClient();
  // The POS (Advance plan) decides whether there is a due at all; a 402 just hides the section.
  const me = useQuery({ queryKey: ['pos', 'me'], queryFn: posApi.me, retry: false, staleTime: 60_000 });
  const [page, setPage] = useState(1);
  const account = useQuery({
    queryKey: ['pos', 'due-account', phone, page],
    queryFn: () => posApi.dueAccount(phone, page),
    enabled: me.isSuccess,
    retry: false,
  });

  const [dialog, setDialog] = useState<'pay' | 'adjust' | 'limit' | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<DuePaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [direction, setDirection] = useState<'add' | 'remove'>('add');

  const done = (next: PosDueAccount, message: string) => {
    queryClient.setQueryData(['pos', 'due-account', phone, 1], next);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    setDialog(null);
    toast.success(message);
  };
  const fail = (err: unknown) => toast.error(apiErrorMessage(err, 'That didn’t work. Try again.'));

  const pay = useMutation({
    mutationFn: () => posApi.receiveDuePayment(phone, { amount: Number(amount), method, reference: reference.trim() || undefined, note: note.trim() || undefined }),
    onSuccess: (r) => done(r, 'Payment saved'),
    onError: fail,
  });
  const adjust = useMutation({
    mutationFn: () => posApi.adjustDue(phone, direction === 'add' ? Number(amount) : -Number(amount), note.trim()),
    onSuccess: (r) => done(r, 'Due corrected'),
    onError: fail,
  });
  const limit = useMutation({
    mutationFn: () => posApi.setDueLimit(phone, amount.trim() === '' ? null : Number(amount)),
    onSuccess: (r) => done(r, 'Limit saved'),
    onError: fail,
  });
  const remind = useMutation({
    mutationFn: () => posApi.remindDue(phone),
    onSuccess: () => {
      toast.success('Reminder texted');
      void account.refetch();
    },
    onError: fail,
  });

  if (!me.isSuccess || !account.data) return null;
  const a = account.data;
  // A store that never sold on due sees nothing here until this customer has a due history.
  if (a.total === 0 && a.balance === 0 && !me.data.enabled) return null;
  const manager = me.data.isManager;

  const open = (which: 'pay' | 'adjust' | 'limit') => {
    setAmount(which === 'pay' && a.balance > 0 ? String(a.balance) : which === 'limit' && a.limit !== null ? String(a.limit) : '');
    setMethod('CASH');
    setReference('');
    setNote('');
    setDirection('add');
    setDialog(which);
  };
  const value = Number(amount);

  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-regantify-text">Due (baki)</h2>
          <p className="mt-0.5 text-xs text-neutral-500">What they owe from counter sales paid by “Due”.</p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-semibold tabular-nums ${a.balance > 0 ? 'text-amber-700' : 'text-regantify-text'}`}>{formatMoney(a.balance)}</p>
          <p className="text-xs text-neutral-500">
            {a.limit === null ? 'No limit' : `Limit ${formatMoney(a.limit)}`}
            {manager && (
              <button type="button" onClick={() => open('limit')} className="ml-1.5 underline-offset-2 hover:text-regantify-text hover:underline">
                change
              </button>
            )}
          </p>
        </div>
      </div>

      {manager && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => open('pay')} disabled={a.balance <= 0} className={`${primaryBtn} h-9 disabled:opacity-50`}>
            <HandCoins size={14} aria-hidden />
            Receive payment
          </button>
          <button type="button" onClick={() => open('adjust')} className={`${outlineBtn} h-9`}>
            <SlidersHorizontal size={14} aria-hidden />
            Correct
          </button>
          {a.balance > 0 && (
            <button type="button" onClick={() => remind.mutate()} disabled={remind.isPending} className={`${outlineBtn} h-9 disabled:opacity-50`}>
              <MessageSquare size={14} aria-hidden />
              {remind.isPending ? 'Sending…' : 'Text a reminder'}
            </button>
          )}
        </div>
      )}
      {a.remindedAt && <p className="mt-2 text-xs text-neutral-500">Last reminder {formatDhakaDateTime(a.remindedAt)}</p>}

      {a.entries.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {a.entries.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-regantify-text">
                  {TYPE_LABEL[e.type]}
                  {e.method && e.type === 'PAYMENT' && <span className="font-normal text-neutral-500"> · {TENDER_LABEL[e.method]}</span>}
                  {e.order && (
                    <>
                      {' · '}
                      <Link to={`/vendor/orders/${e.order.id}`} className="font-normal text-brand hover:underline">
                        {e.order.publicCode ?? `#${e.order.invoiceNumber}`}
                      </Link>
                    </>
                  )}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {formatDhakaDateTime(e.createdAt)} · {e.createdByName}
                  {e.registerName && ` · ${e.registerName}`}
                  {e.reference && ` · ${e.reference}`}
                  {e.note && ` · ${e.note}`}
                </p>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className={e.amount > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                  {e.amount > 0 ? '+' : '−'}
                  {formatMoney(Math.abs(e.amount))}
                </p>
                <p className="text-xs text-neutral-500">owes {formatMoney(e.balanceAfter)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {a.total > a.perPage && (
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>
            Page {a.page} of {Math.ceil(a.total / a.perPage)}
          </span>
          <div className="flex gap-2">
            <button type="button" className={`${outlineBtn} h-8`} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Newer
            </button>
            <button type="button" className={`${outlineBtn} h-8`} disabled={page * a.perPage >= a.total} onClick={() => setPage((p) => p + 1)}>
              Older
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={dialog === 'pay'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Receive a due payment"
        confirmLabel={value > 0 ? `Save ${formatMoney(value)}` : 'Save'}
        busy={pay.isPending}
        onConfirm={() => {
          if (!(value > 0) || value > a.balance) return toast.error(`Enter an amount up to ${formatMoney(a.balance)}.`);
          if (method === 'OTHER' && !reference.trim()) return toast.error('Name the other payment method.');
          pay.mutate();
        }}
        message={
          <div className="space-y-3">
            <p>
              They owe {formatMoney(a.balance)}. Paid here, it isn’t counted in any register’s cash. At the counter, use “Collect due” for that.
            </p>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" className={productInputClass} />
            <select value={method} onChange={(e) => setMethod(e.target.value as DuePaymentMethod)} aria-label="Paid by" className={productInputClass}>
              {PAY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {TENDER_LABEL[m]}
                </option>
              ))}
            </select>
            {method !== 'CASH' && (
              <input value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} placeholder={method === 'OTHER' ? 'Which method?' : 'Transaction ID (optional)'} className={productInputClass} />
            )}
            <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={productInputClass} />
          </div>
        }
      />

      <ConfirmDialog
        open={dialog === 'adjust'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Correct the due"
        confirmLabel="Save correction"
        busy={adjust.isPending}
        onConfirm={() => {
          if (!(value > 0)) return toast.error('Enter an amount.');
          if (note.trim().length < 3) return toast.error('Write why, so the history explains it.');
          adjust.mutate();
        }}
        message={
          <div className="space-y-3">
            <p>For example an old balance from your paper khata, or a mistake. The history keeps this as a correction with your note.</p>
            <div role="group" aria-label="Direction" className="inline-flex overflow-hidden rounded-lg border border-line">
              {(['add', 'remove'] as const).map((d) => (
                <button key={d} type="button" aria-pressed={direction === d} onClick={() => setDirection(d)} className={`h-9 px-3 text-sm ${direction === d ? 'bg-brand text-white' : 'bg-white'}`}>
                  {d === 'add' ? 'They owe more' : 'They owe less'}
                </button>
              ))}
            </div>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" placeholder="Amount" className={productInputClass} />
            <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Why (required)" className={productInputClass} />
          </div>
        }
      />

      <ConfirmDialog
        open={dialog === 'limit'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Due limit"
        confirmLabel="Save limit"
        busy={limit.isPending}
        onConfirm={() => {
          if (amount.trim() !== '' && !(value >= 0)) return toast.error('Enter an amount, or leave it empty for no limit.');
          limit.mutate();
        }}
        message={
          <div className="space-y-3">
            <p>The most this customer may owe. A counter sale that would go past it is refused. Leave it empty for no limit.</p>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Limit" placeholder="No limit" className={productInputClass} />
          </div>
        }
      />
    </section>
  );
}
