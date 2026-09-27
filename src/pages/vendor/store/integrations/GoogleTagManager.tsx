import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import type { GaConsentMode } from '../../../../lib/googleAnalyticsApi';
import { googleTagManagerApi, type GoogleTagManagerSettings } from '../../../../lib/googleTagManagerApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { inputClass, LoadError, Notice, Row, Section, Toggle } from './IntegrationForm';

// The editable part of the page. Text fields are plain strings ('' =
// empty), sent as-is: the server treats '' as "clear".
interface FormState {
  containerId: string;
  ecommerceEvents: boolean;
  customerData: boolean;
  consentMode: GaConsentMode;
  serverContainerUrl: string;
}

function toForm(s: GoogleTagManagerSettings): FormState {
  return {
    containerId: s.containerId ?? '',
    ecommerceEvents: s.ecommerceEvents,
    customerData: s.customerData,
    consentMode: s.consentMode,
    serverContainerUrl: s.serverContainerUrl ?? '',
  };
}

// What the storefront pushes to the dataLayer, so vendors know which
// Custom Event triggers and Data Layer Variables to create in GTM (see
// storefront/src/lib/ecommerceEvents.ts and googleTagManager.ts).
const ECOMMERCE_EVENTS = [
  'view_item',
  'add_to_cart',
  'remove_from_cart',
  'view_cart',
  'add_to_wishlist',
  'begin_checkout',
  'add_payment_info',
  'purchase',
];
const OTHER_EVENTS = ['search', 'sign_up', 'generate_lead', 'virtual_page_view', 'cookie_consent_granted'];

/**
 * Store > Integrations > Google Tag Manager. The browser side is
 * storefront/src/lib/googleTagManager.ts.
 */
