import { api } from './api';

// Store > Invoice (TellMe idea 55) and what the printed invoice needs besides the order. Mirrors the server's
// StoreSettingsService (server/src/store-settings/).

export type InvoicePaperSize = 'A4' | 'RECEIPT80';

export interface InvoiceSettings {
  showLogo: boolean;
  addressOverride: string | null;
  thankYouMessage: string | null;
  terms: string | null;
  /** BIN or trade licence number. */
  taxNumber: string | null;
  /** Bank or bKash details to pay to. */
  paymentInfo: string | null;
  signatureUrl: string | null;
  showProductImage: boolean;
  showSku: boolean;
  showDiscount: boolean;
  showDeliveryCharge: boolean;
  paperSize: InvoicePaperSize;
}

/** The look before the page existed: what a store that never opened Store > Invoice prints. */
export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  showLogo: false,
  addressOverride: null,
  thankYouMessage: null,
  terms: null,
  taxNumber: null,
  paymentInfo: null,
  signatureUrl: null,
  showProductImage: false,
  showSku: false,
  showDiscount: true,
  showDeliveryCharge: true,
  paperSize: 'A4',
};

/** Store-wide warranty/return default that a product line falls back to (Edit Product > Warranty and returns). */
export interface PolicyDefaults {
  defaultWarrantyKind: string | null;
  defaultWarrantyCustom: string | null;
  defaultReturnDays: number | null;
  defaultReturnCondition: string | null;
}

export interface InvoicePrintData {
  settings: InvoiceSettings;
  store: { storeName: string; address: string | null; logoUrl: string | null };
  policyDefaults: PolicyDefaults;
}

export const invoiceApi = {
  /** For printing: open to anyone who can open orders. */
  printData: () => api.get<InvoicePrintData>('/v1/orders/invoice-settings').then((r) => r.data),

  get: () => api.get<InvoiceSettings>('/v1/vendor/invoice-settings').then((r) => r.data),
  update: (body: Partial<Omit<InvoiceSettings, 'signatureUrl'>>) =>
    api.patch<InvoiceSettings>('/v1/vendor/invoice-settings', body).then((r) => r.data),
  uploadSignature: async (file: File) => {
    const formData = new FormData();
    formData.append('signature', file);
    const { data } = await api.post<{ signatureUrl: string }>('/v1/vendor/invoice-settings/signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.signatureUrl;
  },
  clearSignature: () => api.delete<InvoiceSettings>('/v1/vendor/invoice-settings/signature').then((r) => r.data),
};
