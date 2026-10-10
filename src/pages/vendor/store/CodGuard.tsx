import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Trash2 } from 'lucide-react';
import {
  storeSettingsApi,
  type CodGuardSettings,
  type CodVerificationCondition,
  type CodVerificationTrigger,
  type CodVerificationType,
} from '../../../lib/storeSettingsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Checkbox } from '../../../components/ui/Checkbox';

const TYPES: { value: CodVerificationType; label: string; disabled?: boolean }[] = [
  { value: 'NONE', label: 'None' },
  // No autocall integration yet — shown (like the reference) but not selectable.
  { value: 'CALL', label: 'Call', disabled: true },
  { value: 'SMS', label: 'SMS' },
];

const CONDITIONS: { value: CodVerificationCondition; label: string }[] = [
  { value: 'ALL_COD_ORDERS', label: 'All Cash on Delivery Orders' },
  { value: 'NEW_CUSTOMERS', label: 'For New Customers' },
];

const TRIGGERS: { value: CodVerificationTrigger; label: string; hint: string }[] = [
  { value: 'BEFORE_CHECKOUT', label: 'Before Checkout', hint: 'The shopper enters the SMS code before the order is placed.' },
  {
    value: 'AFTER_CHECKOUT',
    label: 'After Checkout',
    hint: 'The order is placed On Hold and moves to Pending once the shopper enters the SMS code.',
  },
];

// How long the shopper has to enter the after-checkout SMS code (CodGuardSettings.verificationExpiryHours).
const EXPIRY_CHOICES: { value: string; label: string }[] = [
  { value: '6', label: 'After 6 hours' },
  { value: '12', label: 'After 12 hours' },
  { value: '24', label: 'After 24 hours (recommended)' },
  { value: '48', label: 'After 2 days' },
  { value: '72', label: 'After 3 days' },
  { value: 'never', label: 'Never (I handle them myself)' },
];