export default function GoogleTagManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['google-tag-manager'],
    queryFn: googleTagManagerApi.get,
  });
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (data) setForm((prev) => prev ?? toForm(data));
  }, [data]);

  const save = useMutation({
    mutationFn: (value: FormState) =>
      googleTagManagerApi.update({
        containerId: value.containerId.trim(),
        ecommerceEvents: value.ecommerceEvents,
        customerData: value.customerData,
        consentMode: value.consentMode,
        serverContainerUrl: value.serverContainerUrl.trim(),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['google-tag-manager'], updated);
      setForm(toForm(updated));
      toast.success('Google Tag Manager settings saved. Your storefront will reflect this shortly.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save Google Tag Manager settings. Please try again.')),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

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
        <h1 className="text-2xl font-semibold text-regantify-text">Google Tag Manager</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Manage all your tracking tags (Google Analytics, Google Ads, Meta, TikTok...) from one Tag Manager container.
        </p>
      </div>

      {isError && !data ? (
        <LoadError
          message={apiErrorMessage(error, 'Could not load your Google Tag Manager settings. Please try again.')}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : isLoading || !form || !data ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          {(data.warnings.themeNotStorePal ||
            data.warnings.gtmCodeInCustomCode ||
            data.warnings.gdprPromptOff ||
            data.warnings.googleAnalyticsOn) && (
            <div className="space-y-2">
              {data.warnings.themeNotStorePal && (
                <Notice tone="warning">
                  Google Tag Manager only works with the StorePal theme. Switch to it in{' '}
                  <Link to="/vendor/store/themes" className="underline">
                    Themes
                  </Link>{' '}
                  to start tracking.
                </Notice>
              )}
              {data.warnings.gtmCodeInCustomCode && (
                <Notice tone="warning">
                  Your{' '}
                  <Link to="/vendor/store/head-scripts" className="underline">
                    Custom Head Scripts
                  </Link>{' '}
                  or{' '}
                  <Link to="/vendor/store/javascript" className="underline">
                    JavaScript Code
                  </Link>{' '}
                  already contain Google Tag Manager code. Remove it once your Container ID is set here, or the
                  container will load twice.
                </Notice>
              )}
              {data.warnings.gdprPromptOff && (
                <Notice tone="warning">
                  Most tags in a container use cookies. Turn on the{' '}
                  <Link to="/vendor/store/gdpr" className="underline">
                    GDPR Prompt
                  </Link>{' '}
                  so visitors can give consent, as Bangladesh&apos;s data protection law and Google&apos;s policies
                  expect.
                </Notice>
              )}
              {data.warnings.googleAnalyticsOn && (
                <Notice tone="info">
                  <Link to="/vendor/store/integrations/google-analytics" className="underline">
                    Google Analytics 4
                  </Link>{' '}
                  is also set up on your store. Don&apos;t add a GA4 tag for the same property in this container, or
                  every visit and sale will be counted twice.
                </Notice>
              )}
            </div>
          )}

          <Section title="Google Tag Manager">
            <Row
              label="Container ID"
              hint={
                <>
                  Shown at the top of your Tag Manager workspace, next to the container name. You can paste the ID
                  (GTM-XXXXXXX) or either code snippet from Tag Manager; we keep only the ID and add the container to
                  every page for you.
                </>
              }
            >
              <input
                type="text"
                name="gtm-container-id"
                autoComplete="off"
                spellCheck={false}
                value={form.containerId}
                onChange={(e) => set('containerId', e.target.value)}
                placeholder="GTM-XXXXXXX"
                className={inputClass}
              />
            </Row>

            <Row
              label="Ecommerce Data Layer"
              hint="Pushes your store's events to the dataLayer in Google Analytics 4 ecommerce format, with product details, so you can fire any tag on them without writing code. Turn off if your container doesn't use them."
            >
              <Toggle
                checked={form.ecommerceEvents}
                onChange={(v) => set('ecommerceEvents', v)}
                label="Ecommerce Data Layer"
              />
            </Row>

            <Row
              label="Customer Data on Purchase"
              hint="Adds the buyer's email, phone and name to the purchase event as SHA-256 hashes (Google's user_data format), for Google Ads enhanced conversions and server-side Meta Conversions API tags. Only hashes are shared, never the plain details."
            >
              <Toggle
                checked={form.customerData}
                disabled={!form.ecommerceEvents}
                onChange={(v) => set('customerData', v)}
                label="Customer Data on Purchase"
              />
            </Row>
          </Section>

          {form.ecommerceEvents && (
            <Notice tone="info">
              In Tag Manager, create a Custom Event trigger with one of these event names:{' '}
              <span className="font-mono text-xs">{ECOMMERCE_EVENTS.join(', ')}</span> (product data in{' '}
              <span className="font-mono text-xs">ecommerce</span>), and{' '}
              <span className="font-mono text-xs">{OTHER_EVENTS.join(', ')}</span>. For GA4 ecommerce tags, tick
              &quot;Send Ecommerce data&quot; with Data source &quot;Data Layer&quot;.
            </Notice>
          )}

          <Section title="Consent">
            <Row
              label="Consent Mode"
              hint={
                data.warnings.gdprPromptOff
                  ? 'Only used while your GDPR Prompt is on. With it off, the container runs for every visitor.'
                  : 'Basic: the container loads only after the visitor accepts your GDPR Prompt. Advanced: it loads right away with Google consent denied, so Google tags send cookieless pings until they accept. Either way, accepting pushes a cookie_consent_granted event.'
              }
            >
              <div className="space-y-2 pt-1">
                {(
                  [
                    { value: 'BASIC', label: 'Basic (wait for consent)' },
                    { value: 'ADVANCED', label: 'Advanced (load with consent denied)' },
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

          <Section title="Server-side Tagging">
            <Row
              label="Tagging Server URL"
              hint="Optional. If you run a server-side GTM container (e.g. on Stape) on your own subdomain, enter its URL and the container will load from there instead of Google, so ad blockers are less likely to stop it."
            >
              <input
                type="text"
                name="gtm-server-url"
                autoComplete="off"
                spellCheck={false}
                value={form.serverContainerUrl}
                onChange={(e) => set('serverContainerUrl', e.target.value)}
                placeholder="https://sgtm.yourdomain.com"
                className={inputClass}
              />
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
