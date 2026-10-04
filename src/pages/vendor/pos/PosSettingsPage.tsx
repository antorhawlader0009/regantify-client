import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PosPage } from '../../../components/pos/PosLayout';
import { Field, Panel, PosButton, PosInput, PosSelect, PosTextarea, SwitchRow } from '../../../components/pos/ui';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { POS_TENDERS, posApi, TENDER_LABEL, type PosMe, type PosSettings, type PosTender, type UpdatePosSettings } from '../../../lib/posApi';
import { mediaApi } from '../../../lib/mediaApi';

const SETTINGS_KEY = ['pos', 'settings'] as const;

/** POS > Settings. Everything works with the defaults; this page only adjusts. Managers change it; only the owner turns POS off. */
export default function PosSettingsPage() {
  return <PosPage title="Settings">{(me) => <SettingsBody me={me} />}</PosPage>;
}

function SettingsBody({ me }: { me: PosMe }) {
  const query = useQuery({ queryKey: SETTINGS_KEY, queryFn: posApi.getSettings });

  if (query.isPending) return <p className="text-sm text-pos-muted">Loading…</p>;
  if (query.isError) {
    return <p className="text-sm">{apiErrorMessage(query.error, "Settings couldn't load. Refresh the page to try again.")}</p>;
  }
  return (
    <div className="max-w-3xl space-y-5">
      {!me.isManager && <p className="text-sm text-pos-muted">Only the store owner or a POS manager can change POS settings.</p>}
      <OnOffSection me={me} />
      <SettingsForm settings={query.data} readOnly={!me.isManager} />
    </div>
  );
}

function useSave(successMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePosSettings) => posApi.updateSettings(dto),
    onSuccess: (saved) => {
      queryClient.setQueryData(SETTINGS_KEY, saved);
      queryClient.invalidateQueries({ queryKey: ['pos', 'me'] });
      toast.success(successMessage);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Settings couldn't be saved. Try again.")),
  });
}

function OnOffSection({ me }: { me: PosMe }) {
  const save = useSave('POS turned off');
  return (
    <Panel>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">POS is on</h2>
          <p className="mt-1 text-sm leading-6 text-pos-muted">
            If you turn POS off, nobody can sell from the counter. Sales already made stay in your orders and reports.
          </p>
        </div>
        {me.isOwner && (
          <PosButton onClick={() => save.mutate({ enabled: false })} disabled={save.isPending}>
            Turn off
          </PosButton>
        )}
      </div>
    </Panel>
  );
}

/** The editable part, as strings while typing; turned back into the API's shape on save. */
interface FormState {
  receiptHeader: string;
  receiptFooter: string;
  receiptPhone: string;
  binNumber: string;
  showLogo: boolean;
  receiptWidthMm: '80' | '58';
  receiptLanguage: 'en' | 'bn';
  vatPercent: string;
  pricesIncludeVat: boolean;
  useFlashSalePrices: boolean;
  blockOutOfStock: boolean;
  smsReceipt: boolean;
  paymentMethods: PosTender[];
  banglaQrImageUrl: string;
  /** Empty = returns any time. */
  returnDays: string;
}

function toForm(s: PosSettings): FormState {
  return {
    receiptHeader: s.receiptHeader ?? '',
    receiptFooter: s.receiptFooter ?? '',
    receiptPhone: s.receiptPhone ?? '',
    binNumber: s.binNumber ?? '',
    showLogo: s.showLogo,
    receiptWidthMm: s.receiptWidthMm === 58 ? '58' : '80',
    receiptLanguage: s.receiptLanguage,
    vatPercent: String(s.vatPercent),
    pricesIncludeVat: s.pricesIncludeVat,
    useFlashSalePrices: s.useFlashSalePrices,
    blockOutOfStock: s.blockOutOfStock,
    smsReceipt: s.smsReceipt,
    paymentMethods: s.paymentMethods,
    banglaQrImageUrl: s.banglaQrImageUrl ?? '',
    returnDays: s.returnDays === null ? '' : String(s.returnDays),
  };
}

