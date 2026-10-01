import type { OrderStatus } from '../../../lib/ordersApi';

export const ALL_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'PROCESSING',
  'SHIPPING',
  'COMPLETED',
  'ON_HOLD',
  'PAYMENT_INITIATED',
  'PARTIAL_PAYMENT_PENDING',
  'PAYMENT_FAILED',
  'CANCELLED',
  'RETURN',
  'REFUNDED',
  'STOCK_OUT',
];

// PAYMENT_INITIATED included by default (mirrors OrdersService's own
// DEFAULT_TABS server-side) — a storefront order stuck awaiting a
// gateway redirect the shopper abandoned/never completed otherwise only
// ever shows under "All", with no dedicated tab a vendor would think to
// check.
export const DEFAULT_TABS: OrderStatus[] = ['PENDING', 'PAYMENT_INITIATED', 'PROCESSING', 'SHIPPING', 'COMPLETED'];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipping',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  // Shown as its own Orders-page tab (see DEFAULT_TABS) — "Incomplete
  // Payment" reads clearer to a vendor than "Payment Initiated" (which
  // sounds like something still actively in progress, not abandoned).
  PAYMENT_INITIATED: 'Incomplete Payment',
  PARTIAL_PAYMENT_PENDING: 'Partial Payment Pending',
  PAYMENT_FAILED: 'Payment Failed',
  CANCELLED: 'Cancelled',
  RETURN: 'Return',
  REFUNDED: 'Refunded',
  STOCK_OUT: 'Stock Out',
};

export function orderStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] ?? status;
}

// Bordered badge from the dashboard theme (border-200 / bg-50 / text-700):
// amber pending, green done/active, red failure states.
const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  PROCESSING: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  SHIPPING: 'border-sky-200 bg-sky-50 text-sky-700',
  COMPLETED: 'border-green-200 bg-green-50 text-green-700',
  ON_HOLD: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  PAYMENT_INITIATED: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  PARTIAL_PAYMENT_PENDING: 'border-orange-200 bg-orange-50 text-orange-700',
  PAYMENT_FAILED: 'border-red-200 bg-red-50 text-red-700',
  CANCELLED: 'border-red-200 bg-red-50 text-red-700',
  RETURN: 'border-red-200 bg-red-50 text-red-700',
  REFUNDED: 'border-purple-200 bg-purple-50 text-purple-700',
  STOCK_OUT: 'border-red-200 bg-red-50 text-red-700',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-sm ${STATUS_BADGE_CLASSES[status]}`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
