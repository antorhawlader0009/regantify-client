import { api } from './api';

export interface CollectionProduct {
  id: string;
  name: string;
  sku: string;
  photoUrls: string[];
}

/** Smart collection rules (TellMe idea 72); every rule that is set must match. */
export interface CollectionRules {
  categories?: string[];
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  newDays?: number;
  inStock?: boolean;
  badge?: string;
}

export interface Collection {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  coverPhotoUrl?: string | null;
  content?: string | null;
  hideHeader: boolean;
  hideFooter: boolean;
  hideSidebar: boolean;
  hideBreadcrumb: boolean;
  categoryNames: string[];
  /** Rules instead of hand-picked products; null = hand-picked. */
  rules?: CollectionRules | null;
  products: CollectionProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface CollectionPayload {
  name?: string;
  slug?: string;
  coverPhotoUrl?: string;
  content?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
  hideSidebar?: boolean;
  hideBreadcrumb?: boolean;
  categoryNames?: string[];
  productIds?: string[];
  /** null clears the rules (hand-picked again). */
  rules?: CollectionRules | null;
}

export const collectionsApi = {
  list: (search?: string) =>
    api
      .get<Collection[]>('/v1/collections', { params: search ? { search } : undefined })
      .then((r) => r.data),

  /** How many products these rules match now, and the first few names. */
  previewRules: (rules: CollectionRules) =>
    api.post<{ count: number; names: string[] }>('/v1/collections/preview-rules', { rules }).then((r) => r.data),

  findOne: (id: string) => api.get<Collection>(`/v1/collections/${id}`).then((r) => r.data),

  create: (payload: CollectionPayload) =>
    api.post<Collection>('/v1/collections', payload).then((r) => r.data),

  update: (id: string, payload: CollectionPayload) =>
    api.patch<Collection>(`/v1/collections/${id}`, payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/v1/collections/${id}`).then((r) => r.data),

  // Uploads the collection cover photo and returns its Cloudinary URL —
  // called before Create/Update Collection is submitted.
  uploadCoverPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api
      .post<{ url: string }>('/v1/collections/cover-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
