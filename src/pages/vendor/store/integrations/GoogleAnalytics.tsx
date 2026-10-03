import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, Send } from 'lucide-react';
import {
  googleAnalyticsApi,
  type GaConsentMode,
  type GaDeferredPurchaseStatus,
  type GaPurchaseSource,
  type GoogleAnalyticsSettings,
} from '../../../../lib/googleAnalyticsApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { inputClass, LoadError, Notice, Row, Section, Toggle } from './IntegrationForm';

// The editable part of the page. Text fields are plain strings ('' =
// empty), so the form can be sent as-is: the server treats '' as "clear",
// except mpApiSecret, where '' means "keep the saved secret".
interface FormState {
  measurementId: string;
  secondaryMeasurementId: string;
  ecommerceEvents: boolean;
  consentMode: GaConsentMode;
  debugMode: boolean;
  mpApiSecret: string;
  clearMpApiSecret: boolean;
  purchaseSource: GaPurchaseSource;
  deferredPurchase: boolean;
  deferredPurchaseStatus: GaDeferredPurchaseStatus;
  sendRefunds: boolean;
}

const DEFERRED_STATUSES: { value: GaDeferredPurchaseStatus; label: string }[] = [
  { value: 'PROCESSING', label: 'Processing (order confirmed)' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'COMPLETED', label: 'Completed (delivered)' },
];

// What "StorePal ecommerce events" sends, shown in the hint so vendors
// know which GA4 reports will fill up.
const ECOMMERCE_EVENTS =
  'view_item, add_to_cart, remove_from_cart, view_cart, add_to_wishlist, search, begin_checkout, add_payment_info, purchase, sign_up and generate_lead';

function toForm(s: GoogleAnalyticsSettings): FormState {
  return {
    measurementId: s.measurementId ?? '',
    secondaryMeasurementId: s.secondaryMeasurementId ?? '',
    ecommerceEvents: s.ecommerceEvents,
    consentMode: s.consentMode,
    debugMode: s.debugMode,
    mpApiSecret: '',
    clearMpApiSecret: false,
    purchaseSource: s.purchaseSource,
    deferredPurchase: s.deferredPurchase,
    deferredPurchaseStatus: s.deferredPurchaseStatus,
    sendRefunds: s.sendRefunds,
  };
}

/**
 * Store > Integrations > Google Analytics 4. The browser tag is
 * storefront/src/lib/googleAnalytics.ts; server-side purchases and refunds
 * are server/src/store-settings/ga-measurement-protocol.service.ts.
 */
