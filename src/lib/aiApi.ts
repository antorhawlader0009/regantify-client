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
