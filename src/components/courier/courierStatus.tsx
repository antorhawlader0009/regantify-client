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

// Client mirror of server/src/courier/providers/steadfast-status.ts's
// STEADFAST_STATUSES. Anything ending "approval pending" is only the
// rider's word — neutral until SteadFast confirms it.
const STEADFAST_STATUSES: Record<string, StatusInfo> = {
  in_review: { label: 'In review', tone: 'neutral' },
  pending: { label: 'Pending', tone: 'progress' },
  hold: { label: 'On hold', tone: 'warning' },
  delivered_approval_pending: { label: 'Delivered (awaiting approval)', tone: 'progress' },
  partial_delivered_approval_pending: { label: 'Partly delivered (awaiting approval)', tone: 'warning' },
  cancelled_approval_pending: { label: 'Cancelled (awaiting approval)', tone: 'warning' },
  unknown_approval_pending: { label: 'Awaiting approval', tone: 'neutral' },
  delivered: { label: 'Delivered', tone: 'success' },
  partial_delivered: { label: 'Partially delivered', tone: 'warning' },
  cancelled: { label: 'Cancelled (coming back)', tone: 'danger' },
  exceptional: { label: 'Exceptional (lost / damaged)', tone: 'danger' },
  unknown: { label: 'Unknown', tone: 'danger' },
  partial_delivered_return_processing: { label: 'Partial return being prepared', tone: 'warning' },
  partial_delivered_return_rider_assigned: { label: 'Partial return on its way', tone: 'warning' },
  partial_delivered_return_received: { label: 'Partial return received', tone: 'warning' },
  cancelled_return_processing: { label: 'Return being prepared', tone: 'warning' },
  cancelled_return_rider_assigned: { label: 'Return on its way', tone: 'warning' },
  cancelled_return_received: { label: 'Returned to you', tone: 'warning' },
};

const STEADFAST_ALIASES: Record<string, string> = {
  on_hold: 'hold',
  partial_delivery: 'partial_delivered',
  partially_delivered: 'partial_delivered',
  review: 'in_review',
};

/** Same normalization as the server's normalizeSteadfastStatus. */
export function normalizeSteadfastStatus(raw: string | null | undefined): string {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-.]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/proccessing/g, 'processing')
    .replace(/canceled/g, 'cancelled');
  return STEADFAST_ALIASES[key] ?? key;
}

// Client mirror of server/src/courier/providers/redx-status.ts's REDX_STATUSES.
const REDX_STATUSES: Record<string, StatusInfo> = {
  pickup_pending: { label: 'Pickup pending', tone: 'neutral' },
  ready_for_delivery: { label: 'At RedX hub', tone: 'progress' },
  delivery_in_progress: { label: 'Out for delivery', tone: 'progress' },
  delivered: { label: 'Delivered', tone: 'success' },
  partial_delivered: { label: 'Partially delivered', tone: 'warning' },
  agent_hold: { label: 'On hold', tone: 'warning' },
  agent_area_change: { label: 'Area change in progress', tone: 'warning' },
  agent_returning: { label: 'Return in progress', tone: 'warning' },
  returned: { label: 'Returned to you', tone: 'warning' },
  paid: { label: 'COD paid by RedX', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

const REDX_ALIASES: Record<string, string> = {
  hold: 'agent_hold',
  on_hold: 'agent_hold',
  returning: 'agent_returning',
  return_in_progress: 'agent_returning',
  area_change: 'agent_area_change',
  partial_delivery: 'partial_delivered',
  partially_delivered: 'partial_delivered',
  canceled: 'cancelled',
  pending: 'pickup_pending',
};

/** Same normalization as the server's normalizeRedxStatus. */
export function normalizeRedxStatus(raw: string | null | undefined): string {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-.]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return REDX_ALIASES[key] ?? key;
}

/** "in_transit" → "In transit" for statuses we don't have a label for. */
function humanize(key: string): string {
  const words = key.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function courierStatusInfo(provider: CourierProvider, raw: string | null | undefined): StatusInfo {
  if (provider === 'STEADFAST') {
    const sfKey = normalizeSteadfastStatus(raw);
    return STEADFAST_STATUSES[sfKey] ?? { label: humanize(sfKey) || 'Unknown', tone: 'neutral' };
  }
  if (provider === 'REDX') {
    const redxKey = normalizeRedxStatus(raw);
    return REDX_STATUSES[redxKey] ?? { label: humanize(redxKey) || 'Unknown', tone: 'neutral' };
  }
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
