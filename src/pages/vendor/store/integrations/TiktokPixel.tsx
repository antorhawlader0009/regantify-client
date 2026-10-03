import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, Send } from 'lucide-react';
import type { DeferredPurchaseStatus } from '../../../../lib/metaPixelApi';
import { tiktokPixelApi, type TiktokPixelSettings } from '../../../../lib/tiktokPixelApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { inputClass, LoadError, Notice, Row, Section, Toggle } from './IntegrationForm';

// The editable part of the page. Text fields are plain strings ('' =
// empty), sent as-is: the server treats '' as "clear", except
// eventsApiToken, where '' means "keep the saved token".
interface FormState {
  pixelId: string;
  ecommerceEvents: boolean;
  advancedMatching: boolean;
  eventsApiToken: string;
  clearEventsApiToken: boolean;
  testEventCode: string;
  deferredPurchase: boolean;
  deferredPurchaseStatus: DeferredPurchaseStatus;
}

const DEFERRED_STATUSES: { value: DeferredPurchaseStatus; label: string }[] = [
  { value: 'PROCESSING', label: 'Processing (order confirmed)' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'COMPLETED', label: 'Completed (delivered)' },
];

function toForm(s: TiktokPixelSettings): FormState {
  return {
    pixelId: s.pixelId ?? '',
    ecommerceEvents: s.ecommerceEvents,
    advancedMatching: s.advancedMatching,
    eventsApiToken: '',
    clearEventsApiToken: false,
    testEventCode: s.testEventCode ?? '',
    deferredPurchase: s.deferredPurchase,
    deferredPurchaseStatus: s.deferredPurchaseStatus,
  };
}

/**
 * Store > Integrations > TikTok Pixel. The browser pixel is
 * storefront/src/lib/tiktokPixel.ts; the Events API is
 * server/src/store-settings/tiktok-events-api.service.ts.
 */
