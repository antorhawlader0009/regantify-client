import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { giftCardSalesApi } from '../../../lib/giftCardsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { formatDhakaDate } from '../../../lib/dhakaDate';
import { useCan } from '../../../lib/useStaffAccess';

const taka = (n: number) => `৳${n.toLocaleString('en-US')}`;
const STATUS_TEXT: Record<string, string> = { PENDING: 'Waiting for payment', PAID: 'Paid', FAILED: 'Payment failed', CANCELLED: 'Cancelled' };

/**
 * Marketing > Gift Cards > "Sell on your store" (TellMe idea 135): shoppers on a StorePal store buy a card for someone, pay through your own
 * SSLCommerz, and the receiver is texted the code from your SMS credits. The money goes straight to your gateway: nothing passes through the
 * platform wallet and there is no platform fee. A sold card is your liability like any other. To cancel or refund one, switch the card off in the
 * list below and return the money yourself. Off by default; needs SSLCommerz connected.
 */
export function GiftCardSaleCard() {
  const queryClient = useQueryClient();
  const canEdit = useCan('marketing.gift_cards');
  const { data } = useQuery({ queryKey: ['gift-card-sales'], queryFn: giftCardSalesApi.settings });
  const { data: purchases = [] } = useQuery({ queryKey: ['gift-card-purchases'], queryFn: giftCardSalesApi.purchases });
  const [enabled, setEnabled] = useState(false);
  const [amounts, setAmounts] = useState('500, 1000, 2000');
  const [expiry, setExpiry] = useState('');

  useEffect(() => {
    if (!data) return;
    setEnabled(data.giftCardSaleEnabled);
    setAmounts(data.giftCardSaleAmounts.join(', '));
    setExpiry(data.giftCardSaleExpiryDays ? String(data.giftCardSaleExpiryDays) : '');
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      giftCardSalesApi.save({
        enabled,
        amounts: amounts.split(/[\s,]+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n)),
        expiryDays: expiry.trim() === '' ? null : Number(expiry),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gift-card-sales'] });
      toast.success('Saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });

  if (!data) return null;
  return (
    <section className="mb-5 rounded-2xl border border-black/5 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-regantify-text">Sell gift cards on your store</h2>
          <p className="mt-1 text-sm text-regantify-text-muted">
            Shoppers buy a card for a friend at <span className="font-mono">/gift-card</span> on your StorePal store and pay online. The receiver gets the code by SMS from your SMS credits. The money goes to your own SSLCommerz; nothing passes through the platform wallet.
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} disabled={!canEdit} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          On
        </label>
      </div>
      {!data.gatewayReady && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          SSLCommerz is not connected. <Link to="/vendor/store/payment-gateway" className="underline">Connect it</Link> to sell gift cards online.
        </p>
      )}
      <div className={`mt-4 grid gap-4 sm:grid-cols-2 ${enabled ? '' : 'opacity-60'}`}>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Amounts to sell (৳, up to 6)</label>
          <input value={amounts} disabled={!canEdit || !enabled} onChange={(e) => setAmounts(e.target.value)} placeholder="500, 1000, 2000" className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm" />
          <p className="mt-1 text-xs text-regantify-text-muted">Between ৳100 and ৳50,000.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Card lasts (days)</label>
          <input type="number" min={30} max={1095} value={expiry} disabled={!canEdit || !enabled} onChange={(e) => setExpiry(e.target.value)} placeholder="Blank = never expires" className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm" />
        </div>
      </div>
      {canEdit && (
        <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="mt-4 rounded-xl bg-regantify-black px-5 py-2.5 font-medium text-white disabled:opacity-60">
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      )}

      {purchases.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold">Online sales</h3>
          <ul className="divide-y divide-black/5 text-sm">
            {purchases.slice(0, 10).map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <span className="font-semibold tabular-nums">{taka(p.amount)}</span>
                <span>
                  {p.buyerName} → {p.recipientName} ({p.recipientPhone})
                </span>
                <span className="text-xs text-neutral-500">{formatDhakaDate(p.createdAt)}</span>
                <span className="ml-auto text-xs">
                  {STATUS_TEXT[p.status] ?? p.status}
                  {p.status === 'PAID' && !p.smsSent && <span className="ml-1.5 text-amber-700">· SMS not sent{p.smsError ? ` (${p.smsError})` : ''}: give them the code yourself</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
