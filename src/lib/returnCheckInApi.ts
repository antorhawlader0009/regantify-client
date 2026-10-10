import { api } from './api';

// Orders > Return check-in — mirrors the server's ReturnCheckInService (server/src/orders/return-check-in.service.ts).
// A parcel the courier sent back is counted in at the shop: per product line it is good, damaged, or never came.

export type ReturnOutcome = 'GOOD' | 'DAMAGED' | 'MISSING';

export const RETURN_OUTCOME_LABELS: Record<ReturnOutcome, string> = {
  GOOD: 'Good, back in stock',
  DAMAGED: 'Damaged',
  MISSING: 'Did not come',
};

export interface ReturnCheckLine {
  itemId: string;
  productName: string;
  productImage: string | null;
  /** "Red / M", or null for a product without options. */
  options: string | null;
  quantity: number;
  /** Null until checked in. */
  outcome: ReturnOutcome | null;
}

export interface ReturnCheckParcel {
  orderId: string;
  orderRef: string;
  status: string;
  customerName: string;
  courier: string | null;
  trackingId: string | null;
  returnedAt: string | null;
  /** Whether this order's stock was already put back when it was marked Returned. */
  stockAlreadyBack: boolean;
  checkedAt: string | null;
  checkedBy: string | null;
  lines: ReturnCheckLine[];
}

export interface ReturnCheckPending {
  total: number;
  parcels: ReturnCheckParcel[];
  /** Store setting: stock goes back only at check-in. */
  stockAfterCheckIn: boolean;
}

export const returnCheckInApi = {
  pending: () => api.get<ReturnCheckPending>('/v1/return-check-in').then((r) => r.data),

  find: (code: string) => api.get<ReturnCheckParcel>('/v1/return-check-in/find', { params: { code } }).then((r) => r.data),

  checkIn: (orderId: string, lines: { itemId: string; outcome: ReturnOutcome }[], note?: string) =>
    api.post<ReturnCheckParcel>(`/v1/return-check-in/${orderId}`, { lines, note: note?.trim() || undefined }).then((r) => r.data),
};
