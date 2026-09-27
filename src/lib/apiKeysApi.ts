import { api } from './api';

// Store > Integrations > External API keys — mirrors the server's
// ApiKeysService (server/src/external-api/api-keys.service.ts). The key
// itself is only ever returned by create(); the server keeps a hash.

export type ApiKeyAccess = 'READ_ONLY' | 'READ_WRITE';

export interface ApiKeyInfo {
  id: string;
  name: string;
  // The key's first characters, to tell keys apart.
  prefix: string;
  access: ApiKeyAccess;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  createdAt: string;
}

export const apiKeysApi = {
  list: async () => (await api.get<ApiKeyInfo[]>('/v1/vendor/api-keys')).data,
  create: async (body: { name: string; access: ApiKeyAccess }) =>
    (await api.post<ApiKeyInfo & { key: string }>('/v1/vendor/api-keys', body)).data,
  update: async (id: string, body: { name?: string; access?: ApiKeyAccess }) =>
    (await api.patch<ApiKeyInfo>(`/v1/vendor/api-keys/${id}`, body)).data,
  remove: async (id: string) => (await api.delete(`/v1/vendor/api-keys/${id}`)).data,
};

/** The API's own origin, as the dashboard reaches it (see lib/api.ts). */
export const apiBaseUrl = (): string => (api.defaults.baseURL ?? '').replace(/\/$/, '');
