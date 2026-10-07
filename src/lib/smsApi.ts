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

  /** One SMS to one customer (Order detail). */
  sendSingle: (phone: string, message: string) =>
    api.post<{ smsCredits: number }>('/v1/sms/send', { phone, message }).then((r) => r.data),
};

/** Who an SMS campaign goes to (SMS_AUDIENCES on the server). */
export type SmsAudience = 'ALL' | 'RECENT' | 'SELECTED';

export interface SmsCampaignTarget {
  audience: SmsAudience;
  days?: number;
  phones?: string[];
}

export interface SmsCampaignPreview {
  recipients: number;
  smsPerMessage: number;
  totalCredits: number;
  smsCredits: number;
}
