import { api } from './api';

export interface VendorCustomer {
  phone: string;
  name: string;
  email: string | null;
  address: string;
  city: string | null;
  district: string | null;
  zip: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  blacklisted: boolean;
  /** What they owe from counter sales on due (POS); 0 for most customers. */
  dueBalance: number;
  /** The vendor's own tags on this customer (VIP, Wholesale...). */
  tags: string[];
  /** The vendor's own note on this customer. */
  note: string | null;
}

/** A tag the store uses and how many customers carry it. */
export interface CustomerTagCount {
  tag: string;
  count: number;
}

/** Ready-made tags offered in the tag picker; vendors can type their own too. */
export const SUGGESTED_CUSTOMER_TAGS = ['VIP', 'Wholesale', 'Regular', 'Returns often', 'Difficult'];

export interface VendorCustomerOrder {
  id: string;
  invoiceNumber: number;
  status: string;
  source: string;
  total: number;
  createdAt: string;
}

export interface VendorCustomerDetail extends VendorCustomer {
  /** Why the vendor blacklisted this phone; null when not blacklisted or no reason was given. */
  blacklistReason: string | null;
  orders: VendorCustomerOrder[];
}

export interface ListCustomersParams {
  search?: string;
  blacklistedOnly?: boolean;
  /** Only customers who owe money (POS due). */
  dueOnly?: boolean;
  /** Only customers carrying this tag. */
  tag?: string;
  page?: number;
  perPage?: number;
}

export interface CustomerListResponse {
  customers: VendorCustomer[];
  total: number;
  page: number;
  perPage: number;
}

/** "+ Add New" (Add Customer page) and Bulk Upload both post this shape — one call per customer. */
export interface CreateCustomerPayload {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  address?: string;
  city?: string;
  district?: string;
  zip?: string;
}

/** "Edit Customer" page — same shape minus phone (not editable, see UpdateCustomerDto) plus an optional new password. */
export interface UpdateCustomerPayload {
  name: string;
  email?: string;
  password?: string;
  address?: string;
  city?: string;
  district?: string;
  zip?: string;
}

/** Customers > Details tab — summary cards + order-status breakdown. */
export interface CustomerStats {
  contacts30Days: number;
  contactsAllTime: number;
  accountsCreated30Days: number;
  accountsCreatedAllTime: number;
  averageLtv: number;
  placedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface ExportCsvParams {
  search?: string;
  blacklistedOnly?: boolean;
  dueOnly?: boolean;
  tag?: string;
  /** When given, only these phones are exported — the "select rows, then Export CSV" flow. */
  phones?: string[];
}

export const customersApi = {
  list: (params: ListCustomersParams = {}) =>
    api.get<CustomerListResponse>('/v1/customers', { params }).then((r) => r.data),

  getStats: () => api.get<CustomerStats>('/v1/customers/stats').then((r) => r.data),

  findOne: (phone: string) =>
    api.get<VendorCustomerDetail>(`/v1/customers/${encodeURIComponent(phone)}`).then((r) => r.data),

  create: (payload: CreateCustomerPayload) =>
    api.post<VendorCustomer>('/v1/customers', payload).then((r) => r.data),

  update: (phone: string, payload: UpdateCustomerPayload) =>
    api.patch<VendorCustomer>(`/v1/customers/${encodeURIComponent(phone)}`, payload).then((r) => r.data),

  exportCsv: (params: ExportCsvParams = {}) =>
    api
      .get<VendorCustomer[]>('/v1/customers/export', {
        params: {
          search: params.search,
          blacklistedOnly: params.blacklistedOnly,
          dueOnly: params.dueOnly,
          tag: params.tag,
          phones: params.phones && params.phones.length > 0 ? params.phones.join(',') : undefined,
        },
      })
      .then((r) => r.data),

  /** `reason` is kept only while blacklisted (Customer Detail's switch); the list's menu sends none. */
  setBlacklisted: (phone: string, blacklisted: boolean, reason?: string) =>
    api
      .patch<{ phone: string; blacklisted: boolean; blacklistReason: string | null }>(
        `/v1/customers/${encodeURIComponent(phone)}/blacklist`,
        { blacklisted, reason: blacklisted && reason?.trim() ? reason.trim() : undefined },
      )
      .then((r) => r.data),

  /** Every tag the store uses, most used first. */
  listTags: () => api.get<CustomerTagCount[]>('/v1/customers/tags').then((r) => r.data),

  /** Customer Detail's "Note & tags". */
  setNote: (phone: string, payload: { note: string; tags: string[] }) =>
    api
      .patch<{ phone: string; note: string | null; tags: string[] }>(`/v1/customers/${encodeURIComponent(phone)}/note`, payload)
      .then((r) => r.data),

  remove: (phone: string) =>
    api.delete<{ phone: string; deleted: boolean }>(`/v1/customers/${encodeURIComponent(phone)}`).then((r) => r.data),
};
