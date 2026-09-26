import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { courierApi, notConnectedProvider, type PathaoBookingDraft, type PathaoBookingDraftResponse } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { PathaoLocationSelects } from './PathaoLocationSelects';

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none disabled:opacity-60';

function formatTaka(value: number) {
  return `৳${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** Pathao wants 01XXXXXXXXX — same normalization the server applies (toPathaoPhone), so the popup can flag a bad number before booking. */
function toPathaoPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('880') ? `0${digits.slice(3)}` : digits.startsWith('1') && digits.length === 10 ? `0${digits}` : digits;
  return /^01\d{9}$/.test(local) ? local : null;
}

/** Client-side mirror of PathaoProvider.bookOrder's checks — the server re-checks everything, this just catches mistakes without a round-trip. */
function validate(form: PathaoBookingDraft): string | null {
  if (!form.storeId) return 'Select a pickup store.';
  const name = form.recipientName.trim();
  if (name.length < 3 || name.length > 100) return 'Recipient name must be 3-100 characters.';
  if (!toPathaoPhone(form.recipientPhone)) return 'Recipient phone must be an 11-digit number starting with 01.';
  if (form.recipientSecondaryPhone?.trim() && !toPathaoPhone(form.recipientSecondaryPhone)) {
    return 'Secondary phone must be an 11-digit number starting with 01.';
  }
  const address = form.recipientAddress.trim();
  if (address.length < 10 || address.length > 220) return 'Delivery address must be 10-220 characters.';
  if ((form.areaId && !form.zoneId) || (form.zoneId && !form.cityId)) return 'Pick the location from the top: City, then Zone, then Area.';
  if (!Number.isInteger(form.itemQuantity) || form.itemQuantity < 1) return 'Quantity must be at least 1.';
  if (!(form.itemWeight >= 0.5 && form.itemWeight <= 10)) return 'Weight must be between 0.5 and 10 kg.';
  if (!Number.isInteger(form.amountToCollect) || form.amountToCollect < 0) return 'Amount to collect must be a whole number, 0 or more.';
  return null;
}

/** `value`, but only after it has stopped changing for `delayMs` — keeps the price estimate from firing on every keystroke in the weight field. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-regantify-text mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-regantify-text-muted mt-1">{hint}</p>}
    </div>
  );
}

/** Live "what will Pathao charge" box — needs a store, city and zone (Pathao's price API requires all three). */
function PriceEstimate({ form }: { form: PathaoBookingDraft }) {
  const priceInput = useDebouncedValue(
    {
      storeId: form.storeId,
      itemType: form.itemType,
      deliveryType: form.deliveryType,
      itemWeight: form.itemWeight,
      cityId: form.cityId,
      zoneId: form.zoneId,
    },
    400,
  );
  const ready =
    priceInput.storeId != null &&
    priceInput.cityId != null &&
    priceInput.zoneId != null &&
    priceInput.itemWeight >= 0.5 &&
    priceInput.itemWeight <= 10;

  const { data: price, isFetching, isError, error } = useQuery({
    queryKey: ['pathao-price', priceInput],
    queryFn: () =>
      courierApi.getPathaoPrice({
        storeId: priceInput.storeId!,
        itemType: priceInput.itemType,
        deliveryType: priceInput.deliveryType,
        itemWeight: priceInput.itemWeight,
        cityId: priceInput.cityId!,
        zoneId: priceInput.zoneId!,
      }),
    enabled: ready,
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (!ready) {
    return (
      <p className="text-xs text-regantify-text-muted">
        Pick a city and zone to see Pathao’s charge. Without a location, Pathao works it out from the address.
      </p>
    );
  }
  if (isFetching && !price) {
    return <p className="text-xs text-regantify-text-muted">Checking Pathao’s price…</p>;
  }
  if (isError || !price) {
    return <p className="text-xs text-amber-700">{apiErrorMessage(error, 'Could not get a price from Pathao right now.')}</p>;
  }

  const codFee = price.codEnabled && form.amountToCollect > 0 ? Math.round(form.amountToCollect * price.codPercentage * 100) / 100 : 0;
  const discount = price.discount + price.promoDiscount;

  return (
    <div className="text-sm space-y-1">
      <div className="flex justify-between">
        <span className="text-regantify-text-muted">Delivery charge</span>
        <span className="text-regantify-text">{formatTaka(price.finalPrice)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-xs">
          <span className="text-regantify-text-muted">Includes discount</span>
          <span className="text-green-700">−{formatTaka(discount)}</span>
        </div>
      )}
      {codFee > 0 && (
        <div className="flex justify-between">
          <span className="text-regantify-text-muted">COD charge ({(price.codPercentage * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%)</span>
          <span className="text-regantify-text">≈ {formatTaka(codFee)}</span>
        </div>
      )}
      <div className="flex justify-between pt-1 border-t border-black/5 font-medium">
        <span className="text-regantify-text">Pathao charge</span>
        <span className="text-regantify-text">≈ {formatTaka(price.finalPrice + codFee)}</span>
      </div>
      {isFetching && <p className="text-xs text-regantify-text-muted">Updating…</p>}
    </div>
  );
}

interface BookingFormProps {
  data: PathaoBookingDraftResponse;
  onCancel: () => void;
  onBooked: () => void;
}

function BookingForm({ data, onCancel, onBooked }: BookingFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PathaoBookingDraft>(data.draft);
  const [error, setError] = useState<string | null>(null);

  const { data: stores } = useQuery({
    queryKey: ['pathao-store-list'],
    queryFn: courierApi.getPathaoStoreList,
  });
  // Same key PathaoLocationSelects uses, so this is the cached list, not a second request.
  const { data: areas } = useQuery({
    queryKey: ['pathao-areas', form.zoneId],
    queryFn: () => courierApi.getPathaoAreas(form.zoneId!),
    enabled: form.zoneId != null,
    staleTime: 60 * 60_000,
  });
  const selectedArea = areas?.find((a) => a.id === form.areaId);

  function update<K extends keyof PathaoBookingDraft>(key: K, value: PathaoBookingDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const orderId = data.order.id;
  const invalidateOrder = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    queryClient.invalidateQueries({ queryKey: ['order-history', orderId] });
    queryClient.invalidateQueries({ queryKey: ['courier-tracking'] });
  };

  const bookMutation = useMutation({
    mutationFn: () =>
      courierApi.bookOrder(orderId, {
        ...form,
        recipientSecondaryPhone: form.recipientSecondaryPhone?.trim() || null,
      }),
    onSuccess: (order: { courierConsignmentId?: string | null }) => {
      invalidateOrder();
      toast.success(
        order?.courierConsignmentId ? `Booked with Pathao — consignment ${order.courierConsignmentId}.` : 'Booked with Pathao.',
      );
      onBooked();
    },
    onError: (err) => {
      invalidateOrder(); // picks up courierBookingStatus: FAILED + the error on the row
      setError(apiErrorMessage(err, 'Could not book this order with Pathao. Please try again.'));
    },
  });

  const activeStores = stores?.filter((s) => s.isActive) ?? [];
  const isCod = data.order.paymentMethod === 'COD';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const problem = validate(form);
        if (problem) {
          setError(problem);
          return;
        }
        setError(null);
        bookMutation.mutate();
      }}
      className="p-6 pt-4 space-y-4"
    >
      {data.order.courierBookingStatus === 'FAILED' && data.order.courierBookingError && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p>Last attempt failed: {data.order.courierBookingError}</p>
        </div>
      )}

      <Field label="Pickup store">
        <select
          value={form.storeId ?? ''}
          onChange={(e) => update('storeId', Number(e.target.value))}
          className={inputClass}
        >
          <option value="" disabled>
            {stores ? 'Select a pickup store…' : 'Loading stores…'}
          </option>
          {/* The saved store stays selectable even if it isn't in the active list (e.g. list still loading). */}
          {form.storeId != null && !activeStores.some((s) => s.id === form.storeId) && (
            <option value={form.storeId}>{data.pickupStore?.name ?? `Store #${form.storeId}`}</option>
          )}
          {activeStores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Recipient name">
          <input value={form.recipientName} onChange={(e) => update('recipientName', e.target.value)} maxLength={100} className={inputClass} />
        </Field>
        <Field label="Phone">
          <input
            value={form.recipientPhone}
            onChange={(e) => update('recipientPhone', e.target.value)}
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            className={inputClass}
          />
        </Field>
        <Field label="Secondary phone (optional)">
          <input
            value={form.recipientSecondaryPhone ?? ''}
            onChange={(e) => update('recipientSecondaryPhone', e.target.value)}
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Delivery address" hint={`${form.recipientAddress.trim().length}/220`}>
        <textarea
          value={form.recipientAddress}
          onChange={(e) => update('recipientAddress', e.target.value)}
          maxLength={220}
          rows={2}
          className={inputClass}
        />
      </Field>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-regantify-text">Delivery location (optional)</span>
          {(form.cityId || form.zoneId || form.areaId) && (
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, cityId: null, zoneId: null, areaId: null }))}
              className="text-xs text-regantify-text-muted hover:text-regantify-text underline"
            >
              Clear — let Pathao detect it
            </button>
          )}
        </div>
        <PathaoLocationSelects
          value={{ cityId: form.cityId, zoneId: form.zoneId, areaId: form.areaId }}
          onChange={(loc) => setForm((prev) => ({ ...prev, ...loc }))}
          selectClassName={inputClass}
          suggestFrom={{ address: data.order.shippingAddress, city: data.order.shippingCity, district: data.order.shippingDistrict }}
        />
        {selectedArea?.homeDeliveryAvailable === false && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-700">
            <AlertTriangle size={12} /> Pathao doesn’t offer home delivery in {selectedArea.name} — the customer may need to collect it.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Delivery type">
          <select value={form.deliveryType} onChange={(e) => update('deliveryType', Number(e.target.value) as 48 | 12)} className={inputClass}>
            <option value={48}>Normal</option>
            <option value={12}>On Demand</option>
          </select>
        </Field>
        <Field label="Item type">
          <select value={form.itemType} onChange={(e) => update('itemType', Number(e.target.value) as 1 | 2)} className={inputClass}>
            <option value={2}>Parcel</option>
            <option value={1}>Document</option>
          </select>
        </Field>
        <Field label="Quantity">
          <input
            type="number"
            min={1}
            step={1}
            value={Number.isNaN(form.itemQuantity) ? '' : form.itemQuantity}
            onChange={(e) => update('itemQuantity', e.target.valueAsNumber)}
            className={inputClass}
          />
        </Field>
        <Field label="Weight (kg)">
          <input
            type="number"
            min={0.5}
            max={10}
            step={0.1}
            value={Number.isNaN(form.itemWeight) ? '' : form.itemWeight}
            onChange={(e) => update('itemWeight', e.target.valueAsNumber)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Amount to collect (৳)"
        hint={
          isCod
            ? `Cash on delivery — order total ${formatTaka(Number(data.order.total))}.`
            : 'This order is paid online, so Pathao should collect nothing.'
        }
      >
        <input
          type="number"
          min={0}
          step={1}
          value={Number.isNaN(form.amountToCollect) ? '' : form.amountToCollect}
          onChange={(e) => update('amountToCollect', e.target.valueAsNumber)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Item description">
          <input value={form.itemDescription} onChange={(e) => update('itemDescription', e.target.value)} maxLength={500} className={inputClass} />
        </Field>
        <Field label="Special instruction">
          <input
            value={form.specialInstruction}
            onChange={(e) => update('specialInstruction', e.target.value)}
            maxLength={500}
            placeholder="e.g. Call before delivery"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="rounded-xl bg-regantify-search p-3">
        <PriceEstimate form={form} />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-regantify-content text-regantify-text text-sm font-medium hover:bg-black/10"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={bookMutation.isPending}
          className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
        >
          {bookMutation.isPending ? 'Booking…' : 'Book with Pathao'}
        </button>
      </div>
    </form>
  );
}

interface PathaoBookingModalProps {
  /** The order to book — null closes the popup. */
  orderId: string | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Book with Pathao" popup (pathao-plan.md Step 4): pre-filled from the
 * order + the vendor's saved Default Values (server-built, see
 * CourierBookingService.getPathaoBookingDraft), every field editable,
 * with Pathao's live delivery charge once a city/zone is known. Used by
 * the Orders list's Actions menu and Order Detail; SteadFast/RedX still
 * book in one click with no popup.
 */
export function PathaoBookingModal({ orderId, onOpenChange }: PathaoBookingModalProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pathao-booking-draft', orderId],
    queryFn: () => courierApi.getPathaoBookingDraft(orderId!),
    enabled: orderId != null,
    // Always rebuilt from the latest order + settings when reopened.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const notConnected = isError && notConnectedProvider(error) === 'PATHAO';

  return (
    <Dialog
      open={orderId != null}
      onOpenChange={onOpenChange}
      title={data ? `Book with Pathao — ORDER-${data.order.invoiceNumber}` : 'Book with Pathao'}
      maxWidth="max-w-2xl"
    >
      {isLoading ? (
        <p className="p-6 pt-4 text-sm text-regantify-text-muted">Loading…</p>
      ) : notConnected ? (
        <p className="p-6 pt-4 text-sm text-regantify-text-muted">
          Connect your Pathao account first on the{' '}
          <Link to="/vendor/courier/pathao" className="text-regantify-cta underline" onClick={() => onOpenChange(false)}>
            Pathao page
          </Link>
          .
        </p>
      ) : isError || !data ? (
        <p className="p-6 pt-4 text-sm text-red-500">{apiErrorMessage(error, 'Could not load this order for Pathao booking.')}</p>
      ) : (
        <BookingForm key={orderId} data={data} onCancel={() => onOpenChange(false)} onBooked={() => onOpenChange(false)} />
      )}
    </Dialog>
  );
}
