import { useEffect, useState } from 'react';
import { Bot, Sparkles, MessageSquareText, Save, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAiModels,
  getAiSettings,
  updateAiSetting,
  type AiFeature,
  type AiModelOption,
  type AiFeatureSetting,
} from '../../../lib/aiApi';

interface FeatureField {
  key: AiFeature;
  label: string;
  description: string;
  icon: typeof Sparkles;
}

// Every AI-powered feature the platform has a model picker for — add a
// new entry here (and a matching AiFeature enum value on the server)
// whenever a new AI feature is built. Order matches how they'll be
// rolled out: Product Information Maker first, then the storefront chat
// bot.
const FEATURES: FeatureField[] = [
  {
    key: 'PRODUCT_INFO_MAKER',
    label: 'Product Information Maker',
    description: 'Generates product name, description and other fields for vendors from a few inputs.',
    icon: Sparkles,
  },
  {
    key: 'STORE_CHATBOT',
    label: 'Store AI Chat Bot',
    description: "Shopper-facing chat widget on a vendor's storefront that answers questions about their store.",
    icon: MessageSquareText,
  },
];

export default function AiSettings() {
  const [models, setModels] = useState<AiModelOption[]>([]);
  const [settings, setSettings] = useState<Record<AiFeature, string>>({} as Record<AiFeature, string>);
  const [loading, setLoading] = useState(true);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingFeature, setSavingFeature] = useState<AiFeature | null>(null);

  // Saved settings load automatically (so the page shows what's already
  // configured), but the model list itself is only ever pulled live from
  // this Cloudflare account's own catalog — once up front here, and
  // again whenever "Fetch Models" below is clicked. Never
  // hardcoded/cached beyond this component's own state, per the point of
  // this page: a model Cloudflare adds/retires should show up (or
  // disappear) the moment someone re-fetches, with no code change.
  useEffect(() => {
    getAiSettings()
      .then((settingList) => {
        setSettings(
          settingList.reduce(
            (acc, s: AiFeatureSetting) => ({ ...acc, [s.feature]: s.modelName }),
            {} as Record<AiFeature, string>,
          ),
        );
      })
      .catch(() => toast.error('Could not load saved AI settings.'))
      .finally(() => setLoading(false));
    void fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchModels = async () => {
    setFetchingModels(true);
    setLoadError(null);
    try {
      const modelList = await getAiModels();
      setModels(modelList);
    } catch {
      setLoadError('Could not load the model list. Check that WORKERS_AI_API_KEY/WORKERS_AI_ACCOUNT_ID are set on the server.');
    } finally {
      setFetchingModels(false);
    }
  };

  const handleChange = async (feature: AiFeature, modelName: string) => {
    const previous = settings[feature];
    setSettings((prev) => ({ ...prev, [feature]: modelName }));
    setSavingFeature(feature);
    try {
      await updateAiSetting(feature, modelName);
      toast.success('Model updated.');
    } catch {
      setSettings((prev) => ({ ...prev, [feature]: previous }));
      toast.error('Could not save this change. Please try again.');
    } finally {
      setSavingFeature(null);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Bot size={22} className="text-regantify-cta" />
          <div>
            <h1 className="text-2xl font-semibold text-regantify-text">AI Settings</h1>
            <p className="text-sm text-regantify-text-muted mt-0.5">
              Choose which Cloudflare Workers AI model each AI-powered feature uses across the whole platform.
            </p>
          </div>
        </div>

        <button
          onClick={fetchModels}
          disabled={fetchingModels}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors disabled:opacity-60 shrink-0"
        >
          {fetchingModels ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {fetchingModels ? 'Fetching…' : 'Fetch Models'}
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-black/5 p-6 text-sm text-red-600">{loadError}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6 space-y-6">
          {models.length === 0 ? (
            <p className="text-sm text-regantify-text-muted">
              No models loaded yet — click <span className="font-medium">Fetch Models</span> above to pull the live list from
              Cloudflare.
            </p>
          ) : (
            FEATURES.map((field) => {
              const Icon = field.icon;
              const isSaving = savingFeature === field.key;
              return (
                <div key={field.key}>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-regantify-text mb-1">
                    <Icon size={15} className="text-regantify-text-muted" />
                    {field.label}
                  </label>
                  <p className="text-xs text-regantify-text-muted mb-2">{field.description}</p>
                  <div className="relative">
                    <select
                      value={settings[field.key] ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      disabled={isSaving || fetchingModels}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text
                        bg-white focus:outline-none focus:border-regantify-cta transition-colors disabled:opacity-60
                        appearance-none"
                    >
                      {models.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.displayName}
                        </option>
                      ))}
                    </select>
                    {isSaving && (
                      <Loader2
                        size={16}
                        className="animate-spin text-regantify-text-muted absolute right-3 top-1/2 -translate-y-1/2"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}

          <p className="flex items-center gap-1.5 text-xs text-regantify-text-muted pt-1">
            <Save size={13} />
            Changes save automatically as soon as you pick a model.
          </p>
        </div>
      )}
    </div>
  );
}
