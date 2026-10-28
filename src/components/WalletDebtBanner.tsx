import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { kycApi } from '../lib/kycApi';
import { useAuthStore } from '../store/authStore';

/**
 * The wallet strip on every dashboard page (2026-10-28, server finance/wallet-debt.ts). The platform's fees are taken from the
 * wallet when an order completes, so it can go below 0: below ৳0 a yellow warning (orders still come in), below the -৳100 limit a
 * red strip (new orders are off and the store shows shoppers "orders are off" until money is added). Nothing shows otherwise.
 * Staff see it too, without the amount, and are told to ask the owner.
 */
export function WalletDebtBanner() {
  const isOwner = useAuthStore((s) => s.user?.role === 'VENDOR');
  const { data } = useQuery({ queryKey: ['kyc-me'], queryFn: kycApi.mine, refetchInterval: 5 * 60_000, staleTime: 60_000, retry: false });
  const wallet = data?.wallet;
  if (!wallet || wallet.state === 'OK') return null;

  const off = wallet.state === 'OFF';
  const amount = `৳${wallet.balance.toLocaleString('en-US')}`;
  const text = off
    ? isOwner
      ? `New orders are off. Your wallet is ${amount}, below the ৳${wallet.limit} limit, because of unpaid platform fees. Add money and orders open again at once.`
      : 'New orders are off because the store wallet is below its limit. Ask the store owner to add money.'
    : isOwner
      ? `Your wallet is ${amount} after platform fees. Add money soon: below ৳${wallet.limit} your store stops taking new orders.`
      : 'The store wallet is below ৳0. Ask the store owner to add money before new orders stop.';

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm ${off ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
      <Wallet size={16} className="shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{text}</p>
      {isOwner && (
        <Link to="/vendor/billing?tab=wallet" className="shrink-0 font-medium underline underline-offset-2">
          Add money
        </Link>
      )}
    </div>
  );
}
