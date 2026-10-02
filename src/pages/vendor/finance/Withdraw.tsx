import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, Landmark, X } from 'lucide-react';
import { Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { MoneyInput, Segmented } from '../../../components/product/ProductFormKit';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState, StackedList } from '../../../components/ui/PageKit';
import { financeApi, type WithdrawMethod, type WithdrawRequest } from '../../../lib/financeApi';
import { apiErrorMessage } from '../../../lib/api';
import { BD_PHONE_HINT, normalizeBdPhone, toLatinDigits } from '../../../lib/bdPhone';
import { formatDhakaDate, formatDhakaDateTime } from '../../../lib/dhakaDate';
import { toast } from '../../../lib/toast';
import { formatTaka } from './financeUi';

const METHOD_LABEL: Record<WithdrawMethod, string> = {
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  BANK: 'Bank transfer',
};

// Mirrors server WithdrawRequestsService's MINIMUM_WITHDRAW_AMOUNT. There's no withdrawal fee.
const MINIMUM_WITHDRAW_AMOUNT = 100;

/** Requested → Approved → Paid (or Requested → Rejected), with the dates we know. */
function StatusSteps({ r }: { r: WithdrawRequest }) {
  const steps: { label: string; state: 'done' | 'now' | 'todo' | 'failed'; at?: string | null }[] =
    r.status === 'REJECTED'
      ? [
          { label: 'Requested', state: 'done', at: r.createdAt },
          { label: 'Rejected', state: 'failed', at: r.resolvedAt },
        ]
      : [
          { label: 'Requested', state: 'done', at: r.createdAt },
          { label: 'Approved', state: r.status === 'PENDING' ? 'now' : 'done', at: r.status === 'APPROVED' ? r.resolvedAt : null },
          { label: 'Paid', state: r.status === 'PAID' ? 'done' : r.status === 'APPROVED' ? 'now' : 'todo', at: r.status === 'PAID' ? r.resolvedAt : null },
        ];

  return (
    <ol className="mt-2.5 flex items-start" aria-label="Request progress">
      {steps.map((s, i) => (
        <li key={s.label} className="flex min-w-0 flex-1 flex-col items-start">
          <div className="flex w-full items-center">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                s.state === 'done'
                  ? 'border-brand bg-brand text-white'
                  : s.state === 'failed'
                    ? 'border-red-600 bg-red-600 text-white'
                    : s.state === 'now'
                      ? 'border-amber-500 bg-amber-50 text-amber-600'
                      : 'border-line bg-white text-neutral-300'
              }`}
              aria-hidden
            >
              {s.state === 'done' ? <Check size={11} /> : s.state === 'failed' ? <X size={11} /> : s.state === 'now' ? <Clock size={11} /> : null}
            </span>
            {i < steps.length - 1 && <span className={`mx-1 h-px flex-1 ${s.state === 'done' ? 'bg-brand' : 'bg-line'}`} aria-hidden />}
          </div>
          <span className={`mt-1 text-xs ${s.state === 'todo' ? 'text-neutral-400' : s.state === 'failed' ? 'text-red-700' : 'text-regantify-text'}`}>
            {s.label}
            <span className="sr-only">: {s.state === 'done' ? 'done' : s.state === 'now' ? 'waiting' : s.state === 'failed' ? '' : 'not yet'}</span>
          </span>
          {s.at && <span className="text-[11px] text-neutral-500">{formatDhakaDate(s.at)}</span>}
        </li>
      ))}
    </ol>
  );
}

function RequestItem({ r }: { r: WithdrawRequest }) {
  const to = r.method === 'BANK' ? r.bankDetails?.split('\n')[0] : r.receiverNumber;
  return (
    <li className="px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm font-semibold tabular-nums text-regantify-text">{formatTaka(r.amount)}</p>
        <p className="text-xs text-neutral-500">{formatDhakaDateTime(r.createdAt)}</p>
      </div>
      <p className="mt-0.5 truncate text-xs text-neutral-600">
        {METHOD_LABEL[r.method]}
        {to && <> · {to}</>}
      </p>
      <StatusSteps r={r} />
      {r.status === 'REJECTED' && <p className="mt-2 text-xs text-neutral-600">The amount went back to your wallet balance.</p>}
      {r.note && <p className="mt-2 rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-600">Note: {r.note}</p>}
    </li>
  );
}

/**
 * Finance > Withdraw — request a payout from the wallet balance. No
 * payout gateway exists yet, so a Super Admin reviews each request and
 * pays outside the platform (see server's WithdrawRequestsService: the
 * amount is set aside from the balance right away, and given back if the
 * request is rejected). The form shows the available balance and the
 * minimum, fills the method and number from the last request, and
 * confirms the amount before sending. There's no fee.
 */
export default function Withdraw() {
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: walletLoading } = useQuery({ queryKey: ['finance', 'wallet'], queryFn: () => financeApi.getWallet() });
  const { data: requests = [], isLoading } = useQuery({ queryKey: ['finance', 'withdraw-requests'], queryFn: () => financeApi.getWithdrawRequests() });

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawMethod>('BKASH');
  const [receiverNumber, setReceiverNumber] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Fill the method and number from the most recent request, once.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || isLoading) return;
    const last = requests[0];
    if (last) {
      setMethod(last.method);
      if (last.receiverNumber) setReceiverNumber(last.receiverNumber);
      if (last.bankDetails) setBankDetails(last.bankDetails);
    }
    setPrefilled(true);
  }, [prefilled, isLoading, requests]);

  const pendingRequest = requests.find((r) => r.status === 'PENDING');
  const balance = Number(wallet?.balance ?? 0);
  const numericAmount = Number(amount);
  const phone = normalizeBdPhone(receiverNumber);

  const errors = {
    amount: !amount
      ? 'Enter how much to withdraw.'
      : !Number.isFinite(numericAmount) || numericAmount <= 0
        ? 'Enter an amount like 500.'
        : numericAmount < MINIMUM_WITHDRAW_AMOUNT
          ? `The minimum is ${formatTaka(MINIMUM_WITHDRAW_AMOUNT)}.`
          : numericAmount > balance
            ? `That’s more than your balance of ${formatTaka(balance)}.`
            : null,
    receiver: method === 'BANK' ? null : !receiverNumber.trim() ? `Enter your ${METHOD_LABEL[method]} number.` : !phone ? BD_PHONE_HINT : null,
    bank: method === 'BANK' && !bankDetails.trim() ? 'Enter the account name, account number, bank and branch.' : null,
  };
  const valid = !errors.amount && !errors.receiver && !errors.bank;
  const shown = (key: keyof typeof errors) => (submitted || (key === 'amount' && amount) ? errors[key] : null);

  const submitMutation = useMutation({
    mutationFn: () =>
      financeApi.createWithdrawRequest({
        amount: numericAmount,
        method,
        receiverNumber: method !== 'BANK' ? phone ?? receiverNumber.trim() : undefined,
        bankDetails: method === 'BANK' ? bankDetails.trim() : undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setAmount('');
      setNote('');
      setSubmitted(false);
      setConfirming(false);
      toast.success('Withdrawal requested');
    },
    onError: (err) => {
      setConfirming(false);
      setFormError(apiErrorMessage(err, 'Couldn’t send this request. Check your connection and try again.'));
    },
  });

  const destination = method === 'BANK' ? 'your bank account' : `${METHOD_LABEL[method]} ${phone ?? receiverNumber.trim()}`;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[15px] font-semibold text-regantify-text">Withdraw</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Move money from your wallet to bKash, Nagad or your bank. There’s no fee.</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-regantify-text">New withdrawal</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-neutral-50 p-3 text-sm">
            <div>
              <p className="text-xs text-neutral-500">Available</p>
              {walletLoading ? (
                <div className="mt-1 h-5 w-20 animate-pulse rounded bg-neutral-200" />
              ) : (
                <p className="font-semibold tabular-nums text-regantify-text">{formatTaka(balance)}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-neutral-500">Minimum</p>
              <p className="font-semibold tabular-nums text-regantify-text">{formatTaka(MINIMUM_WITHDRAW_AMOUNT)}</p>
            </div>
          </div>

          {pendingRequest ? (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <Clock size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
              <p>
                Your request for {formatTaka(pendingRequest.amount)} is waiting for review. You can ask for another once it’s approved or
                rejected.
              </p>
            </div>
          ) : !walletLoading && balance < MINIMUM_WITHDRAW_AMOUNT ? (
            <p className="mt-4 text-sm text-neutral-600">
              You can withdraw once your balance reaches {formatTaka(MINIMUM_WITHDRAW_AMOUNT)}. Online orders add to it when they’re paid.
            </p>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                setSubmitted(true);
                if (valid) setConfirming(true);
              }}
              className="mt-4 space-y-4"
            >
              <Field label="Amount" required error={shown('amount')}>
                <MoneyInput value={amount} onChange={(v) => setAmount(toLatinDigits(v))} placeholder={`At least ${MINIMUM_WITHDRAW_AMOUNT}`} ariaLabel="Amount" />
                <button type="button" onClick={() => setAmount(String(Math.floor(balance * 100) / 100))} className="mt-1.5 text-xs font-medium text-brand hover:underline">
                  Withdraw all ({formatTaka(balance)})
                </button>
              </Field>

              <div>
                <p className="mb-1.5 text-sm font-medium text-regantify-text">Send it to</p>
                <Segmented<WithdrawMethod>
                  ariaLabel="Payout method"
                  value={method}
                  onChange={setMethod}
                  options={(['BKASH', 'NAGAD', 'BANK'] as WithdrawMethod[]).map((m) => ({ id: m, label: METHOD_LABEL[m] }))}
                />
              </div>

              {method !== 'BANK' ? (
                <Field label={`${METHOD_LABEL[method]} number`} required error={shown('receiver')}>
                  <input
                    type="text"
                    inputMode="tel"
                    value={receiverNumber}
                    onChange={(e) => setReceiverNumber(toLatinDigits(e.target.value))}
                    placeholder="01XXXXXXXXX"
                    className={productInputClass}
                  />
                </Field>
              ) : (
                <Field label="Bank account" required error={shown('bank')}>
                  <textarea
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    placeholder={'Account name\nAccount number\nBank and branch'}
                    rows={3}
                    className={`${productInputClass} resize-y`}
                  />
                </Field>
              )}

              <Field label="Note (optional)">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className={`${productInputClass} resize-y`} />
              </Field>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                Withdraw {valid ? formatTaka(numericAmount) : ''}
              </button>
            </form>
          )}
        </section>

        <section className="min-w-0 rounded-xl border border-line bg-white p-3.5">
          <h2 className="mb-3 px-0.5 text-[15px] font-semibold text-regantify-text">Your withdrawals</h2>
          {isLoading ? (
            <div className="space-y-2" aria-busy>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-lg border border-line">
              <EmptyState icon={Landmark} title="No withdrawals yet" hint="Your requests and where each one is (requested, approved, paid) show up here." />
            </div>
          ) : (
            <StackedList>
              {requests.map((r) => (
                <RequestItem key={r.id} r={r} />
              ))}
            </StackedList>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Withdraw ${formatTaka(numericAmount || 0)}?`}
        message={
          <>
            <p>
              We’ll send <strong className="text-regantify-text">{formatTaka(numericAmount || 0)}</strong> to {destination}.
            </p>
            <dl className="mt-3 space-y-1 rounded-lg bg-neutral-50 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Fee</dt>
                <dd className="tabular-nums">{formatTaka(0)}</dd>
              </div>
              <div className="flex justify-between gap-3 font-medium text-regantify-text">
                <dt>You receive</dt>
                <dd className="tabular-nums">{formatTaka(numericAmount || 0)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Balance after</dt>
                <dd className="tabular-nums">{formatTaka(balance - (numericAmount || 0))}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs">The amount is set aside now. If the request is rejected, it comes back to your wallet.</p>
          </>
        }
        confirmLabel="Send request"
        onConfirm={() => submitMutation.mutate()}
        busy={submitMutation.isPending}
      />
    </div>
  );
}
