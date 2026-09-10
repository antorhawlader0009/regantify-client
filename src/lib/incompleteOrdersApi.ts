import { api } from './api';

export interface IncompleteOrderItem {
  id: string;
  incompleteOrderId: string;
  productName: string;
  productSku: string;
  productImage?: string | null;
  selectedOptions: Record<string, string>;
  quantity: number;
  // Resolved server-side by matching productSku against this vendor's
  // live catalog — null if no matching product exists (e.g. the sku was
  // typed before the product was created, or the product was since
  // deleted) or the match is a DRAFT product with no public page.
  product?: { slug: string; visibility: 'PUBLIC' | 'DRAFT' } | null;
}

export interface IncompleteOrderNote {
  id: string;
  incompleteOrderId: string;
  text: string;
  createdAt: string;
}

export interface IncompleteOrder {
  id: string;
  vendorId: string;
  sessionKey: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  shippingAddress?: string | null;
  customerNote?: string | null;
  label?: string | null;
  items: IncompleteOrderItem[];
  staffNotes: IncompleteOrderNote[];
  createdAt: string;
  updatedAt: string;
}

export interface ListIncompleteOrdersParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export interface IncompleteOrderListResponse {
  incompleteOrders: IncompleteOrder[];
  total: number;
  page: number;
  perPage: number;
}

export const incompleteOrdersApi = {
  list: (params: ListIncompleteOrdersParams = {}) =>
    api.get<IncompleteOrderListResponse>('/api/v1/incomplete-orders', { params }).then((r) => r.data),

  updateLabel: (id: string, label: string | null) =>
    api.patch<IncompleteOrder>(`/api/v1/incomplete-orders/${id}/label`, { label }).then((r) => r.data),

  addNote: (id: string, text: string) =>
    api.post<IncompleteOrder>(`/api/v1/incomplete-orders/${id}/notes`, { text }).then((r) => r.data),

  remove: (id: string) => api.delete(`/api/v1/incomplete-orders/${id}`).then((r) => r.data),

  bulkRemove: (ids: string[]) =>
    api.post<{ removed: number }>('/api/v1/incomplete-orders/bulk-remove', { ids }).then((r) => r.data),

  bulkChangeLabel: (ids: string[], label: string | null) =>
    api
      .post<{ updated: number }>('/api/v1/incomplete-orders/bulk-change-label', { ids, label })
      .then((r) => r.data),
};
