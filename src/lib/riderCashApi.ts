import { api } from './api';

// Orders > Rider cash (TellMe idea 38) — mirrors the server's RiderCashService (server/src/orders/rider-cash.service.ts).

export interface RiderSummary {
  name: string;
  deliveredCount: number;
  returnedCount: number;
  /** Cash collected on delivered Cash on Delivery orders since the start date. */
  collected: number;
  handedIn: number;
  /** collected - handedIn: what the rider still holds. */
  balance: number;
  lastHandedInAt: string | null;
}

export interface RiderOrderRow {
  orderId: string;
  orderRef: string;
  customerName: string;
  area: string | null;
  cash: number;
  at: string;
}

export interface RiderEntry {
  id: string;
  amount: number;
  note: string | null;
  actor: string | null;
  createdAt: string;
}

export interface RiderDetail {
  name: string;
  from: string;
  to: string;
  delivered: RiderOrderRow[];
  returned: RiderOrderRow[];
  collectedInRange: number;
  handedInRange: number;
  entries: RiderEntry[];
  /** All the time since the start date: what the rider still holds. */
  balance: number;
}

export const riderCashApi = {
  riders: () => api.get<{ since: string; riders: RiderSummary[] }>('/v1/rider-cash/riders').then((r) => r.data),

  rider: (name: string, from?: string, to?: string) => api.get<RiderDetail>('/v1/rider-cash/rider', { params: { name, from, to } }).then((r) => r.data),

  addEntry: (riderName: string, amount: number, note?: string) => api.post('/v1/rider-cash/entries', { riderName, amount, note: note?.trim() || undefined }).then((r) => r.data),

  /** The owner only. */
  removeEntry: (id: string) => api.delete(`/v1/rider-cash/entries/${id}`).then((r) => r.data),
};
