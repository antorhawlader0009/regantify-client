import { api } from './api';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  isOwner: boolean;
  email: string | null;
  phone: string | null;
  allowedIp: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
}

export interface CreateStaffMemberPayload {
  name: string;
  phone: string;
  email?: string;
  role: string;
  password?: string;
  allowedIp?: string;
}

export interface CreateStaffMemberResponse {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  allowedIp: string | null;
  /** Shown once, right after creation — see StaffService.create's own comment for why this comes back in the response at all. */
  temporaryPassword: string;
}

export const staffApi = {
  list: (search?: string) => api.get<StaffMember[]>('/api/v1/staff', { params: { search } }).then((r) => r.data),

  create: (payload: CreateStaffMemberPayload) =>
    api.post<CreateStaffMemberResponse>('/api/v1/staff', payload).then((r) => r.data),

  remove: (id: string) => api.delete<{ success: boolean }>(`/api/v1/staff/${id}`).then((r) => r.data),
};
