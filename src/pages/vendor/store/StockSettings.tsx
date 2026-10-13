import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { storeSettingsApi, blankHtmlToEmpty, type StockSettings as StockSettingsValue } from '../../../lib/storeSettingsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { Checkbox } from '../../../components/ui/Checkbox';
import { AdvancedPanel } from '../../../components/ui/AdvancedToggle';
import { PolicyField, policyFromProduct, policyToPayload } from '../../../components/product/PolicyField';

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

  // Advanced settings that differ from the defaults (the panel then starts open).
  const advancedInUse = form
    ? [!form.reduceStockOnCodCheckout, form.returnStockAfterCheckIn, form.soldOutDisplay !== 'KEEP', form.reorderSmsEnabled, form.lowStockMessageEnabled, form.hideStockCount, Boolean(form.defaultWarrantyKind) || form.defaultReturnDays != null].filter(Boolean).length
    : 0;

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
            <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
              <Checkbox
                checked={form.showOutOfStockProducts}
                onChange={(v) => set('showOutOfStockProducts', v)}
                label="Show out-of-stock products in shop pages"
              />
              <Checkbox
                checked={form.showOutOfStockBadge}
                onChange={(v) => set('showOutOfStockBadge', v)}
                label='Show "Out of Stock" badge on product cards'
                hint="Off: sold-out products look like any other product card, without the faded image and label."
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
            <h2 className="text-sm font-medium text-regantify-text mb-1">Low Stock Alert</h2>
            <p className="text-xs text-regantify-text-muted mb-3">
              A product with fewer than this many left shows on the Low Stock page, and your notification bell tells you once
              a day. A product can have its own number (Edit Product &gt; Low stock alert). Turn on a text for it in
              Notifications &gt; Alert settings.
            </p>
            <label className="flex items-center gap-2 text-sm text-regantify-text">
              Alert when stock is under
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={1000000}
                value={form.lowStockThreshold}
                onChange={(e) => set('lowStockThreshold', Number(e.target.value.replace(/\D/g, '') || 0))}
                className={`${inputClass.replace('w-full ', '')} w-28`}
              />
            </label>
            <p className="text-xs text-regantify-text-muted mt-2">0 turns the alert off for products without their own number.</p>
          </section>

          <AdvancedPanel
            id="stock-settings"
            what="Stock on COD orders, returned parcels, sold-out order, reorder SMS, wholesale tag, low stock message, warranty and returns"
            inUse={advancedInUse}
          >
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

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <h2 className="text-sm font-medium text-regantify-text mb-2">Returned Parcels</h2>
            <Checkbox
              checked={form.returnStockAfterCheckIn}
              onChange={(v) => set('returnStockAfterCheckIn', v)}
              label="Put returned stock back only after I check the parcel in"
              hint={
                'Off (default): when an order is marked Returned its stock goes back at once, and the check-in on Orders > ' +
                'Return check-in only takes off what came back damaged or never came. On: nothing goes back until you check ' +
                'the parcel in, and only the products you find in good shape are added back.'
              }
            />
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <h2 className="text-sm font-medium text-regantify-text mb-1">Sold-out products on the store lists</h2>
            <p className="text-xs text-regantify-text-muted mb-3">
              StorePal only. Pre-order, backorder and unlimited-stock products are never sold out; a product with variations is sold out when
              every variation is. Pinned products stay where you pinned them, even when sold out. The product&apos;s own link and the search keep working.
            </p>
            <div className="space-y-2 text-sm text-regantify-text">
              {([
                ['KEEP', 'Leave them where they are (default)'],
                ['LAST', 'Move them to the end of the list'],
                ['HIDE', 'Hide them from the lists'],
              ] as const).map(([value, text]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" name="soldOutDisplay" checked={form.soldOutDisplay === value} onChange={() => set('soldOutDisplay', value)} className="accent-regantify-cta" />
                  {text}
                </label>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <h2 className="text-sm font-medium text-regantify-text mb-1">Reorder reminder SMS</h2>
            <p className="text-xs text-regantify-text-muted mb-3">
              For products where you set “Lasts about (days)”: when that time has passed since a Completed order, the customer gets one SMS with a one-tap link to buy it again, once per purchase. Sent between 10 AM and 8 PM, from your SMS credits. Not sent to blacklisted customers or to anyone who bought the product again.
            </p>
            <label className="flex items-center gap-2 text-sm text-regantify-text">
              <input type="checkbox" checked={form.reorderSmsEnabled} onChange={(e) => set('reorderSmsEnabled', e.target.checked)} />
              Send reorder reminders
            </label>
            {form.reorderSmsEnabled && (
              <label className="mt-3 block text-xs text-regantify-text-muted">
                Most texts per day
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={form.reorderSmsDailyLimit}
                  onChange={(e) => set('reorderSmsDailyLimit', Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                  className={`${inputClass.replace('w-full ', '')} mt-1 block w-28`}
                />
              </label>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <h2 className="text-sm font-medium text-regantify-text mb-1">Wholesale customers</h2>
            <p className="text-xs text-regantify-text-muted mb-3">
              A customer who is logged in and whose phone has this tag (Customers &gt; Note &amp; tags) sees and pays the product&apos;s wholesale price, when it has one. StorePal only.
            </p>
            <input
              type="text"
              maxLength={40}
              value={form.wholesaleTag}
              onChange={(e) => set('wholesaleTag', e.target.value)}
              className={`${inputClass.replace('w-full ', '')} w-56`}
            />
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <h2 className="text-sm font-medium text-regantify-text mb-1">Low Stock Message on the Store</h2>
            <p className="text-xs text-regantify-text-muted mb-3">
              Shows shoppers a red &quot;Only 3 left&quot; on the product page and product cards when stock is running low, so
              they do not wait. Display only: stock and prices do not change. Products with backorder or pre-order never
              show it. With variations, the chosen variation&apos;s stock is used.
            </p>
            <div className="space-y-4">
              <Checkbox
                checked={form.lowStockMessageEnabled}
                onChange={(v) => set('lowStockMessageEnabled', v)}
                label='Show "Only N left" when stock is low'
              />
              <div className={form.lowStockMessageEnabled ? '' : 'opacity-60'}>
                <label className="flex items-center gap-2 text-sm text-regantify-text">
                  Show the message when stock is
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    value={form.lowStockMessageLimit}
                    onChange={(e) => set('lowStockMessageLimit', Math.min(1000, Math.max(1, Number(e.target.value.replace(/\D/g, '') || 1))))}
                    className={`${inputClass.replace('w-full ', '')} w-24`}
                  />
                  or fewer
                </label>
              </div>
              <Checkbox
                checked={form.hideStockCount}
                onChange={(v) => set('hideStockCount', v)}
                label='Hide the exact stock count when stock is high (show only "In stock")'
                hint="Stops competitors from seeing how many units you hold."
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-black/5 p-5">
            <h2 className="text-sm font-medium text-regantify-text mb-1">Warranty and Returns (store default)</h2>
            <p className="text-xs text-regantify-text-muted mb-3">
              Shown under the Buy button and printed under each item on the invoice, for every product that does not set its own
              (Edit Product &gt; Warranty and returns). Leave both on &quot;Not set&quot; to show nothing.
            </p>
            <PolicyField
              compact
              value={policyFromProduct({
                warrantyKind: form.defaultWarrantyKind,
                warrantyCustom: form.defaultWarrantyCustom,
                returnDays: form.defaultReturnDays,
                returnCondition: form.defaultReturnCondition,
              })}
              onChange={(next) => {
                const p = policyToPayload(next);
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        defaultWarrantyKind: p.warrantyKind,
                        defaultWarrantyCustom: next.warrantyKind === 'CUSTOM' ? next.warrantyCustom : null,
                        defaultReturnDays: p.returnDays,
                        defaultReturnCondition: next.returnCondition || null,
                      }
                    : prev,
                );
              }}
            />
          </section>
          </AdvancedPanel>

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
