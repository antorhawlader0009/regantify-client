import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { outlineBtn } from '../../../components/ui/PageKit';
import { smsApi, type SmsPackage } from '../../../lib/smsApi';
import { paymentsApi } from '../../../lib/paymentsApi';
import { financeApi } from '../../../lib/financeApi';
import { apiErrorMessage } from '../../../lib/api';

interface BuySmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** "৳0.41" — what one SMS costs in a package. */
export function perSms(pkg: Pick<SmsPackage, 'price' | 'smsCount'>) {
  return `৳${(pkg.price / pkg.smsCount).toFixed(2)}`;
}

/**
 * "Buy SMS": pick a package (each shows what one SMS costs), then
 * confirm. The confirm step starts a real PayStation checkout for the
 * package's price and redirects the browser there — SMS credits land
 * once PayStation confirms the payment (IPN/callback, see
 * PaymentsService.reconcile), not immediately on click.
 */
export function BuySmsDialog({ open, onOpenChange }: BuySmsDialogProps) {
  const [selected, setSelected] = useState<SmsPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['sms-packages'],
    queryFn: () => smsApi.getPackages(),
    enabled: open,
  });

  // Only fetched to show the deficit-clearing note before charging — the
  // server resolves the real deficit itself at initiate time
  // (PaymentsService.initiate) regardless of what this reads.
  const { data: wallet } = useQuery({
    queryKey: ['finance', 'wallet'],
    queryFn: () => financeApi.getWallet(),
    enabled: open,
  });
  const deficit = Math.max(0, -Number(wallet?.balance ?? '0'));

  const buyMutation = useMutation({
    mutationFn: (packageId: SmsPackage['id']) => paymentsApi.initiate({ purpose: 'SMS_PACKAGE', packageId }),
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

  const cheapest = packages?.reduce<SmsPackage | null>((best, p) => (!best || p.price / p.smsCount < best.price / best.smsCount ? p : best), null);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} title={selected ? 'Confirm purchase' : 'Buy SMS'} maxWidth="max-w-2xl">
      <div className="p-6 pt-3">
        {selected ? (
          <>
            <button type="button" onClick={() => setSelected(null)} className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
              <ArrowLeft size={15} aria-hidden />
              Other packages
            </button>
            <dl className="space-y-1.5 rounded-lg border border-line bg-neutral-50 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-600">{selected.smsCount.toLocaleString()} SMS</dt>
                <dd className="tabular-nums">৳{selected.price.toLocaleString()}</dd>
              </div>
              {deficit > 0 && (
                <div className="flex justify-between gap-3 text-amber-800">
                  <dt>Clears your negative wallet balance</dt>
                  <dd className="tabular-nums">৳{deficit.toLocaleString()}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-semibold text-regantify-text">
                <dt>You pay</dt>
                <dd className="tabular-nums">৳{(selected.price + deficit).toLocaleString()}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-neutral-500">Pay with bKash, Nagad or a card on PayStation. The SMS are added as soon as the payment is confirmed.</p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() => buyMutation.mutate(selected.id)}
              disabled={buyMutation.isPending}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {buyMutation.isPending ? 'Opening PayStation…' : `Pay ৳${(selected.price + deficit).toLocaleString()}`}
            </button>
          </>
        ) : isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3" aria-busy>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-neutral-100" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {(packages ?? []).map((pkg) => {
              const best = cheapest?.id === pkg.id;
              return (
                <li key={pkg.id} className={`flex flex-col rounded-xl border p-4 ${best ? 'border-brand bg-brand-lime/20' : 'border-line bg-white'}`}>
                  {best && <span className="mb-2 w-fit rounded border border-brand/30 bg-brand-lime px-1.5 py-0.5 text-[11px] font-medium text-regantify-text">Best value</span>}
                  <p className="text-xl font-semibold tabular-nums text-regantify-text">{pkg.smsCount.toLocaleString()} SMS</p>
                  <p className="text-sm text-neutral-600">৳{pkg.price.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{perSms(pkg)} per SMS</p>
                  <button type="button" onClick={() => setSelected(pkg)} className={`${outlineBtn} mt-4 h-10`}>
                    Choose
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
