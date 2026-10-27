import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Loader2 } from 'lucide-react';
import { ordersApi, type Order } from '../../lib/ordersApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

/**
 * Store pickup: before handing a pickup order over, the shop types the 6-digit code the customer shows (it is on their thank-you
 * and tracking page and in the "ready for pickup" text). The dashboard never sees the code, only the server compares it, so whoever
 * comes to collect must have it. A match marks the order Completed. Marking it Completed from the status menu still works (for a
 * customer who lost the code, the shop's own call).
 */
export function PickupCodeCard({ order, canEdit, onDone }: { order: Order; canEdit: boolean; onDone: () => void }) {
  const [code, setCode] = useState('');
  const check = useMutation({
    mutationFn: () => ordersApi.checkPickupCode(order.id, code.trim()),
    onSuccess: () => {
      toast.success('Code matches. The order is marked as picked up.');
      setCode('');
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not check the code.')),
  });

  if (order.deliveryZone !== 'PICKUP' || !order.hasPickupCode || !canEdit) return null;
  if (order.status !== 'PROCESSING' && order.status !== 'READY_FOR_PICKUP') return null;

  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          <KeyRound size={15} aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-regantify-text">Hand over at the shop</h3>
          <p className="text-xs text-regantify-text-muted">Ask the customer for their 6-digit pickup code and type it here.</p>
        </div>
      </div>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (/^\d{6}$/.test(code.trim())) check.mutate();
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="123456"
          aria-label="Pickup code"
          className="w-36 rounded-lg border border-line px-3 py-2 text-center font-mono text-lg tracking-[0.3em] outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={code.length !== 6 || check.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {check.isPending && <Loader2 size={14} className="animate-spin" />}
          Check and hand over
        </button>
      </form>
    </section>
  );
}
