import { api } from './api';

export type BlogStatus = 'DRAFT' | 'PUBLISHED';

export interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  coverUrl: string | null;
  status: BlogStatus;
  publishedAt: string;
}

export interface BlogPost extends BlogPostRow {
  excerpt: string | null;
  content: string | null;
  tags: string[];
  authorName: string | null;
}

export interface BlogPayload {
  title?: string;
  slug?: string;
  coverUrl?: string | null;
  excerpt?: string | null;
  content?: string | null;
  tags?: string[];
  authorName?: string | null;
  status?: BlogStatus;
  publishedAt?: string;
}

/** Store > Magazine (TellMe idea 106). */
export const blogApi = {
  list: (search?: string) => api.get<BlogPostRow[]>('/v1/blog', { params: search ? { search } : undefined }).then((r) => r.data),
  findOne: (id: string) => api.get<BlogPost>(`/v1/blog/${id}`).then((r) => r.data),
  create: (payload: BlogPayload) => api.post<BlogPost>('/v1/blog', payload).then((r) => r.data),
  update: (id: string, payload: BlogPayload) => api.patch<BlogPost>(`/v1/blog/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/v1/blog/${id}`).then((r) => r.data),
  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post<{ url: string }>('/v1/blog/cover-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
};
