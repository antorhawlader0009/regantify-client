import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getVendorDeliveryCharges, updateVendorDeliveryCharges, type DeliveryCharges } from '../../../lib/vendorApi';
import { apiErrorMessage } from '../../../lib/api';

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
                hover:bg-regantify-cta-dark transition-colors disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save delivery charges'}
            </button>
          </div>
        </form>
      </section>

      <AroundDhakaSection
        charges={charges}
        disabled={isLoading}
        onSaved={(updated) => queryClient.setQueryData(['vendor-delivery-charges'], updated)}
      />

      <PickupSection
        charges={charges}
        disabled={isLoading}
        onSaved={(updated) => queryClient.setQueryData(['vendor-delivery-charges'], updated)}
      />

      <PreferredDaySection
        charges={charges}
        disabled={isLoading}
        onSaved={(updated) => queryClient.setQueryData(['vendor-delivery-charges'], updated)}
      />

      <DeliveryTimeSection
        charges={charges}
        disabled={isLoading}
        onSaved={(updated) => queryClient.setQueryData(['vendor-delivery-charges'], updated)}
      />
    </div>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * "Around Dhaka": an optional third delivery zone for Savar, Ashulia, Gazipur, Tongi, Narayanganj, Keraniganj
 * and nearby, because couriers price them between Dhaka and the rest of the country. Off by default, so
 * nothing changes until the vendor turns it on. StorePal's checkout offers it as a third shipping option
 * (and picks it from the district when the shopper has not chosen one); other themes keep two.
 */
