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
}

export interface VendorCustomerOrder {
  id: string;
  invoiceNumber: number;
  status: string;
  source: string;
  total: number;
  createdAt: string;
}

export interface VendorCustomerDetail extends VendorCustomer {
  orders: VendorCustomerOrder[];
}

export interface ListCustomersParams {
  search?: string;
  blacklistedOnly?: boolean;
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
          phones: params.phones && params.phones.length > 0 ? params.phones.join(',') : undefined,
        },
      })
      .then((r) => r.data),

  setBlacklisted: (phone: string, blacklisted: boolean) =>
    api
      .patch<{ phone: string; blacklisted: boolean }>(
        `/v1/customers/${encodeURIComponent(phone)}/blacklist`,
        { blacklisted },
      )
      .then((r) => r.data),

  remove: (phone: string) =>
    api.delete<{ phone: string; deleted: boolean }>(`/v1/customers/${encodeURIComponent(phone)}`).then((r) => r.data),
};
