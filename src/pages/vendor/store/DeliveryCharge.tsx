import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getBlockedAreas, getVendorDeliveryCharges, updateVendorDeliveryCharges, type DeliveryCharges } from '../../../lib/vendorApi';
import { BD_DISTRICTS } from '../../../lib/bdDistricts';
import { apiErrorMessage } from '../../../lib/api';
import { AdvancedPanel } from '../../../components/ui/AdvancedToggle';

const deliveryChargeSchema = z.object({
  insideDhakaCharge: z.coerce.number().min(0, 'Enter a valid amount').max(1000000, 'Amount is too large'),
  outsideDhakaCharge: z.coerce.number().min(0, 'Enter a valid amount').max(1000000, 'Amount is too large'),
  vatChargeBdt: z.coerce.number().min(0, 'Enter a valid amount').max(1000000, 'Amount is too large'),
});
type DeliveryChargeFormValues = z.infer<typeof deliveryChargeSchema>;
type DeliveryChargeFormInput = z.input<typeof deliveryChargeSchema>;

const inputClass = `w-full px-4 py-2.5 rounded-xl bg-regantify-search text-regantify-text
  focus:outline-none focus:ring-2 focus:ring-regantify-black`;

/**
 * Store > Delivery Charge (moved here from Settings) - vendor-editable
 * Inside Dhaka / Outside Dhaka shipping charges plus a flat VAT fee applied
 * to every order regardless of payment method (see Vendor.insideDhakaCharge/
 * vatChargeBdt in schema.prisma). These are the exact numbers checkout uses
 * to price an order - see OrdersService.create and
 * storefront/src/lib/useCheckout.ts, both of which read the vendor's own
 * saved values. A gateway's own Platform Charge is a separate, independent
 * setting - see Store > Payment Gateway (PaymentGateway.tsx), not this form.
 */
export default function DeliveryCharge() {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: charges, isLoading } = useQuery({
    queryKey: ['vendor-delivery-charges'],
    queryFn: getVendorDeliveryCharges,
  });

  const form = useForm<DeliveryChargeFormInput, unknown, DeliveryChargeFormValues>({
    resolver: zodResolver(deliveryChargeSchema),
    defaultValues: { insideDhakaCharge: 60, outsideDhakaCharge: 120, vatChargeBdt: 0 },
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

  // Settings in the "Advanced" panel that are switched on right now (the panel then starts open).
  const advancedInUse = charges
    ? [
        charges.expressEnabled,
        charges.pickupEnabled,
        charges.preferredDeliveryEnabled,
        charges.deliveryAreaMode !== 'OFF',
        Number(charges.minOrderAmount) > 0,
        charges.giftOptionEnabled,
        charges.weightChargeEnabled,
        Boolean(charges.dailyOrderLimit),
        charges.orderCutoffMinutes != null,
      ].filter(Boolean).length
    : 0;

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

      <DeliveryTimeSection
        charges={charges}
        disabled={isLoading}
        onSaved={(updated) => queryClient.setQueryData(['vendor-delivery-charges'], updated)}
      />

      <AdvancedPanel
        id="delivery-charge"
        what="Express delivery, pick up from the shop, customer picks the day, where we deliver, minimum order, weight charge, gift wrap, daily order limit"
        inUse={advancedInUse}
      >
        <ExpressSection
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

        <DeliveryAreaSection
          charges={charges}
          disabled={isLoading}
          onSaved={(updated) => queryClient.setQueryData(['vendor-delivery-charges'], updated)}
        />

        <CheckoutRulesSection
          charges={charges}
          disabled={isLoading}
          onSaved={(updated) => queryClient.setQueryData(['vendor-delivery-charges'], updated)}
        />
      </AdvancedPanel>
    </div>
  );
}

/**
 * "Where we deliver" (TellMe idea 65), StorePal checkout only, off by default (every area). Either only the districts ticked,
 * or every district except the ones ticked. A shopper who picks a refused district sees the message at once and cannot place
 * the order; the server judges again when the order is placed. Pickup from the shop, your own Add Order and the POS ignore it.
 * The list under it shows where shoppers tried and were refused.
 */
