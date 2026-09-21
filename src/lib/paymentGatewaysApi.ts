import { api } from './api';

export type PaymentGatewayType = 'COD' | 'ONLINE_PAYMENT' | 'SSLCOMMERZ' | 'BKASH_MERCHANT' | 'VENDOR_PAYSTATION';
export type PaymentGatewayStatus = 'ACTIVE' | 'DISABLED' | 'COMING_SOON';

export interface VendorPaymentGateway {
  id: string;
  type: PaymentGatewayType;
  status: PaymentGatewayStatus;
  displayLabel: string | null;
  platformChargeBdt: string;
  isConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentGatewayCatalogEntry {
  type: PaymentGatewayType;
  isEnabledPlatformWide: boolean;
  isImplemented: boolean;
  displayName: string;
  description: string | null;
}

export interface UpdateGatewayPayload {
  displayLabel?: string;
  platformChargeBdt?: number;
  status?: 'ACTIVE' | 'DISABLED';
}

export const paymentGatewaysApi = {
  /** Store > Payment Gateway page's own list — every gateway this vendor has (built-in + custom, any status). */
  listGateways: () => api.get<VendorPaymentGateway[]>('/v1/payment-gateways').then((r) => r.data),

  /** Which gateway types are connectable at all right now — "Add a payment gateway" picker's own catalog view. */
  getCatalog: () => api.get<PaymentGatewayCatalogEntry[]>('/v1/payment-gateways/catalog').then((r) => r.data),

  /**
   * COD/ONLINE_PAYMENT only — enable/disable, nothing else. Display
   * label + fee for these two are fully plan-driven now (edited at
   * Admin > Plans > Manage Plans, never per-vendor) — the server DTO
   * backing this route (UpdateBuiltinStatusDto) rejects anything but
   * `status`, so the payload type here is narrowed to match.
   */
  updateBuiltin: (type: 'COD' | 'ONLINE_PAYMENT', payload: { status: 'ACTIVE' | 'DISABLED' }) =>
    api.patch<VendorPaymentGateway>(`/v1/payment-gateways/${type}/builtin`, payload).then((r) => r.data),

  connectSslcommerz: (storeId: string, storePassword: string, displayLabel?: string, platformChargeBdt?: number) =>
    api
      .post<{ id: string; type: PaymentGatewayType; status: PaymentGatewayStatus }>('/v1/payment-gateways/sslcommerz', {
        storeId,
        storePassword,
        displayLabel,
        platformChargeBdt,
      })
      .then((r) => r.data),

  // Both always reject with a "coming soon" 400 today (see
  // PaymentGatewaysService.connectBkashMerchant/connectVendorPaystation)
  // — kept as real calls (not stubbed client-side) so the server's exact
  // message surfaces as the toast, and so connecting either becomes a
  // one-line change once a real provider client ships.
  connectBkashMerchant: () => api.post('/v1/payment-gateways/bkash-merchant'),
  connectVendorPaystation: () => api.post('/v1/payment-gateways/vendor-paystation'),

  /** Any already-connected gateway's charge/label (built-in or custom) — no plan gate. */
  updateCharge: (id: string, payload: UpdateGatewayPayload) =>
    api.patch<{ id: string; displayLabel: string | null; platformChargeBdt: string }>(`/v1/payment-gateways/${id}/charge`, payload).then((r) => r.data),

  /** Custom gateways only — soft-disconnect. COD/ONLINE_PAYMENT reject this; use updateBuiltin's status field instead. */
  disconnect: (id: string) => api.delete<{ disconnected: true }>(`/v1/payment-gateways/${id}`).then((r) => r.data),
};
