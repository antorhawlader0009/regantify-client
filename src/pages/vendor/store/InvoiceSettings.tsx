import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Upload, X } from 'lucide-react';
import { invoiceApi, type InvoicePrintData, type InvoiceSettings as InvoiceSettingsValue } from '../../../lib/invoiceApi';
import { getVendorSettings } from '../../../lib/vendorApi';
import type { Order } from '../../../lib/ordersApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Checkbox } from '../../../components/ui/Checkbox';
import { InvoiceSheet } from '../order/InvoiceModal';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors';

// A made-up order for the live preview: nothing here is saved or sent anywhere.
const SAMPLE_ORDER = {
  id: 'sample',
  invoiceNumber: 1042,
  publicCode: null,
  createdAt: new Date().toISOString(),
  customerName: 'Rahim Uddin',
  customerPhone: '01700000000',
  shippingAddress: 'House 12, Road 5, Dhanmondi',
  shippingCity: 'Dhanmondi',
  shippingDistrict: 'Dhaka',
  paymentMethod: 'COD',
  subtotal: '2300',
  deliveryCharge: '80',
  vatAmount: '0',
  vatIncluded: false,
  platformChargeAmount: '0',
  platformChargePayer: 'CUSTOMER',
  discountAmount: '100',
  totalAmount: '2280',
  customerNote: null,
  items: [
    {
      id: 'i1',
      orderId: 'sample',
      productName: 'Cotton Panjabi',
      productSku: 'PJ-001',
      productImage: null,
      selectedOptions: { Size: 'L' },
      listPrice: '1200',
      unitPrice: '1200',
      quantity: 1,
      lineTotal: '1200',
      product: { slug: 'cotton-panjabi', visibility: 'PUBLIC', warrantyKind: null, warrantyCustom: null, returnDays: 7, returnCondition: 'if unworn' },
    },
    {
      id: 'i2',
      orderId: 'sample',
      productName: 'Leather Belt',
      productSku: 'BL-014',
      productImage: null,
      selectedOptions: {},
      listPrice: '550',
      unitPrice: '550',
      quantity: 2,
      lineTotal: '1100',
      product: { slug: 'leather-belt', visibility: 'PUBLIC', warrantyKind: 'M6', warrantyCustom: null, returnDays: null, returnCondition: null },
    },
  ],
} as unknown as Order;

/**
 * Store > Invoice (TellMe idea 55): how the printed invoice looks: store block, thank-you message, terms, BIN or trade
 * licence number, a signature or seal, which columns and lines show, and A4 or an 80 mm receipt. The preview beside the form
 * is the real invoice sheet. Every Print Invoice reads these settings when it prints, so old orders print with them too.
 */
