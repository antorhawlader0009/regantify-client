import { api } from './api';

// Mirrors server/src/cod-fee-watch/ (security review P-12).

export interface CodFeeWatch {
  days: number;
  stuckAfterDays: number;
  totals: { stuckShipping: number; stuckFee: number; cancelledAfterShipping: number };
  stores: Array<{
    vendorId: string;
    storeName: string;
    subdomain: string;
    stuckShipping: number;
    stuckFee: number;
    cancelledAfterShipping: number;
    completed: number;
  }>;
}

export const codFeeWatchApi = {
  stores: (days: number) => api.get<CodFeeWatch>('/v1/admin/cod-fee-watch', { params: { days } }).then((r) => r.data),
};
