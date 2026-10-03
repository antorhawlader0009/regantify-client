import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Loader2, Save } from 'lucide-react';
import { metaPixelApi, type MetaPixelEventMode, type MetaPixelSettings } from '../../../../lib/metaPixelApi';
import { getVendorDomain } from '../../../../lib/vendorApi';
import { storefrontStoreUrl } from '../../../../lib/storefrontUrl';
import { useAuthStore } from '../../../../store/authStore';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { inputClass, LoadError, Notice, Row, Section, Toggle } from './IntegrationForm';

// The pixel half of MetaPixelSettings (the Conversions API half is on
// MetaConversionsApi.tsx; both pages read and save the same settings, each
// sending only its own fields). Text fields are plain strings ('' =
// empty), so the form can be sent as-is: the server treats '' as "clear".
interface FormState {
  pixelId: string;
  secondaryPixelId: string;
  eventMode: MetaPixelEventMode;
  imgTagTracking: boolean;
  domainVerificationCode: string;
}

function toForm(s: MetaPixelSettings): FormState {
  return {
    pixelId: s.pixelId ?? '',
    secondaryPixelId: s.secondaryPixelId ?? '',
    eventMode: s.eventMode,
    imgTagTracking: s.imgTagTracking,
    domainVerificationCode: s.domainVerificationCode ?? '',
  };
}

/**
 * Store > Integrations > Facebook Pixel (Meta). See facebook-pixel.md in
 * the workspace root for how each setting is used on the storefront. The
 * Conversions API and Deferred Purchase Events are their own page,
 * MetaConversionsApi.tsx.
 */
export default function FacebookPixel() {
  const queryClient = useQueryClient();
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['meta-pixel'],
    queryFn: metaPixelApi.get,
  });
  const { data: customDomain } = useQuery({ queryKey: ['vendor-domain'], queryFn: getVendorDomain });
  const [form, setForm] = useState<FormState | null>(null);

  // Fill the form once; later refetches never overwrite unsaved edits.
  // Save resets it itself.
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
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['meta-pixel'], updated);
      setForm(toForm(updated));
      toast.success('Facebook Pixel settings saved. Your storefront will reflect this shortly.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save Facebook Pixel settings. Please try again.')),
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

      {isError && !data ? (
        <LoadError
          message={apiErrorMessage(error, 'Could not load your Facebook Pixel settings. Please try again.')}
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
            data.warnings.pixelCodeInCustomCode ||
            data.warnings.gdprPromptOff) && (
            <div className="space-y-2">
              {data.warnings.themeNotStorePal && (
                <Notice tone="warning">
                  The Facebook Pixel only works with the StorePal theme. Switch to it in{' '}
                  <Link to="/vendor/store/themes" className="underline">
                    Templates
                  </Link>{' '}
                  to start tracking.
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
              hint="Send events as lightweight image requests instead of loading Facebook's script. Faster, but Meta's automatic events and browser-side matching won't work, and pixel helper extensions (Meta Pixel Helper, Pixel Helper Pro) can't see these events. Check them in Events Manager instead."
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

          <Notice tone="info">
            Send these events from our server too, so ad blockers and iOS can&apos;t lose them, and send Purchase only
            for confirmed orders: set up the{' '}
            <Link to="/vendor/store/integrations/meta-conversions-api" className="underline">
              Meta Conversions API
            </Link>
            .
          </Notice>

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
