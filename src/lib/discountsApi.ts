import { api } from './api';
import type { DiscountType } from './couponsApi';

export interface DiscountRef {
  id: string;
  name: string;
}

export interface Discount {
  id: string;
  vendorId: string;
  name: string;
  discountType: DiscountType;
  amount: string | null;
  maxDiscount: string | null;
  applyOnListPrice: boolean;
  minCartAmount: string | null;
  minQuantity: number | null;
  products: DiscountRef[];
  categories: DiscountRef[];
  startsAt: string | null;
  endsAt: string | null;
  usageCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListDiscountsParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export interface DiscountListResponse {
  discounts: Discount[];
  total: number;
  page: number;
  perPage: number;
}

/** New/Edit Discount form payload. On edit, null clears an optional field. */
export interface DiscountPayload {
  name: string;
  discountType: DiscountType;
  amount?: number | null;
  maxDiscount?: number | null;
  applyOnListPrice?: boolean;
  minCartAmount?: number | null;
  minQuantity?: number | null;
  productIds?: string[];
  categoryIds?: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
}

export const discountsApi = {
  list: (params: ListDiscountsParams = {}) =>
    api.get<DiscountListResponse>('/v1/discounts', { params }).then((r) => r.data),

  findOne: (id: string) => api.get<Discount>(`/v1/discounts/${id}`).then((r) => r.data),

  create: (payload: DiscountPayload) => api.post<Discount>('/v1/discounts', payload).then((r) => r.data),

  update: (id: string, payload: Partial<DiscountPayload>) =>
    api.patch<Discount>(`/v1/discounts/${id}`, payload).then((r) => r.data),

  setActive: (id: string, active: boolean) =>
    api.patch<Discount>(`/v1/discounts/${id}/active`, { active }).then((r) => r.data),

  remove: (id: string) => api.delete<{ success: boolean }>(`/v1/discounts/${id}`).then((r) => r.data),
};
