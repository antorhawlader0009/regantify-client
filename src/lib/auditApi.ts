import { api } from './api';

// Account > Activity log (TellMe idea 158) — mirrors the server's AuditService.list().

export interface AuditChange {
  field: string;
  before: string;
  after: string;
}

export interface AuditItem {
  id: string;
  at: string;
  actor: string;
  /** PRODUCT | COUPON | DELIVERY | PAYMENT | COURIER | CUSTOMER | DOMAIN | TEAM */
  area: string;
  summary: string;
  changes: AuditChange[];
}

export interface AuditPage {
  total: number;
  page: number;
  perPage: number;
  items: AuditItem[];
  areas: string[];
}

export interface AuditQuery {
  area?: string;
  actor?: string;
  from?: string;
  to?: string;
  page?: number;
}

export const AREA_LABEL: Record<string, string> = {
  PRODUCT: 'Products',
  COUPON: 'Coupons',
  DELIVERY: 'Delivery and checkout',
  PAYMENT: 'Payment options',
  COURIER: 'Courier',
  CUSTOMER: 'Customers',
  DOMAIN: 'Domain',
  PLATFORM: 'Regantify team',
  TEAM: 'Team',
};

export const auditApi = {
  list: (q: AuditQuery) => api.get<AuditPage>('/v1/audit-log', { params: q }).then((r) => r.data),
};