export default function GoogleAnalytics() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['google-analytics'],
    queryFn: googleAnalyticsApi.get,
  });
  const [form, setForm] = useState<FormState | null>(null);

  // Fill the form once; later refetches (e.g. after "Send test event")
  // only refresh the status lines, never unsaved edits. Save resets it
  // itself.
  useEffect(() => {
    if (data) setForm((prev) => prev ?? toForm(data));
  }, [data]);

  const save = useMutation({
    mutationFn: (value: FormState) =>
      googleAnalyticsApi.update({
        measurementId: value.measurementId.trim(),
        secondaryMeasurementId: value.secondaryMeasurementId.trim(),
        ecommerceEvents: value.ecommerceEvents,
        consentMode: value.consentMode,
        debugMode: value.debugMode,
        ...(value.clearMpApiSecret
          ? { clearMpApiSecret: true }
          : value.mpApiSecret.trim()
            ? { mpApiSecret: value.mpApiSecret.trim() }
            : {}),
        purchaseSource: value.purchaseSource,
        // Deferred purchase only exists for server-sent purchases.
        deferredPurchase: value.purchaseSource === 'SERVER' && value.deferredPurchase,
        deferredPurchaseStatus: value.deferredPurchaseStatus,
        sendRefunds: value.sendRefunds,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['google-analytics'], updated);
      setForm(toForm(updated));
      toast.success('Google Analytics settings saved. Your storefront will reflect this shortly.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save Google Analytics settings. Please try again.')),
  });

  const sendTest = useMutation({
    mutationFn: googleAnalyticsApi.sendTestEvent,
    onSuccess: () => {
      toast.success('Test event sent. Open GA4 > Admin > DebugView: "storepal_test" should appear within a minute.');
      // Refresh the "last event sent / last error" line.
      queryClient.invalidateQueries({ queryKey: ['google-analytics'] });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not send the test event.'));
      queryClient.invalidateQueries({ queryKey: ['google-analytics'] });
    },
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  // A secret counts as "there" if one is saved and not being removed, or
  // one was just typed in. Server purchases can't work without one.
  const hasSecret = form
    ? (!!data?.mpApiSecretSet && !form.clearMpApiSecret) || !!form.mpApiSecret.trim()
    : false;
  const serverPurchase = form?.purchaseSource === 'SERVER';

  // Removing the secret while purchases come from the server would leave
  // no purchase events at all, so that also switches purchases back to
  // the browser.
  const removeSecret = () =>
    setForm((prev) => (prev ? { ...prev, clearMpApiSecret: true, purchaseSource: 'BROWSER', deferredPurchase: false } : prev));

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          to="/vendor/store/integrations"
          className="inline-flex items-center gap-1.5 text-xs text-regantify-cta hover:underline mb-1"
        >
          <ArrowLeft size={14} />
          Integrations
        </Link>
        <h1 className="text-2xl font-semibold text-regantify-text">Google Analytics 4</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          See where your visitors come from, what they look at and what they buy.
        </p>
      </div>

      {isError && !data ? (
        <LoadError
          message={apiErrorMessage(error, 'Could not load your Google Analytics settings. Please try again.')}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : isLoading || !form || !data ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          {(data.warnings.themeNotStorePal || data.warnings.gtagCodeInCustomCode || data.warnings.gdprPromptOff) && (
            <div className="space-y-2">
              {data.warnings.themeNotStorePal && (
                <Notice tone="warning">
                  Google Analytics only works with the StorePal theme. Switch to it in{' '}
                  <Link to="/vendor/store/themes" className="underline">
                    Templates
                  </Link>{' '}
                  to start tracking.
                </Notice>
              )}
              {data.warnings.gtagCodeInCustomCode && (
                <Notice tone="warning">
                  Your{' '}
                  <Link to="/vendor/store/head-scripts" className="underline">
                    Custom Head Scripts
                  </Link>{' '}
                  or{' '}
                  <Link to="/vendor/store/javascript" className="underline">
                    JavaScript Code
                  </Link>{' '}
                  already contain Google Analytics (gtag.js) code. Remove it once your Measurement ID is set here, or
                  every page view will be counted twice.
                </Notice>
              )}
              {data.warnings.gdprPromptOff && (
                <Notice tone="warning">
                  Google Analytics uses cookies. Turn on the{' '}
                  <Link to="/vendor/store/gdpr" className="underline">
                    GDPR Prompt
                  </Link>{' '}
                  so visitors can give consent, as Bangladesh&apos;s data protection law and Google&apos;s policies
                  expect.
                </Notice>
              )}
            </div>
          )}

          <Section title="Google Analytics 4">
            <Row
              label="Measurement ID"
              hint={
                <>
                  Google Analytics &gt; Admin &gt; Data streams &gt; your web stream. You can paste the ID (G-XXXXXXXXXX)
                  or the whole Google tag code; we keep only the ID and add the tag to every page for you.
                </>
              }
            >
              <input
                type="text"
                name="ga-measurement-id"
                autoComplete="off"
                spellCheck={false}
                value={form.measurementId}
                onChange={(e) => set('measurementId', e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className={inputClass}
              />
            </Row>

            <Row
              label="Ecommerce Events"
              hint={`Sends ${ECOMMERCE_EVENTS} with product details, so GA4's Monetization reports (ecommerce purchases, checkout funnel, top products) work. Turn off to track page views only.`}
            >
              <Toggle
                checked={form.ecommerceEvents}
                onChange={(v) => set('ecommerceEvents', v)}
                label="Ecommerce Events"
              />
            </Row>

            <Row
              label="Secondary Measurement ID"
              hint="Optional. Every browser event is also sent to this GA4 property, e.g. your agency's or an older one."
            >
              <input
                type="text"
                name="ga-secondary-measurement-id"
                autoComplete="off"
                spellCheck={false}
                value={form.secondaryMeasurementId}
                onChange={(e) => set('secondaryMeasurementId', e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </Row>
          </Section>

          <Notice tone="info">
            Your store changes pages without reloading. In your web stream&apos;s Enhanced measurement settings, keep
            &quot;Page changes based on browser history events&quot; on (it is on by default) so every page view is
            counted.
          </Notice>

          <Section title="Consent">
            <Row
              label="Consent Mode"
              hint={
                data.warnings.gdprPromptOff
                  ? 'Only used while your GDPR Prompt is on. With it off, Google Analytics runs for every visitor.'
                  : 'Basic: nothing goes to Google until the visitor accepts your GDPR Prompt. Advanced: Google gets cookieless, anonymous pings before that and estimates the visitors who declined, so your reports miss less.'
              }
            >
              <div className="space-y-2 pt-1">
                {(
                  [
                    { value: 'BASIC', label: 'Basic (wait for consent)' },
                    { value: 'ADVANCED', label: 'Advanced (cookieless pings before consent)' },
                  ] as const
                ).map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                    <input
                      type="radio"
                      name="consentMode"
                      checked={form.consentMode === opt.value}
                      onChange={() => set('consentMode', opt.value)}
                      className="accent-regantify-cta"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </Row>
          </Section>

          <Section title="Server-side Tracking (Measurement Protocol)">
            <Row
              label="API Secret"
              hint={
                <>
                  Lets our server send purchases to Google directly, so ad blockers can&apos;t lose them. Admin &gt; Data
                  streams &gt; your web stream &gt; Measurement Protocol API secrets &gt; Create, then copy the
                  &quot;Secret value&quot;.
                </>
              }
            >
              {data.mpApiSecretSet && !form.clearMpApiSecret && !form.mpApiSecret && (
                <p className="text-xs text-emerald-700 mb-1.5">
                  A secret is saved. Paste a new one to replace it, or{' '}
                  <button type="button" onClick={removeSecret} className="underline">
                    remove it
                  </button>
                  .
                </p>
              )}
              {form.clearMpApiSecret && (
                <p className="text-xs text-red-600 mb-1.5">
                  The saved secret will be removed when you save, and purchases will be sent from the browser.{' '}
                  <button type="button" onClick={() => set('clearMpApiSecret', false)} className="underline">
                    Undo
                  </button>
                </p>
              )}
              <div className="flex gap-2">
                <input
                  // Not type="password": Chrome would treat the page as a
                  // login form and autofill the vendor's saved password
                  // (same as the Facebook Pixel page's token field).
                  type="text"
                  name="ga-mp-api-secret"
                  autoComplete="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  style={{ WebkitTextSecurity: 'disc' } as CSSProperties}
                  value={form.mpApiSecret}
                  disabled={form.clearMpApiSecret}
                  onChange={(e) => set('mpApiSecret', e.target.value)}
                  placeholder={data.mpApiSecretSet ? '••••••••••••••••' : 'Paste your API secret'}
                  className={inputClass}
                />
                <button
                  type="button"
                  // Tests what's saved, not what's typed.
                  disabled={sendTest.isPending || !data.mpApiSecretSet || !data.measurementId}
                  onClick={() => sendTest.mutate()}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-black/[0.03] transition-colors disabled:opacity-50"
                >
                  {sendTest.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Send test event
                </button>
              </div>
              {(data.mpLastSuccessAt || data.mpLastError) && (
                <p className="text-xs text-regantify-text-muted mt-1.5">
                  {data.mpLastSuccessAt && <>Last event sent {new Date(data.mpLastSuccessAt).toLocaleString()}. </>}
                  {data.mpLastError && <span className="text-red-600">Last error: {data.mpLastError}</span>}
                </p>
              )}
            </Row>

            <Row
              label="Send Purchase Events From"
              hint={
                hasSecret
                  ? 'Our server is recommended: ad blockers can\'t stop it, it also covers online payments, and it lets you use deferred purchases and refunds below. Purchases are never sent from both.'
                  : 'Sending from our server needs an API secret (above).'
              }
            >
              <div className="space-y-2 pt-1">
                {(
                  [
                    { value: 'BROWSER', label: "The shopper's browser (thank-you page)" },
                    { value: 'SERVER', label: 'Our server (Measurement Protocol)' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 text-sm text-regantify-text ${
                      opt.value === 'SERVER' && !hasSecret ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="purchaseSource"
                      checked={form.purchaseSource === opt.value}
                      disabled={opt.value === 'SERVER' && !hasSecret}
                      onChange={() => set('purchaseSource', opt.value)}
                      className="accent-regantify-cta"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </Row>

            {serverPurchase && (
              <>
                <Row
                  label="Deferred Purchase Events"
                  hint="Send the purchase only when the order reaches the status below, so fake or cancelled COD orders never show up as revenue."
                >
                  <Toggle
                    checked={form.deferredPurchase}
                    onChange={(v) => set('deferredPurchase', v)}
                    label="Deferred Purchase Events"
                  />
                </Row>
                {form.deferredPurchase && (
                  <Row
                    label="Send Purchase when the order is"
                    hint="Processing is recommended: GA4 only links a purchase to the visit it came from within about a day of that visit, and delivery usually takes longer."
                  >
                    <select
                      value={form.deferredPurchaseStatus}
                      onChange={(e) => set('deferredPurchaseStatus', e.target.value as GaDeferredPurchaseStatus)}
                      className={inputClass}
                    >
                      {DEFERRED_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </Row>
                )}
                <Row
                  label="Send Refunds"
                  hint="When an order whose purchase was already sent is Cancelled, Returned or Refunded, GA4 gets a refund for it, so your revenue report matches real sales."
                >
                  <Toggle checked={form.sendRefunds} onChange={(v) => set('sendRefunds', v)} label="Send Refunds" />
                </Row>
              </>
            )}
          </Section>

          <Section title="Testing">
            <Row
              label="Debug Mode"
              hint="Shows your store's events live in GA4 > Admin > DebugView while you check your setup. Turn it off when you're done."
            >
              <Toggle checked={form.debugMode} onChange={(v) => set('debugMode', v)} label="Debug Mode" />
            </Row>
          </Section>

          <button
            onClick={() => save.mutate(form)}
            disabled={save.isPending}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
              text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}
