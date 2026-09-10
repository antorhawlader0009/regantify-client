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

export const DEFAULT_TABS: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPING', 'COMPLETED'];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPING: 'Shipping',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  PAYMENT_INITIATED: 'Payment Initiated',
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

// Tailwind classes for the pill badge shown per order/status tab —
// matches the color language used across the reference screenshots
// (amber pending, green completed/shipping-active, red failure states).
const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-emerald-100 text-emerald-700',
  SHIPPING: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-gray-200 text-gray-700',
  PAYMENT_INITIATED: 'bg-indigo-100 text-indigo-700',
  PARTIAL_PAYMENT_PENDING: 'bg-orange-100 text-orange-700',
  PAYMENT_FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURN: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
  STOCK_OUT: 'bg-red-100 text-red-700',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${STATUS_BADGE_CLASSES[status]}`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
