import { api } from './api';

// Profit on one order, as Analytics counts it (server/src/analytics/order-money.ts). Needs analytics.profit.

export interface OrderProfit {
  orderId: string;
  /** The parcel came back: nothing was earned, only the courier fee is lost. */
  returned: boolean;
  revenue: number;
  productCost: number;
  courierFee: number;
  platformCharge: number;
  vat: number;
  profit: number;
  margin: number | null;
  /** False when a product line has no cost, so the profit is higher than the truth. */
  costKnown: boolean;
}

export const orderProfitApi = {
  /** Orders that never became a sale (cancelled, unpaid) have no row. */
  get: (ids: string[]) =>
    ids.length === 0 ? Promise.resolve([] as OrderProfit[]) : api.get<OrderProfit[]>('/v1/orders/profit', { params: { ids: ids.join(',') } }).then((r) => r.data),
};
