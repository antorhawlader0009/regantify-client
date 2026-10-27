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

// Where the text in a photo sent to a store's AI chat is read (server photo-match/photo-text.ts): BROWSER = Tesseract.js in
// the shopper's browser (default, about 7 MB the first time), SERVER = Tesseract on our server (nothing to download).
export type PhotoTextMode = 'BROWSER' | 'SERVER';

export async function getPhotoTextMode(): Promise<PhotoTextMode> {
  const { data } = await api.get<{ mode: PhotoTextMode }>('/v1/admin/ai/photo-text');
  return data.mode;
}

export async function setPhotoTextMode(mode: PhotoTextMode): Promise<PhotoTextMode> {
  const { data } = await api.put<{ mode: PhotoTextMode }>('/v1/admin/ai/photo-text', { mode });
  return data.mode;
}

// The voice model of store voice calls (server storefront/voice-files.ts VOICE_MODELS): the same voice stored in fewer
// bits for a smaller download. `downloadMb` is what a shopper downloads once; `changeDb` how far the voice moves from
// the original (lower = closer).
export interface VoiceModelOption {
  key: string;
  file: string;
  label: string;
  downloadMb: number;
  changeDb: number;
  voice: string;
  note: string;
}

export async function getVoiceModel(): Promise<{ model: string; defaultModel: string; models: VoiceModelOption[] }> {
  const { data } = await api.get<{ model: string; defaultModel: string; models: VoiceModelOption[] }>('/v1/admin/ai/voice-model');
  return data;
}

export async function setVoiceModel(model: string): Promise<string> {
  const { data } = await api.put<{ model: string }>('/v1/admin/ai/voice-model', { model });
  return data.model;
}

/** The voice a call switches to when a shopper's phone is too slow for the Piper voice. */
export type VoiceFallback = 'GOOGLE' | 'SERVER';

export async function getVoiceFallback(): Promise<VoiceFallback> {
  const { data } = await api.get<{ fallback: VoiceFallback }>('/v1/admin/ai/voice-fallback');
  return data.fallback;
}

export async function setVoiceFallback(fallback: VoiceFallback): Promise<VoiceFallback> {
  const { data } = await api.put<{ fallback: VoiceFallback }>('/v1/admin/ai/voice-fallback', { fallback });
  return data.fallback;
}
