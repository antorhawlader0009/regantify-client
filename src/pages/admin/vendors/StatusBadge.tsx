import type { VendorStatus } from '../../../lib/adminApi';

const STYLES: Record<VendorStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

const LABELS: Record<VendorStatus, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  SUSPENDED: 'Suspended',
};

export function StatusBadge({ status }: { status: VendorStatus }) {
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${STYLES[status]}`}>{LABELS[status]}</span>
  );
}
