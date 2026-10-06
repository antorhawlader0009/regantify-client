import { api } from './api';
import type { StaffPermission, StaffRoleKey } from './staffPermissions';

export interface StaffMember {
  id: string;
  name: string;
  /** Shown name: "Owner", a ready-made role's name, or the custom role's name. */
  role: string;
  roleKey: StaffRoleKey | null; // null for the owner
  customRoleId: string | null;
  /** What the role gives (the owner: everything), already expanded. */
  permissions: StaffPermission[];
  status: 'ACTIVE' | 'SUSPENDED';
  isOwner: boolean;
  email: string | null;
  phone: string | null;
  allowedIp: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  /** The owner can see their password (set by the owner, not changed by them since). */
  hasSavedPassword: boolean;
  welcomeMessage: string | null;
  credentialsSmsAt: string | null;
  createdAt: string | null;
}

export interface CreateStaffMemberPayload {
  name: string;
  phone: string;
  email?: string;
  roleKey: StaffRoleKey;
  /** With roleKey CUSTOM. */
  customRoleId?: string;
  password?: string;
  allowedIp?: string;
  welcomeMessage?: string;
  /** Text them their role and login details (the server's default is on). */
  sendLoginSms?: boolean;
}

/** Edit staff: send only what changes; '' (or null) clears email, IP and welcome message. */
export interface UpdateStaffMemberPayload {
  name?: string;
  email?: string | null;
  roleKey?: StaffRoleKey;
  customRoleId?: string;
  allowedIp?: string | null;
  welcomeMessage?: string | null;
}

export interface StaffCustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: StaffPermission[];
  staffCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffRolesInfo {
  /** Which ready-made roles the plan unlocks (STAFF_ROLE_MIN_TIER). */
  roleTier: number;
  customRoles: StaffCustomRole[];
}

export interface StaffCredentials {
  name: string;
  phone: string | null;
  email: string | null;
  loginUrl: string | null;
  /** null when they set their own password (or were added before passwords were saved): reset it to get one. */
  password: string | null;
}

export interface StaffActivityEntry {
  id: string;
  actorName: string | null;
  staffMemberId: string | null;
  staffName: string | null;
  action: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateStaffMemberResponse extends StaffMember {
  /** Returned right after creation; afterwards only through credentials (owner-only, logged). */
  temporaryPassword: string;
  smsSent: boolean;
  /** Why the login SMS didn't go out, when it was asked for. */
  smsError: string | null;
}

export const staffApi = {
  list: (search?: string) => api.get<StaffMember[]>('/v1/staff', { params: { search } }).then((r) => r.data),

  get: (id: string) => api.get<StaffMember>(`/v1/staff/${id}`).then((r) => r.data),

  create: (payload: CreateStaffMemberPayload) =>
    api.post<CreateStaffMemberResponse>('/v1/staff', payload).then((r) => r.data),

  update: (id: string, payload: UpdateStaffMemberPayload) => api.patch<StaffMember>(`/v1/staff/${id}`, payload).then((r) => r.data),

  suspend: (id: string) => api.post<StaffMember>(`/v1/staff/${id}/suspend`).then((r) => r.data),

  activate: (id: string) => api.post<StaffMember>(`/v1/staff/${id}/activate`).then((r) => r.data),

  remove: (id: string) => api.delete<{ success: boolean }>(`/v1/staff/${id}`).then((r) => r.data),

  credentials: (id: string) => api.get<StaffCredentials>(`/v1/staff/${id}/credentials`).then((r) => r.data),

  resetPassword: (id: string, payload: { password?: string; sendLoginSms?: boolean }) =>
    api
      .post<{ password: string; smsSent: boolean; smsError: string | null }>(`/v1/staff/${id}/reset-password`, payload)
      .then((r) => r.data),

  sendLoginSms: (id: string) => api.post<{ sentAt: string }>(`/v1/staff/${id}/send-login-sms`).then((r) => r.data),

  activity: (staffMemberId?: string) =>
    api.get<StaffActivityEntry[]>('/v1/staff/activity', { params: { staffMemberId } }).then((r) => r.data),

  roles: () => api.get<StaffRolesInfo>('/v1/staff/roles').then((r) => r.data),

  createRole: (payload: { name: string; description?: string; permissions: StaffPermission[] }) =>
    api.post<StaffCustomRole>('/v1/staff/roles', payload).then((r) => r.data),

  updateRole: (id: string, payload: { name?: string; description?: string | null; permissions?: StaffPermission[] }) =>
    api.patch<StaffCustomRole>(`/v1/staff/roles/${id}`, payload).then((r) => r.data),

  duplicateRole: (id: string) => api.post<StaffCustomRole>(`/v1/staff/roles/${id}/duplicate`).then((r) => r.data),

  deleteRole: (id: string) => api.delete<{ success: boolean }>(`/v1/staff/roles/${id}`).then((r) => r.data),
};
