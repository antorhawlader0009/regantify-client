import { api } from './api';

// Mirrors server/src/marketing-cms/ (super-admin-new.md Step 14).

export interface Bilingual {
  en: string;
  bn: string;
}
export interface HeroSlide {
  id: string;
  imageUrl: string;
  title: Bilingual;
  detail: Bilingual;
}
export interface Testimonial {
  id: string;
  name: string;
  role: Bilingual;
  quote: Bilingual;
  photoUrl: string | null;
  rating: number | null;
  enabled: boolean;
}
export interface FaqItem {
  id: string;
  q: Bilingual;
  a: Bilingual;
  enabled: boolean;
}
export interface MarketingContent {
  hero: { title: Bilingual; sub: Bilingual; slides: HeroSlide[] };
  testimonials: { title: Bilingual; items: Testimonial[] };
  faq: FaqItem[];
  pricingNote: Bilingual;
  showcaseTitle: Bilingual;
  seo: { title: string; description: string; imageUrl: string | null };
}

export interface PlatformBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  views: number;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string;
}
export type PlatformBlogPostBody = Pick<PlatformBlogPost, 'title' | 'excerpt' | 'body' | 'coverUrl' | 'tags' | 'status' | 'publishedAt' | 'seoTitle' | 'seoDescription'> & { slug?: string };

export interface PublicBlogSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  tags: string[];
  publishedAt: string;
}
export interface PublicBlogPost extends PublicBlogSummary {
  body: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** What `GET v1/public/marketing` returns to the homepage. */
export interface PublicMarketing {
  banner: { text: string; link: string | null } | null;
  featured: Array<{ name: string; subdomain: string; logoUrl: string | null }>;
  content?: MarketingContent;
}

export const marketingCmsApi = {
  content: () => api.get<MarketingContent>('/v1/admin/marketing-cms/content').then((r) => r.data),
  saveContent: (content: MarketingContent) => api.put<MarketingContent>('/v1/admin/marketing-cms/content', { content }).then((r) => r.data),
  upload: (file: File, kind: string) => {
    const form = new FormData();
    form.set('file', file);
    return api.post<{ url: string }>('/v1/admin/marketing-cms/images', form, { params: { kind }, headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.url);
  },
  posts: () => api.get<PlatformBlogPost[]>('/v1/admin/marketing-cms/blog').then((r) => r.data),
  createPost: (body: PlatformBlogPostBody) => api.post<PlatformBlogPost>('/v1/admin/marketing-cms/blog', body).then((r) => r.data),
  updatePost: (id: string, body: PlatformBlogPostBody) => api.put<PlatformBlogPost>(`/v1/admin/marketing-cms/blog/${id}`, body).then((r) => r.data),
  deletePost: (id: string) => api.delete(`/v1/admin/marketing-cms/blog/${id}`).then((r) => r.data),
};

export const publicSiteApi = {
  marketing: () => api.get<PublicMarketing>('/v1/public/marketing').then((r) => r.data),
  blog: () => api.get<PublicBlogSummary[]>('/v1/public/blog').then((r) => r.data),
  post: (slug: string) => api.get<PublicBlogPost>(`/v1/public/blog/${encodeURIComponent(slug)}`).then((r) => r.data),
};

/** The text for the page's language: Bangla when there is a Bangla version, else English. */
export const pick = (b: Bilingual | undefined, lang: string) => (b ? (lang === 'bn' && b.bn ? b.bn : b.en) : '');
