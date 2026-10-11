import { api } from './api';

export interface IncentiveRow {
  staffId: string;
  name: string;
  role: string;
  active: boolean;
  perConfirm: number;
  perDelivered: number;
  confirmed: number;
  delivered: number;
  amount: number;
}

export interface IncentiveReport {
  month: string;
  rows: IncentiveRow[];
  total: number;
}

export const staffIncentivesApi = {
  report: (month: string) => api.get<IncentiveReport>('/v1/staff-incentives', { params: { month } }).then((r) => r.data),
  setRates: (staffId: string, perConfirm: number, perDelivered: number) =>
    api.patch<{ ok: boolean }>(`/v1/staff-incentives/${staffId}`, { perConfirm, perDelivered }).then((r) => r.data),
};
