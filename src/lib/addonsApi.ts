import { api } from './api';

// Mirrors server/src/addons/addons.controller.ts. Keys are server/src/addons/addons.ts ADDON_DEFS (and the cards in
// pages/vendor/addons/Addons.tsx), kept in lockstep by hand.

export type AddonState = 'READY' | 'SOON' | 'WAITING';

export interface AdminAddon {
  key: string;
  group: string;
  label: string;
  /** How far it is built: ready, being built (docs in hand), or waiting for documentation. */
  state: AddonState;
  /** What turning it off does, for a ready add-on. */
  enforced: string;
  on: boolean;
  note: string | null;
  changedBy: string | null;
  changedAt: string | null;
  /** Stores with it connected right now (gateways and couriers only). */
  storesUsing: number | null;
}

export const addonsApi = {
  /** The store's Add-ons page: keys Super Admin turned off for every store. */
  off: () => api.get<{ off: string[] }>('/v1/addons').then((r) => r.data.off),

  adminList: () => api.get<AdminAddon[]>('/v1/admin/addons').then((r) => r.data),
  adminSet: (key: string, body: { on: boolean; note?: string }) => api.put(`/v1/admin/addons/${key}`, body).then((r) => r.data),
};
