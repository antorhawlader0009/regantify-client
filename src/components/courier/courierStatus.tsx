import type { CourierProvider } from '../../lib/ordersApi';

type Tone = 'neutral' | 'progress' | 'success' | 'warning' | 'danger';

interface StatusInfo {
  label: string;
  tone: Tone;
}

// Client mirror of server/src/courier/providers/pathao-status.ts's
// PATHAO_STATUSES (labels + whether it needs the vendor's attention).
// Keys are normalized the same way (normalizeCourierStatus).
const PATHAO_STATUSES: Record<string, StatusInfo> = {
  pending: { label: 'Pending', tone: 'neutral' },
  pickup_requested: { label: 'Pickup requested', tone: 'neutral' },
  assigned_for_pickup: { label: 'Assigned for pickup', tone: 'neutral' },
  pickup_failed: { label: 'Pickup failed', tone: 'danger' },
  pickup_cancelled: { label: 'Pickup cancelled', tone: 'danger' },
  picked: { label: 'Picked up', tone: 'progress' },
  at_the_sorting_hub: { label: 'At the sorting hub', tone: 'progress' },
  in_transit: { label: 'In transit', tone: 'progress' },
  received_at_last_mile_hub: { label: 'At the last-mile hub', tone: 'progress' },
  assigned_for_delivery: { label: 'Out for delivery', tone: 'progress' },
  delivered: { label: 'Delivered', tone: 'success' },
  partial_delivery: { label: 'Partially delivered', tone: 'warning' },
  delivery_failed: { label: 'Delivery failed', tone: 'danger' },
  on_hold: { label: 'On hold', tone: 'warning' },
  return: { label: 'Returned', tone: 'warning' },
  return_id_created: { label: 'Return created', tone: 'warning' },
  return_in_transit: { label: 'Return in transit', tone: 'warning' },
  returned_to_merchant: { label: 'Returned to you', tone: 'warning' },
  paid_return: { label: 'Return paid', tone: 'warning' },
  exchange: { label: 'Exchanged', tone: 'warning' },
  payment_invoice: { label: 'COD paid by Pathao', tone: 'success' },
};

const ALIASES: Record<string, string> = {
  created: 'pending',
  returned: 'return',
  paid: 'payment_invoice',
  exchanged: 'exchange',
  sorting_hub: 'at_the_sorting_hub',
  hold: 'on_hold',
};

/** Same normalization as the server's normalizePathaoStatus. */
export function normalizeCourierStatus(raw: string | null | undefined): string {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^order\./, '')
    .replace(/[\s\-.]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return ALIASES[key] ?? key;
}

/** "in_transit" → "In transit" for statuses we don't have a label for. */
function humanize(key: string): string {
  const words = key.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function courierStatusInfo(provider: CourierProvider, raw: string | null | undefined): StatusInfo {
  const key = normalizeCourierStatus(raw);
  if (provider === 'PATHAO' && PATHAO_STATUSES[key]) return PATHAO_STATUSES[key];
  if (key === 'delivered') return { label: 'Delivered', tone: 'success' };
  return { label: humanize(key) || 'Unknown', tone: 'neutral' };
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-regantify-content text-regantify-text-muted',
  progress: 'bg-blue-50 text-blue-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-600',
};

/** The courier's own status as a small pill, e.g. "Pathao: In transit". */
export function CourierStatusBadge({ provider, status, prefix }: { provider: CourierProvider; status: string; prefix?: string }) {
  const info = courierStatusInfo(provider, status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TONE_CLASSES[info.tone]}`} title={status}>
      {prefix ? `${prefix}: ` : ''}
      {info.label}
    </span>
  );
}
