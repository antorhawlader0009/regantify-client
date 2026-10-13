import { api } from './api';
import type { AdminRoleKey } from './adminPermissions';

// Mirrors server/src/admin/admin-team.controller.ts — Super Admin > Staff (super-admin-plan.md Step 13).

export interface TeamMember {
  userId: string;
  name: string;
  email: string | null;
  role: AdminRoleKey;
  status: 'ACTIVE' | 'SUSPENDED';
  twoFactorOn: boolean;
  lastLoginAt: string | null;
  since: string;
}

export interface TeamList {
  max: number;
  roles: Array<{ key: AdminRoleKey; label: string; description: string }>;
  members: TeamMember[];
}

export const adminTeamApi = {
  list: () => api.get<TeamList>('/v1/admin/team').then((r) => r.data),
  invite: (body: { name: string; email: string; role: 'MANAGER' | 'FINANCE' | 'SUPPORT'; code: string }) =>
    api.post<{ userId: string; email: string; temporaryPassword: string }>('/v1/admin/team', body).then((r) => r.data),
  setRole: (userId: string, role: 'MANAGER' | 'FINANCE' | 'SUPPORT') => api.patch(`/v1/admin/team/${userId}/role`, { role }).then((r) => r.data),
  setStatus: (userId: string, status: 'ACTIVE' | 'SUSPENDED') => api.patch(`/v1/admin/team/${userId}/status`, { status }).then((r) => r.data),
  resetTwoFactor: (userId: string, code: string) => api.post(`/v1/admin/team/${userId}/reset-2fa`, { code }).then((r) => r.data),
  newPassword: (userId: string, code: string) => api.post<{ temporaryPassword: string }>(`/v1/admin/team/${userId}/new-password`, { code }).then((r) => r.data),
  changeOwnPassword: (currentPassword: string, newPassword: string) => api.post('/v1/auth/admin/change-password', { currentPassword, newPassword }).then((r) => r.data),
};
