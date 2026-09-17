import { api } from './api';

export type DiscountType = 'FIXED' | 'PERCENT' | 'FREE_SHIPPING';

export interface CouponProductRef {
  id: string;
  name: string;
}

export interface CouponCategoryRef {
  id: string;
  name: string;
}

export interface Coupon {
  id: string;
  vendorId: string;
  code: string;
  validTill: string | null;
  hasCustomLink: boolean;
  customLink: string | null;
  discountType: DiscountType;
  amount: string | null;
  maxDiscount: string | null;
  applyOnListPrice: boolean;
  resetOtherDiscounts: boolean;
  minCartAmount: string | null;
  newCustomerOnly: boolean;
  customerPhones: string[];
  products: CouponProductRef[];
  categories: CouponCategoryRef[];
  usageLimit: number | null;
  usageCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListCouponsParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export interface CouponListResponse {
  coupons: Coupon[];
  total: number;
  page: number;
  perPage: number;
}

/** New/Edit Coupon form payload — matches the reference form field-for-field. */
export interface CouponPayload {
  code: string;
  validTill?: string;
  hasCustomLink?: boolean;
  customLink?: string;
  discountType: DiscountType;
  amount?: number;
  maxDiscount?: number;
  applyOnListPrice?: boolean;
  resetOtherDiscounts?: boolean;
  minCartAmount?: number;
  newCustomerOnly?: boolean;
  customerPhones?: string[];
  productIds?: string[];
  categoryIds?: string[];
  usageLimit?: number;
}

export const couponsApi = {
  list: (params: ListCouponsParams = {}) =>
    api.get<CouponListResponse>('/v1/coupons', { params }).then((r) => r.data),

  findOne: (id: string) => api.get<Coupon>(`/v1/coupons/${id}`).then((r) => r.data),

  create: (payload: CouponPayload) => api.post<Coupon>('/v1/coupons', payload).then((r) => r.data),

  update: (id: string, payload: Partial<CouponPayload>) =>
    api.patch<Coupon>(`/v1/coupons/${id}`, payload).then((r) => r.data),

  setActive: (id: string, active: boolean) =>
    api.patch<Coupon>(`/v1/coupons/${id}/active`, { active }).then((r) => r.data),

  remove: (id: string) => api.delete<{ success: boolean }>(`/v1/coupons/${id}`).then((r) => r.data),
};
