import { api } from './api';

// Platform announcements (TellMe idea 131) — mirrors server/src/announcements.

export type AnnouncementTone = 'INFO' | 'WARNING' | 'URGENT';
export type AnnouncementFeature = 'POS' | 'LMS' | 'CUSTOM_DOMAIN';
export type PlanCodeValue = 'FREE' | 'BASIC' | 'STARTER' | 'ADVANCE';

export const TONE_LABEL: Record<AnnouncementTone, string> = { INFO: 'Information', WARNING: 'Warning', URGENT: 'Urgent' };
export const FEATURE_LABEL: Record<AnnouncementFeature, string> = { POS: 'POS System', LMS: 'LMS', CUSTOM_DOMAIN: 'Custom domain' };

/** What a store sees. */
export interface VendorAnnouncement {
  id: string;
  title: string;
  body: string;
  linkLabel: string | null;
  linkUrl: string | null;
  tone: AnnouncementTone;
  startsAt: string;
  dismissed: boolean;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  linkLabel: string | null;
  linkUrl: string | null;
  tone: AnnouncementTone;
  planCodes: PlanCodeValue[];
  feature: AnnouncementFeature | null;
  startsAt: string;
  endsAt: string | null;
  dismissedCount: number;
}

export type SaveAnnouncement = Omit<AdminAnnouncement, 'id' | 'dismissedCount' | 'startsAt' | 'endsAt'> & { startsAt: string | null; endsAt: string | null };

export const announcementsApi = {
  forMe: () => api.get<VendorAnnouncement[]>('/v1/announcements').then((r) => r.data),
  dismiss: (id: string) => api.post(`/v1/announcements/${id}/dismiss`).then((r) => r.data),
};

export const adminAnnouncementsApi = {
  list: () => api.get<AdminAnnouncement[]>('/v1/admin/announcements').then((r) => r.data),
  create: (body: SaveAnnouncement) => api.post<AdminAnnouncement>('/v1/admin/announcements', body).then((r) => r.data),
  update: (id: string, body: SaveAnnouncement) => api.patch<AdminAnnouncement>(`/v1/admin/announcements/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/v1/admin/announcements/${id}`).then((r) => r.data),
};
