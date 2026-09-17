import { api } from './api';

// Mirrors server/src/admin — Super Admin > All Vendors.
export type VendorStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export interface AdminVendor {
  id: string;
  storeName: string;
  subdomain: string;
  status: VendorStatus;
  phone: string | null;
  email: string | null;
  ownerName: string | null;
  address: string | null;
  // Decimal serialized as a string by Prisma's JSON encoding (e.g. "1250.00") — parse with Number(...) before formatting.
  balance: string;
  smsCredits: number;
  createdAt: string;
  lastLoginAt: string | null;
  productCount: number;
  orderCount: number;
}

export interface AdminVendorListResponse {
  vendors: AdminVendor[];
  total: number;
  page: number;
  perPage: number;
}

export interface ListVendorsParams {
  search?: string;
  page?: number;
  perPage?: number;
  sortBy?: 'createdAt' | 'storeName' | 'balance' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export const adminApi = {
  listVendors: (params: ListVendorsParams = {}) =>
    api.get<AdminVendorListResponse>('/v1/admin/vendors', { params }).then((r) => r.data),

  // "Login as Vendor" — returns a one-time token, valid 24h if unused,
  // that VendorImpersonateEntry exchanges for a 15-min vendor session in
  // a separate tab. See server/src/admin/admin.service.ts.
  impersonateVendor: (vendorId: string) =>
    api.post<{ token: string }>(`/v1/admin/vendors/${vendorId}/impersonate`).then((r) => r.data),

  // Actions column — SUSPENDED blocks the vendor's dashboard login/session
  // AND their public storefront; see AdminService.updateVendorStatus.
  updateVendorStatus: (vendorId: string, status: VendorStatus) =>
    api
      .patch<{ id: string; status: VendorStatus }>(`/v1/admin/vendors/${vendorId}/status`, { status })
      .then((r) => r.data),
};
