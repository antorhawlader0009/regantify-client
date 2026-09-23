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

export default function CodGuard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['cod-guard-settings'], queryFn: storeSettingsApi.getCodGuard });
  const [form, setForm] = useState<CodGuardSettings | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const onSaved = (updated: CodGuardSettings, message: string) => {
    queryClient.setQueryData(['cod-guard-settings'], updated);
    setForm(updated);
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
    save.mutate(form);
  };

  const isSms = form?.verificationType === 'SMS';

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
