import { api } from './api';

// Store > Product > Size Guides — mirrors the server's SizeGuidesService (server/src/size-guides/). A guide is a
// TABLE (column headings and rows of short text cells) or one IMAGE, made once and used by many products and
// categories. A product's own choice is Product.sizeGuideId; a category's guide is set from the guide itself.

export type SizeGuideKind = 'TABLE' | 'IMAGE';

export const MAX_GUIDE_COLUMNS = 8;
export const MAX_GUIDE_ROWS = 40;
export const MAX_GUIDE_CELL = 40;

export interface SizeGuide {
  id: string;
  name: string;
  kind: SizeGuideKind;
  columns: string[];
  rows: string[][];
  imageUrl: string | null;
  note: string | null;
  /** Categories that use this guide for their products that have none of their own. */
  categories: { id: string; name: string }[];
  /** Products that picked this guide themselves. */
  _count: { products: number };
}

export interface SizeGuideInput {
  name: string;
  kind: SizeGuideKind;
  columns?: string[];
  rows?: string[][];
  imageUrl?: string;
  note?: string;
  categoryIds?: string[];
}

export const SIZE_GUIDES_KEY = ['size-guides'] as const;

export const sizeGuidesApi = {
  list: () => api.get<SizeGuide[]>('/v1/size-guides').then((r) => r.data),
  create: (body: SizeGuideInput) => api.post<SizeGuide>('/v1/size-guides', body).then((r) => r.data),
  update: (id: string, body: SizeGuideInput) => api.put<SizeGuide>(`/v1/size-guides/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete<{ deleted: boolean }>(`/v1/size-guides/${id}`).then((r) => r.data),
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post<{ url: string }>('/v1/size-guides/image', form).then((r) => r.data.url);
  },
};