function AroundDhakaSection({
  charges,
  disabled,
  onSaved,
}: {
  charges: DeliveryCharges | undefined;
  disabled: boolean;
  onSaved: (updated: DeliveryCharges) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [charge, setCharge] = useState('100');
  const [days, setDays] = useState('');

  useEffect(() => {
    if (!charges) return;
    setEnabled(charges.aroundDhakaEnabled);
    setCharge(String(Number(charges.aroundDhakaCharge)));
    setDays(charges.aroundDhakaDays === null ? '' : String(charges.aroundDhakaDays));
  }, [charges]);

  const save = useMutation({
    mutationFn: () => {
      const amount = Number(charge);
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter the charge as a number.');
      return updateVendorDeliveryCharges({
        aroundDhakaEnabled: enabled,
        aroundDhakaCharge: amount,
        aroundDhakaDays: days.trim() === '' ? null : Number(days),
      });
    },
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success('Around Dhaka saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save Around Dhaka. Check the numbers and try again.')),
  });

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5 mt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-regantify-text">Around Dhaka</h2>
          <p className="text-sm text-regantify-text-muted mt-1">
            A third delivery option for Savar, Ashulia, Gazipur, Tongi, Narayanganj, Keraniganj and nearby, with its own
            charge. Without it those shoppers pay either the Dhaka or the outside-Dhaka charge.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-regantify-text shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-regantify-cta"
          />
          On
        </label>
      </div>

      <div className={`grid sm:grid-cols-2 gap-4 mt-4 ${enabled ? '' : 'opacity-60'}`}>
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Around Dhaka (৳)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={charge}
            disabled={disabled || !enabled}
            onChange={(e) => setCharge(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Delivery time (working days)</label>
          <input
            type="number"
            min={0}
            max={60}
            step={1}
            inputMode="numeric"
            value={days}
            disabled={disabled || !enabled}
            onChange={(e) => setDays(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-regantify-text-muted mt-1.5">Blank = no &ldquo;Expected by&rdquo; date for this zone.</p>
        </div>
      </div>

      <p className="text-xs text-regantify-text-muted mt-3">
        Works on the StorePal theme. Orders you add yourself can use it too.
      </p>

      <button
        type="button"
        disabled={save.isPending || disabled}
        onClick={() => save.mutate()}
        className="mt-4 bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Save Around Dhaka'}
      </button>
    </section>
  );
}

/**
 * "Delivery time" (tracking-plan.md Step 7): how many working days a parcel takes, so shoppers see an
 * "Expected by" date at checkout, on the thank-you page, on the tracking page and in texts. Blank for a
 * zone means no date is shown for it (the default). The date is worked out when the order is placed and
 * never changes afterwards, so editing this later does not move a promise already made.
 */
function DeliveryTimeSection({
  charges,
  disabled,
  onSaved,
}: {
  charges: DeliveryCharges | undefined;
  disabled: boolean;
  onSaved: (updated: DeliveryCharges) => void;
}) {
  const [inside, setInside] = useState('');
  const [outside, setOutside] = useState('');
  const [processing, setProcessing] = useState('0');
  const [offDays, setOffDays] = useState<number[]>([]);

  useEffect(() => {
    if (!charges) return;
    setInside(charges.insideDhakaDays === null ? '' : String(charges.insideDhakaDays));
    setOutside(charges.outsideDhakaDays === null ? '' : String(charges.outsideDhakaDays));
    setProcessing(String(charges.deliveryProcessingDays));
    setOffDays(charges.deliveryOffDays);
  }, [charges]);

  const save = useMutation({
    mutationFn: () =>
      updateVendorDeliveryCharges({
        insideDhakaDays: inside.trim() === '' ? null : Number(inside),
        outsideDhakaDays: outside.trim() === '' ? null : Number(outside),
        deliveryProcessingDays: Number(processing) || 0,
        deliveryOffDays: offDays,
      }),
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success('Delivery time saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the delivery time. Check the numbers and try again.')),
  });

  const numberField = (label: string, value: string, set: (v: string) => void, hint: string, max: number) => (
    <div>
      <label className="block text-sm font-medium text-regantify-text mb-1.5">{label}</label>
      <input
        type="number"
        min={0}
        max={max}
        step={1}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => set(e.target.value)}
        className={inputClass}
      />
      <p className="text-xs text-regantify-text-muted mt-1.5">{hint}</p>
    </div>
  );

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5 mt-6">
      <h2 className="text-base font-medium text-regantify-text">Delivery time</h2>
      <p className="text-sm text-regantify-text-muted mt-1">
        Show shoppers an &ldquo;Expected by&rdquo; date. Leave a zone blank to show no date for it.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mt-4">
        {numberField('Inside Dhaka (working days)', inside, setInside, 'Blank = no date shown.', 60)}
        {numberField('Outside Dhaka (working days)', outside, setOutside, 'Blank = no date shown.', 60)}
        {numberField('Days to get an order ready', processing, setProcessing, 'Added before the delivery days.', 30)}
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-regantify-text mb-1.5">Days off (not counted)</p>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((name, day) => {
            const on = offDays.includes(day);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => setOffDays((prev) => (on ? prev.filter((d) => d !== day) : [...prev, day].sort()))}
                className={`px-3 py-1.5 rounded-lg border text-sm ${on ? 'bg-regantify-black text-white border-regantify-black' : 'border-black/10 text-regantify-text hover:bg-regantify-content'}`}
              >
                {name}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-regantify-text-muted mt-1.5">For example Friday, if you do not ship or deliver on Fridays.</p>
      </div>

      <button
        type="button"
        disabled={save.isPending || disabled}
        onClick={() => save.mutate()}
        className="mt-5 bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Save delivery time'}
      </button>
    </section>
  );
}

/**
 * "Pick up from the shop" (TellMe idea 46): a fourth checkout option on StorePal at no delivery charge. The shopper
 * gives a name and phone only; the order goes Pending, Processing, Ready for pickup (the customer is texted, from
 * your SMS credits), Completed. It never goes to a courier, a handover sheet or rider cash.
 */
