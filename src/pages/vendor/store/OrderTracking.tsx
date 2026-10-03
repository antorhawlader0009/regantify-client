import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, RotateCcw, Save } from 'lucide-react';
import {
  storeSettingsApi,
  type TrackingNotifyEvent,
  type TrackingNotifyEventName,
  type TrackingNotifySettings,
} from '../../../lib/storeSettingsApi';
import { smsApi } from '../../../lib/smsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Checkbox } from '../../../components/ui/Checkbox';

// Store > Order Tracking (tracking-plan.md Step 5): which texts a shopper gets as their order moves,
// and their wording. Every text costs SMS credits, so each one is off until the owner turns it on.

const SAMPLE = {
  '{store}': 'Your Store',
  '{order}': 'FAS-261003-7K3M9QD',
  '{link}': 'https://yourstore.com/t/aB3dE5gH7jK9',
  '{courier}': 'Pathao',
  '{tracking_id}': 'PTH1234567',
  '{amount}': '1060',
  '{expected}': 'Expected by Tue 6 Oct.',
} as const;

// Same rule as the server's SmsService.estimateSmsCount: plain GSM text is 160 characters per
// message (153 when it takes several), anything else (Bangla) is 70 (67).
// eslint-disable-next-line no-control-regex
const GSM = /^[\x00-\x7F£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./0-9:;<=>?¡A-Z¿a-zÄÖÑÜ§äöñüà]*$/;
function segments(message: string): { count: number; unicode: boolean } {
  const unicode = !GSM.test(message);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return { count: message.length <= single ? 1 : Math.ceil(message.length / multi), unicode };
}

function preview(text: string): string {
  return text
    .replace(/\{(store|order|link|courier|tracking_id|amount|expected)\}/g, (m) => SAMPLE[m as keyof typeof SAMPLE] ?? m)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();
}

