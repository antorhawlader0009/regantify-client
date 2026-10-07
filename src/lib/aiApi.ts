import { api } from './api';

// Mirrors server/src/ai — Super Admin > AI Settings, picking which Gemini
// model each AI-powered feature calls. Platform-wide, not vendor-scoped.
export type AiFeature = 'PRODUCT_INFO_MAKER' | 'STORE_CHATBOT' | 'LANDING_PAGE_GENERATOR' | 'LMS_ASSISTANT' | 'DASHBOARD_ASSISTANT';

export interface AiModelOption {
  /** Full resource name, e.g. "models/gemini-2.5-flash" — pass back exactly as-is when saving. */
  name: string;
  displayName: string;
  description?: string;
}

export interface AiFeatureSetting {
  feature: AiFeature;
  modelName: string;
  /** LMS_ASSISTANT only: AI uses each store gets per month (null for the other features). */
  monthlyLimitPerStore: number | null;
}

/** Live from Gemini's own account (ListModels) — see AiService.listModels for why this isn't a hardcoded list. */
export async function getAiModels(): Promise<AiModelOption[]> {
  const { data } = await api.get<AiModelOption[]>('/v1/admin/ai/models');
  return data;
}

export async function getAiSettings(): Promise<AiFeatureSetting[]> {
  const { data } = await api.get<AiFeatureSetting[]>('/v1/admin/ai/settings');
  return data;
}

export async function updateAiSetting(feature: AiFeature, modelName: string, monthlyLimitPerStore?: number): Promise<AiFeatureSetting> {
  const { data } = await api.patch<AiFeatureSetting>('/v1/admin/ai/settings', { feature, modelName, monthlyLimitPerStore });
  return data;
}

// Model prices behind AI Credits (server ai-credits/ai-credit-pricing.ts).
// ADMIN = set on this page, BUILT_IN = Cloudflare's published price in
// the code, FALLBACK = no price anywhere, charged at the highest rate.
export type AiRateSource = 'ADMIN' | 'BUILT_IN' | 'FALLBACK';

export interface AiModelRate {
  inputUsdPerM: number;
  outputUsdPerM: number;
}

export interface AiModelPriceRow extends AiModelRate {
  modelName: string;
  source: AiRateSource;
  /** Cloudflare's price from the built-in list, when the model is on it. */
  builtIn: AiModelRate | null;
  /** Features that run on this model now. */
  inUseBy: AiFeature[];
  /** Credits a 1,000-token prompt with a 200-token reply takes at this price. */
  sampleCredits: number;
}

export interface AiModelPriceList {
  /** US$ of AI cost one AI Credit stands for. */
  usdPerCredit: number;
  models: AiModelPriceRow[];
}

export async function getAiModelPrices(): Promise<AiModelPriceList> {
  const { data } = await api.get<AiModelPriceList>('/v1/admin/ai/model-prices');
  return data;
}

export async function setAiModelPrice(modelName: string, inputUsdPerM: number, outputUsdPerM: number) {
  const { data } = await api.put('/v1/admin/ai/model-prices', { modelName, inputUsdPerM, outputUsdPerM });
  return data;
}

export async function clearAiModelPrice(modelName: string) {
  const { data } = await api.delete('/v1/admin/ai/model-prices', { params: { modelName } });
  return data;
}
