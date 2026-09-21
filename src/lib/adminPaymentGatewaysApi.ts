import { api } from './api';
import type { PaymentGatewayCatalogEntry, PaymentGatewayStatus, PaymentGatewayType } from './paymentGatewaysApi';

// Mirrors server/src/admin/admin-payment-gateways.controller.ts — Super
// Admin > Payment Gateway (platform-wide catalog switches + oversight).
// COD/ONLINE_PAYMENT's per-vendor fee is NOT settable through this API
// at all — it's fully plan-driven, see adminPlansApi.updatePlan.

export interface UpdateGatewayCatalogPayload {
  isEnabledPlatformWide?: boolean;
  displayName?: string;
  description?: string;
}

export interface AdminVendorGatewayRow {
  id: string;
  vendorId: string;
  storeName: string;
  subdomain: string;
  type: PaymentGatewayType;
  status: PaymentGatewayStatus;
  displayLabel: string | null;
  platformChargeBdt: string;
  updatedAt: string;
}

export interface AdminVendorGatewaysPage {
  data: AdminVendorGatewayRow[];
  total: number;
  page: number;
  perPage: number;
}

export const adminPaymentGatewaysApi = {
  listCatalog: () => api.get<PaymentGatewayCatalogEntry[]>('/v1/admin/payment-gateways/catalog').then((r) => r.data),

  updateCatalogEntry: (type: PaymentGatewayType, payload: UpdateGatewayCatalogPayload) =>
    api.patch<PaymentGatewayCatalogEntry>(`/v1/admin/payment-gateways/catalog/${type}`, payload).then((r) => r.data),

  listVendorGateways: (page?: number, perPage?: number) =>
    api.get<AdminVendorGatewaysPage>('/v1/admin/payment-gateways/vendors', { params: { page, perPage } }).then((r) => r.data),
};
