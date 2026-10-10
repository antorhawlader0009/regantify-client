import { api } from './api';

// Orders > Courier Handover — mirrors the server's HandoverService (server/src/orders/handover.service.ts).
// A sheet is the list of parcels given to a courier's pickup person in one go, frozen when it is made.

export interface HandoverRow {
  orderId: string;
  orderRef: string;
  courier: string;
  trackingId: string | null;
  customerName: string;
  district: string | null;
  /** The cash the courier collects for this parcel. */
  codAmount: number;
}

/** A parcel that could go on a sheet. */
export interface HandoverCandidate extends HandoverRow {
  status: string;
  /** The sheet it was last handed over on, or null. */
  sheetNumber: number | null;
}

export interface HandoverSheetSummary {
  id: string;
  number: number;
  courier: string;
  parcelCount: number;
  codTotal: string | number;
  actor: string;
  note: string | null;
  createdAt: string;
}

export interface HandoverSheet extends HandoverSheetSummary {
  storeName: string;
  rows: HandoverRow[];
}

/** PATHAO / STEADFAST / REDX = that connected courier, MANUAL = a hand-run one (Own rider, Paperfly...), undefined = all. */
export type HandoverCourierFilter = 'PATHAO' | 'STEADFAST' | 'REDX' | 'MANUAL';

export const handoverApi = {
  candidates: (courier?: HandoverCourierFilter, days?: number) =>
    api.get<HandoverCandidate[]>('/v1/handover-sheets/candidates', { params: { courier, days } }).then((r) => r.data),

  /** The parcel behind a typed or scanned tracking ID or order number. */
  find: (code: string) => api.get<HandoverCandidate>('/v1/handover-sheets/find', { params: { code } }).then((r) => r.data),

  list: () => api.get<HandoverSheetSummary[]>('/v1/handover-sheets').then((r) => r.data),

  get: (id: string) => api.get<HandoverSheet>(`/v1/handover-sheets/${id}`).then((r) => r.data),

  create: (orderIds: string[], note?: string) =>
    api.post<HandoverSheet>('/v1/handover-sheets', { orderIds, note: note?.trim() || undefined }).then((r) => r.data),
};
