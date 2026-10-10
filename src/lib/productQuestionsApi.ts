import { api } from './api';

// Reviews > Questions (TellMe idea 35) — mirrors the server's ProductQuestionsService (server/src/reviews/product-questions.service.ts).

export interface ProductQuestion {
  id: string;
  customerName: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  /** "Rahim (Manager)". */
  answeredBy: string | null;
  /** Taken down from the page without deleting it. */
  hidden: boolean;
  createdAt: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
}

export type QuestionStatus = 'UNANSWERED' | 'ANSWERED';

export interface ProductQuestionPage {
  items: ProductQuestion[];
  total: number;
  /** Waiting for an answer, whatever the tab. */
  unanswered: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export const productQuestionsApi = {
  list: (params: { status?: QuestionStatus; page?: number; perPage?: number }) =>
    api.get<ProductQuestionPage>('/v1/product-questions', { params }).then((r) => r.data),

  /** An empty text takes the answer back, and the question leaves the page. */
  answer: (id: string, answer: string) => api.put<ProductQuestion>(`/v1/product-questions/${id}/answer`, { answer }).then((r) => r.data),

  setHidden: (id: string, hidden: boolean) => api.patch(`/v1/product-questions/${id}/hidden`, { hidden }).then((r) => r.data),

  remove: (id: string) => api.delete(`/v1/product-questions/${id}`).then((r) => r.data),
};
