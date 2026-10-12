import { api } from './api';

// Store > SEO — mirrors server/src/seo/ (SeoService). The home page title, description and share picture are the Store > Branding
// fields (brandMetaTitle / brandMetaDescription / brandCoverImageUrl), so they are read and saved through vendorApi's branding calls.

export interface SeoSettings {
  allowIndexing: boolean;
  appendStoreName: boolean;
  preferCustomDomain: boolean;
  googleVerification: string | null;
  bingVerification: string | null;
  store: {
    storeName: string;
    subdomain: string;
    customDomain: string | null;
    brandMetaTitle: string | null;
    brandMetaDescription: string | null;
    brandCoverImageUrl: string | null;
    logoUrl: string | null;
  };
}

export type SeoSettingsUpdate = Partial<Pick<SeoSettings, 'allowIndexing' | 'appendStoreName' | 'preferCustomDomain'>> & {
  /** The pasted meta tag or just its code; an empty string clears it. */
  googleVerification?: string;
  bingVerification?: string;
};

export type SeoGrade = 'good' | 'warn' | 'missing';

export interface SeoHealthCheck {
  id: string;
  label: string;
  grade: SeoGrade;
  detail: string;
  fixPath?: string;
  weight: number;
}

export interface SeoHealth {
  score: number;
  checks: SeoHealthCheck[];
  products: { total: number; withoutPhoto: number; withoutDescription: number; withoutSearchDescription: number };
}

export const seoApi = {
  get: async () => (await api.get<SeoSettings>('/v1/vendor/seo')).data,
  update: async (input: SeoSettingsUpdate) => (await api.patch<SeoSettings>('/v1/vendor/seo', input)).data,
  health: async () => (await api.get<SeoHealth>('/v1/vendor/seo/health')).data,
};

/** Search results cut a title near 60 characters and a description near 160 (same targets as the server's seo-rules.ts). */
export const TITLE_IDEAL = { min: 30, max: 60 };
export const DESCRIPTION_IDEAL = { min: 70, max: 160 };
