import { api } from './api';

export type PageStatus = 'DRAFT' | 'PUBLISHED';

export interface StorePage {
  id: string;
  vendorId: string;
  title: string;
  slug: string;
  content?: string | null;
  status: PageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PagePayload {
  title?: string;
  slug?: string;
  content?: string;
  status?: PageStatus;
}

export const pagesApi = {
  list: (search?: string) =>
    api.get<StorePage[]>('/api/v1/pages', { params: search ? { search } : undefined }).then((r) => r.data),

  findOne: (id: string) => api.get<StorePage>(`/api/v1/pages/${id}`).then((r) => r.data),

  create: (payload: PagePayload) => api.post<StorePage>('/api/v1/pages', payload).then((r) => r.data),

  update: (id: string, payload: PagePayload) =>
    api.patch<StorePage>(`/api/v1/pages/${id}`, payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/api/v1/pages/${id}`).then((r) => r.data),
};
