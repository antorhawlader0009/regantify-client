import { api } from './api';

// Reviews > Reports (STORE-APP-plan.md Step 4) - mirrors server/src/reviews/content-reports.service.ts.
// What shoppers reported on this store's pages: a review, an answered question, or an answer of the store's AI chat.

export type ReportKind = 'REVIEW' | 'QUESTION' | 'AI_ANSWER';
export type ReportStatus = 'OPEN' | 'HIDDEN' | 'DISMISSED';
export type ReportFilter = 'OPEN' | 'DONE' | 'ALL';

export type ReportedItem =
  | { reviewId: string; rating: number; title: string; text: string; by: string | null; shown: boolean }
  | { questionId: string; product: string | null; question: string; answer: string; by: string; shown: boolean }
  | { exchange: string }
  /** The review or question was deleted since. */
  | null;

export interface ContentReport {
  id: string;
  kind: ReportKind;
  reason: string;
  /** The reason in words ("Spam or an advertisement"). */
  reasonLabel: string;
  note: string | null;
  status: ReportStatus;
  createdAt: string;
  item: ReportedItem;
}

export interface ContentReportPage {
  data: ContentReport[];
  total: number;
  page: number;
  perPage: number;
  /** Open reports, whatever the tab. */
  open: number;
}

export const contentReportsApi = {
  list: (params: { status?: ReportFilter; page?: number; perPage?: number }) =>
    api.get<ContentReportPage>('/v1/content-reports', { params }).then((r) => r.data),
  count: () => api.get<{ open: number }>('/v1/content-reports/count').then((r) => r.data),
  /** "Not a problem": the report is closed, the item stays. */
  dismiss: (id: string) => api.post(`/v1/content-reports/${id}/dismiss`).then((r) => r.data),
  /** Takes the reported review or question off the page and closes every open report about it. */
  hide: (id: string) => api.post(`/v1/content-reports/${id}/hide`).then((r) => r.data),
};