function SettingsForm({ settings, readOnly }: { settings: PosSettings; readOnly: boolean }) {
  const [form, setForm] = useState<FormState>(() => toForm(settings));
  useEffect(() => setForm(toForm(settings)), [settings]);
  const save = useSave('POS settings saved');

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const vat = Number(form.vatPercent);
  const vatValid = form.vatPercent.trim() !== '' && Number.isFinite(vat) && vat >= 0 && vat <= 100;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!vatValid) {
      toast.error('VAT must be a number from 0 to 100.');
      return;
    }
    save.mutate({
      receiptHeader: form.receiptHeader,
      receiptFooter: form.receiptFooter,
      receiptPhone: form.receiptPhone,
      binNumber: form.binNumber,
      showLogo: form.showLogo,
      receiptWidthMm: form.receiptWidthMm === '58' ? 58 : 80,
      receiptLanguage: form.receiptLanguage,
      vatPercent: Math.round(vat * 100) / 100,
      pricesIncludeVat: form.pricesIncludeVat,
      useFlashSalePrices: form.useFlashSalePrices,
      blockOutOfStock: form.blockOutOfStock,
      smsReceipt: form.smsReceipt,
      paymentMethods: form.paymentMethods,
      banglaQrImageUrl: form.banglaQrImageUrl,
      returnDays: form.returnDays.trim() === '' ? null : Math.max(0, Math.trunc(Number(form.returnDays)) || 0),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={readOnly} className="space-y-5">
        <Section title="Receipt" text="What's printed on every counter receipt.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Text under the store name" hint="For example your shop address or opening hours." className="sm:col-span-2">
              <PosTextarea rows={2} maxLength={300} value={form.receiptHeader} onChange={(e) => set('receiptHeader', e.target.value)} />
            </Field>
            <Field label="Text at the bottom" hint="For example your exchange policy." className="sm:col-span-2">
              <PosTextarea rows={2} maxLength={300} value={form.receiptFooter} onChange={(e) => set('receiptFooter', e.target.value)} />
            </Field>
            <Field label="Phone number" hint="Leave empty to print your account's phone number.">
              <PosInput inputMode="tel" maxLength={30} value={form.receiptPhone} onChange={(e) => set('receiptPhone', e.target.value)} />
            </Field>
            <Field label="BIN (VAT registration number)" hint="Printed when filled in.">
              <PosInput maxLength={30} value={form.binNumber} onChange={(e) => set('binNumber', e.target.value)} />
            </Field>
            <Field label="Paper width">
              <PosSelect value={form.receiptWidthMm} onChange={(e) => set('receiptWidthMm', e.target.value as FormState['receiptWidthMm'])}>
                <option value="80">80 mm</option>
                <option value="58">58 mm</option>
              </PosSelect>
            </Field>
            <Field label="Receipt language">
              <PosSelect value={form.receiptLanguage} onChange={(e) => set('receiptLanguage', e.target.value as FormState['receiptLanguage'])}>
                <option value="en">English</option>
                <option value="bn">Bangla</option>
              </PosSelect>
            </Field>
          </div>
          <div className="mt-2 border-t border-pos-line">
            <SwitchRow label="Print the store logo" checked={form.showLogo} onChange={(v) => set('showLogo', v)} disabled={readOnly} />
          </div>
          <details className="mt-3 rounded-lg bg-pos-page px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">Setting up a receipt printer</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-pos-muted">
              <li>Install the printer’s own Windows driver (for example Xprinter’s) and print its test page.</li>
              <li>In the driver’s paper settings, choose 80 mm (or 58 mm) roll paper, the same width as above.</li>
              <li>If a cash drawer is plugged into the printer, turn on “open cash drawer” in the driver, so it opens with every receipt.</li>
              <li>In Chrome’s print window, pick that printer once and set Margins to None. Chrome remembers it.</li>
            </ol>
            <p className="mt-2 text-pos-muted">Receipts print as normal pages, so Bangla works on any printer.</p>
          </details>
        </Section>

        <Section
          title="VAT"
          text="Only for counter sales. Your online store keeps its own VAT setting. These receipts are not NBR EFD (Mushak 6.3) invoices."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="VAT %" hint="0 means no VAT line on the receipt.">
              <PosInput
                inputMode="decimal"
                value={form.vatPercent}
                onChange={(e) => set('vatPercent', e.target.value)}
                aria-invalid={!vatValid}
              />
            </Field>
          </div>
          <div className="mt-2 border-t border-pos-line">
            <SwitchRow
              label="Prices already include VAT"
              hint="On: the price on the product is what the customer pays, and the receipt shows how much of it is VAT. Off: VAT is added on top."
              checked={form.pricesIncludeVat}
              onChange={(v) => set('pricesIncludeVat', v)}
              disabled={readOnly}
            />
          </div>
        </Section>

        <Section
          title="Payments"
          text="How customers can pay at the counter. Cash is always on. The others are recorded only: the money goes to your own card machine, bKash, Nagad or bank account, not through us."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {POS_TENDERS.filter((m) => m !== 'CASH').map((m) => (
              <label key={m} className="flex items-center gap-2.5 rounded-lg border border-pos-line px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={form.paymentMethods.includes(m)}
                  onChange={(e) =>
                    set('paymentMethods', e.target.checked ? [...form.paymentMethods, m] : form.paymentMethods.filter((x) => x !== m))
                  }
                />
                {TENDER_LABEL[m]}
              </label>
            ))}
          </div>
          <BanglaQrField value={form.banglaQrImageUrl} onChange={(url) => set('banglaQrImageUrl', url)} disabled={readOnly} />
        </Section>

        <Section title="Returns" text="How long after a sale its items can be brought back to the counter. Voiding a sale on the same open shift is always possible.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Returns accepted for (days)" hint="Leave empty to accept returns any time.">
              <PosInput inputMode="numeric" maxLength={4} value={form.returnDays} onChange={(e) => set('returnDays', e.target.value.replace(/\D/g, ''))} placeholder="Any time" />
            </Field>
          </div>
        </Section>

        <Section title="Selling" text="How the counter handles prices, stock and receipts.">
          <div className="divide-y divide-pos-line">
            <SwitchRow
              label="Use flash sale prices at the counter"
              hint="A running flash sale lowers the counter price too. Campaign prices are online only."
              checked={form.useFlashSalePrices}
              onChange={(v) => set('useFlashSalePrices', v)}
              disabled={readOnly}
            />
            <SwitchRow
              label="Block a sale when stock shows 0"
              hint="Off: the sale goes through, because the item is in your hand; the stock count goes to 0 and the cashier is told to check the shelf."
              checked={form.blockOutOfStock}
              onChange={(v) => set('blockOutOfStock', v)}
              disabled={readOnly}
            />
            <SwitchRow
              label="Offer an SMS receipt"
              hint="After a sale, the cashier can text the customer a link to their receipt. Uses your SMS credits."
              checked={form.smsReceipt}
              onChange={(v) => set('smsReceipt', v)}
              disabled={readOnly}
            />
          </div>
        </Section>
      </fieldset>

      {!readOnly && (
        <div className="flex justify-end">
          <PosButton type="submit" variant="primary" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save settings'}
          </PosButton>
        </div>
      )}
    </form>
  );
}

