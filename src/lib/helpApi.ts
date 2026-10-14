import { api } from './api';

// Mirrors server/src/help-center/ (super-admin-new.md Step 11).

export interface HelpArticleSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  paths: string[];
  videoUrl: string | null;
  excerpt: string;
  updatedAt: string;
}
export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  body: string;
  videoUrl: string | null;
  paths: string[];
  updatedAt: string;
}
export interface AdminHelpArticle extends HelpArticle {
  published: boolean;
  position: number;
  views: number;
  updatedBy: string | null;
  createdAt: string;
}

export type ChangelogKind = 'NEW' | 'IMPROVED' | 'FIXED';
export const CHANGELOG_KIND_LABEL: Record<ChangelogKind, string> = { NEW: 'New', IMPROVED: 'Improved', FIXED: 'Fixed' };
export interface ChangelogEntry {
  id: string;
  title: string;
  body: string;
  kind: ChangelogKind;
  planCodes: string[];
  link: string | null;
  publishedAt: string;
  isNew?: boolean;
  createdBy?: string | null;
}

export type RequestStatus = 'REVIEW' | 'OPEN' | 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'DECLINED';
export const REQUEST_STATUSES: RequestStatus[] = ['REVIEW', 'OPEN', 'PLANNED', 'IN_PROGRESS', 'DONE', 'DECLINED'];
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  REVIEW: 'Waiting for review',
  OPEN: 'Open for votes',
  PLANNED: 'Planned',
  IN_PROGRESS: 'Being built',
  DONE: 'Done',
  DECLINED: 'Not for now',
};
export interface FeatureRequest {
  id: string;
  title: string;
  body: string | null;
  status: RequestStatus;
  adminNote: string | null;
  votes: number;
  votedByMe: boolean;
  mine: boolean;
  canVote: boolean;
  createdAt: string;
}
export interface AdminFeatureRequest {
  id: string;
  title: string;
  body: string | null;
  status: RequestStatus;
  adminNote: string | null;
  votes: number;
  vendorId: string | null;
  storeName: string | null;
  askedBy: string | null;
  createdAt: string;
  statusChangedAt: string | null;
}

export interface NpsReport {
  last90: { responses: number; promoters: number; passives: number; detractors: number; nps: number | null; skipped: number };
  byMonth: Array<{ month: string; responses: number; promoters: number; passives: number; detractors: number; nps: number | null; skipped: number }>;
  comments: Array<{ id: string; vendorId: string; storeName: string; score: number; reason: string; planCode: string | null; createdAt: string }>;
}

export const helpApi = {
  articles: (q?: string) => api.get<HelpArticleSummary[]>('/v1/help/articles', { params: q ? { q } : {} }).then((r) => r.data),
  article: (slug: string) => api.get<HelpArticle>(`/v1/help/articles/${encodeURIComponent(slug)}`).then((r) => r.data),
  changelog: () => api.get<{ unread: number; entries: ChangelogEntry[] }>('/v1/help/changelog').then((r) => r.data),
  markSeen: () => api.post<{ unread: number }>('/v1/help/changelog/seen').then((r) => r.data),
  requests: (sort: 'top' | 'new') => api.get<FeatureRequest[]>('/v1/help/requests', { params: { sort } }).then((r) => r.data),
  createRequest: (body: { title: string; body?: string }) => api.post('/v1/help/requests', body).then((r) => r.data),
  vote: (id: string) => api.post<{ votedByMe: boolean; votes: number }>(`/v1/help/requests/${id}/vote`).then((r) => r.data),
  npsDue: () => api.get<{ due: boolean }>('/v1/help/nps/due').then((r) => r.data),
  answerNps: (body: { score: number | null; reason?: string }) => api.post<{ saved: boolean }>('/v1/help/nps', body).then((r) => r.data),
};

export interface ArticleBody {
  title: string;
  category: string;
  body: string;
  videoUrl: string | null;
  paths: string[];
  published: boolean;
  position: number;
}
export interface ChangelogBody {
  title: string;
  body: string;
  kind: ChangelogKind;
  planCodes: string[];
  link: string | null;
  publishedAt: string;
}

export const adminHelpApi = {
  articles: () => api.get<AdminHelpArticle[]>('/v1/admin/help/articles').then((r) => r.data),
  picker: () => api.get<HelpArticleSummary[]>('/v1/admin/help/articles/picker').then((r) => r.data),
  createArticle: (body: ArticleBody) => api.post<AdminHelpArticle>('/v1/admin/help/articles', body).then((r) => r.data),
  updateArticle: (id: string, body: ArticleBody) => api.put<AdminHelpArticle>(`/v1/admin/help/articles/${id}`, body).then((r) => r.data),
  deleteArticle: (id: string) => api.delete(`/v1/admin/help/articles/${id}`).then((r) => r.data),
  changelog: () => api.get<ChangelogEntry[]>('/v1/admin/help/changelog').then((r) => r.data),
  createChangelog: (body: ChangelogBody) => api.post('/v1/admin/help/changelog', body).then((r) => r.data),
  updateChangelog: (id: string, body: ChangelogBody) => api.put(`/v1/admin/help/changelog/${id}`, body).then((r) => r.data),
  deleteChangelog: (id: string) => api.delete(`/v1/admin/help/changelog/${id}`).then((r) => r.data),
  requests: (status?: RequestStatus) => api.get<AdminFeatureRequest[]>('/v1/admin/help/requests', { params: status ? { status } : {} }).then((r) => r.data),
  createRequest: (body: { title: string; body?: string }) => api.post('/v1/admin/help/requests', body).then((r) => r.data),
  updateRequest: (id: string, body: { title?: string; body?: string | null; status?: RequestStatus; adminNote?: string | null }) =>
    api.patch(`/v1/admin/help/requests/${id}`, body).then((r) => r.data),
  deleteRequest: (id: string) => api.delete(`/v1/admin/help/requests/${id}`).then((r) => r.data),
  nps: () => api.get<NpsReport>('/v1/admin/help/nps').then((r) => r.data),
};

/** The published article for a dashboard page: the one whose page address is the longest match for where the seller is. */
export function articleForPath(list: HelpArticleSummary[], pathname: string): HelpArticleSummary | null {
  let best: { a: HelpArticleSummary; len: number } | null = null;
  for (const a of list) {
    for (const p of a.paths) {
      if ((pathname === p || pathname.startsWith(`${p}/`)) && (!best || p.length > best.len)) best = { a, len: p.length };
    }
  }
  return best?.a ?? null;
}