function DeliveryAreaSection({
  charges,
  disabled,
  onSaved,
}: {
  charges: DeliveryCharges | undefined;
  disabled: boolean;
  onSaved: (updated: DeliveryCharges) => void;
}) {
  const [mode, setMode] = useState<'OFF' | 'ONLY' | 'EXCEPT'>('OFF');
  const [districts, setDistricts] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const blocked = useQuery({ queryKey: ['blocked-areas'], queryFn: getBlockedAreas, retry: false });

  useEffect(() => {
    if (!charges) return;
    setMode(charges.deliveryAreaMode);
    setDistricts(new Set(charges.deliveryAreaDistricts));
    setMessage(charges.deliveryAreaMessage ?? '');
  }, [charges]);

  const save = useMutation({
    mutationFn: () => {
      if (mode !== 'OFF' && districts.size === 0) throw new Error(mode === 'ONLY' ? 'Tick at least one district you deliver to.' : 'Tick the districts you do not deliver to, or turn this off.');
      return updateVendorDeliveryCharges({ deliveryAreaMode: mode, deliveryAreaDistricts: [...districts], deliveryAreaMessage: message.trim() || null });
    },
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success('Delivery area saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the delivery area.')),
  });

  const toggle = (d: string) =>
    setDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5 mt-6">
      <h2 className="text-base font-medium text-regantify-text">Where we deliver</h2>
      <p className="text-sm text-regantify-text-muted mt-1">
        Stop orders for districts you do not serve before they are placed. Off means every area is served. Works on the StorePal theme.
      </p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-regantify-text">
        {([
          ['OFF', 'Every area'],
          ['ONLY', 'Only these districts'],
          ['EXCEPT', 'Everywhere except these districts'],
        ] as const).map(([value, text]) => (
          <label key={value} className="flex cursor-pointer items-center gap-2">
            <input type="radio" name="area-mode" checked={mode === value} disabled={disabled} onChange={() => setMode(value)} className="accent-regantify-cta" />
            {text}
          </label>
        ))}
      </div>

      {mode !== 'OFF' && (
        <>
          <div className="mt-4 grid max-h-64 grid-cols-2 gap-x-4 gap-y-1.5 overflow-y-auto rounded-xl border border-black/10 p-3 sm:grid-cols-3 lg:grid-cols-4">
            {BD_DISTRICTS.map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 text-sm text-regantify-text">
                <input type="checkbox" checked={districts.has(d)} onChange={() => toggle(d)} className="h-4 w-4 accent-regantify-cta" />
                {d}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-regantify-text-muted">{districts.size} selected.</p>
          <div className="mt-3 max-w-xl">
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Message to the shopper (optional)</label>
            <input
              type="text"
              maxLength={200}
              value={message}
              disabled={disabled}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Sorry, we do not deliver to this district right now."
              className={inputClass}
            />
            <p className="text-xs text-regantify-text-muted mt-1.5">For example: “Visit our showroom to collect it.”</p>
          </div>
        </>
      )}

      <button
        type="button"
        disabled={save.isPending || disabled}
        onClick={() => save.mutate()}
        className="mt-4 bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Save delivery area'}
      </button>

      {(blocked.data?.length ?? 0) > 0 && (
        <div className="mt-5 border-t border-black/5 pt-4">
          <h3 className="text-sm font-medium text-regantify-text">Orders stopped by this setting</h3>
          <p className="text-xs text-regantify-text-muted mt-0.5">Where shoppers asked for delivery and were refused. A district with many tries may be worth serving.</p>
          <ul className="mt-2 grid gap-1 text-sm text-regantify-text sm:grid-cols-2">
            {blocked.data?.map((b) => (
              <li key={b.district} className="flex justify-between rounded-lg bg-black/[0.03] px-3 py-1.5">
                <span>{b.district}</span>
                <span className="tabular-nums text-regantify-text-muted">{b.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * Checkout rules (TellMe ideas 56, 57, 58), all off by default:
 * - a minimum order (goods total before discounts) that storefront orders must reach;
 * - the gift option: a "this is a gift" tick with a message and a wrap charge that is its own line in the total (StorePal);
 * - a weight charge for heavy carts: each started kg above the free weight adds the zone's per-kg amount, up to a cap.
 * The server judges all three again when the order is placed. Your own Add Order and the POS skip them.
 */
function CheckoutRulesSection({
  charges,
  disabled,
  onSaved,
}: {
  charges: DeliveryCharges | undefined;
  disabled: boolean;
  onSaved: (updated: DeliveryCharges) => void;
}) {
  const [minOrder, setMinOrder] = useState('');
  const [gift, setGift] = useState(false);
  const [wrap, setWrap] = useState('0');
  const [usdRate, setUsdRate] = useState('');
  const [weightOn, setWeightOn] = useState(false);
  const [freeKg, setFreeKg] = useState('1');
  const [perInside, setPerInside] = useState('0');
  const [perAround, setPerAround] = useState('0');
  const [perOutside, setPerOutside] = useState('0');
  const [maxExtra, setMaxExtra] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [cutoff, setCutoff] = useState('');

  useEffect(() => {
    if (!charges) return;
    setMinOrder(charges.minOrderAmount && Number(charges.minOrderAmount) > 0 ? String(Number(charges.minOrderAmount)) : '');
    setGift(charges.giftOptionEnabled);
    setWrap(String(Number(charges.giftWrapCharge)));
    setUsdRate(charges.giftUsdRate && Number(charges.giftUsdRate) > 0 ? String(Number(charges.giftUsdRate)) : '');
    setWeightOn(charges.weightChargeEnabled);
    setFreeKg(String(Number(charges.weightFreeKg)));
    setPerInside(String(Number(charges.weightPerKgInside)));
    setPerAround(String(Number(charges.weightPerKgAround)));
    setPerOutside(String(Number(charges.weightPerKgOutside)));
    setMaxExtra(charges.weightChargeMax && Number(charges.weightChargeMax) > 0 ? String(Number(charges.weightChargeMax)) : '');
    setDailyLimit(charges.dailyOrderLimit ? String(charges.dailyOrderLimit) : '');
    setCutoff(charges.orderCutoffMinutes === null || charges.orderCutoffMinutes === undefined ? '' : `${String(Math.floor(charges.orderCutoffMinutes / 60)).padStart(2, '0')}:${String(charges.orderCutoffMinutes % 60).padStart(2, '0')}`);
  }, [charges]);

  const save = useMutation({
    mutationFn: () => {
      const num = (text: string, label: string) => {
        const n = Number(text || 0);
        if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a number, 0 or more.`);
        return n;
      };
      return updateVendorDeliveryCharges({
        minOrderAmount: minOrder.trim() ? num(minOrder, 'The minimum order') : null,
        giftOptionEnabled: gift,
        giftWrapCharge: num(wrap, 'The gift wrap charge'),
        giftUsdRate: usdRate.trim() ? num(usdRate, 'The dollar rate') : null,
        weightChargeEnabled: weightOn,
        weightFreeKg: num(freeKg, 'The free weight'),
        weightPerKgInside: num(perInside, 'The Inside Dhaka amount'),
        weightPerKgAround: num(perAround, 'The Around Dhaka amount'),
        weightPerKgOutside: num(perOutside, 'The Outside Dhaka amount'),
        weightChargeMax: maxExtra.trim() ? num(maxExtra, 'The cap') : null,
        dailyOrderLimit: dailyLimit.trim() ? Math.floor(num(dailyLimit, 'The daily limit')) : null,
        orderCutoffMinutes: cutoff ? Number(cutoff.slice(0, 2)) * 60 + Number(cutoff.slice(3, 5)) : null,
      });
    },
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success('Checkout rules saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Check the numbers and try again.')),
  });

  const field = (label: string, value: string, set: (v: string) => void, hint?: string, off?: boolean) => (
    <div className={off ? 'opacity-60' : ''}>
      <label className="block text-sm font-medium text-regantify-text mb-1.5">{label}</label>
      <input type="number" min={0} step="any" inputMode="decimal" value={value} disabled={disabled || off} onChange={(e) => set(e.target.value)} className={inputClass} />
      {hint && <p className="text-xs text-regantify-text-muted mt-1.5">{hint}</p>}
    </div>
  );

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5 mt-6">
      <h2 className="text-base font-medium text-regantify-text">Checkout rules</h2>
      <p className="text-sm text-regantify-text-muted mt-1">
        Minimum order, gift option and a weight charge for heavy parcels. All are off until you fill them in, and your own Add Order and the POS ignore them.
      </p>

      <div className="mt-4 max-w-xs">
        {field('Minimum order (৳)', minOrder, setMinOrder, 'The goods total, before discounts. Empty = no minimum. The cart tells the shopper how much more to add.')}
      </div>

      <div className="mt-6 border-t border-black/5 pt-4">
        <h3 className="text-sm font-medium text-regantify-text">Orders per day and cut-off time (StorePal)</h3>
        <p className="text-xs text-regantify-text-muted mt-1">
          For shops that cannot take unlimited orders, or that ship same day before a certain hour. Dhaka time. Cancelled, unpaid and returned orders do not use up a slot.
          Your own Add Order and the POS ignore both, and your plan&apos;s own daily limit still applies on top.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {field('Most orders per day', dailyLimit, setDailyLimit, 'Empty = no limit. When full, shoppers see “today’s orders are full” and cannot order.')}
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Cut-off time</label>
            <input type="time" value={cutoff} disabled={disabled} onChange={(e) => setCutoff(e.target.value)} className={inputClass} />
            <p className="text-xs text-regantify-text-muted mt-1.5">Empty = none. An order after this time counts as the next day for the expected delivery date, and the shopper is told.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-black/5 pt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-regantify-text cursor-pointer">
          <input type="checkbox" checked={gift} disabled={disabled} onChange={(e) => setGift(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          Gift option at checkout (StorePal)
        </label>
        <p className="text-xs text-regantify-text-muted mt-1">
          The shopper can tick &quot;this is a gift&quot;, give the sender&apos;s name (and phone, even from abroad), write a short message and hide the prices on the invoice. <strong>A gift is always paid in full online</strong>, never Cash on Delivery, so the option only shows while you have an online payment method connected. The sender gets the order texts; the receiver is only texted when it is out for delivery. You see a big gift note on the order and the packing list. To accept cards from abroad, connect a payment method that takes foreign cards (ask your provider).
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {field('Gift wrap charge (৳)', wrap, setWrap, '0 = free wrapping. Added to the total as its own line.', !gift)}
          {field(
            'Dollar rate for senders abroad (৳ per $1)',
            usdRate,
            setUsdRate,
            'e.g. 122. Shoppers whose phone is outside Bangladesh, and anyone sending a gift, see “≈ US$X” beside the price and the total. Only a guide: they still pay in taka. Empty = off. Update it when the rate moves.',
            !gift,
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-black/5 pt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-regantify-text cursor-pointer">
          <input type="checkbox" checked={weightOn} disabled={disabled} onChange={(e) => setWeightOn(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          Extra delivery charge for heavy carts
        </label>
        <p className="text-xs text-regantify-text-muted mt-1">
          Uses the weight set on each product (Edit Product &gt; Stock). A product with no weight adds nothing. A free-shipping coupon or discount waives this too.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {field('Free up to (kg)', freeKg, setFreeKg, 'Nothing extra up to this weight.', !weightOn)}
          {field('Cap on the extra (৳)', maxExtra, setMaxExtra, 'Empty = no cap.', !weightOn)}
          {field('Each extra kg, Inside Dhaka (৳)', perInside, setPerInside, undefined, !weightOn)}
          {field('Each extra kg, Around Dhaka (৳)', perAround, setPerAround, undefined, !weightOn)}
          {field('Each extra kg, Outside Dhaka (৳)', perOutside, setPerOutside, undefined, !weightOn)}
        </div>
      </div>

      <button
        type="button"
        disabled={save.isPending || disabled}
        onClick={() => save.mutate()}
        className="mt-5 bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Save checkout rules'}
      </button>
    </section>
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

const EXPRESS_ZONE_LABELS: Record<string, string> = { DHAKA: 'Inside Dhaka', AROUND_DHAKA: 'Around Dhaka', OUTSIDE_DHAKA: 'Outside Dhaka' };

/**
 * "Express delivery" (TellMe idea 132): an optional faster choice at checkout for a higher charge, usually with the store's own rider in Dhaka.
 * Off by default. The extra is added to the zone's charge; a free-delivery offer takes off the normal charge but, unless ticked below, not the
 * express extra (it pays for the faster service). After the cut-off the choice is not shown. Express orders are never booked with a courier
 * automatically, and show an Express mark in Orders. StorePal checkout only.
 */
function ExpressSection({
  charges,
  disabled,
  onSaved,
}: {
  charges: DeliveryCharges | undefined;
  disabled: boolean;
  onSaved: (updated: DeliveryCharges) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [zones, setZones] = useState<string[]>(['DHAKA']);
  const [charge, setCharge] = useState('80');
  const [cutoff, setCutoff] = useState('');
  const [day, setDay] = useState<'TODAY' | 'NEXT_DAY'>('TODAY');
  const [waived, setWaived] = useState(false);

  useEffect(() => {
    if (!charges) return;
    setEnabled(charges.expressEnabled ?? false);
    setZones(charges.expressZones ?? ['DHAKA']);
    setCharge(String(Number(charges.expressCharge ?? 80)));
    const m = charges.expressCutoffMinutes;
    setCutoff(m === null || m === undefined ? '' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    setDay(charges.expressDay ?? 'TODAY');
    setWaived(charges.expressWaivedByFree ?? false);
  }, [charges]);

  const save = useMutation({
    mutationFn: () => {
      const amount = Number(charge);
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter the charge as a number.');
      if (enabled && zones.length === 0) throw new Error('Pick at least one area for express delivery.');
      return updateVendorDeliveryCharges({
        expressEnabled: enabled,
        expressZones: zones,
        expressCharge: amount,
        expressCutoffMinutes: cutoff ? Number(cutoff.slice(0, 2)) * 60 + Number(cutoff.slice(3, 5)) : null,
        expressDay: day,
        expressWaivedByFree: waived,
      });
    },
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success('Express delivery saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save express delivery. Check the details and try again.')),
  });

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5 mt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-regantify-text">Express delivery</h2>
          <p className="text-sm text-regantify-text-muted mt-1">
            Let shoppers pay a little more for a faster delivery, such as the same day in Dhaka with your own rider. They choose between standard and express at checkout.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-regantify-text shrink-0 cursor-pointer">
          <input type="checkbox" checked={enabled} disabled={disabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
          On
        </label>
      </div>

      <div className={`mt-4 space-y-4 ${enabled ? '' : 'opacity-60'}`}>
        <div>
          <p className="text-sm font-medium text-regantify-text mb-1.5">Runs in</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {Object.entries(EXPRESS_ZONE_LABELS).map(([zone, label]) => (
              <label key={zone} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={disabled || !enabled}
                  checked={zones.includes(zone)}
                  onChange={(e) => setZones(e.target.checked ? [...zones, zone] : zones.filter((z) => z !== zone))}
                  className="h-4 w-4 accent-regantify-cta"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Extra charge (৳)</label>
            <input type="number" min={0} step="0.01" value={charge} disabled={disabled || !enabled} onChange={(e) => setCharge(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Arrives</label>
            <select value={day} disabled={disabled || !enabled} onChange={(e) => setDay(e.target.value as 'TODAY' | 'NEXT_DAY')} className={inputClass}>
              <option value="TODAY">Today</option>
              <option value="NEXT_DAY">Next day</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Last order time (Dhaka)</label>
            <input type="time" value={cutoff} disabled={disabled || !enabled} onChange={(e) => setCutoff(e.target.value)} className={inputClass} />
            <p className="text-xs text-regantify-text-muted mt-1.5">Blank = express is offered all day.</p>
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={waived} disabled={disabled || !enabled} onChange={(e) => setWaived(e.target.checked)} className="mt-0.5 h-4 w-4 accent-regantify-cta" />
          <span>
            A free-delivery offer also waives the express extra
            <span className="block text-xs text-regantify-text-muted">Off by default: the extra pays for the faster service.</span>
          </span>
        </label>
      </div>

      <button
        type="button"
        disabled={save.isPending || disabled}
        onClick={() => save.mutate()}
        className="mt-4 bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60"
      >
        {save.isPending ? 'Saving…' : 'Save express delivery'}
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
  // Delivery time slots (TellMe idea 90): up to 4, each with a name, hours and an optional daily maximum.
  const [slots, setSlots] = useState<Array<{ name: string; from: string; to: string; max: string }>>([]);

  useEffect(() => {
    if (!charges) return;
    setEnabled(charges.preferredDeliveryEnabled);
    setMinDays(String(charges.preferredDeliveryMinDays));
    setSlots((charges.deliverySlots ?? []).map((s) => ({ name: s.name, from: s.from, to: s.to, max: s.maxPerDay ? String(s.maxPerDay) : '' })));
  }, [charges]);

  const save = useMutation({
    mutationFn: () => {
      const days = Number(minDays);
      if (!Number.isInteger(days) || days < 0 || days > 14) throw new Error('The earliest day must be a whole number from 0 to 14.');
      for (const s of slots) {
        if (!s.name.trim()) throw new Error('Give every time slot a name.');
        if (!s.from || !s.to || s.from >= s.to) throw new Error(`${s.name.trim()}: the start must be earlier than the end.`);
      }
      return updateVendorDeliveryCharges({
        preferredDeliveryEnabled: enabled,
        preferredDeliveryMinDays: days,
        deliverySlots: slots.map((s) => ({ name: s.name.trim(), from: s.from, to: s.to, maxPerDay: Number(s.max) > 0 ? Math.floor(Number(s.max)) : null })),
      });
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

      <div className={`mt-5 ${enabled ? '' : 'opacity-60'}`}>
        <h3 className="text-sm font-medium text-regantify-text">Delivery time slots (optional)</h3>
        <p className="text-xs text-regantify-text-muted mt-1">
          Up to 4, like Morning 9–12. After picking a day the customer may pick a slot. It shows on the order, packing list, handover sheet and parcel sticker.
          A wish, not a promise; it is not sent to the courier. A daily maximum greys the slot out once it is full.
        </p>
        <div className="mt-3 space-y-2">
          {slots.map((s, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-regantify-text-muted">
                Name
                <input value={s.name} maxLength={30} disabled={disabled || !enabled} onChange={(e) => setSlots((cur) => cur.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={`${inputClass} !w-36`} />
              </label>
              <label className="text-xs text-regantify-text-muted">
                From
                <input type="time" value={s.from} disabled={disabled || !enabled} onChange={(e) => setSlots((cur) => cur.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} className={`${inputClass} !w-28`} />
              </label>
              <label className="text-xs text-regantify-text-muted">
                To
                <input type="time" value={s.to} disabled={disabled || !enabled} onChange={(e) => setSlots((cur) => cur.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} className={`${inputClass} !w-28`} />
              </label>
              <label className="text-xs text-regantify-text-muted">
                Most a day
                <input value={s.max} inputMode="numeric" placeholder="No limit" disabled={disabled || !enabled} onChange={(e) => setSlots((cur) => cur.map((x, j) => (j === i ? { ...x, max: e.target.value.replace(/\D/g, '') } : x)))} className={`${inputClass} !w-24`} />
              </label>
              <button type="button" disabled={disabled} onClick={() => setSlots((cur) => cur.filter((_, j) => j !== i))} className="h-10 px-2 text-sm text-red-600 hover:underline">
                Remove
              </button>
            </div>
          ))}
        </div>
        {slots.length < 4 && (
          <button
            type="button"
            disabled={disabled || !enabled}
            onClick={() => setSlots((cur) => [...cur, { name: cur.length === 0 ? 'Morning' : '', from: cur.length === 0 ? '09:00' : '', to: cur.length === 0 ? '12:00' : '', max: '' }])}
            className="mt-2 text-sm text-regantify-cta hover:underline disabled:opacity-60"
          >
            + Add a time slot
          </button>
        )}
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