export default function CodGuard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['cod-guard-settings'], queryFn: storeSettingsApi.getCodGuard });
  const [form, setForm] = useState<CodGuardSettings | null>(null);
  // The minimum cart for the advance, as typed ("" = every order).
  const [minOrderText, setMinOrderText] = useState('');
  // The pre-order advance percentage, as typed ("" = off).
  const [preOrderText, setPreOrderText] = useState('');

  const minOrderToText = (value: CodGuardSettings['advanceMinOrder']) => (value ? String(Number(value)) : '');

  useEffect(() => {
    if (data) {
      setForm(data);
      setMinOrderText(minOrderToText(data.advanceMinOrder));
      setPreOrderText(data.preOrderAdvancePercent ? String(data.preOrderAdvancePercent) : '');
    }
  }, [data]);

  const onSaved = (updated: CodGuardSettings, message: string) => {
    queryClient.setQueryData(['cod-guard-settings'], updated);
    setForm(updated);
    setMinOrderText(minOrderToText(updated.advanceMinOrder));
    setPreOrderText(updated.preOrderAdvancePercent ? String(updated.preOrderAdvancePercent) : '');
    toast.success(message);
  };

  const save = useMutation({
    mutationFn: storeSettingsApi.updateCodGuard,
    onSuccess: (updated) => onSaved(updated, 'COD Guard settings saved.'),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save COD Guard settings. Please try again.')),
  });

  const remove = useMutation({
    mutationFn: storeSettingsApi.deleteCodGuard,
    onSuccess: (cleared) => onSaved(cleared, 'COD Guard settings deleted. All guards are off.'),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete COD Guard settings. Please try again.')),
  });

  const set = <K extends keyof CodGuardSettings>(key: K, value: CodGuardSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = () => {
    if (!form) return;
    if (form.verificationType === 'SMS' && (!form.verificationCondition || !form.verificationTrigger)) {
      toast.error('Choose a trigger condition and when verification should happen.');
      return;
    }
    const minOrder = minOrderText.trim() === '' ? null : Number(minOrderText);
    if (form.advanceEnabled && minOrder !== null && (!Number.isFinite(minOrder) || minOrder < 0)) {
      toast.error('Enter the minimum order amount as a number, or leave it empty for every order.');
      return;
    }
    const preOrder = preOrderText.trim() === '' ? null : Number(preOrderText);
    if (preOrder !== null && (!Number.isInteger(preOrder) || preOrder < 0 || preOrder > 100)) {
      toast.error('Enter the pre-order advance as a whole percentage from 1 to 100, or leave it empty to turn it off.');
      return;
    }
    save.mutate({
      ...form,
      advanceMinOrder: form.advanceEnabled && minOrder ? minOrder : null,
      preOrderAdvancePercent: preOrder && preOrder > 0 ? preOrder : null,
    });
  };

  const isSms = form?.verificationType === 'SMS';
  const preOrderOn = preOrderText.trim() !== '' && Number(preOrderText) > 0;

  // What happens to an order whose advance isn't paid in an hour: shared by the delivery-charge advance and
  // the pre-order advance, shown under whichever is on.
  const unpaidChoice = form ? (
    <div>
      <p className="text-sm font-medium text-regantify-text mb-2">If the shopper doesn't pay within an hour</p>
      <div className="flex flex-col gap-2">
        <Radio
          name="advanceUnpaidHold"
          label="Cancel the order (Payment failed, stock goes back)"
          checked={!form.advanceUnpaidHold}
          onChange={() => set('advanceUnpaidHold', false)}
        />
        <Radio
          name="advanceUnpaidHold"
          label="Keep it On Hold so I can call the shopper"
          checked={form.advanceUnpaidHold}
          onChange={() => set('advanceUnpaidHold', true)}
        />
      </div>
      <p className="text-xs text-regantify-text-muted mt-1.5">
        An order kept On Hold is collected in full by the courier unless the shopper pays the advance later.
      </p>
    </div>
  ) : null;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">COD Guard Settings</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Protect your store from fake Cash on Delivery orders placed on your StorePal storefront.
        </p>
      </div>

      {isLoading || !form ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <Checkbox
              checked={form.autoBlockEnabled}
              onChange={(v) => set('autoBlockEnabled', v)}
              label="Enable Auto Block"
            />
            <p className="text-xs text-regantify-text-muted mt-1.5 ml-7">
              When enabled, COD orders from phone numbers you've blacklisted in{' '}
              <Link to="/vendor/customers" className="text-regantify-cta hover:underline">
                Customers
              </Link>{' '}
              are blocked at checkout.
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <Checkbox
              checked={form.advanceEnabled}
              onChange={(v) => set('advanceEnabled', v)}
              label="Take the delivery charge in advance"
            />
            <p className="text-xs text-regantify-text-muted mt-1.5 ml-7">
              A shopper who chooses Cash on Delivery first pays <b>only the delivery charge</b> online (bKash, Nagad, card via
              PayStation) to confirm the order, and pays the rest in cash on delivery. Couriers are then asked to collect only the
              remaining amount. Many sellers use this to stop fake orders.
            </p>

            {form.advanceEnabled && (
              <div className="mt-4 ml-7 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-regantify-text mb-1.5">
                    Only for orders of at least (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={minOrderText}
                    onChange={(e) => setMinOrderText(e.target.value)}
                    placeholder="Empty = every Cash on Delivery order"
                    className="w-full sm:w-72 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white
                      focus:outline-none focus:border-regantify-cta transition-colors"
                  />
                </div>
                {unpaidChoice}
                <ul className="text-xs text-regantify-text-muted space-y-1 list-disc pl-4">
                  <li>
                    Needs <b>Online Payment</b> to be on in{' '}
                    <Link to="/vendor/store/payment-gateway" className="text-regantify-cta hover:underline">
                      Payment Gateway
                    </Link>
                    ; otherwise Cash on Delivery works as usual.
                  </li>
                  <li>Works on the StorePal theme only. Free-delivery orders pay no advance.</li>
                  <li>
                    The whole delivery charge goes to your wallet. The payment page adds a small processing fee on top for the
                    shopper, so you lose nothing. It is not refunded automatically if the order is cancelled.
                  </li>
                  <li>
                    Took the money yourself (own bKash)? Open the order and use <b>Advance received</b> to record it.
                  </li>
                </ul>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <h2 className="text-base font-medium text-regantify-text">Advance for pre-order products</h2>
            <p className="text-xs text-regantify-text-muted mt-1.5">
              Products you brought in on pre-order are the ones shoppers are most likely to leave unpaid. With this on, a shopper who
              chooses Cash on Delivery first pays this share of the pre-order products online, and the rest in cash when they arrive.
              If the order also has a delivery-charge advance above, the larger of the two is taken, not both.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                value={preOrderText}
                onChange={(e) => setPreOrderText(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="Off"
                aria-label="Pre-order advance percentage"
                className="w-28 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white
                  focus:outline-none focus:border-regantify-cta transition-colors"
              />
              <span className="text-sm text-regantify-text">% of the pre-order products</span>
            </div>
            <ul className="mt-3 text-xs text-regantify-text-muted space-y-1 list-disc pl-4">
              <li>
                Needs <b>Online Payment</b> to be on in{' '}
                <Link to="/vendor/store/payment-gateway" className="text-regantify-cta hover:underline">
                  Payment Gateway
                </Link>{' '}
                and the StorePal theme. Products are marked Pre-order on their own page.
              </li>
              <li>The full amount goes to your wallet. The payment page adds the same small processing fee as the delivery-charge advance.</li>
            </ul>
            {preOrderOn && !form.advanceEnabled && <div className="mt-4">{unpaidChoice}</div>}
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <Checkbox
              checked={form.duplicateOrderHold}
              onChange={(v) => set('duplicateOrderHold', v)}
              label="Hold possible duplicate orders"
            />
            <p className="text-xs text-regantify-text-muted mt-1.5 ml-7">
              When the same phone orders the same product again within 24 hours of an open order, the new order is always marked
              &ldquo;Possible duplicate&rdquo; and you get a notice. With this on it also starts <b>On Hold</b>, so it can&apos;t ship
              until you check with the customer and move it on. Orders that are paid online are marked but not held.
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <Checkbox
              checked={form.customerCancelEnabled}
              onChange={(v) => set('customerCancelEnabled', v)}
              label="Let customers cancel their own order"
            />
            <p className="text-xs text-regantify-text-muted mt-1.5 ml-7">
              Shows a <b>Cancel order</b> button on the order tracking page and the thank-you page (StorePal theme) while the order is
              <b> Pending</b> or <b>On Hold</b>. The customer picks a reason, the order is cancelled, its stock and gift card go back, and
              you get a notice (bell, phone and Telegram). It never shows once you move the order to Processing, for an order that has a
              payment on it (online or advance), or one already booked with a courier. Those say &ldquo;call the store&rdquo;.
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <Checkbox
              checked={form.customerEditEnabled}
              onChange={(v) => set('customerEditEnabled', v)}
              label="Let customers fix their delivery address"
            />
            <p className="text-xs text-regantify-text-muted mt-1.5 ml-7">
              Shows a <b>Fix my address</b> button on the order tracking page and the thank-you page (StorePal theme) while the order is
              <b> Pending</b> or <b>On Hold</b> and not yet booked with a courier. The customer can correct the street address, the thana
              or area and a second phone. The main phone and the district stay as ordered. You get a notice, and the order&apos;s history
              keeps the old and the new address. Fewer parcels come back for a wrong address.
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
            <h2 className="text-base font-medium text-regantify-text">Order Verification</h2>

            <div>
              <p className="text-sm font-medium text-regantify-text mb-2">Verification Type</p>
              <div className="flex flex-wrap items-center gap-5">
                {TYPES.map((t) => (
                  <Radio
                    key={t.value}
                    name="verificationType"
                    label={t.label}
                    checked={form.verificationType === t.value}
                    disabled={t.disabled}
                    onChange={() => set('verificationType', t.value)}
                  />
                ))}
              </div>
            </div>

            <div className={isSms ? '' : 'opacity-60 pointer-events-none'} aria-disabled={!isSms}>
              <label className="block text-sm font-medium text-regantify-text mb-1.5">Trigger Condition</label>
              <select
                value={form.verificationCondition ?? ''}
                disabled={!isSms}
                onChange={(e) => set('verificationCondition', (e.target.value || null) as CodVerificationCondition | null)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white
                  focus:outline-none focus:border-regantify-cta transition-colors"
              >
                <option value="" disabled>
                  Select…
                </option>
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-regantify-text-muted mt-1.5">Which orders should trigger verification.</p>
            </div>

            <div className={isSms ? '' : 'opacity-60 pointer-events-none'} aria-disabled={!isSms}>
              <p className="text-sm font-medium text-regantify-text mb-2">Verification Trigger</p>
              <div className="flex flex-wrap items-center gap-5">
                {TRIGGERS.map((t) => (
                  <Radio
                    key={t.value}
                    name="verificationTrigger"
                    label={t.label}
                    checked={form.verificationTrigger === t.value}
                    disabled={!isSms}
                    onChange={() => set('verificationTrigger', t.value)}
                  />
                ))}
              </div>
              {form.verificationTrigger && (
                <p className="text-xs text-regantify-text-muted mt-1.5">
                  {TRIGGERS.find((t) => t.value === form.verificationTrigger)?.hint}
                </p>
              )}
            </div>

            {isSms && form.verificationTrigger === 'AFTER_CHECKOUT' && (
              <div className="rounded-xl border border-black/10 p-4">
                <p className="text-sm font-medium text-regantify-text mb-2">If the shopper never enters the code</p>
                <select
                  value={form.verificationExpiryHours === null ? 'never' : String(form.verificationExpiryHours)}
                  onChange={(e) => set('verificationExpiryHours', e.target.value === 'never' ? null : Number(e.target.value))}
                  aria-label="Time allowed to enter the code"
                  className="w-full sm:w-72 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white
                    focus:outline-none focus:border-regantify-cta transition-colors"
                >
                  {EXPIRY_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {form.verificationExpiryHours !== null && (
                  <div className="mt-3 flex flex-col gap-2">
                    <Radio
                      name="verificationExpiryHold"
                      label="Cancel the order (stock goes back)"
                      checked={!form.verificationExpiryHold}
                      onChange={() => set('verificationExpiryHold', false)}
                    />
                    <Radio
                      name="verificationExpiryHold"
                      label="Keep it On Hold and tell me, so I can call the customer"
                      checked={form.verificationExpiryHold}
                      onChange={() => set('verificationExpiryHold', true)}
                    />
                  </div>
                )}
                <p className="text-xs text-regantify-text-muted mt-2">
                  Without this, an order whose code is never entered stays On Hold forever with its stock taken. Only orders from the
                  last 7 days are looked at, and a code entered after the time is refused with an explanation.
                </p>
              </div>
            )}

            {isSms && (
              <p className="text-xs text-regantify-text-muted">
                Each verification code is one SMS from your{' '}
                <Link to="/vendor/sms" className="text-regantify-cta hover:underline">
                  SMS balance
                </Link>
                . If your balance runs out, verification is skipped so shoppers can still order. SMS verification
                only runs on the StorePal theme.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm text-amber-900">You need to set up Autocall to use call verification.</p>
              <button
                type="button"
                disabled
                title="Autocall is coming soon"
                className="px-3 py-1.5 rounded-lg bg-amber-400 text-amber-950 text-xs font-medium opacity-70 cursor-not-allowed"
              >
                Autocall Settings (coming soon)
              </button>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={save.isPending || remove.isPending}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
                text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {save.isPending ? 'Saving…' : 'Save Settings'}
            </button>
            <button
              onClick={() => remove.mutate()}
              disabled={save.isPending || remove.isPending}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-red-300 text-red-600
                hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-60"
            >
              {remove.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Radio({
  name,
  label,
  checked,
  disabled,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-2 text-sm ${
        disabled ? 'text-regantify-text-muted cursor-not-allowed' : 'text-regantify-text cursor-pointer'
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4 accent-regantify-cta"
      />
      {label}
    </label>
  );
}
