import { api } from './api';

export interface CampaignItemProduct {
  id: string;
  name: string;
  sku: string;
  photoUrls: string[];
  price: string;
  discountPrice: string | null;
  freeShipping: boolean;
}

export interface CampaignItemVariant {
  id: string;
  sku: string;
  listPrice: string | null;
  discountPrice: string | null;
}

export interface CampaignItem {
  id: string;
  campaignId: string;
  productId: string;
  variantId: string | null;
  discountPrice: string | null;
  product: CampaignItemProduct;
  variant: CampaignItemVariant | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  coverPhotoUrl: string | null;
  items: CampaignItem[];
  createdAt: string;
  updatedAt: string;
}

/** List row — items is lean here (just ids, for a product count), not the full CampaignItem shape findOne returns. */
export interface CampaignListRow extends Omit<Campaign, 'items'> {
  items: { id: string }[];
}

export interface CampaignItemInput {
  productId: string;
  variantId?: string;
  discountPrice?: number;
}

export interface CampaignPayload {
  name?: string;
  slug?: string;
  coverPhotoUrl?: string;
  items?: CampaignItemInput[];
}

/** One match from "Add Products by SKU" — a product, with its variants (if any) alongside for the frontend to match the specific SKU(s) typed in. */
export interface SkuLookupProduct {
  id: string;
  name: string;
  sku: string;
  photoUrls: string[];
  price: string;
  discountPrice: string | null;
  freeShipping: boolean;
  variants: { id: string; sku: string; listPrice: string | null; discountPrice: string | null }[];
}

export const campaignsApi = {
  list: (search?: string) =>
    api
      .get<CampaignListRow[]>('/v1/campaigns', { params: search ? { search } : undefined })
      .then((r) => r.data),

  findOne: (id: string) => api.get<Campaign>(`/v1/campaigns/${id}`).then((r) => r.data),

  create: (payload: CampaignPayload) =>
    api.post<Campaign>('/v1/campaigns', payload).then((r) => r.data),

  update: (id: string, payload: CampaignPayload) =>
    api.patch<Campaign>(`/v1/campaigns/${id}`, payload).then((r) => r.data),

  remove: (id: string) => api.delete(`/v1/campaigns/${id}`).then((r) => r.data),

  // Uploads the campaign cover photo and returns its Cloudinary URL —
  // called before Create/Update Campaign is submitted.
  uploadCoverPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api
      .post<{ url: string }>('/v1/campaigns/cover-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  // "Add Products by SKU" — comma-separated SKUs, matched against
  // product AND variant SKUs.
  lookupBySkus: (skus: string[]) =>
    api
      .get<SkuLookupProduct[]>('/v1/campaigns/lookup-by-sku', { params: { skus: skus.join(',') } })
      .then((r) => r.data),
};
