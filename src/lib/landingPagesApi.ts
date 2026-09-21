import { api } from './api';

export type LandingPageStatus = 'DRAFT' | 'PUBLISHED';
export type LandingPageDisplayMode = 'FULL_PAGE' | 'WITH_STORE_CHROME';

/**
 * One entry in LandingPage.sections. Mirrors the server's
 * LandingPageSectionDto envelope — see landing-page-sections.md (the
 * shared section-registry contract) for `type`'s allowed values and each
 * type's own `props` shape. `props` is deliberately loose here for the
 * same reason it is server-side: the envelope is shared, the per-type
 * shape is each section component's own concern (Steps 5-6).
 */
export interface LandingPageSection {
  id: string;
  type: string;
  props: Record<string, unknown>;
  visibility: { desktop: boolean; mobile: boolean };
}

export interface LandingPage {
  id: string;
  vendorId: string;
  title: string;
  slug: string;
  status: LandingPageStatus;
  sections: LandingPageSection[];
  displayMode: LandingPageDisplayMode;
  chatButtonEnabled: boolean;
  chatButtonLink?: string | null;
  chatButtonImageUrl?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
  customCss?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  coverImageUrl?: string | null;
  metaPixelId?: string | null;
  tiktokPixelId?: string | null;
  splitTestParentId?: string | null;
  splitTestTrafficPct?: number | null;
  aiGenerated: boolean;
  visitCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LandingPagePayload {
  title?: string;
  slug?: string;
  sections?: LandingPageSection[];
  status?: LandingPageStatus;
  displayMode?: LandingPageDisplayMode;
  chatButtonEnabled?: boolean;
  chatButtonLink?: string;
  chatButtonImageUrl?: string;
  headingFont?: string;
  bodyFont?: string;
  customCss?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  coverImageUrl?: string;
  metaPixelId?: string;
  tiktokPixelId?: string;
}

export const landingPagesApi = {
  list: (search?: string) =>
    api.get<LandingPage[]>('/v1/landing-pages', { params: search ? { search } : undefined }).then((r) => r.data),

  findOne: (id: string) => api.get<LandingPage>(`/v1/landing-pages/${id}`).then((r) => r.data),

  create: (payload: LandingPagePayload) =>
    api.post<LandingPage>('/v1/landing-pages', payload).then((r) => r.data),

  update: (id: string, payload: LandingPagePayload) =>
    api.patch<LandingPage>(`/v1/landing-pages/${id}`, payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/v1/landing-pages/${id}`).then((r) => r.data),

  /** Actions > Make a Copy — returns the new DRAFT copy. */
  duplicate: (id: string) =>
    api.post<LandingPage>(`/v1/landing-pages/${id}/duplicate`).then((r) => r.data),
};
