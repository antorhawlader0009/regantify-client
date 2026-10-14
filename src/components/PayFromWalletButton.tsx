import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { apiErrorMessage } from '../lib/api';
import { paymentsApi } from '../lib/paymentsApi';
import { toast } from '../lib/toast';

const tk = (n: number) => `Tk ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/**
 * "Pay from wallet" next to the online payment for a plan, an SMS pack or an AI Credits pack. Shows nothing unless Super Admin turned wallet
 * purchases on (Settings > Money). The server works out the price again; `price` here only decides whether the balance looks enough.
 */
export function PayFromWalletButton({
  purpose,
  packageId,
  promoCode,
  price,
  onPaid,
  className = '',
}: {
  purpose: 'SMS_PACKAGE' | 'CHATBOT_PACKAGE' | 'PLAN_UPGRADE';
  packageId: string;
  promoCode?: string;
  price: number;
  onPaid: () => void;
  className?: string;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['wallet-pay-info'], queryFn: paymentsApi.walletPayInfo, staleTime: 30_000 });
  const [confirming, setConfirming] = useState(false);
  const pay = useMutation({
    mutationFn: () => paymentsApi.walletPay({ purpose, packageId, ...(promoCode && { promoCode }) }),
    onSuccess: (r) => {
      toast.success(`Paid ${tk(r.amount)} from your wallet. ${tk(r.balance)} left.`);
      setConfirming(false);
      qc.invalidateQueries();
      onPaid();
    },
    onError: (err) => {
      setConfirming(false);
      toast.error(apiErrorMessage(err, 'Could not pay from the wallet.'));
    },
  });
  if (!data?.enabled) return null;
  const enough = data.balance >= price;

  return (
    <div className={className}>
      <button
        type="button"
        disabled={!enough || pay.isPending}
        onClick={() => (confirming ? pay.mutate() : setConfirming(true))}
        className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
          confirming ? 'border-brand bg-brand text-white' : 'border-line bg-white text-regantify-text hover:bg-neutral-50'
        }`}
      >
        <Wallet size={16} aria-hidden />
        {pay.isPending ? 'Paying...' : confirming ? `Confirm: take ${tk(price)} from the wallet` : `Pay ${tk(price)} from wallet`}
      </button>
      <p className="mt-1 text-center text-xs text-neutral-500">
        {enough ? `Wallet balance: ${tk(data.balance)}` : `Your wallet has ${tk(data.balance)}, not enough for this.`}
        {confirming && !pay.isPending && (
          <button type="button" onClick={() => setConfirming(false)} className="ml-2 underline">
            Cancel
          </button>
        )}
      </p>
    </div>
  );
}
