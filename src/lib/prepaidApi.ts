import { api } from './api';

/** Discount for paying online + the "pay now online and save" offer on COD orders (server orders/prepaid-discount.ts). */
export interface PrepaidSettings {
  enabled: boolean;
  kind: 'FLAT' | 'PERCENT';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  switchOffer: boolean;
  switchSms: boolean;
}

export const prepaidApi = {
  get: () => api.get<PrepaidSettings>('/v1/prepaid-discount').then((r) => r.data),
  save: (body: Partial<PrepaidSettings>) => api.patch<PrepaidSettings>('/v1/prepaid-discount', body).then((r) => r.data),
};
