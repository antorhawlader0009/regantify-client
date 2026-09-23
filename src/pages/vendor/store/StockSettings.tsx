import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { storeSettingsApi, blankHtmlToEmpty, type StockSettings as StockSettingsValue } from '../../../lib/storeSettingsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { Checkbox } from '../../../components/ui/Checkbox';

// Shown as the editor/input placeholders, and what StorePal falls back to
// when a message is left blank (keep in sync with storefront's
// themes/storepal/lib/backorder.ts).
const DEFAULT_POPUP_MESSAGE =
  'This product is currently out of stock. If you order this product, delivery time will be 2-3 weeks.';
const DEFAULT_SHORT_MESSAGE = 'Backorder. Delivery time 2-3 Weeks.';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors';

export default function StockSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['stock-settings'], queryFn: storeSettingsApi.getStock });
  const [form, setForm] = useState<StockSettingsValue | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (value: StockSettingsValue) =>
      storeSettingsApi.updateStock({
        ...value,
        backorderPopupMessage: blankHtmlToEmpty(value.backorderPopupMessage),
        backorderShortMessage: value.backorderShortMessage ?? '',
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['stock-settings'], updated);
      toast.success('Stock settings saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save stock settings. Please try again.')),
  });

  const set = <K extends keyof StockSettingsValue>(key: K, value: StockSettingsValue[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Stock Settings</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Control how out-of-stock products show and sell on your StorePal storefront.
        </p>
      </div>

      {isLoading || !form ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-base font-medium text-regantify-text mb-2">Out-of-stock Product Display</h2>
            <div className="bg-white rounded-2xl border border-black/5 p-5">
              <Checkbox
                checked={form.showOutOfStockProducts}
                onChange={(v) => set('showOutOfStockProducts', v)}
                label="Show out-of-stock products in shop pages"
              />
            </div>
          </section>

          <section>
            <h2 className="text-base font-medium text-regantify-text mb-2">Backorder</h2>
            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
              <Checkbox
                checked={!form.allowBackorder}
                onChange={(v) => set('allowBackorder', !v)}
                label="Do not allow backorder"
                hint="When backorder is allowed, shoppers can still order a product after its stock runs out."
              />

              <div className={form.allowBackorder ? '' : 'opacity-60'}>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">Backorder Popup Message</label>
                <RichTextEditor
                  value={form.backorderPopupMessage ?? ''}
                  onChange={(html) => set('backorderPopupMessage', html)}
                  placeholder={DEFAULT_POPUP_MESSAGE}
                />
              </div>

              <div className={form.allowBackorder ? '' : 'opacity-60'}>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">Backorder Short Message</label>
                <input
                  type="text"
                  maxLength={120}
                  value={form.backorderShortMessage ?? ''}
                  onChange={(e) => set('backorderShortMessage', e.target.value)}
                  placeholder={DEFAULT_SHORT_MESSAGE}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <h2 className="text-sm font-medium text-regantify-text mb-2">Reduce Stock on COD Orders</h2>
            <Checkbox
              checked={form.reduceStockOnCodCheckout}
              onChange={(v) => set('reduceStockOnCodCheckout', v)}
              label="Reduce stock as soon as a COD order is placed"
              hint={
                'On (default): stock goes down the moment a Cash on Delivery order is placed. Off: a COD order ' +
                'stays in Pending without touching stock, and stock is only reduced once you move it to Processing.'
              }
            />
          </section>

          <button
            onClick={() => save.mutate(form)}
            disabled={save.isPending}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
              text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {save.isPending ? 'Saving…' : 'Save Stock Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
