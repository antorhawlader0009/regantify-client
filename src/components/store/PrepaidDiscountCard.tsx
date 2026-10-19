import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { Checkbox } from '../ui/Checkbox';
import { prepaidApi, type PrepaidSettings } from '../../lib/prepaidApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const input =
  'w-full sm:w-44 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white focus:outline-none focus:border-regantify-cta transition-colors';

/**
 * Store > COD Guard > "Discount for paying online" (server orders/prepaid-discount.ts): a saving for orders not paid
 * in cash on delivery, shown at checkout before Cash on Delivery is picked, and the optional "pay now online and save"
 * offer on COD orders (thank-you and tracking pages, plus one SMS). Saves on its own, apart from the page's form.
 */
export function PrepaidDiscountCard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['prepaid-discount'], queryFn: prepaidApi.get });
  const [form, setForm] = useState<PrepaidSettings | null>(null);
  const [valueText, setValueText] = useState('');
  const [minText, setMinText] = useState('');
  const [maxText, setMaxText] = useState('');

  useEffect(() => {
    if (!data) return;
    setForm(data);
    setValueText(data.value ? String(data.value) : '');
    setMinText(data.minOrder ? String(data.minOrder) : '');
    setMaxText(data.maxDiscount ? String(data.maxDiscount) : '');
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      prepaidApi.save({
        ...form!,
        value: Number(valueText) || 0,
        minOrder: Number(minText) || 0,
        maxDiscount: form!.kind === 'PERCENT' && Number(maxText) > 0 ? Number(maxText) : null,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(['prepaid-discount'], next);
      toast.success('Online payment discount saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  if (!form) {
    return (
      <section className="bg-white rounded-2xl border border-black/5 p-5 flex justify-center">
        <Loader2 size={18} className="animate-spin text-regantify-text-muted" />
      </section>
    );
  }
  const set = <K extends keyof PrepaidSettings>(k: K, v: PrepaidSettings[K]) => setForm({ ...form, [k]: v });
  const example = form.kind === 'FLAT' ? `৳${Number(valueText) || 0}` : `${Number(valueText) || 0}%`;

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5" id="prepaid-discount">
      <Checkbox checked={form.enabled} onChange={(v) => set('enabled', v)} label="Discount for paying online" />
      <p className="text-xs text-regantify-text-muted mt-1.5 ml-7">
        Shoppers who pay online (bKash, Nagad, card, or a mobile payment sent before delivery) get this much off. Checkout shows
        it on every online option before they pick Cash on Delivery. Fewer COD orders means fewer parcels refused at the door.
      </p>

      {form.enabled && (
        <div className="mt-4 ml-7 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-regantify-text mb-1.5">Discount</label>
              <input type="number" min={0} inputMode="decimal" value={valueText} onChange={(e) => setValueText(e.target.value)} placeholder="30" className={input} />
            </div>
            <div className="inline-flex rounded-xl border border-black/10 p-0.5">
              {(['FLAT', 'PERCENT'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('kind', k)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium ${form.kind === k ? 'bg-regantify-cta text-white' : 'text-regantify-text'}`}
                >
                  {k === 'FLAT' ? 'Taka (৳)' : 'Percent (%)'}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-regantify-text-muted -mt-2">A fixed amount like ৳30 moves more shoppers than a percentage.</p>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-sm font-medium text-regantify-text mb-1.5">Only for orders of at least (৳)</label>
              <input type="number" min={0} inputMode="decimal" value={minText} onChange={(e) => setMinText(e.target.value)} placeholder="Every order" className={input} />
            </div>
            {form.kind === 'PERCENT' && (
              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">At most (৳)</label>
                <input type="number" min={0} inputMode="decimal" value={maxText} onChange={(e) => setMaxText(e.target.value)} placeholder="No limit" className={input} />
              </div>
            )}
          </div>

          <div className="rounded-xl bg-neutral-50 p-4">
            <Checkbox checked={form.switchOffer} onChange={(v) => set('switchOffer', v)} label="Offer it after a Cash on Delivery order too" />
            <p className="text-xs text-regantify-text-muted mt-1.5 ml-7">
              The thank-you and tracking pages show "Pay online now and save {example}". The order stays Cash on Delivery until the
              payment arrives, then the discount comes off by itself. Needs Online Payment turned on in Payment Gateway.
            </p>
            {form.switchOffer && (
              <div className="mt-3 ml-7">
                <Checkbox checked={form.switchSms} onChange={(v) => set('switchSms', v)} label="Also text the offer once, about 30 minutes after the order" />
                <p className="text-xs text-regantify-text-muted mt-1 ml-7">Uses your SMS credits. Never at night, never to blocked numbers or customers who said no to offers.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta text-white text-sm font-medium hover:bg-regantify-cta-dark disabled:opacity-60"
        >
          {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
      </div>
    </section>
  );
}
