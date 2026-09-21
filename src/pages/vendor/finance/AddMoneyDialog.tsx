import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog } from '../../../components/ui/Dialog';
import { inputClass } from '../../../components/product/ProductFormPieces';
import { paymentsApi } from '../../../lib/paymentsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const MIN_AMOUNT = 20;

function formatAmount(value: number) {
  return `৳${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

interface AddMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Current Main Balance (see Wallet.tsx) — used only to show the
  // "this also clears your negative balance" note below before
  // submitting; the server always resolves the real deficit itself at
  // charge time (PaymentsService.initiate), this is display-only.
  currentBalance: number;
}

/**
 * Finance > Wallet's "Add Money" — a real top-up through PayStation,
 * replacing the old capped ৳1–৳5 "Test Payment" button (see git history
 * for TestPaymentDialog, same component this grew out of). Redirects the
 * whole tab to PayStation's hosted checkout; PayStation then redirects
 * back to /vendor/finance/payment-callback once the vendor finishes.
 *
 * If Vendor.balance is currently negative (e.g. ORDER_COMPLETION_FEE
 * charged with no balance floor — see OrdersService.applyStatusUpdate),
 * the server adds that deficit on top of whatever amount is entered here
 * (PaymentsService.initiate) so completing this top-up also clears it —
 * there's no separate "pay down your negative balance" flow, this is it.
 */
export function AddMoneyDialog({ open, onOpenChange, currentBalance }: AddMoneyDialogProps) {
  const [amount, setAmount] = useState('100');

  const initiateMutation = useMutation({
    mutationFn: () => paymentsApi.initiate({ purpose: 'WALLET_TOPUP', amount: Number(amount) }),
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not start the payment. Please try again.')),
  });

  const parsedAmount = Number(amount);
  const isValid = Number.isFinite(parsedAmount) && parsedAmount >= MIN_AMOUNT;
  const hasDeficit = currentBalance < 0;
  const deficit = hasDeficit ? Math.abs(currentBalance) : 0;
  const payableTotal = isValid ? parsedAmount + deficit : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add Money (PayStation)" maxWidth="max-w-md">
      <div className="p-6 pt-4">
        <p className="text-sm text-regantify-text-muted mb-4">
          Top up your wallet balance through PayStation. It's added to your Main Balance once confirmed.
        </p>

        {hasDeficit && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            Your wallet balance is currently {formatAmount(currentBalance)}. This negative amount (
            {formatAmount(deficit)}) will automatically be added to your payment below so this top-up also clears
            it.
          </div>
        )}

        <label className="block text-sm font-medium text-regantify-text mb-1.5">Amount to Add (৳)</label>
        <input
          type="number"
          min={MIN_AMOUNT}
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
        />
        {!isValid && <p className="text-xs text-red-600 mt-1.5">Enter an amount of at least ৳{MIN_AMOUNT}.</p>}

        {isValid && hasDeficit && (
          <p className="text-xs text-regantify-text-muted mt-1.5">
            You'll be charged {formatAmount(payableTotal)} total — {formatAmount(parsedAmount)} added to your
            wallet + {formatAmount(deficit)} clearing your negative balance.
          </p>
        )}

        <button
          onClick={() => initiateMutation.mutate()}
          disabled={!isValid || initiateMutation.isPending}
          className="w-full mt-5 px-6 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
            transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {initiateMutation.isPending
            ? 'Redirecting…'
            : `Pay ${isValid ? formatAmount(payableTotal) : ''} with PayStation`}
        </button>
      </div>
    </Dialog>
  );
}