export default function InvoiceSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['invoice-settings'], queryFn: invoiceApi.get });
  const { data: vendor } = useQuery({ queryKey: ['vendor-settings'], queryFn: getVendorSettings, retry: false, staleTime: 5 * 60_000 });
  const [form, setForm] = useState<InvoiceSettingsValue | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (value: InvoiceSettingsValue) => {
      const { signatureUrl: _signature, ...rest } = value;
      return invoiceApi.update({
        ...rest,
        // Empty text clears a field back to the built-in look.
        addressOverride: rest.addressOverride ?? '',
        thankYouMessage: rest.thankYouMessage ?? '',
        terms: rest.terms ?? '',
        taxNumber: rest.taxNumber ?? '',
        paymentInfo: rest.paymentInfo ?? '',
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['invoice-settings'], updated);
      void queryClient.invalidateQueries({ queryKey: ['invoice-print-data'] });
      toast.success('Invoice settings saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save invoice settings. Please try again.')),
  });

  const set = <K extends keyof InvoiceSettingsValue>(key: K, value: InvoiceSettingsValue[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  async function onSignature(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await invoiceApi.uploadSignature(file);
      set('signatureUrl', url);
      void queryClient.invalidateQueries({ queryKey: ['invoice-print-data'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload the image. Please try again.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeSignature() {
    try {
      await invoiceApi.clearSignature();
      set('signatureUrl', null);
      void queryClient.invalidateQueries({ queryKey: ['invoice-print-data'] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove the image. Please try again.'));
    }
  }

  const preview: InvoicePrintData | null = form
    ? {
        settings: form,
        store: { storeName: vendor?.storeName ?? 'Your Store', address: vendor?.address ?? null, logoUrl: null },
        policyDefaults: { defaultWarrantyKind: null, defaultWarrantyCustom: null, defaultReturnDays: null, defaultReturnCondition: null },
      }
    : null;

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Invoice</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Make the invoice your customers get look like your shop. It also applies to invoices of orders you already have.
        </p>
      </div>

      {isLoading || !form || !preview ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
              <h2 className="text-sm font-medium text-regantify-text">Header</h2>
              <Checkbox
                checked={form.showLogo}
                onChange={(v) => set('showLogo', v)}
                label="Show my logo at the top"
                hint="The logo from Store > Branding."
              />
              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">Address on the invoice</label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={form.addressOverride ?? ''}
                  onChange={(e) => set('addressOverride', e.target.value)}
                  placeholder="Leave empty to use the address from Settings"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">BIN or trade licence number</label>
                <input
                  type="text"
                  maxLength={60}
                  value={form.taxNumber ?? ''}
                  onChange={(e) => set('taxNumber', e.target.value)}
                  placeholder="Optional"
                  className={inputClass}
                />
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
              <h2 className="text-sm font-medium text-regantify-text">Footer</h2>
              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">
                  Thank-you message <span className="text-xs font-normal text-neutral-500">({(form.thankYouMessage ?? '').length}/200)</span>
                </label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={form.thankYouMessage ?? ''}
                  onChange={(e) => set('thankYouMessage', e.target.value)}
                  placeholder="Thank you for your order."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">
                  Terms <span className="text-xs font-normal text-neutral-500">({(form.terms ?? '').length}/400)</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={400}
                  value={form.terms ?? ''}
                  onChange={(e) => set('terms', e.target.value)}
                  placeholder="e.g. Goods once sold can be exchanged within 7 days with this invoice."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">Bank or bKash details</label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={form.paymentInfo ?? ''}
                  onChange={(e) => set('paymentInfo', e.target.value)}
                  placeholder="e.g. bKash (Personal) 01XXXXXXXXX"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">Signature or seal</label>
                <div className="flex items-center gap-3">
                  {form.signatureUrl ? (
                    <>
                      <img src={form.signatureUrl} alt="Signature" className="h-14 max-w-[160px] rounded border border-black/10 bg-white object-contain p-1" />
                      <button
                        type="button"
                        onClick={removeSignature}
                        className="flex items-center gap-1 text-sm text-red-600 hover:underline"
                      >
                        <X size={14} /> Remove
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 rounded-xl border border-black/10 px-3.5 py-2 text-sm text-regantify-text hover:bg-black/[0.03] disabled:opacity-60"
                    >
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {uploading ? 'Uploading…' : 'Upload image'}
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => void onSignature(e.target.files?.[0])}
                  />
                </div>
                <p className="mt-1.5 text-xs text-neutral-500">A PNG with a transparent background prints best. Max 4 MB.</p>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
              <h2 className="text-sm font-medium text-regantify-text">What to show</h2>
              <Checkbox checked={form.showProductImage} onChange={(v) => set('showProductImage', v)} label="Product photo next to each item" />
              <Checkbox checked={form.showSku} onChange={(v) => set('showSku', v)} label="SKU under each item" />
              <Checkbox
                checked={form.showDiscount}
                onChange={(v) => set('showDiscount', v)}
                label="Discount as its own line"
                hint="Off: the discount is taken off the subtotal instead. The total does not change."
              />
              <Checkbox
                checked={form.showDeliveryCharge}
                onChange={(v) => set('showDeliveryCharge', v)}
                label="Delivery charge as its own line"
                hint="Off: the delivery charge is included in the subtotal instead. The total does not change."
              />
            </section>

            <section className="bg-white rounded-2xl border border-black/5 p-5">
              <h2 className="text-sm font-medium text-regantify-text mb-3">Paper</h2>
              <div className="flex gap-3">
                {([
                  ['A4', 'A4 page'],
                  ['RECEIPT80', '80 mm receipt'],
                ] as const).map(([value, text]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${
                      form.paperSize === value ? 'border-regantify-cta text-regantify-text' : 'border-black/10 text-neutral-600'
                    }`}
                  >
                    <input type="radio" name="paper" checked={form.paperSize === value} onChange={() => set('paperSize', value)} className="accent-brand" />
                    {text}
                  </label>
                ))}
              </div>
            </section>

            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
                text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {save.isPending ? 'Saving…' : 'Save Invoice Settings'}
            </button>
          </div>

          <div className="lg:sticky lg:top-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Preview (sample order)</p>
            <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white p-6">
              <InvoiceSheet order={SAMPLE_ORDER} invoice={preview} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
