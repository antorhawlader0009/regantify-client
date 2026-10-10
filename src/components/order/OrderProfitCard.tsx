import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { orderProfitApi } from '../../lib/orderProfitApi';
import { useCan } from '../../lib/useStaffAccess';

const taka = (n: number) => `${n < 0 ? '-' : ''}৳${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/**
 * Order detail: what this order earned, worked out exactly as Analytics > Sales does (so the two always agree):
 * what the customer pays, less product cost, the courier's fee, the platform charge and VAT. Only for people who may see
 * profit (analytics.profit). Cancelled and unpaid orders were never a sale, so they have no card.
 */
export function OrderProfitCard({ orderId }: { orderId: string }) {
  const canProfit = useCan('analytics.profit');
  const { data } = useQuery({
    queryKey: ['order-profit', orderId],
    queryFn: () => orderProfitApi.get([orderId]),
    enabled: canProfit,
    retry: false,
  });
  const p = data?.[0];
  if (!canProfit || !p) return null;

  const loss = p.profit < 0;
  const Icon = loss ? TrendingDown : TrendingUp;
  const row = (label: string, value: number, minus = false) =>
    value === 0 && minus ? null : (
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className="tabular-nums text-regantify-text">{minus ? `- ${taka(value)}` : taka(value)}</span>
      </div>
    );

  return (
    <div className={`rounded-xl border px-4 py-3 ${loss ? 'border-red-200 bg-red-50/40' : 'border-line bg-white'}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} className={loss ? 'text-red-600' : 'text-green-700'} aria-hidden />
        <span className="text-sm font-medium text-regantify-text">Profit on this order</span>
        {p.margin !== null && <span className="ml-auto text-xs text-neutral-500">{p.margin}% of what the customer pays</span>}
      </div>

      {p.returned ? (
        <div className="space-y-1">
          <p className="text-sm text-neutral-600">The parcel came back, so nothing was earned. Only the courier&apos;s fee is lost.</p>
          {row('Courier fee', p.courierFee)}
        </div>
      ) : (
        <div className="space-y-1">
          {row('Customer pays (with delivery charge)', p.revenue)}
          {row('Product cost', p.productCost, true)}
          {row('Courier fee', p.courierFee, true)}
          {row('Platform charge', p.platformCharge, true)}
          {row('VAT', p.vat, true)}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
        <span className="text-sm font-medium text-regantify-text">{p.returned ? 'Loss' : 'Profit'}</span>
        <span className={`text-base font-semibold tabular-nums ${loss ? 'text-red-700' : 'text-green-700'}`}>{taka(p.profit)}</span>
      </div>

      {!p.costKnown && !p.returned && (
        <p className="mt-2 text-xs text-amber-800">
          Some products on this order have no cost set, so the real profit is lower than this. Add the cost in{' '}
          <Link to="/vendor/product/all" className="underline">
            Edit Product
          </Link>
          .
        </p>
      )}
    </div>
  );
}
