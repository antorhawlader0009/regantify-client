import { api } from './api';
import type { CommissionType, ResaleApproval } from './resaleSupplyApi';

// Reseller system Step 3 (RESELLER-plan.md): the catalog a reseller browses and the partnerships between stores. Mirrors
// server/src/resale/resale-catalog.service.ts and resale-partners.service.ts.

export type PartnershipStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLOCKED' | 'ENDED';

export interface PartnerStore {
  id: string;
  storeName: string;
  subdomain: string;
  logoUrl: string | null;
  verified: boolean;
}

export interface Partnership {
  id: string;
  status: PartnershipStatus;
  /** The supplier asked first; the reseller accepts or declines. */
  invited: boolean;
  message: string | null;
  reason: string | null;
  endedBy: 'SUPPLIER' | 'RESELLER' | null;
  requestedAt: string;
  decidedAt: string | null;
  updatedAt: string;
  supplier: PartnerStore;
  reseller: PartnerStore;
  /** Supplier side only (Step 10): this reseller's orders, return rate, sales and earnings owed / paid. */
  stats?: { orders: number; delivered: number; returned: number; returnRate: number | null; sales: number; owed: number; paid: number } | null;
  /** Supplier side (Step 13): the reseller's return rate over all its resale orders, to judge a request. */
  overall?: { finished: number; returnRate: number | null } | null;
}

export interface CatalogTerms {
  priceFrom: number;
  priceTo: number;
  commissionType: CommissionType;
  commissionValue: number;
  minPrice: number | null;
  maxPrice: number | null;
  earningPerPiece: number;
  earningUpTo: number;
}

export interface CatalogItem {
  offerId: string;
  productId: string;
  name: string;
  photoUrl: string | null;
  category: string | null;
  hasOptions: boolean;
  inStock: boolean | null;
  marketingNote: string | null;
  terms: CatalogTerms;
  /** A lower offer waiting for its date. */
  pending: (CatalogTerms & { from: string }) | null;
  supplier: { id: string; storeName: string; verified: boolean };
  partnership: { id: string; status: PartnershipStatus; invited: boolean } | null;
  /** Already in this store (Step 4): the listing id. */
  listingId: string | null;
  /** Step 13: NEW = under 20 delivered resale orders; RELIABLE = 90%+ delivered. */
  supplierBadge: 'NEW' | 'RELIABLE' | null;
}

/** Step 13: how a supplier really does on resale orders (180 days). */
export interface SupplierScore {
  delivered: number;
  returned: number;
  cancelled: number;
  stockOutCancels: number;
  /** Problems Regantify decided against the supplier (Step 14). */
  disputesLost: number;
  deliveredRate: number | null;
  returnRate: number | null;
  onTimeRate: number | null;
  avgEarningWaitDays: number | null;
  rating: { average: number; count: number } | null;
  badge: 'NEW' | 'RELIABLE' | null;
}

export interface MyRating {
  canRate: boolean;
  deliveredFromSupplier: number;
  stars: number | null;
  comment: string | null;
}

export interface SupplierCard {
  id: string;
  storeName: string;
  subdomain: string;
  logoUrl: string | null;
  verified: boolean;
  joinedAt: string;
  delivered: number;
  deliveredRate: number | null;
  scoreDays: number;
  shipWithinDays: number;
  returnWindowDays: number;
  approval: ResaleApproval;
  termsBn: string | null;
  termsEn: string | null;
  pickupNote: string | null;
  offered: number;
  partnership: { id: string; status: PartnershipStatus; invited: boolean } | null;
  score: SupplierScore;
  myRating: MyRating;
}

/** A supplier's product in this store (Step 4). `own` = the reseller wrote its own; else it follows the supplier. */
export interface ResaleListing {
  id: string;
  productId: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  visibility: string;
  category: string | null;
  description: string | null;
  photoUrls: string[];
  sellPrice: number;
  ownPrice: number | null;
  own: { name: boolean; description: boolean; photos: boolean; category: boolean };
  /** Why the system hid it (offer stopped, partnership ended, supplier closed); null while it can sell. */
  pausedReason: string | null;
  supplier: { id: string; storeName: string };
  supplierName: string | null;
  supplierPhotos: string[];
  supplierCategory: string | null;
  terms: { commissionType: CommissionType; commissionValue: number; minPrice: number | null; maxPrice: number | null; supplierPrice: number | null; earningPerPiece: number | null } | null;
  /** A lower offer starts on this day. */
  pendingFrom: string | null;
  /** How it sells (Step 11): resale orders, delivered, returned, and the earning on delivered ones (before Regantify's share). */
  performance: { orders: number; delivered: number; returned: number; earned: number };
  createdAt: string;
}

