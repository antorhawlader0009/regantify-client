import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, Send } from 'lucide-react';
import { metaPixelApi, type DeferredPurchaseStatus, type MetaPixelSettings } from '../../../../lib/metaPixelApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { inputClass, LoadError, Notice, Row, Section, Toggle } from './IntegrationForm';

// The Conversions API half of MetaPixelSettings (the pixel half is on
// FacebookPixel.tsx; both pages read and save the same settings, each
// sending only its own fields). capiAccessToken '' means "keep the saved
// token"; clearCapiToken removes it.
interface FormState {
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
    capiAccessToken: '',
    clearCapiToken: false,
    testEventCode: s.testEventCode ?? '',
    deferredPurchase: s.deferredPurchase,
    deferredPurchaseStatus: s.deferredPurchaseStatus,
  };
}

/**
 * Store > Integrations > Meta Conversions API — server-to-server copies of
 * the Facebook Pixel's events, plus Deferred Purchase Events (see
 * server/src/store-settings/meta-capi.service.ts). Its own page, but the
 * same MetaPixelSettings row and routes as the Facebook Pixel page, since
 * the Conversions API sends to that pixel.
 */
export default function MetaConversionsApi() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['meta-pixel'],
    queryFn: metaPixelApi.get,
  });
  const [form, setForm] = useState<FormState | null>(null);

  // Fill the form once; later refetches (e.g. after "Send test event")
  // only refresh the status lines, never unsaved edits.
  useEffect(() => {
    if (data) setForm((prev) => prev ?? toForm(data));
  }, [data]);

  const save = useMutation({
    mutationFn: (value: FormState) =>
      metaPixelApi.update({
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
      toast.success('Conversions API settings saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save Conversions API settings. Please try again.')),
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

  // A token counts as "there" if one is saved and not being removed, or
  // one was just typed in. Deferred purchase can't work without one.
  const hasToken = form
    ? (!!data?.capiTokenSet && !form.clearCapiToken) || !!form.capiAccessToken.trim()
    : false;

  // Removing the token also turns deferred purchase off, since the server
  // could no longer send it.
  const removeToken = () =>
    setForm((prev) => (prev ? { ...prev, clearCapiToken: true, deferredPurchase: false } : prev));

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
        <h1 className="text-2xl font-semibold text-regantify-text">Meta Conversions API</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Send your store&apos;s events to Meta from our server too, so ad blockers and iOS can&apos;t lose them.
        </p>
      </div>

      {isError && !data ? (
        <LoadError
          message={apiErrorMessage(error, 'Could not load your Conversions API settings. Please try again.')}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : isLoading || !form || !data ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          {(!data.pixelId || data.capiTokenInvalid || data.warnings.themeNotStorePal) && (
            <div className="space-y-2">
              {!data.pixelId && (
                <Notice tone="warning">
                  The Conversions API sends events to your Facebook Pixel. Add your Pixel ID in{' '}
                  <Link to="/vendor/store/integrations/facebook-pixel" className="underline">
                    Facebook Pixel (Meta)
                  </Link>{' '}
                  first.
                </Notice>
              )}
              {data.warnings.themeNotStorePal && (
                <Notice tone="warning">
                  The Conversions API only works with the StorePal theme. Switch to it in{' '}
                  <Link to="/vendor/store/themes" className="underline">
                    Themes
                  </Link>
                  .
                </Notice>
              )}
              {data.capiTokenInvalid && (
                <Notice tone="error">
                  Meta rejected your access token, so server events are paused. Generate a new token in Events Manager
                  and paste it below.
                </Notice>
              )}
            </div>
          )}

          <Section title="Conversions API">
            <Row
              label="Access Token"
              hint={
                <>
                  Events Manager &gt; your pixel &gt; Settings &gt; Conversions API &gt; Generate access token.
                  Don&apos;t also turn on Meta&apos;s own one-click Conversions API, or events are counted twice.
                </>
              }
            >
              {data.capiTokenSet && !form.clearCapiToken && !form.capiAccessToken && (
                <p className="text-xs text-emerald-700 mb-1.5">
                  A token is saved. Paste a new one to replace it, or{' '}
                  <button type="button" onClick={removeToken} className="underline">
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
                // login form and autofills the vendor's saved password
                // into it. The text is masked with CSS instead.
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
                  : 'Needs an access token (above), since these events are sent from our server.'
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
