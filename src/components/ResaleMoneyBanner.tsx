import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { useFeature } from '../lib/features';
import { useCan } from '../lib/useStaffAccess';

interface ResaleMoneyStatus {
  waiting: { count: number; amount: number; needed: number };
  upcoming: { amount: number; needed: number };
  balance: number;
}

const taka = (n: number) => `৳${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/**
 * Reseller system (RESELLER-plan.md Step 8): the supplier's strip on every dashboard page. Red while reseller earnings wait for money in the
 * wallet (the store takes no new orders until then); amber when resale orders on their way will owe more than the wallet holds. Asked only
 * for stores the RESALE_SUPPLY flag is on for; nothing shows otherwise.
 */
export function ResaleMoneyBanner() {
  const supplyOn = useFeature('RESALE_SUPPLY');
  const canFinance = useCan('finance.view');
  const canOrders = useCan('orders.view');
  const canSee = canFinance || canOrders;
  const { data } = useQuery({
    queryKey: ['resale-money-status'],
    queryFn: () => api.get<ResaleMoneyStatus>('/v1/resale/money/status').then((r) => r.data),
    enabled: supplyOn && canSee,
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
    retry: false,
  });
  if (!data) return null;
  if (data.waiting.count > 0) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
        <Wallet size={16} className="shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          Your store is not taking new orders: reseller earnings of {taka(data.waiting.amount)} are waiting. Add {taka(data.waiting.needed)} to your wallet and orders reopen by themselves.
        </p>
        <Link to="/vendor/billing?tab=wallet" className="shrink-0 font-medium underline underline-offset-2">
          Add money
        </Link>
      </div>
    );
  }
  if (data.upcoming.needed > 0) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        <Wallet size={16} className="shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          Resale orders on their way will owe resellers {taka(data.upcoming.amount)}. Add {taka(data.upcoming.needed)} before they are delivered, or new orders stop until you do.
        </p>
        <Link to="/vendor/billing?tab=wallet" className="shrink-0 font-medium underline underline-offset-2">
          Add money
        </Link>
      </div>
    );
  }
  return null;
}
