import { api } from './api';

// Vendor dashboard top-bar search — mirrors server/src/search/.

export interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Dashboard route that opens this record. */
  path: string;
  image?: string;
}

export interface SearchGroup {
  key: string;
  label: string;
  items: SearchItem[];
}

export const searchApi = {
  find: (q: string) => api.get<{ query: string; groups: SearchGroup[] }>('/v1/search', { params: { q } }).then((r) => r.data),
};