interface Draft {
  enabled: boolean;
  /** The vendor's own wording; null means the built-in text for the chosen language. */
  text: string | null;
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors';

function EventCard({
  event,
  language,
  draft,
  variables,
  maxLength,
  onChange,
}: {
  event: TrackingNotifyEvent;
  language: 'en' | 'bn';
  draft: Draft;
  variables: string[];
  maxLength: number;
  onChange: (next: Draft) => void;
}) {
  const builtIn = event.defaultText[language];
  const value = draft.text ?? builtIn;
  const rendered = preview(value);
  const { count, unicode } = segments(rendered);

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <Checkbox checked={draft.enabled} onChange={(enabled) => onChange({ ...draft, enabled })} label={event.label} />
        {draft.text !== null && (
          <button
            type="button"
            onClick={() => onChange({ ...draft, text: null })}
            className="inline-flex items-center gap-1 text-xs text-regantify-text-muted hover:text-regantify-text"
          >
            <RotateCcw size={12} />
            Use the built-in text
          </button>
        )}
      </div>

      <div className={`mt-3 ${draft.enabled ? '' : 'opacity-60'}`}>
        <textarea
          rows={3}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange({ ...draft, text: e.target.value === builtIn ? null : e.target.value })}
          className={inputClass}
          aria-label={`${event.label} text`}
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...draft, text: `${value}${value.endsWith(' ') ? '' : ' '}${v}` })}
              className="rounded-md border border-black/10 px-1.5 py-0.5 font-mono text-[11px] text-regantify-text-muted hover:bg-regantify-content"
            >
              {v}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-regantify-content px-3.5 py-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-regantify-text-muted">
            <MessageSquare size={12} />
            What your customer sees
          </p>
          <p className="mt-1 break-words text-sm text-regantify-text">{rendered || ' '}</p>
          <p className="mt-1.5 text-xs text-regantify-text-muted">
            {rendered.length} characters, {count} {count === 1 ? 'SMS credit' : 'SMS credits'} each
            {unicode ? ' (Bangla and other non-English letters use 70 characters per message)' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrderTracking() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['tracking-notify-settings'], queryFn: storeSettingsApi.getTrackingNotify });
  const credits = useQuery({ queryKey: ['sms-credits'], queryFn: smsApi.getCredits });

  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [quietHours, setQuietHours] = useState(true);
  const [stalledHours, setStalledHours] = useState('48');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const load = (settings: TrackingNotifySettings) => {
    setLanguage(settings.language);
    setQuietHours(settings.quietHours);
    setStalledHours(String(settings.stalledAfterHours));
    setDrafts(Object.fromEntries(settings.events.map((e) => [e.event, { enabled: e.enabled, text: e.custom ? e.text : null }])));
  };
  useEffect(() => {
    if (data) load(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      storeSettingsApi.updateTrackingNotify({
        language,
        quietHours,
        stalledAfterHours: Math.min(336, Math.max(6, Math.round(Number(stalledHours)) || 48)),
        events: Object.fromEntries(Object.entries(drafts).map(([event, d]) => [event, { enabled: d.enabled, text: d.text }])) as Partial<
          Record<TrackingNotifyEventName, { enabled: boolean; text: string | null }>
        >,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['tracking-notify-settings'], updated);
      load(updated);
      toast.success('Order tracking texts saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  const enabledCount = useMemo(() => Object.values(drafts).filter((d) => d.enabled).length, [drafts]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Order Tracking</h1>
        <p className="mt-1 text-sm text-regantify-text-muted">
          Text your customers as their order moves, so they stop asking where it is. Every text uses SMS credits, and each one is off until you turn it on.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center rounded-2xl border border-black/5 bg-white p-8">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-black/5 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-regantify-text">
                SMS credits left: <span className="font-semibold">{credits.data ? credits.data.smsCredits : '...'}</span>
                {credits.data && credits.data.smsCredits === 0 && enabledCount > 0 && (
                  <span className="ml-2 text-regantify-text-muted">Texts are skipped while you have none.</span>
                )}
              </p>
              <Link to="/vendor/sms" className="text-regantify-cta hover:underline">
                Buy SMS credits
              </Link>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-regantify-text">Language of the built-in texts</p>
              <div className="inline-flex overflow-hidden rounded-xl border border-black/10">
                {(['en', 'bn'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguage(l)}
                    aria-pressed={language === l}
                    className={`px-4 py-2 text-sm font-medium ${language === l ? 'bg-regantify-cta text-white' : 'text-regantify-text hover:bg-regantify-content'}`}
                  >
                    {l === 'en' ? 'English' : 'Bangla'}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-regantify-text-muted">Texts you have written yourself stay as you wrote them.</p>
            </div>

            <Checkbox
              checked={quietHours}
              onChange={setQuietHours}
              label="Quiet hours: no texts between 9 pm and 8 am"
              hint="A text that comes up at night waits and goes out at 8 am (Bangladesh time)."
            />

            <div>
              <label htmlFor="stalled-hours" className="mb-1.5 block text-sm font-medium text-regantify-text">
                Flag a parcel as stalled after (hours)
              </label>
              <input
                id="stalled-hours"
                type="number"
                min={6}
                max={336}
                step={1}
                value={stalledHours}
                onChange={(e) => setStalledHours(e.target.value)}
                className={`${inputClass} max-w-[140px]`}
              />
              <p className="mt-1.5 text-xs text-regantify-text-muted">
                A parcel on its way with no courier movement for this long shows under &ldquo;Needs attention&rdquo; on the Orders page, with a
                notification. Failed deliveries, late orders and returns are flagged too.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            {data.events.map((event) => (
              <EventCard
                key={event.event}
                event={event}
                language={language}
                draft={drafts[event.event] ?? { enabled: event.enabled, text: null }}
                variables={data.variables}
                maxLength={data.maxTextLength}
                onChange={(next) => setDrafts((prev) => ({ ...prev, [event.event]: next }))}
              />
            ))}
          </section>

          <p className="text-xs text-regantify-text-muted">
            Each text is sent once per order, even if the courier repeats an update. The &ldquo;Handed to the courier&rdquo; text also
            follows the older &ldquo;Text customer on booking&rdquo; switch in your courier settings until you choose here.
          </p>

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex items-center gap-1.5 rounded-xl bg-regantify-cta px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-regantify-cta-dark disabled:opacity-60"
          >
            {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {save.isPending ? 'Saving…' : 'Save Order Tracking'}
          </button>
        </div>
      )}
    </div>
  );
}