export interface UpdateListingInput {
  name?: string | null;
  description?: string | null;
  photoUrls?: string[] | null;
  category?: string | null;
  price?: number | null;
}

export type CatalogSort = 'newest' | 'earning' | 'price_low' | 'price_high';

export const RESALE_SELL_KEY = ['resale-sell'] as const;

export const resaleSellApi = {
  catalog: (params: { q?: string; category?: string; supplierId?: string; offerId?: string; sort?: CatalogSort; page?: number }) =>
    api.get<{ total: number; page: number; perPage: number; items: CatalogItem[]; categories: string[] }>('/v1/resale/sell/catalog', { params }).then((r) => r.data),
  supplier: (supplierId: string) => api.get<SupplierCard>(`/v1/resale/sell/suppliers/${supplierId}`).then((r) => r.data),
  request: (supplierId: string, message?: string) => api.post<Partnership>(`/v1/resale/sell/suppliers/${supplierId}/request`, { message }).then((r) => r.data),
  partnerships: () => api.get<Partnership[]>('/v1/resale/sell/partnerships').then((r) => r.data),
  rate: (supplierId: string, stars: number, comment?: string) => api.post<MyRating>(`/v1/resale/sell/suppliers/${supplierId}/rating`, { stars, comment }).then((r) => r.data),
  accept: (id: string) => api.post<Partnership>(`/v1/resale/sell/partnerships/${id}/accept`).then((r) => r.data),
  decline: (id: string) => api.post<Partnership>(`/v1/resale/sell/partnerships/${id}/decline`).then((r) => r.data),
  end: (id: string, message?: string) => api.post<Partnership>(`/v1/resale/sell/partnerships/${id}/end`, { message }).then((r) => r.data),
  listings: () => api.get<{ max: number; items: ResaleListing[] }>('/v1/resale/sell/listings').then((r) => r.data),
  addListing: (offerId: string, price?: number | null) =>
    api.post<{ listingId: string; productId: string; slug: string }>('/v1/resale/sell/listings', { offerId, price }).then((r) => r.data),
  updateListing: (id: string, body: UpdateListingInput) => api.patch<{ ok: true }>(`/v1/resale/sell/listings/${id}`, body).then((r) => r.data),
  removeListing: (id: string) => api.delete<{ ok: true }>(`/v1/resale/sell/listings/${id}`).then((r) => r.data),
};

/** The supplier side of the same partnerships (Products > Sell through resellers > Resellers). */
export const resalePartnersApi = {
  list: (status?: PartnershipStatus) =>
    api.get<{ items: Partnership[]; counts: Partial<Record<PartnershipStatus, number>> }>('/v1/resale/supply/partners', { params: { status } }).then((r) => r.data),
  invite: (address: string, message?: string) => api.post<Partnership>('/v1/resale/supply/partners/invite', { address, message }).then((r) => r.data),
  approve: (id: string) => api.post<Partnership>(`/v1/resale/supply/partners/${id}/approve`).then((r) => r.data),
  reject: (id: string, message?: string) => api.post<Partnership>(`/v1/resale/supply/partners/${id}/reject`, { message }).then((r) => r.data),
  end: (id: string, message?: string) => api.post<Partnership>(`/v1/resale/supply/partners/${id}/end`, { message }).then((r) => r.data),
  block: (id: string, reason: string) => api.post<Partnership>(`/v1/resale/supply/partners/${id}/block`, { reason }).then((r) => r.data),
  unblock: (id: string) => api.post<Partnership>(`/v1/resale/supply/partners/${id}/unblock`).then((r) => r.data),
};

export const PARTNERSHIP_LABEL: Record<PartnershipStatus, string> = {
  PENDING: 'Waiting',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  BLOCKED: 'Blocked',
  ENDED: 'Ended',
};
