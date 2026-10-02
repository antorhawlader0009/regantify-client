import { api } from './api';

export type FlashSaleDiscountType = 'PERCENT' | 'FIXED';

export interface FlashSaleProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  photoUrls: string[];
  price: string;
}

export interface FlashSale {
  id: string;
  vendorId: string;
  name: string;
  discountType: FlashSaleDiscountType;
  amount: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  products: FlashSaleProduct[];
  /**
   * List only: orders placed while the sale ran that contain one of its
   * products (cancelled/failed left out). Orders don't record the sale
   * itself, so this is how many orders came in during it.
   */
  orderCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListFlashSalesParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export interface FlashSaleListResponse {
  flashSales: FlashSale[];
  total: number;
  page: number;
  perPage: number;
}

/** New/Edit Flash Sale form payload. */
export interface FlashSalePayload {
  name: string;
  discountType: FlashSaleDiscountType;
  amount: number;
  startsAt: string;
  endsAt: string;
  productIds: string[];
  active?: boolean;
}

export const flashSalesApi = {
  list: (params: ListFlashSalesParams = {}) =>
    api.get<FlashSaleListResponse>('/v1/flash-sales', { params }).then((r) => r.data),

  findOne: (id: string) => api.get<FlashSale>(`/v1/flash-sales/${id}`).then((r) => r.data),

  create: (payload: FlashSalePayload) => api.post<FlashSale>('/v1/flash-sales', payload).then((r) => r.data),

  update: (id: string, payload: Partial<FlashSalePayload>) =>
    api.patch<FlashSale>(`/v1/flash-sales/${id}`, payload).then((r) => r.data),

  setActive: (id: string, active: boolean) =>
    api.patch<FlashSale>(`/v1/flash-sales/${id}/active`, { active }).then((r) => r.data),

  remove: (id: string) => api.delete<{ success: boolean }>(`/v1/flash-sales/${id}`).then((r) => r.data),
};
