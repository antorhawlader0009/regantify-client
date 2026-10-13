import { api } from './api';
import type { PlanCode } from './plansApi';

// Mirrors server/src/admin/admin-catalog.controller.ts — Super Admin > Plans > Packs & promos (super-admin-plan.md Step 10).

export interface AdminPack {
  id: string;
  name: string;
  /** SMS count or AI credit count. */
  amount: number;
  price: number;
  active: boolean;
  sortOrder: number;
  badge: string | null;
  /** Successful payments for this pack. */
  sold: number;
}

export interface PackInput {
  name?: string;
  amount?: number;
  price?: number;
  active?: boolean;
  badge?: string | null;
}

export type PackKind = 'sms' | 'ai';

export interface AdminPromo {
  id: string;
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  planCodes: PlanCode[];
  maxUses: number | null;
  usedCount: number;
  oncePerStore: boolean;
  expiresAt: string | null;
  active: boolean;
  note: string | null;
  createdAt: string;
}

export interface PromoInput {
  code?: string;
  percentOff?: number | null;
  amountOff?: number | null;
  planCodes?: PlanCode[];
  maxUses?: number | null;
  oncePerStore?: boolean;
  expiresAt?: string | null;
  active?: boolean;
  note?: string | null;
}

export const adminCatalogApi = {
  packs: () => api.get<{ sms: AdminPack[]; ai: AdminPack[] }>('/v1/admin/catalog/packs').then((r) => r.data),
  createPack: (kind: PackKind, body: PackInput) => api.post<{ id: string }>(`/v1/admin/catalog/packs/${kind}`, body).then((r) => r.data),
  updatePack: (kind: PackKind, id: string, body: PackInput) => api.patch<{ id: string }>(`/v1/admin/catalog/packs/${kind}/${id}`, body).then((r) => r.data),
  reorderPacks: (kind: PackKind, ids: string[]) => api.put(`/v1/admin/catalog/packs/${kind}/order`, { ids }).then((r) => r.data),
  promos: () => api.get<AdminPromo[]>('/v1/admin/catalog/promos').then((r) => r.data),
  createPromo: (body: PromoInput) => api.post<{ id: string }>('/v1/admin/catalog/promos', body).then((r) => r.data),
  updatePromo: (id: string, body: PromoInput) => api.patch<{ id: string }>(`/v1/admin/catalog/promos/${id}`, body).then((r) => r.data),
};
