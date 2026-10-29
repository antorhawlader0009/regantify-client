import { api } from './api';

// Instant checkout links - mirrors server/src/instant-checkout/instant-checkout.service.ts.

export interface InstantProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  stock: number | null;
  options: Array<{ name: string; values: string[] }>;
}

export interface InstantLinkLine {
  slug: string;
  name: string;
  quantity: number;
  options: Record<string, string>;
}

export type InstantZone = 'DHAKA' | 'AROUND_DHAKA' | 'OUTSIDE_DHAKA';

export interface CreateInstantLink {
  lines: InstantLinkLine[];
  customerName?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  zone?: InstantZone;
  couponCode?: string;
  expiresInHours?: number;
  chatRecordId?: string;
}

export interface CreatedInstantLink {
  id: string;
  url: string;
  expiresAt: string;
  message: { en: string; bn: string };
}

export interface InstantLinkRow {
  id: string;
  url: string | null;
  state: 'OPEN' | 'ORDERED' | 'EXPIRED' | 'CANCELLED';
  source: 'DASHBOARD' | 'EXTENSION';
  customerName: string | null;
  phone: string | null;
  lines: InstantLinkLine[];
  couponCode: string | null;
  opens: number;
  lastOpenedAt: string | null;
  orderId: string | null;
  orderInvoice: number | null;
  expiresAt: string;
  createdAt: string;
}

export const instantCheckoutApi = {
  products: (q: string) => api.get<InstantProduct[]>('/v1/instant-checkout/products', { params: { q } }).then((r) => r.data),
  create: (body: CreateInstantLink) => api.post<CreatedInstantLink>('/v1/instant-checkout', body).then((r) => r.data),
  list: (page: number) => api.get<{ items: InstantLinkRow[]; total: number; page: number; perPage: number }>('/v1/instant-checkout', { params: { page } }).then((r) => r.data),
  cancel: (id: string) => api.delete(`/v1/instant-checkout/${id}`).then((r) => r.data),
};
