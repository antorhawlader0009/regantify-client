import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Copy, Loader2, Save, Send } from 'lucide-react';
import {
  metaPixelApi,
  type DeferredPurchaseStatus,
  type MetaPixelEventMode,
  type MetaPixelSettings,
} from '../../../../lib/metaPixelApi';
import { getVendorDomain } from '../../../../lib/vendorApi';
import { storefrontStoreUrl } from '../../../../lib/storefrontUrl';
import { useAuthStore } from '../../../../store/authStore';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';

// The editable part of the page. Text fields are plain strings ('' =
// empty), so the form can be sent as-is: the server treats '' as "clear",
// except capiAccessToken, where '' means "keep the saved token".
interface FormState {
  pixelId: string;
  secondaryPixelId: string;
  eventMode: MetaPixelEventMode;
  imgTagTracking: boolean;
  domainVerificationCode: string;
  capiAccessToken: string;
  clearCapiToken: boolean;
  testEventCode: string;
  deferredPurchase: boolean;
  deferredPurchaseStatus: DeferredPurchaseStatus;
}

const DEFERRED_STATUSES: { value: DeferredPurchaseStatus; label: string }[] = [
  { value: 'PROCESSING', label: 'Processing (order confirmed)' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'COMPLETED', label: 'Completed (delivered)' },
];

