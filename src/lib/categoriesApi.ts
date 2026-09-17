import { api } from './api';

export interface Category {
  id: string;
  vendorId: string;
  name: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  position: number;
  coverPhotoUrl?: string | null;
  squarePhotoUrl?: string | null;
  facebookCategory?: string | null;
  googleCategory?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  parentId?: string;
  coverPhotoUrl?: string;
  squarePhotoUrl?: string;
  facebookCategory?: string;
  googleCategory?: string;
}

export const categoriesApi = {
  list: (visibility?: 'PUBLIC' | 'PRIVATE') =>
    api
      .get<Category[]>('/v1/categories', { params: visibility ? { visibility } : undefined })
      .then((r) => r.data),

  create: (payload: CreateCategoryPayload) =>
    api.post<Category>('/v1/categories', payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreateCategoryPayload>) =>
    api.patch<Category>(`/v1/categories/${id}`, payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/v1/categories/${id}`).then((r) => r.data),

  // Persists a new top-to-bottom order for Main Categories after a
  // drag-and-drop reorder — `ids` is the complete new order.
  reorder: (ids: string[]) => api.patch('/v1/categories/reorder', { ids }).then((r) => r.data),

  // Uploads one cover or square photo and returns its Cloudinary URL —
  // called before Create Category is submitted, same pattern as product
  // photo uploads.
  uploadPhoto: (file: File, kind: 'cover' | 'square') => {
    const formData = new FormData();
    formData.append('photo', file);
    return api
      .post<{ url: string }>(`/v1/categories/photos/${kind}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
