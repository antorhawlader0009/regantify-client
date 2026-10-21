import { api } from './api';
import type { DashboardView } from '../store/authStore';

/** The signed-in person's own dashboard preferences (server: AccountViewController, SIMPLE-VIEW-plan.md Step 1). */
export const accountApi = {
  setDashboardView: (view: DashboardView) =>
    api.patch<{ dashboardView: DashboardView; saved: boolean }>('/v1/account/dashboard-view', { view }).then((r) => r.data),
  setSimplePins: (paths: string[]) =>
    api.put<{ simplePins: string[]; saved: boolean }>('/v1/account/simple-pins', { paths }).then((r) => r.data),
  /** A use count for Super Admin (Step 12). Fire and forget: a failure is ignored. */
  viewStat: (kind: ViewStatKind, path?: string) => {
    api.post('/v1/account/view-stat', { kind, path }).catch(() => undefined);
  },
};

export type ViewStatKind = 'TO_SIMPLE' | 'TO_FULL' | 'HIDDEN_PAGE' | 'PIN' | 'LEAVE_NOTE';
