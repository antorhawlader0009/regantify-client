import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { storeSettingsApi, type StoreAwayMode, type StoreAwaySettings } from '../../../lib/storeSettingsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Checkbox } from '../../../components/ui/Checkbox';

type Form = Omit<StoreAwaySettings, 'active'>;

const MODES: { value: StoreAwayMode; label: string; hint: string }[] = [
  {
    value: 'TAKE_ORDERS',
    label: 'Keep taking orders',
    hint: 'Shoppers see your message and can still order. Checkout tells them delivery starts from your return day.',
  },
  {
    value: 'BROWSE_ONLY',
    label: 'Stop orders for now',
    hint: 'Shoppers can look at your products but can’t place an order until you are back.',
  },
];

/** Tomorrow in Dhaka, YYYY-MM-DD: the earliest return day. */
function tomorrowDhaka(): string {
  return new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

function formatDay(day: string): string {
  return new Date(`${day}T00:00:00+06:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' });
}

/**
 * Store > Store Away (holiday mode): tell shoppers the store is closed for a while, with a message and
 * the day it's back. Ends by itself on that day. Shown on the StorePal storefront only.
 */
export default function StoreAway() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['store-away-settings'], queryFn: storeSettingsApi.getStoreAway });
  const [form, setForm] = useState<Form | null>(null);

  useEffect(() => {
    if (data) setForm({ enabled: data.enabled, mode: data.mode, message: data.message, returnDate: data.returnDate });
  }, [data]);

  const save = useMutation({
    mutationFn: storeSettingsApi.updateStoreAway,
    onSuccess: (updated) => {
      queryClient.setQueryData(['store-away-settings'], updated);
      toast.success(updated.active ? 'Your store is now away.' : 'Store Away settings saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save Store Away settings. Please try again.')),
  });

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = () => {
    if (!form) return;
    if (form.enabled && form.returnDate && form.returnDate < tomorrowDhaka()) {
      toast.error('The return day must be after today.');
      return;
    }
    save.mutate({ ...form, returnDate: form.returnDate || null });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Store Away</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Going on an Eid holiday or out to restock? Let shoppers know your store is closed for a few days.
        </p>
      </div>

      {isLoading || !form ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          {data?.active && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
              Your store is away right now
              {data.returnDate ? ` and opens again on ${formatDay(data.returnDate)}.` : '. Turn it off below when you are back.'}
            </div>
          )}

          <section className="bg-white rounded-2xl border border-black/5 p-5 space-y-5">
            <div>
              <Checkbox checked={form.enabled} onChange={(v) => set('enabled', v)} label="My store is away" />
              <p className="text-xs text-regantify-text-muted mt-1.5 ml-7">
                Shows a notice at the top of every page of your StorePal store.
              </p>
            </div>

            <div className={form.enabled ? 'space-y-5' : 'space-y-5 opacity-60 pointer-events-none'} aria-disabled={!form.enabled}>
              <div>
                <p className="text-sm font-medium text-regantify-text mb-2">Orders while away</p>
                <div className="flex flex-col gap-3">
                  {MODES.map((m) => (
                    <label key={m.value} className="flex items-start gap-2 text-sm text-regantify-text cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        checked={form.mode === m.value}
                        onChange={() => set('mode', m.value)}
                        className="mt-0.5 h-4 w-4 accent-regantify-cta"
                      />
                      <span>
                        {m.label}
                        <span className="block text-xs text-regantify-text-muted">{m.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">Message for shoppers</label>
                <textarea
                  value={form.message}
                  maxLength={300}
                  rows={3}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder="We are on Eid holiday. Orders will be delivered after we are back."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white
                    focus:outline-none focus:border-regantify-cta transition-colors"
                />
                <p className="text-xs text-regantify-text-muted mt-1">Empty = a short built-in notice.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">Back on</label>
                <input
                  type="date"
                  min={tomorrowDhaka()}
                  value={form.returnDate ?? ''}
                  onChange={(e) => set('returnDate', e.target.value || null)}
                  className="w-full sm:w-60 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white
                    focus:outline-none focus:border-regantify-cta transition-colors"
                />
                <p className="text-xs text-regantify-text-muted mt-1">
                  Store Away turns itself off on this day, so you won’t lose sales if you forget. Empty = until you turn it off.
                </p>
              </div>
            </div>

            <p className="text-xs text-regantify-text-muted">
              Works on the StorePal theme. Orders you add in the dashboard or sell at the POS are not affected.
            </p>
          </section>

          <button
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
              text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {save.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
