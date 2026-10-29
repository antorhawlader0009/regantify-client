import { api } from './api';

// Reviews > Questions (TellMe idea 35) - mirrors the server's ProductQuestionsService (server/src/reviews/product-questions.service.ts).

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
  /** The shopper left a phone (their account's, or one they typed), so the answer can be texted. The number itself stays on the server. */
  hasPhone: boolean;
  /** When the answer was last texted to the shopper. */
  answerSmsAt: string | null;
  createdAt: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
}

/** The answer is saved even when the text fails; smsError then says why. */
export interface AnswerResult {
  success: boolean;
  smsSent: boolean;
  smsError: string | null;
}

export interface AnswerSmsCost {
  hasPhone: boolean;
  /** SMS credits this text takes (0 through the store's own SMS gateway). */
  credits: number;
  creditsLeft: number;
  ownGateway: boolean;
  sentBefore: string | null;
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

  /** An empty text takes the answer back, and the question leaves the page. With sendSms the answer is also texted (SMS credits). */
  answer: (id: string, answer: string, sendSms = false) =>
    api.put<AnswerResult>(`/v1/product-questions/${id}/answer`, { answer, sendSms }).then((r) => r.data),
  /** What texting this answer would cost; nothing is sent. */
  answerSmsCost: (id: string, answer: string) => api.post<AnswerSmsCost>(`/v1/product-questions/${id}/answer-sms-cost`, { answer }).then((r) => r.data),
  /** An AI draft of the answer (TellMe idea 137). Costs AI Credits; nothing is saved. */
  aiDraft: (id: string) => api.post<{ text: string }>(`/v1/product-questions/${id}/ai-draft`).then((r) => r.data),

  setHidden: (id: string, hidden: boolean) => api.patch(`/v1/product-questions/${id}/hidden`, { hidden }).then((r) => r.data),

  remove: (id: string) => api.delete(`/v1/product-questions/${id}`).then((r) => r.data),
};