export default function TiktokPixel() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['tiktok-pixel'],
    queryFn: tiktokPixelApi.get,
  });
  const [form, setForm] = useState<FormState | null>(null);

  // Fill the form once; later refetches (e.g. after "Send test event")
  // only refresh the status lines, never unsaved edits.
  useEffect(() => {
    if (data) setForm((prev) => prev ?? toForm(data));
  }, [data]);

  const save = useMutation({
    mutationFn: (value: FormState) =>
      tiktokPixelApi.update({
        pixelId: value.pixelId.trim(),
        ecommerceEvents: value.ecommerceEvents,
        advancedMatching: value.advancedMatching,
        ...(value.clearEventsApiToken
          ? { clearEventsApiToken: true }
          : value.eventsApiToken.trim()
            ? { eventsApiToken: value.eventsApiToken.trim() }
            : {}),
        testEventCode: value.testEventCode.trim(),
        deferredPurchase: value.deferredPurchase,
        deferredPurchaseStatus: value.deferredPurchaseStatus,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['tiktok-pixel'], updated);
      setForm(toForm(updated));
      toast.success('TikTok Pixel settings saved. Your storefront will reflect this shortly.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save TikTok Pixel settings. Please try again.')),
  });

  const sendTest = useMutation({
    mutationFn: tiktokPixelApi.sendTestEvent,
    onSuccess: () => {
      toast.success('Test event sent. Check TikTok Events Manager > your pixel > Test Events.');
      queryClient.invalidateQueries({ queryKey: ['tiktok-pixel'] });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not send the test event.'));
      queryClient.invalidateQueries({ queryKey: ['tiktok-pixel'] });
    },
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  // A token counts as "there" if one is saved and not being removed, or
  // one was just typed in. Deferred purchase can't work without one.
  const hasToken = form
    ? (!!data?.eventsApiTokenSet && !form.clearEventsApiToken) || !!form.eventsApiToken.trim()
    : false;

  // Removing the token also turns deferred purchase off, since the server
  // could no longer send it.
  const removeToken = () =>
    setForm((prev) => (prev ? { ...prev, clearEventsApiToken: true, deferredPurchase: false } : prev));

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
        <h1 className="text-2xl font-semibold text-regantify-text">TikTok Pixel</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Measure TikTok ad results, optimize for purchases and build audiences from your store visitors.
        </p>
      </div>

      {isError && !data ? (
        <LoadError
          message={apiErrorMessage(error, 'Could not load your TikTok Pixel settings. Please try again.')}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : isLoading || !form || !data ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          {(data.eventsApiTokenInvalid ||
            data.warnings.themeNotStorePal ||
            data.warnings.pixelCodeInCustomCode ||
            data.warnings.gdprPromptOff) && (
            <div className="space-y-2">
              {data.warnings.themeNotStorePal && (
                <Notice tone="warning">
                  The TikTok Pixel only works with the StorePal theme. Switch to it in{' '}
                  <Link to="/vendor/store/themes" className="underline">
                    Templates
                  </Link>{' '}
                  to start tracking.
                </Notice>
              )}
              {data.eventsApiTokenInvalid && (
                <Notice tone="error">
                  TikTok rejected your Events API access token, so server events are paused. Generate a new token in
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
                  already contain TikTok Pixel code. Remove it once your Pixel ID is set here, or every event will be
                  counted twice.
                </Notice>
              )}
              {data.warnings.gdprPromptOff && (
                <Notice tone="warning">
                  The pixel uses cookies. Turn on the{' '}
                  <Link to="/vendor/store/gdpr" className="underline">
                    GDPR Prompt
                  </Link>{' '}
                  so visitors can give consent, as Bangladesh&apos;s data protection law and TikTok&apos;s terms
                  expect.
                </Notice>
              )}
            </div>
          )}

          <Section title="TikTok Pixel">
            <Row
              label="Pixel ID"
              hint="TikTok Ads Manager > Tools > Events Manager > Web, under your pixel's name. You can paste the ID or TikTok's whole base code; we keep only the ID and add the pixel to every page for you."
            >
              <input
                type="text"
                name="tiktok-pixel-id"
                autoComplete="off"
                spellCheck={false}
                value={form.pixelId}
                onChange={(e) => set('pixelId', e.target.value)}
                placeholder="e.g. C1A2B3C4D5E6F7G8H9I0"
                className={inputClass}
              />
            </Row>

            <Row
              label="Ecommerce Events"
              hint="Sends ViewContent, AddToCart, AddToWishlist, Search, InitiateCheckout, AddPaymentInfo, Purchase, CompleteRegistration and Lead with product details, so you can optimize ads for purchases. Turn off to track page views only."
            >
              <Toggle checked={form.ecommerceEvents} onChange={(v) => set('ecommerceEvents', v)} label="Ecommerce Events" />
            </Row>

            <Row
              label="Advanced Matching"
              hint="On purchase, shares the buyer's email and phone with TikTok as SHA-256 hashes, so more sales are matched to the ads that brought them. Also turn on Advanced Matching in your pixel's settings in Events Manager."
            >
              <Toggle
                checked={form.advancedMatching}
                disabled={!form.ecommerceEvents}
                onChange={(v) => set('advancedMatching', v)}
                label="Advanced Matching"
              />
            </Row>
          </Section>

          <Notice tone="info">
            Landing pages can use a different pixel: set it in the landing page builder under Settings &gt; TikTok Pixel
            ID. Pages without one use this pixel.
          </Notice>

          <Section title="Events API">
            <Row
              label="Access Token"
              hint={
                <>
                  Sends purchases from our server too, so ad blockers and iOS can&apos;t lose them (TikTok keeps one
                  copy). Events Manager &gt; your pixel &gt; Settings &gt; Events API &gt; Generate Access Token.
                </>
              }
            >
              {data.eventsApiTokenSet && !form.clearEventsApiToken && !form.eventsApiToken && (
                <p className="text-xs text-emerald-700 mb-1.5">
                  A token is saved. Paste a new one to replace it, or{' '}
                  <button type="button" onClick={removeToken} className="underline">
                    remove it
                  </button>
                  .
                </p>
              )}
              {form.clearEventsApiToken && (
                <p className="text-xs text-red-600 mb-1.5">
                  The saved token will be removed when you save.{' '}
                  <button type="button" onClick={() => set('clearEventsApiToken', false)} className="underline">
                    Undo
                  </button>
                </p>
              )}
              <input
                // Not type="password": Chrome would treat the page as a
                // login form and autofill the vendor's saved password
                // (same as the Facebook Pixel page's token field).
                type="text"
                name="tiktok-events-api-token"
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                style={{ WebkitTextSecurity: 'disc' } as CSSProperties}
                value={form.eventsApiToken}
                disabled={form.clearEventsApiToken}
                onChange={(e) => set('eventsApiToken', e.target.value)}
                placeholder={data.eventsApiTokenSet ? '••••••••••••••••' : 'Paste your access token'}
                className={inputClass}
              />
              {(data.eventsApiLastSuccessAt || data.eventsApiLastError) && (
                <p className="text-xs text-regantify-text-muted mt-1.5">
                  {data.eventsApiLastSuccessAt && (
                    <>Last event sent {new Date(data.eventsApiLastSuccessAt).toLocaleString()}. </>
                  )}
                  {data.eventsApiLastError && <span className="text-red-600">Last error: {data.eventsApiLastError}</span>}
                </p>
              )}
            </Row>

            <Row
              label="Test Event Code"
              hint="Optional. From Events Manager > your pixel > Test Events. While set, server events show up there for testing and aren't counted. Save, then Send test event to check your token. Clear it when you're done."
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  name="tiktok-test-event-code"
                  autoComplete="off"
                  value={form.testEventCode}
                  onChange={(e) => set('testEventCode', e.target.value)}
                  placeholder="TEST12345"
                  className={inputClass}
                />
                <button
                  type="button"
                  // Tests what's saved, not what's typed.
                  disabled={sendTest.isPending || !data.eventsApiTokenSet || !data.testEventCode}
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
                  ? 'Purchase is sent to TikTok only when the order reaches the status below, so fake or cancelled COD orders never teach your ads the wrong buyers.'
                  : 'Needs an Events API access token (above), since these events are sent from our server.'
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
                hint="Processing is recommended: TikTok credits an ad only for purchases within its attribution window (7 days after a click by default), and delivery can take longer."
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
