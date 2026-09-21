import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet as WalletIcon, ArrowRight, Clock, ArrowDownToLine, CreditCard, AlertTriangle } from 'lucide-react';
import { financeApi } from '../../../lib/financeApi';
import { AddMoneyDialog } from './AddMoneyDialog';

// `-` prefix instead of the default `৳-95.00` toLocaleString would give —
// `৳` always leads, negative or not.
function formatAmount(value: string) {
  const n = Number(value);
  const formatted = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2 });
  return n < 0 ? `-৳${formatted}` : `৳${formatted}`;
}

export default function Wallet() {
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'wallet'],
    queryFn: () => financeApi.getWallet(),
  });
  const balance = Number(data?.balance ?? '0');
  const isNegative = balance < 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Wallet</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAddMoneyOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-regantify-cta text-regantify-cta
              hover:bg-regantify-cta hover:text-white text-sm font-medium transition-colors"
          >
            <CreditCard size={15} />
            Add Money
          </button>
          <Link
            to="/vendor/finance/withdraw"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark
              text-white text-sm font-medium transition-colors"
          >
            Request Withdrawal
          </Link>
        </div>
      </div>

      <AddMoneyDialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen} currentBalance={balance} />

      {isNegative && !isLoading && (
        <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            Your wallet balance is negative ({formatAmount(data?.balance ?? '0')}). It'll be cleared automatically
            the next time you Add Money, buy an SMS/AI Chat Bot package, or upgrade your plan.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-regantify-black rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
            <WalletIcon size={16} />
            Main Balance
          </div>
          <p className={`text-3xl font-semibold mt-3 ${isNegative ? 'text-red-400' : ''}`}>
            {isLoading ? '…' : formatAmount(data?.balance ?? '0')}
          </p>
          <p className="text-white/60 text-xs mt-1">Available to withdraw</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-black/5">
          <div className="flex items-center gap-2 text-regantify-text-muted text-sm font-medium">
            <Clock size={16} />
            Pending Withdrawals
          </div>
          <p className="text-3xl font-semibold mt-3 text-regantify-text">
            {isLoading ? '…' : formatAmount(data?.pendingWithdrawals ?? '0')}
          </p>
          <p className="text-regantify-text-muted text-xs mt-1">Awaiting admin review</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-black/5">
          <div className="flex items-center gap-2 text-regantify-text-muted text-sm font-medium">
            <ArrowDownToLine size={16} />
            Total Withdrawn
          </div>
          <p className="text-3xl font-semibold mt-3 text-regantify-text">
            {isLoading ? '…' : formatAmount(data?.totalWithdrawn ?? '0')}
          </p>
          <p className="text-regantify-text-muted text-xs mt-1">Lifetime payouts received</p>
        </div>
      </div>

      <div className="flex items-center gap-5 mt-5">
        <Link
          to="/vendor/finance/transactions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-regantify-cta hover:underline"
        >
          View transaction history
          <ArrowRight size={14} />
        </Link>
        <Link
          to="/vendor/finance/withdraw"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-regantify-cta hover:underline"
        >
          View withdrawal history
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
