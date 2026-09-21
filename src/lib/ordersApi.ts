import { api } from './api';

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'PAYMENT_INITIATED'
  | 'PARTIAL_PAYMENT_PENDING'
  | 'PAYMENT_FAILED'
  | 'CANCELLED'
  | 'RETURN'
  | 'REFUNDED'
  | 'STOCK_OUT';

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  productSku: string;
  productImage?: string | null;
  selectedOptions: Record<string, string>;
  listPrice: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  // Live product snapshot for the "view on storefront" link — null when
  // the product was since deleted, or DRAFT (no public page to link to).
  // See OrdersService.itemsInclude.
  product?: { slug: string; visibility: 'PUBLIC' | 'DRAFT' } | null;
}

export type CourierProvider = 'NONE' | 'PATHAO' | 'STEADFAST' | 'REDX';

// Real-booking lifecycle for courierProvider — see COURIER-PLAN.md
// §2.4/§3.4. Distinct from OrderStatus: courierProvider/
// courierBookingStatus track the courier API side, OrderStatus is the
// vendor-facing pipeline stage (which a successful courier sync can also
// update, via applyStatusUpdate on the server).
export type CourierBookingStatus = 'NOT_BOOKED' | 'BOOKING' | 'BOOKED' | 'FAILED';

export interface Order {
  id: string;
  vendorId: string;
  invoiceNumber: number;
  source: 'STOREFRONT' | 'MANUAL';
  status: OrderStatus;
  label?: string | null;
  courierProvider: CourierProvider;
  courierConsignmentId?: string | null;
  courierTrackingCode?: string | null;
  courierBookingStatus: CourierBookingStatus;
  courierBookingError?: string | null;
  courierLastSyncedAt?: string | null;
  deletedAt?: string | null;
  customerName: string;
  customerPhone: string;
  customerPhoneAlt?: string | null;
  customerEmail?: string | null;
  customerNote?: string | null;
  staffNote?: string | null;
  shippingAddress: string;
  shippingZip?: string | null;
  shippingCity?: string | null;
  shippingDistrict?: string | null;
  // Pathao-specific numeric location IDs, set via PathaoLocationPicker —
  // see COURIER-PLAN.md §3.2/§7 Phase 2. Independent of the free-text
  // shippingCity/shippingDistrict above.
  pathaoCityId?: number | null;
  pathaoZoneId?: number | null;
  pathaoAreaId?: number | null;
  // RedX's single delivery-area id, set via RedxLocationPicker — RedX
  // has only one location tier, unlike Pathao's city/zone/area cascade.
  redxAreaId?: number | null;
  deliveryZone: 'DHAKA' | 'OUTSIDE_DHAKA';
  subtotal: string;
  deliveryCharge: string;
  // Flat VAT fee, shown to shoppers as "VAT" (StorePal) — applied to
  // every order regardless of paymentMethod. See Vendor.vatChargeBdt /
  // Order.vatAmount in schema.prisma.
  vatAmount: string;
  // Store > Payment Gateway's per-gateway Platform Charge — independent
  // of vatAmount above. See VendorPaymentGateway.platformChargeBdt /
  // Order.platformChargeAmount in schema.prisma. Always the real amount
  // charged; platformChargeHidden below is a storefront-display-only
  // flag (not used anywhere in this vendor dashboard today).
  platformChargeAmount: string;
  platformChargeHidden: boolean;
  discountAmount: string;
  discountLabel?: string | null;
  total: string;
  paymentMethod: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface CustomerHistoryOrder {
  id: string;
  invoiceNumber: number;
  status: OrderStatus;
  total: string;
  createdAt: string;
  storeName: string;
}

export interface CustomerHistory {
  phone: string;
  totalResolved: number;
  successRate: number | null;
  orders: CustomerHistoryOrder[];
}

export interface ListOrdersParams {
  search?: string;
  status?: OrderStatus;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  trashOnly?: boolean;
  page?: number;
  perPage?: number;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  perPage: number;
}

export interface OrderItemInput {
  productId?: string;
  variantId?: string;
  productName: string;
  productSku?: string;
  productImage?: string;
  selectedOptions?: Record<string, string>;
  listPrice: number;
  unitPrice: number;
  quantity: number;
}

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerPhoneAlt?: string;
  customerEmail?: string;
  customerNote?: string;
  staffNote?: string;
  shippingAddress: string;
  shippingZip?: string;
  shippingCity?: string;
  shippingDistrict?: string;
  deliveryZone?: 'DHAKA' | 'OUTSIDE_DHAKA';
  items: OrderItemInput[];
  deliveryCharge?: number;
  discountAmount?: number;
  discountLabel?: string;
}

export const ordersApi = {
  list: (params: ListOrdersParams = {}) =>
    api.get<OrderListResponse>('/v1/orders', { params }).then((r) => r.data),

  findOne: (id: string) => api.get<Order>(`/v1/orders/${id}`).then((r) => r.data),

  create: (payload: CreateOrderPayload) =>
    api.post<Order>('/v1/orders', payload).then((r) => r.data),

  updateStatus: (id: string, status: OrderStatus, note?: string) =>
    api.patch<Order>(`/v1/orders/${id}/status`, { status, note }).then((r) => r.data),

  updateLabel: (id: string, label: string | null) =>
    api.patch<Order>(`/v1/orders/${id}/label`, { label }).then((r) => r.data),

  updateCourier: (id: string, courierProvider: CourierProvider) =>
    api.patch<Order>(`/v1/orders/${id}/courier`, { courierProvider }).then((r) => r.data),

  trash: (id: string) => api.post<Order>(`/v1/orders/${id}/trash`).then((r) => r.data),

  restore: (id: string) => api.post<Order>(`/v1/orders/${id}/restore`).then((r) => r.data),

  getHistory: (id: string) =>
    api.get<OrderStatusHistoryEntry[]>(`/v1/orders/${id}/history`).then((r) => r.data),

  // Customize Order Status Tabs — the four defaults come back even for a
  // vendor who's never customized anything (server-side fallback).
  getStatusTabs: () =>
    api.get<{ statuses: OrderStatus[] }>('/v1/orders/status-tabs').then((r) => r.data.statuses),

  updateStatusTabs: (statuses: OrderStatus[]) =>
    api
      .patch<{ statuses: OrderStatus[] }>('/v1/orders/status-tabs', { statuses })
      .then((r) => r.data.statuses),

  // Courier delivery-history / success-rate lookup by phone number,
  // platform-wide — powers the small "94% (105)" badges and "Check
  // History" on the Orders list.
  getCustomerHistory: (phone: string) =>
    api.get<CustomerHistory>(`/v1/orders/customer-history/${encodeURIComponent(phone)}`).then((r) => r.data),
};
