import { api } from './api';

export interface ReviewOrderRef {
  id: string;
  invoiceNumber: number;
}

export interface ReviewProductRef {
  id: string;
  name: string;
  photoUrls: string[];
}

export interface Review {
  id: string;
  vendorId: string;
  title: string;
  content: string | null;
  rating: number;
  photos: string[];
  orderId: string | null;
  order: ReviewOrderRef | null;
  products: ReviewProductRef[];
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  approved: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListReviewsParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export interface ReviewListResponse {
  reviews: Review[];
  total: number;
  page: number;
  perPage: number;
}

/** Add/Edit Review form payload — matches the reference form field-for-field. */
export interface ReviewPayload {
  title: string;
  content?: string;
  rating: number;
  date?: string;
  photoUrls?: string[];
  orderId?: string;
  productIds?: string[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  approved?: boolean;
  featured?: boolean;
}

export const reviewsApi = {
  list: (params: ListReviewsParams = {}) =>
    api.get<ReviewListResponse>('/api/v1/reviews', { params }).then((r) => r.data),

  findOne: (id: string) => api.get<Review>(`/api/v1/reviews/${id}`).then((r) => r.data),

  create: (payload: ReviewPayload) => api.post<Review>('/api/v1/reviews', payload).then((r) => r.data),

  update: (id: string, payload: Partial<ReviewPayload>) =>
    api.patch<Review>(`/api/v1/reviews/${id}`, payload).then((r) => r.data),

  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api
      .post<{ url: string }>('/api/v1/reviews/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  setFeatured: (id: string, featured: boolean) =>
    api.patch<Review>(`/api/v1/reviews/${id}/featured`, { featured }).then((r) => r.data),

  setApproved: (id: string, approved: boolean) =>
    api.patch<Review>(`/api/v1/reviews/${id}/approved`, { approved }).then((r) => r.data),

  remove: (id: string) => api.delete<{ success: boolean }>(`/api/v1/reviews/${id}`).then((r) => r.data),
};
