import { api } from './api';
import type { CloseReasonCode } from './closeReasons';

// Orders > Bulk update by tracking ID (TellMe idea 129) - mirrors the server's TrackingBulkService
// (server/src/orders/tracking-bulk.service.ts).

export type TrackingBulkStatus = 'COMPLETED' | 'RETURN';

export type TrackingBulkRow =
  | { code: string; outcome: 'OK'; orderId: string; ref: string; customerName: string; status: string }
  | { code: string; outcome: 'BLOCKED'; orderId: string; ref: string; customerName: string; status: string; reason: string }
  | { code: string; outcome: 'NOT_FOUND' };

export interface TrackingBulkPreview {
  rows: TrackingBulkRow[];
  ok: number;
  blocked: number;
  notFound: number;
}

export interface TrackingBulkResult {
  updated: number;
  blocked: number;
  notFound: number;
  failed: { code: string; ref: string; reason: string }[];
}

export const trackingBulkApi = {
  preview: (codes: string, status: TrackingBulkStatus) =>
    api.post<TrackingBulkPreview>('/v1/orders/tracking-bulk/preview', { codes, status }).then((r) => r.data),
  apply: (codes: string, status: TrackingBulkStatus, reasonCode?: CloseReasonCode) =>
    api.post<TrackingBulkResult>('/v1/orders/tracking-bulk', { codes, status, ...(reasonCode && { reasonCode }) }).then((r) => r.data),
};
