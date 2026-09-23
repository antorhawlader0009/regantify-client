import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import {
  storeSettingsApi,
  blankHtmlToEmpty,
  type GdprPromptPosition,
  type GdprSettings,
} from '../../../lib/storeSettingsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';

// Placeholder, and what StorePal shows when the message is left blank
// (keep in sync with storefront's themes/storepal/components/GdprPrompt.tsx).
const DEFAULT_MESSAGE =
  'We Care About Your Privacy. We use cookies to enhance your browsing experience in our site and offer personalized promotions.';

const POSITIONS: { value: GdprPromptPosition; label: string }[] = [
  { value: 'BOTTOM', label: 'Bottom' },
  { value: 'TOP', label: 'Top' },
  { value: 'BOTTOM_LEFT', label: 'Bottom Left' },
  { value: 'BOTTOM_RIGHT', label: 'Bottom Right' },
];

export default function GdprPrompt() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['gdpr-settings'], queryFn: storeSettingsApi.getGdpr });
  const [form, setForm] = useState<GdprSettings | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (value: GdprSettings) =>
      storeSettingsApi.updateGdpr({ ...value, message: blankHtmlToEmpty(value.message) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['gdpr-settings'], updated);
      toast.success('GDPR settings saved. Your storefront will reflect this shortly.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save GDPR settings. Please try again.')),
  });

  const set = <K extends keyof GdprSettings>(key: K, value: GdprSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">GDPR Prompt</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Show a cookie consent prompt to visitors of your StorePal storefront.
        </p>
      </div>

      {isLoading || !form ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-regantify-text">Show cookie consent prompt</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.enabled}
                aria-label="Show cookie consent prompt"
                onClick={() => set('enabled', !form.enabled)}
                className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
                  form.enabled ? 'bg-regantify-cta' : 'bg-black/15'
                }`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    form.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-regantify-text-muted mt-1.5">
              {form.enabled
                ? 'Consent popup enabled. Visitors see it until they accept.'
                : "Consent popup disabled and it won't be shown."}
            </p>
          </div>

          <section>
            <h2 className="text-base font-medium text-regantify-text mb-2">Prompt Message</h2>
            <div className="bg-white rounded-2xl border border-black/5 p-5">
              <RichTextEditor
                value={form.message ?? ''}
                onChange={(html) => set('message', html)}
                placeholder={DEFAULT_MESSAGE}
              />
            </div>
          </section>

          <section>
            <h2 className="text-base font-medium text-regantify-text mb-2">Prompt Style</h2>
            <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">
              <StyleRow label="Prompt Display Position" hint="Where the GDPR consent prompt will be shown.">
                <select
                  value={form.position}
                  onChange={(e) => set('position', e.target.value as GdprPromptPosition)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text bg-white
                    focus:outline-none focus:border-regantify-cta transition-colors"
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </StyleRow>
              <StyleRow label="Prompt Background Color" hint="Background color of the prompt.">
                <ColorInput value={form.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
              </StyleRow>
              <StyleRow label="Prompt Text Color" hint="Text color of the prompt.">
                <ColorInput value={form.textColor} onChange={(v) => set('textColor', v)} />
              </StyleRow>
            </div>
          </section>

          <button
            onClick={() => save.mutate(form)}
            disabled={save.isPending}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
              text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {save.isPending ? 'Saving…' : 'Save GDPR Settings'}
          </button>
        </div>
      )}
    </div>
  );
}

function StyleRow({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[1fr_16rem] gap-2 sm:gap-6 p-5">
      <div>
        <label className="block text-sm font-medium text-regantify-text mb-1.5">{label}</label>
        {children}
      </div>
      <p className="text-sm text-regantify-text-muted sm:pt-7">{hint}</p>
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 max-w-xs">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-10 h-10 rounded-lg border border-black/10 cursor-pointer p-0.5 bg-white"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
        className="flex-1 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text
          focus:outline-none focus:border-regantify-cta transition-colors"
      />
    </div>
  );
}
