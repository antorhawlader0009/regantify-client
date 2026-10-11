import { api } from './api';

/** Store FAQ (TellMe idea 122) — mirrors the server's FaqItem. */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  enabled: boolean;
}

export const faqApi = {
  list: () => api.get<FaqItem[]>('/v1/faq').then((r) => r.data),
  save: (items: FaqItem[]) => api.put<FaqItem[]>('/v1/faq', { items }).then((r) => r.data),
};
