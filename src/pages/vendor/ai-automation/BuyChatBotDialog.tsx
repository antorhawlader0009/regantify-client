import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { outlineBtn } from '../../../components/ui/PageKit';
import { formatTaka } from '../../../components/analytics/format';
import { aiChatBotApi, type ChatBotPackage } from '../../../lib/aiChatBotApi';
import { paymentsApi } from '../../../lib/paymentsApi';
import { financeApi } from '../../../lib/financeApi';
import { apiErrorMessage } from '../../../lib/api';

interface BuyChatBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tokens one reply uses at this store's size, for "about N replies". */
  tokensPerReply?: number;
}

/** What 1 million tokens cost in a pack, e.g. "330". */
function perMillion(pkg: Pick<ChatBotPackage, 'price' | 'tokenCount'>) {
  return (pkg.price / pkg.tokenCount) * 1_000_000;
}

/** "200K", "1M", "15M". */
function shortTokens(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('en-US')}M` : `${(n / 1_000).toLocaleString('en-US')}K`;
}

/**
 * "Buy tokens": pick a pack (each shows its price per 1M tokens and about
 * how many replies it pays for at this store's size), then confirm. The
 * confirm step starts a real PayStation checkout and redirects there; the
 * tokens land in the store's wallet once PayStation confirms the payment
 * (PaymentsService.fulfill), not on click (ai-token-plan.md Step 8).
 */
export function BuyChatBotDialog({ open, onOpenChange, tokensPerReply }: BuyChatBotDialogProps) {
  const [selected, setSelected] = useState<ChatBotPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['chatbot-packages'],
    queryFn: () => aiChatBotApi.getPackages(),
    enabled: open,
  });

  // Only fetched to show the deficit-clearing note before charging; the
  // server resolves the real deficit itself at initiate time.
  const { data: wallet } = useQuery({
    queryKey: ['finance', 'wallet'],
    queryFn: () => financeApi.getWallet(),
    enabled: open,
  });
  const deficit = Math.max(0, -Number(wallet?.balance ?? '0'));

  const buyMutation = useMutation({
    mutationFn: (packageId: ChatBotPackage['id']) => paymentsApi.initiate({ purpose: 'CHATBOT_PACKAGE', packageId }),
    onSuccess: (data) => {
      window.location.href = data.paymentUrl;
    },
    onError: (err) => setError(apiErrorMessage(err, 'Couldn’t open PayStation. Check your connection and try again.')),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelected(null);
      setError(null);
    }
    onOpenChange(next);
  };

  const best = packages?.reduce<ChatBotPackage | null>((b, p) => (!b || perMillion(p) < perMillion(b) ? p : b), null);
  const replies = (tokens: number) => (tokensPerReply ? Math.floor(tokens / tokensPerReply) : null);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} title={selected ? 'Confirm purchase' : 'Buy AI tokens'} maxWidth="max-w-3xl">
      <div className="p-6 pt-3">
        {selected ? (
          <>
            <button type="button" onClick={() => setSelected(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
              <ArrowLeft size={15} aria-hidden />
              Other packs
            </button>
            <dl className="space-y-1.5 rounded-lg border border-line bg-neutral-50 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-600">{selected.tokenCount.toLocaleString()} AI tokens</dt>
                <dd className="tabular-nums">{formatTaka(selected.price)}</dd>
              </div>
              {deficit > 0 && (
                <div className="flex justify-between gap-3 text-amber-800">
                  <dt>Clears your negative wallet balance</dt>
                  <dd className="tabular-nums">{formatTaka(deficit)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-semibold text-regantify-text">
                <dt>You pay</dt>
                <dd className="tabular-nums">{formatTaka(selected.price + deficit)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-neutral-500">
              Pay with bKash, Nagad or a card on PayStation. The tokens are added as soon as the payment is confirmed, and they never expire.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() => buyMutation.mutate(selected.id)}
              disabled={buyMutation.isPending}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {buyMutation.isPending ? 'Opening PayStation…' : `Pay ${formatTaka(selected.price + deficit)}`}
            </button>
          </>
        ) : isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3" aria-busy>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-neutral-100" />
            ))}
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {(packages ?? []).map((pkg) => {
                const isBest = best?.id === pkg.id;
                const n = replies(pkg.tokenCount);
                return (
                  <li key={pkg.id} className={`flex flex-col rounded-xl border p-4 ${isBest ? 'border-brand bg-brand-lime/20' : 'border-line bg-white'}`}>
                    {isBest && (
                      <span className="mb-2 w-fit rounded border border-brand/30 bg-brand-lime px-1.5 py-0.5 text-[11px] font-medium text-regantify-text">Best value</span>
                    )}
                    <p className="text-xl font-semibold tabular-nums text-regantify-text">{shortTokens(pkg.tokenCount)} tokens</p>
                    <p className="text-sm text-neutral-600">{formatTaka(pkg.price)}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {formatTaka(perMillion(pkg))} per 1M tokens
                      {n != null && ` · about ${n.toLocaleString()} replies`}
                    </p>
                    <button type="button" onClick={() => setSelected(pkg)} className={`${outlineBtn} mt-4 h-10`}>
                      Choose
                    </button>
                  </li>
                );
              })}
            </ul>
            {tokensPerReply != null && (
              <p className="mt-4 text-xs text-neutral-500">
                Replies are worked out for your store today (about {tokensPerReply.toLocaleString()} tokens a reply). Adding products makes each reply use a
                little more.
              </p>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
