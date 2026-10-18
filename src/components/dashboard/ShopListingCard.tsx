import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Store } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useCan } from '../../lib/useStaffAccess';
import { useFeature } from '../../lib/features';
import { formatValue } from '../analytics/format';

// Mirrors server/src/marketplace/shop-listing.service.ts (SHOP-plan.md Step 10).
type ShopListing = {
  available: boolean;
  listed: boolean;
  blocked: boolean;
  blockReason: string | null;
  eligible: boolean;
  refusalText: string | null;
  indexedProducts: number;
  shopUrl: string;
  last30Days: { visits: number; orders: number; sales: number };
};

/**
 * Dashboard > "Regantify Shop" (SHOP-plan.md Step 10): the owner's switch to show the store's products on the platform's Shop, why it isn't
 * showing yet when it isn't, and what the Shop brought in the last 30 days. Shown only while the Shop is open to this store (the SHOP flag).
 */
export function ShopListingCard({ isOwner }: { isOwner: boolean }) {
  const flagOn = useFeature('SHOP');
  const canSee = useCan('store.settings');
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['shop-listing'],
    queryFn: () => api.get<ShopListing>('/v1/vendor/shop-listing').then((r) => r.data),
    enabled: flagOn && canSee,
  });
  const save = useMutation({
    mutationFn: (listed: boolean) => api.patch<ShopListing>('/v1/vendor/shop-listing', { listed }).then((r) => r.data),
    onSuccess: (d) => {
      queryClient.setQueryData(['shop-listing'], d);
      toast.success(d.listed ? 'Your products will show on the Shop shortly.' : 'Your products are off the Shop.');
    },
    onError: (e) => toast.error(apiErrorMessage(e, 'Could not save.')),
  });
  if (!flagOn || !canSee || !data?.available) return null;

  const status = data.blocked
    ? `Removed from the Shop by Regantify${data.blockReason ? `: ${data.blockReason}` : '.'}`
    : !data.listed
      ? 'Your products are not on the Shop.'
      : data.eligible
        ? `${data.indexedProducts} of your products are on the Shop.`
        : (data.refusalText ?? 'Checking your store, this takes up to 10 minutes.');

  return (
    <section id="regantify-shop" className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Store size={18} className="text-regantify-text-muted" />
        <h2 className="text-sm font-semibold text-regantify-text">Regantify Shop</h2>
      </div>
      <p className="text-sm text-neutral-600">{status}</p>
      {data.listed && (
        <p className="mt-2 text-xs text-neutral-500">
          Last 30 days from the Shop: {data.last30Days.visits} visits, {data.last30Days.orders} orders, {formatValue(data.last30Days.sales, 'money')}.
        </p>
      )}
      <p className="mt-2 text-xs text-neutral-500">Tip: hidden search words on your products help shoppers find them on the Shop too.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {isOwner && !data.blocked && (
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate(!data.listed)}
            className="rounded-lg bg-regantify-cta px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {data.listed ? 'Take my products off the Shop' : 'Show my products on the Shop'}
          </button>
        )}
        <a href={data.shopUrl} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline">
          Open the Shop
        </a>
      </div>
    </section>
  );
}
