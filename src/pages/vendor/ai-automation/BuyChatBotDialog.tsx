import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { aiChatBotApi, type ChatBotPackage } from '../../../lib/aiChatBotApi';
import { paymentsApi } from '../../../lib/paymentsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

interface BuyChatBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Purchase Credits: AI Chat Bot" — same two-step (pick package -> confirm
 * -> Payment) flow as BuySmsDialog. Payment starts a real PayStation
 * checkout for the package's price and redirects the browser there —
 * chatBotCredits land once PayStation confirms the payment (IPN/
 * callback, see PaymentsService.reconcile), not immediately on click.
 */
export function BuyChatBotDialog({ open, onOpenChange }: BuyChatBotDialogProps) {
  const [selected, setSelected] = useState<ChatBotPackage | null>(null);

  const { data: packages } = useQuery({
    queryKey: ['chatbot-packages'],
    queryFn: () => aiChatBotApi.getPackages(),
    enabled: open,
  });

  const buyMutation = useMutation({
    mutationFn: (packageId: ChatBotPackage['id']) => paymentsApi.initiate({ purpose: 'CHATBOT_PACKAGE', packageId }),
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
    <Dialog open={open} onOpenChange={handleOpenChange} maxWidth="max-w-3xl">
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
              {selected.messageCount.toLocaleString()} AI Chat Bot messages for ৳{selected.price.toLocaleString()}
            </p>

            <div className="bg-regantify-content rounded-xl p-4 mb-5 flex items-center justify-between">
              <span className="text-sm text-regantify-text">Total</span>
              <span className="text-lg font-semibold text-regantify-text">৳{selected.price.toLocaleString()}</span>
            </div>

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
            <h2 className="text-lg font-semibold text-regantify-text mb-5">Purchase Credits: AI Chat Bot</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(packages ?? []).map((pkg) => (
                <div key={pkg.id} className="bg-regantify-content rounded-2xl p-5">
                  <p className="text-base font-semibold text-regantify-text mb-1">
                    {pkg.messageCount.toLocaleString()} Messages
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
