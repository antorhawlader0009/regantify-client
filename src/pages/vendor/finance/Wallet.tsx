import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet as WalletIcon, ArrowRight, Clock, ArrowDownToLine } from 'lucide-react';
import { financeApi } from '../../../lib/financeApi';

function formatAmount(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export default function Wallet() {
  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'wallet'],
    queryFn: () => financeApi.getWallet(),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Wallet</h1>
        <Link
          to="/vendor/finance/withdraw"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          Request Withdrawal
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-regantify-black rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
            <WalletIcon size={16} />
            Main Balance
          </div>
          <p className="text-3xl font-semibold mt-3">
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
