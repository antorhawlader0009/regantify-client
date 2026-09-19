import { api } from './api';

export interface MediaAsset {
  id: string;
  vendorId: string;
  url: string;
  publicId: string;
  // Which upload endpoint produced this file, e.g. "product-portrait",
  // "brand-logo" — shown as the CONTEXT column.
  context: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  // Resolved server-side (MediaService.withLinkedIds) by matching this
  // row's url against Product/VariationValuePhoto photoUrls — only ever
  // set for a "product-portrait" row, and null if the owning product
  // was since deleted or the photo removed from it. Drives the "Go to
  // Product" action.
  productId: string | null;
  // Same idea as productId, but matched against Category.coverPhotoUrl/
  // squarePhotoUrl — only ever set for a "category-cover"/"category-
  // square" row. Drives the "Go to Category" action.
  categoryId: string | null;
}

export interface MediaListResponse {
  items: MediaAsset[];
  total: number;
  page: number;
  perPage: number;
}

export interface ListMediaParams {
  search?: string;
  type?: string; // matched against the mimeType prefix, e.g. "image"
  page?: number;
  perPage?: number;
}

export const mediaApi = {
  list: (params: ListMediaParams = {}) =>
    api.get<MediaListResponse>('/v1/media', { params }).then((r) => r.data),

  remove: (id: string) => api.delete(`/v1/media/${id}`).then((r) => r.data),

  bulkRemove: (ids: string[]) =>
    api.post<{ removed: number; failed: number }>('/v1/media/bulk-remove', { ids }).then((r) => r.data),

  // Media page's own "+ Add New" button — uploads straight into the
  // library with no product/brand/etc. attached, unlike every other
  // upload* function in this app's *Api.ts files (those are always a
  // step inside some other form).
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post<{ url: string }>('/v1/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