/**
 * The store's Bangla QR sticker (a photo or the PNG the bank gave), shown big on the counter
 * when the customer pays by QR. Uploaded to the Media library; saved with the form.
 */
function BanglaQrField({ value, onChange, disabled }: { value: string; onChange: (url: string) => void; disabled: boolean }) {
  const [uploading, setUploading] = useState(false);
  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      onChange((await mediaApi.upload(file)).url);
    } catch (err) {
      toast.error(apiErrorMessage(err, "The image couldn't be uploaded. Try again."));
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="mt-4 border-t border-pos-line pt-4">
      <p className="text-sm font-medium">Your Bangla QR</p>
      <p className="mt-0.5 text-xs leading-5 text-pos-muted">
        Upload the QR sticker your bank or MFS gave you. When a customer pays by Bangla QR, it shows big on the counter screen so they can scan it from any bank or MFS app.
      </p>
      <div className="mt-3 flex items-center gap-4">
        {value ? (
          <img src={value} alt="Your Bangla QR" className="h-24 w-24 rounded-md border border-pos-line bg-white object-contain p-1" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-pos-line text-xs text-pos-muted">No QR yet</div>
        )}
        {!disabled && (
          <div className="flex flex-col gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-pos-line bg-pos-surface px-3 text-sm font-medium hover:bg-pos-page">
              {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => void upload(e.target.files?.[0])} />
            </label>
            {value && (
              <button type="button" className="text-left text-xs text-pos-muted underline" onClick={() => onChange('')}>
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <Panel>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-4 mt-1 text-sm leading-6 text-pos-muted">{text}</p>
      {children}
    </Panel>
  );
}
