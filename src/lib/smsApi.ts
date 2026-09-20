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
};
