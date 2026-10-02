import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog } from '../../../components/ui/Dialog';
import { Field } from '../../../components/product/ProductFormPieces';
import { MoneyInput } from '../../../components/product/ProductFormKit';
import { paymentsApi } from '../../../lib/paymentsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toLatinDigits } from '../../../lib/bdPhone';
import { formatTaka } from './financeUi';

const MIN_AMOUNT = 20;
const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

interface AddMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Current wallet balance (see Wallet.tsx) — used only to show the
  // "this also clears your negative balance" note below before
  // submitting; the server always resolves the real deficit itself at
  // charge time (PaymentsService.initiate), this is display-only.
  currentBalance: number;
}

/**
 * Finance > Wallet's "Add money" — a real top-up through PayStation.
 * Redirects the whole tab to PayStation's hosted checkout; PayStation
 * then redirects back to /vendor/finance/payment-callback once the
 * vendor finishes.
 *
 * If Vendor.balance is currently negative (e.g. a platform charge taken
 * with no balance floor — see OrdersService.applyStatusUpdate), the
 * server adds that deficit on top of whatever amount is entered here
 * (PaymentsService.initiate) so completing this top-up also clears it —
 * there's no separate "pay down your negative balance" flow, this is it.
 */
export function AddMoneyDialog({ open, onOpenChange, currentBalance }: AddMoneyDialogProps) {
  const [amount, setAmount] = useState('500');
  const [error, setError] = useState<string | null>(null);

  const initiateMutation = useMutation({
    mutationFn: () => paymentsApi.initiate({ purpose: 'WALLET_TOPUP', amount: Number(amount) }),
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
    onError: (err) => setError(apiErrorMessage(err, 'Couldn’t open PayStation. Check your connection and try again.')),
  });

  const parsedAmount = Number(amount);
  const isValid = Number.isFinite(parsedAmount) && parsedAmount >= MIN_AMOUNT;
  const deficit = currentBalance < 0 ? Math.abs(currentBalance) : 0;
  const payableTotal = isValid ? parsedAmount + deficit : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add money" maxWidth="max-w-md">
      <form
        className="p-6 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (isValid) initiateMutation.mutate();
        }}
      >
        <p className="mb-4 text-sm text-neutral-600">Pay with bKash, Nagad or a card through PayStation. It’s in your wallet as soon as the payment is confirmed.</p>

        <Field label="Amount" error={amount && !isValid ? `Add at least ${formatTaka(MIN_AMOUNT)}.` : null}>
          <MoneyInput value={amount} onChange={(v) => setAmount(toLatinDigits(v))} ariaLabel="Amount to add" />
        </Field>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(String(n))}
              className={`h-8 rounded-full border px-3 text-xs tabular-nums transition-colors ${
                Number(amount) === n ? 'border-brand bg-brand-lime font-medium text-regantify-text' : 'border-line text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              ৳{n.toLocaleString('en-US')}
            </button>
          ))}
        </div>

        {deficit > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Your balance is {formatTaka(currentBalance)}, so {formatTaka(deficit)} is added to this payment to clear it.
            {isValid && (
              <span className="mt-1 block font-medium">
                You pay {formatTaka(payableTotal)}: {formatTaka(parsedAmount)} into your wallet + {formatTaka(deficit)} to clear the balance.
              </span>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!isValid || initiateMutation.isPending}
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {initiateMutation.isPending ? 'Opening PayStation…' : isValid ? `Pay ${formatTaka(payableTotal)}` : 'Pay'}
        </button>
      </form>
    </Dialog>
  );
}
