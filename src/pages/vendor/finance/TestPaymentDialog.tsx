import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog } from '../../../components/ui/Dialog';
import { inputClass } from '../../../components/product/ProductFormPieces';
import { paymentsApi } from '../../../lib/paymentsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 5;

interface TestPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Finance > Wallet's "Test Payment" button — exists purely to prove the
 * PayStation round-trip works end-to-end (initiate -> hosted checkout ->
 * pay -> IPN/callback -> balance credited), capped at ৳1–৳5 so it can
 * never be used as a real top-up path. On submit, redirects the whole
 * tab to PayStation's hosted checkout (same as the SMS/AI Chat Bot Buy
 * dialogs) — PayStation itself then redirects back to
 * /vendor/finance/payment-callback once the customer finishes.
 */
export function TestPaymentDialog({ open, onOpenChange }: TestPaymentDialogProps) {
  const [amount, setAmount] = useState('5');

  const initiateMutation = useMutation({
    mutationFn: () => paymentsApi.initiate({ purpose: 'WALLET_TOPUP', amount: Number(amount) }),
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not start the test payment. Please try again.')),
  });

  const parsedAmount = Number(amount);
  const isValid = Number.isFinite(parsedAmount) && parsedAmount >= MIN_AMOUNT && parsedAmount <= MAX_AMOUNT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Test Payment (PayStation)" maxWidth="max-w-md">
      <div className="p-6 pt-4">
        <p className="text-sm text-regantify-text-muted mb-4">
          Pay a small amount (৳{MIN_AMOUNT}–৳{MAX_AMOUNT}) through PayStation to confirm the payment gateway is working.
          It will be added to your wallet balance once confirmed.
        </p>

        <label className="block text-sm font-medium text-regantify-text mb-1.5">Amount (৳)</label>
        <input
          type="number"
          min={MIN_AMOUNT}
          max={MAX_AMOUNT}
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
        />
        {!isValid && (
          <p className="text-xs text-red-600 mt-1.5">
            Enter an amount between ৳{MIN_AMOUNT} and ৳{MAX_AMOUNT}.
          </p>
        )}

        <button
          onClick={() => initiateMutation.mutate()}
          disabled={!isValid || initiateMutation.isPending}
          className="w-full mt-5 px-6 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
            transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {initiateMutation.isPending ? 'Redirecting…' : 'Pay with PayStation'}
        </button>
      </div>
    </Dialog>
  );
}
