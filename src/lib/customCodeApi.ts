import { api } from './api';

// Store > Design > Custom CSS / Custom Head Scripts / JavaScript Code —
// mirrors the server's CustomCodeService (server/src/store-settings/).
// Owner-only routes on VendorController. Only the StorePal storefront
// injects any of this.

export interface CustomCode {
  customCss: string | null;
  headScripts: string | null;
}

export type StoreScriptPosition = 'HEAD' | 'BODY';

export interface StoreScript {
  id: string;
  name: string;
  position: StoreScriptPosition;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreScriptInput {
  name: string;
  position: StoreScriptPosition;
  code: string;
}

export const customCodeApi = {
  get: async () => (await api.get<CustomCode>('/v1/vendor/custom-code')).data,
  // Send only the field the page edits; "" clears it.
  update: async (body: { customCss?: string; headScripts?: string }) =>
    (await api.patch<CustomCode>('/v1/vendor/custom-code', body)).data,

  listScripts: async () => (await api.get<StoreScript[]>('/v1/vendor/scripts')).data,
  getScript: async (id: string) => (await api.get<StoreScript>(`/v1/vendor/scripts/${id}`)).data,
  createScript: async (body: StoreScriptInput) => (await api.post<StoreScript>('/v1/vendor/scripts', body)).data,
  updateScript: async (id: string, body: StoreScriptInput) =>
    (await api.patch<StoreScript>(`/v1/vendor/scripts/${id}`, body)).data,
  // Single "Delete" and "Bulk remove" both go through here.
  deleteScripts: async (ids: string[]) =>
    (await api.post<{ deleted: number }>('/v1/vendor/scripts/bulk-delete', { ids })).data,
};
