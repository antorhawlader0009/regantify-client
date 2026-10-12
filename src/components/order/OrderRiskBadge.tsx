import { MapPinOff, ShieldAlert } from 'lucide-react';
import type { Order } from '../../lib/ordersApi';
import { ADDRESS_PROBLEM_TEXT, addressProblem, type AddressProblem } from '../../lib/addressCheck';

const STYLE: Record<'MEDIUM' | 'HIGH', { label: string; cls: string }> = {
  MEDIUM: { label: 'Medium risk', cls: 'border-amber-300 bg-amber-50 text-amber-900' },
  HIGH: { label: 'High risk', cls: 'border-red-300 bg-red-50 text-red-700' },
};

/** What is missing from an open order's address (TellMe idea 144), or null. Pickup, counter and finished orders are never checked. */
export function orderAddressProblem(order: Pick<Order, 'status' | 'source' | 'deliveryZone' | 'shippingAddress' | 'shippingCity' | 'shippingDistrict'>): AddressProblem | null {
  if (order.source === 'POS' || order.deliveryZone === 'PICKUP') return null;
  if (order.status !== 'PENDING' && order.status !== 'ON_HOLD' && order.status !== 'PROCESSING') return null;
  return addressProblem(order.shippingAddress, [order.shippingCity, order.shippingDistrict]);
}

/** Orders list: a small mark under the status when the address may not be enough for a rider, so the team calls before booking a courier. */
export function AddressCheckMark({ order }: { order: Parameters<typeof orderAddressProblem>[0] }) {
  const problem = orderAddressProblem(order);
  if (!problem) return null;
  return (
    <p
      className="mt-1 inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-900"
      title={`${ADDRESS_PROBLEM_TEXT[problem]} Call the customer and correct it with Edit contact before booking a courier.`}
    >
      <MapPinOff size={10} aria-hidden />
      Address incomplete?
    </p>
  );
}

/** The reasons behind an order's risk level (TellMe idea 143), as saved by the server. */
export function riskReasonsOf(order: Pick<Order, 'riskReasons'>): string[] {
  return Array.isArray(order.riskReasons) ? order.riskReasons.filter((r): r is string => typeof r === 'string') : [];
}

/**
 * Small badge for the Orders list: shown only for Medium and High (a Low order has nothing to say). Hovering shows why. Staff see it
 * only when the server sends it, which is to anyone who can view orders.
 */
export function OrderRiskBadge({ order }: { order: Pick<Order, 'riskLevel' | 'riskReasons'> }) {
  if (order.riskLevel !== 'MEDIUM' && order.riskLevel !== 'HIGH') return null;
  const s = STYLE[order.riskLevel];
  const reasons = riskReasonsOf(order);
  return (
    <p
      className={`mt-1 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${s.cls}`}
      title={reasons.length > 0 ? reasons.join('\n') : 'Open the order to see why.'}
    >
      <ShieldAlert size={10} aria-hidden />
      {s.label}
    </p>
  );
}

/** Order detail: the level with every reason in a list, so the vendor can decide whether to call before confirming. */
export function OrderRiskCard({ order }: { order: Pick<Order, 'riskLevel' | 'riskReasons'> }) {
  if (order.riskLevel !== 'MEDIUM' && order.riskLevel !== 'HIGH') return null;
  const high = order.riskLevel === 'HIGH';
  const reasons = riskReasonsOf(order);
  return (
    <div className={`rounded-xl border px-4 py-3 ${high ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
      <p className={`flex items-center gap-2 text-sm font-medium ${high ? 'text-red-800' : 'text-amber-900'}`}>
        <ShieldAlert size={16} className="shrink-0" aria-hidden />
        {high ? 'High risk order. Call the customer before you confirm it.' : 'Medium risk order. A quick call may be worth it.'}
      </p>
      {reasons.length > 0 && (
        <ul className={`mt-1.5 list-disc space-y-0.5 pl-9 text-sm ${high ? 'text-red-800' : 'text-amber-900'}`}>
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 pl-6 text-xs text-neutral-500">Only you can see this. It is a guide from past orders and courier records, not a verdict.</p>
    </div>
  );
}
