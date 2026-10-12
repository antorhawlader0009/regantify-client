import { api } from './api';

// Orders > Standing orders (TellMe idea 149) — mirrors the server's StandingOrdersService (server/src/orders/standing-orders.service.ts).

export interface StandingLine {
  productId: string;
  variantId: string | null;
  quantity: number;
  selectedOptions: Record<string, string>;
  productName: string;
}

export interface StandingOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingDistrict: string | null;
  deliveryZone: 'DHAKA' | 'OUTSIDE_DHAKA' | 'AROUND_DHAKA' | 'PICKUP';
  note: string | null;
  schedule: { intervalDays: number | null; weekday: number | null; text: string };
  startsOn: string;
  endsOn: string | null;
  nextRunOn: string;
  paused: boolean;
  /** Paused because its end day passed. */
  ended: boolean;
  lastRunAt: string | null;
  lastOrderId: string | null;
  lastOrderRef: string | null;
  /** Why the last due day made no order, or null. */
  lastError: string | null;
  actor: string | null;
  lines: StandingLine[];
}

export interface MakeStandingInput {
  intervalDays?: number;
  weekday?: number;
  startsOn?: string;
  endsOn?: string;
}

export const standingOrdersApi = {
  list: () => api.get<StandingOrder[]>('/v1/standing-orders').then((r) => r.data),
  createFromOrder: (orderId: string, input: MakeStandingInput) =>
    api.post<{ id: string; nextRunOn: string }>(`/v1/standing-orders/from-order/${orderId}`, input).then((r) => r.data),
  update: (id: string, input: { paused?: boolean; intervalDays?: number; weekday?: number; endsOn?: string | null }) =>
    api.patch<{ success: true }>(`/v1/standing-orders/${id}`, input).then((r) => r.data),
  remove: (id: string) => api.delete<{ success: true }>(`/v1/standing-orders/${id}`).then((r) => r.data),
};
