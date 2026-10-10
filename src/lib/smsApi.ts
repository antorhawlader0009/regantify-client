import { api } from './api';

export interface SmsLog {
  id: string;
  vendorId: string;
  phone: string;
  message: string;
  smsCount: number;
  createdAt: string;
}

export interface SmsPackage {
  id: 'STARTER' | 'STANDARD' | 'BULK';
  smsCount: number;
  price: number;
}

export const smsApi = {
  getCredits: () => api.get<{ smsCredits: number }>('/v1/sms/credits').then((r) => r.data),

  getLogs: () => api.get<SmsLog[]>('/v1/sms/logs').then((r) => r.data),

  sendTest: (phone: string) =>
    api.post<{ smsCredits: number }>('/v1/sms/test', { phone }).then((r) => r.data),

  getPackages: () => api.get<SmsPackage[]>('/v1/sms/packages').then((r) => r.data),

  /** How many customers a campaign reaches and the credits it takes. */
  previewCampaign: (target: SmsCampaignTarget & { message?: string }) =>
    api.post<SmsCampaignPreview>('/v1/sms/campaign/preview', target).then((r) => r.data),

  /** Sends to every customer in the audience (in the background on the server). */
  sendCampaign: (target: SmsCampaignTarget & { message: string }) =>
    api.post<{ queued: number; totalCredits: number }>('/v1/sms/campaign', target).then((r) => r.data),

  /** "Send later": saved to go out at `sendAt` (an ISO time, 8 AM to 10 PM Dhaka). Nothing is sent or charged now. */
  scheduleCampaign: (target: SmsCampaignTarget & { message: string; sendAt: string }) =>
    api.post<{ scheduled: true; id: string; sendAt: string; recipients: number; totalCredits: number }>('/v1/sms/campaign', target).then((r) => r.data),

  /** Upcoming campaigns first, then what already went out. */
  listScheduled: () => api.get<ScheduledSms[]>('/v1/sms/campaign/scheduled').then((r) => r.data),

  /** Cancels a campaign that hasn't started. */
  cancelScheduled: (id: string) => api.delete(`/v1/sms/campaign/scheduled/${id}`).then((r) => r.data),

  /** One SMS to one customer (Order detail). */
  sendSingle: (phone: string, message: string) =>
    api.post<{ smsCredits: number }>('/v1/sms/send', { phone, message }).then((r) => r.data),
};

/** Who an SMS campaign goes to (SMS_AUDIENCES on the server). */
export type SmsAudience = 'ALL' | 'RECENT' | 'INACTIVE' | 'SELECTED' | 'TAG' | 'VIP' | 'RETURNING';

export type ScheduledSmsStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

/** A campaign saved for later (or already out). `recipients` and `sentCount` are filled in when it goes out. */
export interface ScheduledSms {
  id: string;
  message: string;
  audience: SmsAudience;
  days: number | null;
  tag: string | null;
  /** How many hand-picked customers (audience SELECTED). */
  selectedCount: number;
  sendAt: string;
  status: ScheduledSmsStatus;
  recipients: number | null;
  sentCount: number | null;
  error: string | null;
  sentAt: string | null;
}

export interface SmsCampaignTarget {
  audience: SmsAudience;
  days?: number;
  phones?: string[];
  /** TAG: customers carrying this tag (Customers > note and tags). */
  tag?: string;
}

export interface SmsCampaignPreview {
  recipients: number;
  smsPerMessage: number;
  totalCredits: number;
  smsCredits: number;
}