function toForm(s: MetaPixelSettings): FormState {
  return {
    pixelId: s.pixelId ?? '',
    secondaryPixelId: s.secondaryPixelId ?? '',
    eventMode: s.eventMode,
    imgTagTracking: s.imgTagTracking,
    domainVerificationCode: s.domainVerificationCode ?? '',
    capiAccessToken: '',
    clearCapiToken: false,
    testEventCode: s.testEventCode ?? '',
    deferredPurchase: s.deferredPurchase,
    deferredPurchaseStatus: s.deferredPurchaseStatus,
  };
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white focus:outline-none focus:border-regantify-cta transition-colors disabled:bg-black/[0.03] disabled:text-regantify-text-muted';

/**
 * Store > Integrations > Facebook Pixel (Meta). See facebook-pixel.md in
 * the workspace root for how each setting is used on the storefront and
 * by the Conversions API.
 */
export default function FacebookPixel() {
  const queryClient = useQueryClient();
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const { data, isLoading } = useQuery({ queryKey: ['meta-pixel'], queryFn: metaPixelApi.get });
  const { data: customDomain } = useQuery({ queryKey: ['vendor-domain'], queryFn: getVendorDomain });
  const [form, setForm] = useState<FormState | null>(null);

  // Fill the form once; later refetches (e.g. after "Send test event")
  // only refresh the status lines, never unsaved edits. Save resets it
  // itself.
  useEffect(() => {
    if (data) setForm((prev) => prev ?? toForm(data));
  }, [data]);

  const save = useMutation({
    mutationFn: (value: FormState) =>
      metaPixelApi.update({
        pixelId: value.pixelId.replace(/\s/g, ''),
        secondaryPixelId: value.secondaryPixelId.replace(/\s/g, ''),
        eventMode: value.eventMode,
        imgTagTracking: value.imgTagTracking,
        domainVerificationCode: value.domainVerificationCode,
        ...(value.clearCapiToken
          ? { clearCapiToken: true }
          : value.capiAccessToken.trim()
            ? { capiAccessToken: value.capiAccessToken.trim() }
            : {}),
        testEventCode: value.testEventCode.trim(),
        deferredPurchase: value.deferredPurchase,
        deferredPurchaseStatus: value.deferredPurchaseStatus,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['meta-pixel'], updated);
      setForm(toForm(updated));
      toast.success('Facebook Pixel settings saved. Your storefront will reflect this shortly.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save Facebook Pixel settings. Please try again.')),
  });

  const sendTest = useMutation({
    mutationFn: metaPixelApi.sendTestEvent,
    onSuccess: () => {
      toast.success('Test event sent. Check Events Manager > Test events.');
      // Refresh the "last event sent / last error" line.
      queryClient.invalidateQueries({ queryKey: ['meta-pixel'] });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not send the test event.'));
      queryClient.invalidateQueries({ queryKey: ['meta-pixel'] });
    },
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  // Custom domain first: that's where Meta should fetch the feed from, and
  // what shoppers actually see.
  const feedUrl = customDomain
    ? `https://${customDomain}/feed/facebook-catalog`
    : subdomain
      ? `${storefrontStoreUrl(subdomain)}/feed/facebook-catalog`
      : '';

  // A token counts as "there" if one is saved and not being removed, or
  // one was just typed in. Deferred purchase can't work without one.
  const hasToken = form
    ? (!!data?.capiTokenSet && !form.clearCapiToken) || !!form.capiAccessToken.trim()
    : false;

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
        <h1 className="text-2xl font-semibold text-regantify-text">Facebook Pixel (Meta)</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Track visits, add-to-carts and purchases on your storefront for Facebook &amp; Instagram ads.
        </p>
      </div>

      {isLoading || !form || !data ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          {(data.capiTokenInvalid ||
            data.warnings.themeNotStorePal ||
            data.warnings.pixelCodeInCustomCode ||
            data.warnings.gdprPromptOff) && (
            <div className="space-y-2">
              {data.warnings.themeNotStorePal && (
                <Notice tone="warning">
                  The Facebook Pixel only works with the StorePal theme. Switch to it in{' '}
                  <Link to="/vendor/store/themes" className="underline">
                    Themes
                  </Link>{' '}
                  to start tracking.
                </Notice>
              )}
              {data.capiTokenInvalid && (
                <Notice tone="error">
                  Meta rejected your Conversions API access token, so server events are paused. Generate a new token in
                  Events Manager and paste it below.
                </Notice>
              )}
              {data.warnings.pixelCodeInCustomCode && (
                <Notice tone="warning">
                  Your{' '}
                  <Link to="/vendor/store/head-scripts" className="underline">
                    Custom Head Scripts
                  </Link>{' '}
                  or{' '}
                  <Link to="/vendor/store/javascript" className="underline">
                    JavaScript Code
                  </Link>{' '}
                  already contain Facebook Pixel code. Remove it once your Pixel ID is set here, or every event will be
                  counted twice.
                </Notice>
              )}
              {data.warnings.gdprPromptOff && (
                <Notice tone="warning">
                  The pixel uses cookies. Turn on the{' '}
                  <Link to="/vendor/store/gdpr" className="underline">
                    GDPR Prompt
                  </Link>{' '}
                  so visitors can give consent, as Bangladesh&apos;s data protection law and Meta&apos;s terms expect.
                </Notice>
              )}
            </div>
          )}

          <Section title="Catalog Feed">
            <Row
              label="Feed URL"
              hint="Use this link to import your product catalog into Meta Commerce Manager (Data sources > Data feed > Scheduled feed, daily). Public products with a photo are included; products with variants are listed per variant."
            >
              <div className="flex gap-2">
                <input type="text" value={feedUrl} readOnly className={`${inputClass} text-regantify-text-muted`} />
                <button
                  type="button"
                  disabled={!feedUrl}
                  onClick={() =>
                    navigator.clipboard.writeText(feedUrl).then(() => toast.success('Feed URL copied.'))
                  }
                  className="shrink-0 flex items-center gap-1.5 px-3.5 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-black/[0.03] transition-colors disabled:opacity-50"
                >
                  <Copy size={15} />
                  Copy
                </button>
              </div>
            </Row>
          </Section>

          <Section title="Meta Pixel">
            <Row label="Pixel ID" hint="Only the number, not the whole pixel code. Find it in Meta Events Manager.">
              <input
                type="text"
                name="meta-pixel-id"
                autoComplete="off"
                inputMode="numeric"
                value={form.pixelId}
                onChange={(e) => set('pixelId', e.target.value)}
                placeholder="e.g. 8605565812846437"
                className={inputClass}
              />
            </Row>

            <Row
              label="Event Trigger Method"
              hint='"StorePal Defined Events" sends product views, add-to-carts, checkouts and purchases with product details (best for catalog ads). Use "Automatic Events" only if the defined events cause problems in your ad account.'
            >
              <div className="space-y-2 pt-1">
                {(
                  [
                    { value: 'AUTOMATIC', label: 'Use Automatic Events' },
                    { value: 'STOREPAL_DEFINED', label: 'Use StorePal Defined Events' },
                  ] as const
                ).map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                    <input
                      type="radio"
                      name="eventMode"
                      checked={form.eventMode === opt.value}
                      onChange={() => set('eventMode', opt.value)}
                      className="accent-regantify-cta"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </Row>

            <Row
              label="Track without JS SDK"
              hint="Send events as lightweight image requests instead of loading Facebook's script. Faster, but Meta's automatic events and browser-side matching won't work."
            >
              <Toggle
                checked={form.imgTagTracking}
                onChange={(v) => set('imgTagTracking', v)}
                label="Track without JS SDK"
              />
            </Row>

            <Row
              label="Domain Verification Code"
              hint={
                customDomain ? (
                  <>
                    Paste the meta tag from Meta Business Settings &gt; Brand safety &gt; Domains (&quot;Meta-tag
                    verification&quot;) for <strong>{customDomain}</strong>, save, then click Verify in Meta.
                  </>
                ) : (
                  <>
                    Only works on your own domain: Meta can&apos;t verify a storepal subdomain.{' '}
                    <Link to="/vendor/store/domain" className="text-regantify-cta hover:underline">
                      Connect a custom domain
                    </Link>{' '}
                    first. Verification is optional; tracking works without it.
                  </>
                )
              }
            >
              <input
                type="text"
                name="meta-domain-verification"
                autoComplete="off"
                value={form.domainVerificationCode}
                onChange={(e) => set('domainVerificationCode', e.target.value)}
                placeholder='<meta name="facebook-domain-verification" content="..." />'
                className={inputClass}
              />
            </Row>

            <Row label="Secondary Pixel ID" hint="Optional. Every browser event is also sent to this pixel.">
              <input
                type="text"
                name="meta-secondary-pixel-id"
                autoComplete="off"
                inputMode="numeric"
                value={form.secondaryPixelId}
                onChange={(e) => set('secondaryPixelId', e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </Row>
          </Section>

          <Section title="Conversions API">
            <Row
              label="Access Token"
              hint={
                <>
                  Sends events from our server too, so ad blockers and iOS can&apos;t lose them. Events Manager &gt; your
                  pixel &gt; Settings &gt; Conversions API &gt; Generate access token. Don&apos;t also turn on Meta&apos;s
                  own one-click Conversions API, or events are counted twice.
                </>
              }
            >
              {data.capiTokenSet && !form.clearCapiToken && !form.capiAccessToken && (
                <p className="text-xs text-emerald-700 mb-1.5">
                  A token is saved. Paste a new one to replace it, or{' '}
                  <button type="button" onClick={() => set('clearCapiToken', true)} className="underline">
                    remove it
                  </button>
                  .
                </p>
              )}
              {form.clearCapiToken && (
                <p className="text-xs text-red-600 mb-1.5">
                  The saved token will be removed when you save.{' '}
                  <button type="button" onClick={() => set('clearCapiToken', false)} className="underline">
                    Undo
                  </button>
                </p>
              )}
              <input
                // Not type="password": Chrome then treats this page as a
                // login form and autofills the vendor's saved phone and
                // password into the Secondary Pixel ID and token fields.
                // The text is masked with CSS instead.
                type="text"
                name="meta-capi-access-token"
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                style={{ WebkitTextSecurity: 'disc' } as CSSProperties}
                value={form.capiAccessToken}
                disabled={form.clearCapiToken}
                onChange={(e) => set('capiAccessToken', e.target.value)}
                placeholder={data.capiTokenSet ? '••••••••••••••••' : 'Paste your access token'}
                className={inputClass}
              />
              {(data.capiLastSuccessAt || data.capiLastError) && (
                <p className="text-xs text-regantify-text-muted mt-1.5">
                  {data.capiLastSuccessAt && <>Last event sent {new Date(data.capiLastSuccessAt).toLocaleString()}. </>}
                  {data.capiLastError && <span className="text-red-600">Last error: {data.capiLastError}</span>}
                </p>
              )}
            </Row>

            <Row
              label="Test Event Code"
              hint="Optional. From Events Manager > Test events. While set, server events show up there for testing. Save, then Send test event to check your token. Clear it when you're done."
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  name="meta-test-event-code"
                  autoComplete="off"
                  value={form.testEventCode}
                  onChange={(e) => set('testEventCode', e.target.value)}
                  placeholder="TEST12345"
                  className={inputClass}
                />
                <button
                  type="button"
                  // Tests what's saved, not what's typed, so it's off until
                  // a token and test code are saved.
                  disabled={sendTest.isPending || !data.capiTokenSet || !data.testEventCode}
                  onClick={() => sendTest.mutate()}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-black/[0.03] transition-colors disabled:opacity-50"
                >
                  {sendTest.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Send test event
                </button>
              </div>
            </Row>
          </Section>

          <Section title="Deferred Purchase Events">
            <Row
              label="Enable Deferred Purchase Events"
              hint={
                hasToken
                  ? 'Purchase is sent to Facebook only when the order reaches the status below, so fake or cancelled COD orders never teach your ads the wrong buyers.'
                  : 'Needs a Conversions API access token (above), since these events are sent from our server.'
              }
            >
              <Toggle
                checked={form.deferredPurchase}
                disabled={!hasToken && !form.deferredPurchase}
                onChange={(v) => set('deferredPurchase', v)}
                label="Enable Deferred Purchase Events"
              />
            </Row>
            {form.deferredPurchase && (
              <Row
                label="Send Purchase when the order is"
                hint="Processing is recommended: Meta only credits an ad for purchases within 7 days of the click, and delivery can take longer."
              >
                <select
                  value={form.deferredPurchaseStatus}
                  onChange={(e) => set('deferredPurchaseStatus', e.target.value as DeferredPurchaseStatus)}
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-medium text-regantify-text mb-2">{title}</h2>
      <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint: ReactNode; children: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[1fr_18rem] gap-2 sm:gap-6 p-5">
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">{label}</label>
        {children}
      </div>
      <p className="text-sm text-regantify-text-muted sm:pt-7">{hint}</p>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`mt-1 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-regantify-cta' : 'bg-black/15'
      }`}
    >
      <span
        className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Notice({ tone, children }: { tone: 'warning' | 'error'; children: ReactNode }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
        tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
      }`}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
