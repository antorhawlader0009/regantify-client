import { api } from './api';

export interface Brand {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  logoUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandPayload {
  name: string;
  slug: string;
  logoUrl: string;
}

export const brandsApi = {
  list: (search?: string) =>
    api.get<Brand[]>('/api/v1/brands', { params: search ? { search } : undefined }).then((r) => r.data),

  create: (payload: CreateBrandPayload) => api.post<Brand>('/api/v1/brands', payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/api/v1/brands/${id}`).then((r) => r.data),

  // Uploads the brand logo and returns its Cloudinary URL — called before
  // Create Brand is submitted, same pattern as product/category photos.
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api
      .post<{ url: string }>('/api/v1/brands/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
