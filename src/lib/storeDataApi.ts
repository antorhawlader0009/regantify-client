import { api } from './api';

/** Store backup and restore (TellMe idea 87) - mirrors StoreBackupService.list. */
export interface StoreDataJob {
  id: string;
  kind: 'BACKUP' | 'RESTORE';
  status: 'RUNNING' | 'READY' | 'EXPIRED' | 'DONE' | 'FAILED';
  fileName: string | null;
  sizeBytes: number | null;
  summary: { counts?: Record<string, number>; added?: Record<string, number>; errors?: string[] } | null;
  error: string | null;
  createdAt: string;
  expiresAt: string | null;
  downloadable: boolean;
}

export const storeDataApi = {
  list: async () => (await api.get<StoreDataJob[]>('/v1/store-data')).data,
  backup: async () => (await api.post<{ id: string }>('/v1/store-data/backup')).data,
  /** The file arrives through the signed-in session, so it is fetched as a blob and saved. */
  download: async (job: { id: string; fileName: string | null }) => {
    const res = await api.get<Blob>(`/v1/store-data/${job.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = job.fileName ?? 'backup.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  restore: async (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return (await api.post<{ id: string }>('/v1/store-data/restore', body, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
};