function PickupSection({
  charges,
  disabled,
  onSaved,
}: {
  charges: DeliveryCharges | undefined;
  disabled: boolean;
  onSaved: (updated: DeliveryCharges) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [address, setAddress] = useState('');
  const [hours, setHours] = useState('');

  useEffect(() => {
    if (!charges) return;
    setEnabled(charges.pickupEnabled);
    setAddress(charges.pickupAddress ?? '');
    setHours(charges.pickupHours ?? '');
  }, [charges]);

  const save = useMutation({
    mutationFn: () => {
      if (enabled && !address.trim()) throw new Error('Write the shop address shoppers should come to.');
      return updateVendorDeliveryCharges({ pickupEnabled: enabled, pickupAddress: address.trim() || null, pickupHours: hours.trim() || null });
    },
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success('Store pickup saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save store pickup. Try again.')),
  });

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5 mt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-regantify-text">Pick up from the shop</h2>
          <p className="text-sm text-regantify-text-muted mt-1">
            Shoppers who live nearby can choose to collect the order themselves: no delivery charge, no address needed. Mark the
            order &ldquo;Ready for pickup&rdquo; and they get a text with your address and opening hours.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-regantify-text shrink-0 cursor-pointer">
          <input type="checkbox" checked={enabled} disabled={disabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          On
        </label>
      </div>

      <div className={`grid gap-4 mt-4 ${enabled ? '' : 'opacity-60'}`}>
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Shop address</label>
          <input value={address} maxLength={300} disabled={disabled || !enabled} onChange={(e) => setAddress(e.target.value)} className={inputClass} placeholder="e.g. Shop 12, Mirpur 10, Dhaka" />
        </div>
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Opening hours</label>
          <input value={hours} maxLength={120} disabled={disabled || !enabled} onChange={(e) => setHours(e.target.value)} className={inputClass} placeholder="e.g. 10 AM to 9 PM, closed Friday" />
        </div>
      </div>

      <p className="text-xs text-regantify-text-muted mt-3">Works on the StorePal theme.</p>

      <button
        type="button"
        disabled={save.isPending || disabled}
        onClick={() => save.mutate()}
        className="mt-4 bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Save store pickup'}
      </button>
    </section>
  );
}

/**
 * "Customer picks the delivery day" (TellMe idea 50): an optional date box at StorePal's checkout. The earliest day is this
 * many days from today, the latest 30 days ahead, and the weekdays you switched off under Delivery time are left out.
 * The day shows on the order, the packing list and the handover sheet; a courier cannot always keep to it, so the
 * shopper is told "we will try". Orders with a later day are not booked by auto-booking until that day comes.
 */
function PreferredDaySection({
  charges,
  disabled,
  onSaved,
}: {
  charges: DeliveryCharges | undefined;
  disabled: boolean;
  onSaved: (updated: DeliveryCharges) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [minDays, setMinDays] = useState('2');

  useEffect(() => {
    if (!charges) return;
    setEnabled(charges.preferredDeliveryEnabled);
    setMinDays(String(charges.preferredDeliveryMinDays));
  }, [charges]);

  const save = useMutation({
    mutationFn: () => {
      const days = Number(minDays);
      if (!Number.isInteger(days) || days < 0 || days > 14) throw new Error('The earliest day must be a whole number from 0 to 14.');
      return updateVendorDeliveryCharges({ preferredDeliveryEnabled: enabled, preferredDeliveryMinDays: days });
    },
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success('Delivery day choice saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Check the number and try again.')),
  });

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5 mt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-regantify-text">Customer picks the delivery day</h2>
          <p className="text-sm text-regantify-text-muted mt-1">
            For gifts and occasions: an optional date box at checkout. The day shows on the order, the packing list and the handover
            sheet, and you can filter orders by it. We tell the customer we will try, since a courier cannot always promise a day.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-regantify-text shrink-0 cursor-pointer">
          <input type="checkbox" checked={enabled} disabled={disabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          On
        </label>
      </div>

      <div className={`mt-4 max-w-xs ${enabled ? '' : 'opacity-60'}`}>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Earliest day (days from today)</label>
        <input type="number" min={0} max={14} step={1} inputMode="numeric" value={minDays} disabled={disabled || !enabled} onChange={(e) => setMinDays(e.target.value)} className={inputClass} />
        <p className="text-xs text-regantify-text-muted mt-1.5">The latest is 30 days ahead. Weekdays you switch off in Delivery time below are left out.</p>
      </div>

      <p className="text-xs text-regantify-text-muted mt-3">Works on the StorePal theme. Auto-booking waits until the chosen day.</p>

      <button
        type="button"
        disabled={save.isPending || disabled}
        onClick={() => save.mutate()}
        className="mt-4 bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Save delivery day choice'}
      </button>
    </section>
  );
}
