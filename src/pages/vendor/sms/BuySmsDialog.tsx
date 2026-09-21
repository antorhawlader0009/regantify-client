import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { smsApi, type SmsPackage } from '../../../lib/smsApi';
import { paymentsApi } from '../../../lib/paymentsApi';
import { financeApi } from '../../../lib/financeApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface BuySmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Purchase Credits: SMS" — matches the reference package cards
 * exactly. Picking a package moves to a confirm step; the confirm
 * step's "Payment" button starts a real PayStation checkout for the
 * package's price and redirects the browser there — SMS credits land
 * once PayStation confirms the payment (IPN/callback, see
 * PaymentsService.reconcile), not immediately on click.
 */
export function BuySmsDialog({ open, onOpenChange }: BuySmsDialogProps) {
  const [selected, setSelected] = useState<SmsPackage | null>(null);

  const { data: packages } = useQuery({
    queryKey: ['sms-packages'],
    queryFn: () => smsApi.getPackages(),
    enabled: open,
  });

  // Only fetched to show the deficit-clearing note below before
  // charging — the server resolves the real deficit itself at initiate
  // time (PaymentsService.initiate) regardless of what this reads.
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
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not start the payment. Please try again.')),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelected(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} maxWidth="max-w-2xl">
      <div className="p-6">
        {selected ? (
          <>
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-4"
            >
              <ArrowLeft size={15} />
              Back
            </button>

            <h2 className="text-lg font-semibold text-regantify-text mb-1">Confirm Purchase</h2>
            <p className="text-sm text-regantify-text-muted mb-5">
              {selected.smsCount.toLocaleString()} SMS credits for ৳{selected.price.toLocaleString()}
            </p>

            <div className="bg-regantify-content rounded-xl p-4 mb-5 flex items-center justify-between">
              <span className="text-sm text-regantify-text">Total</span>
              <span className="text-lg font-semibold text-regantify-text">
                ৳{(selected.price + deficit).toLocaleString()}
              </span>
            </div>
            {deficit > 0 && (
              <p className="text-xs text-amber-700 -mt-3 mb-5">
                Includes ৳{deficit.toLocaleString()} clearing your negative wallet balance.
              </p>
            )}

            <button
              onClick={() => buyMutation.mutate(selected.id)}
              disabled={buyMutation.isPending}
              className="w-full px-6 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
                transition-colors disabled:opacity-60"
            >
              {buyMutation.isPending ? 'Redirecting…' : 'Pay with PayStation'}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-regantify-text mb-5">Purchase Credits: SMS</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(packages ?? []).map((pkg) => (
                <div key={pkg.id} className="bg-regantify-content rounded-2xl p-5">
                  <p className="text-base font-semibold text-regantify-text mb-1">
                    {pkg.smsCount.toLocaleString()} SMSs
                  </p>
                  <p className="text-sm text-regantify-text-muted mb-4">Price: ৳{pkg.price.toLocaleString()}</p>
                  <button
                    onClick={() => setSelected(pkg)}
                    className="px-4 py-2 rounded-xl border border-regantify-cta text-regantify-cta text-sm font-medium
                      hover:bg-regantify-cta hover:text-white transition-colors"
                  >
                    Buy Now
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
