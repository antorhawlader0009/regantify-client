import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getVendorDeliveryCharges, updateVendorDeliveryCharges } from '../../../lib/vendorApi';

const deliveryChargeSchema = z.object({
  insideDhakaCharge: z.coerce.number().min(0, 'Enter a valid amount').max(1000000, 'Amount is too large'),
  outsideDhakaCharge: z.coerce.number().min(0, 'Enter a valid amount').max(1000000, 'Amount is too large'),
  vatChargeBdt: z.coerce.number().min(0, 'Enter a valid amount').max(1000000, 'Amount is too large'),
});
type DeliveryChargeFormValues = z.infer<typeof deliveryChargeSchema>;

const inputClass = `w-full px-4 py-2.5 rounded-xl bg-regantify-search text-regantify-text
  focus:outline-none focus:ring-2 focus:ring-regantify-black`;

/**
 * Store > Delivery Charge (moved here from Settings) — vendor-editable
 * Inside Dhaka / Outside Dhaka shipping charges plus a flat VAT fee applied
 * to every order regardless of payment method (see Vendor.insideDhakaCharge/
 * vatChargeBdt in schema.prisma). These are the exact numbers checkout uses
 * to price an order — see OrdersService.create and
 * storefront/src/lib/useCheckout.ts, both of which read the vendor's own
 * saved values. A gateway's own Platform Charge is a separate, independent
 * setting — see Store > Payment Gateway (PaymentGateway.tsx), not this form.
 */
export default function DeliveryCharge() {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: charges, isLoading } = useQuery({
    queryKey: ['vendor-delivery-charges'],
    queryFn: getVendorDeliveryCharges,
  });

  const form = useForm<DeliveryChargeFormValues>({
    resolver: zodResolver(deliveryChargeSchema),
    defaultValues: { insideDhakaCharge: 70, outsideDhakaCharge: 130, vatChargeBdt: 10 },
  });

  useEffect(() => {
    if (charges) {
      form.reset({
        insideDhakaCharge: Number(charges.insideDhakaCharge),
        outsideDhakaCharge: Number(charges.outsideDhakaCharge),
        vatChargeBdt: Number(charges.vatChargeBdt),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charges]);

  const saveMutation = useMutation({
    mutationFn: updateVendorDeliveryCharges,
    onSuccess: (updated) => {
      queryClient.setQueryData(['vendor-delivery-charges'], updated);
      setSaveError(null);
      toast.success('Delivery charges saved.');
    },
    onError: () => setSaveError('Could not save delivery charges. Please try again.'),
  });

  const onSubmit = (values: DeliveryChargeFormValues) => {
    setSaveError(null);
    saveMutation.mutate(values);
  };

  const errors = form.formState.errors;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Delivery Charge</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Set what shoppers pay for delivery, and a flat VAT added to every order.
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-black/5 p-5">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Inside Dhaka (৳)</label>
            <input type="number" min={0} step="0.01" disabled={isLoading} className={inputClass} {...form.register('insideDhakaCharge')} />
            {errors.insideDhakaCharge && <p className="text-red-500 text-sm mt-1.5">{errors.insideDhakaCharge.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Outside Dhaka (৳)</label>
            <input type="number" min={0} step="0.01" disabled={isLoading} className={inputClass} {...form.register('outsideDhakaCharge')} />
            {errors.outsideDhakaCharge && <p className="text-red-500 text-sm mt-1.5">{errors.outsideDhakaCharge.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">VAT (৳)</label>
            <input type="number" min={0} step="0.01" disabled={isLoading} className={inputClass} {...form.register('vatChargeBdt')} />
            {errors.vatChargeBdt && <p className="text-red-500 text-sm mt-1.5">{errors.vatChargeBdt.message}</p>}
            <p className="text-xs text-regantify-text-muted mt-1.5">
              Added to every order, regardless of payment method. See Store &gt; Payment Gateway for per-gateway charges.
            </p>
          </div>

          <div className="sm:col-span-3 flex items-center gap-3">
            {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
            <button
              type="submit"
              disabled={saveMutation.isPending || isLoading}
              className="bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl
                hover:bg-black transition-colors disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save delivery charges'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
