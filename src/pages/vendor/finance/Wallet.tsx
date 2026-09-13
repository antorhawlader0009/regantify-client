import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet as WalletIcon, ArrowRight } from 'lucide-react';
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
      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Wallet</h1>

      <div className="bg-regantify-black rounded-2xl p-6 max-w-sm text-white">
        <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
          <WalletIcon size={16} />
          Main Balance
        </div>
        <p className="text-3xl font-semibold mt-3">
          {isLoading ? '…' : formatAmount(data?.balance ?? '0')}
        </p>
      </div>

      <Link
        to="/vendor/finance/transactions"
        className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium text-regantify-cta hover:underline"
      >
        View transaction history
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
