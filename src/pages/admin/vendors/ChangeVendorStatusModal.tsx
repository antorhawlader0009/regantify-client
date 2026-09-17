import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import type { VendorStatus } from '../../../lib/adminApi';

interface ChangeVendorStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  currentStatus: VendorStatus;
  onConfirm: (next: VendorStatus) => void;
  submitting?: boolean;
}

/** Same "select + explicit confirm" shape as the product ChangeStatusModal, not an instant toggle. */
export function ChangeVendorStatusModal({
  open,
  onOpenChange,
  storeName,
  currentStatus,
  onConfirm,
  submitting,
}: ChangeVendorStatusModalProps) {
  const [status, setStatus] = useState<VendorStatus>(currentStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-md">
      <div className="p-6 space-y-5">
        <h2 className="font-semibold text-regantify-text">Change Status of {storeName}</h2>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as VendorStatus)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-regantify-search text-regantify-text text-sm focus:outline-none"
          >
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        {status === 'SUSPENDED' && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            Suspending blocks this vendor from logging into their dashboard and takes their storefront offline for
            shoppers, immediately.
          </p>
        )}
      </div>

      <div className="border-t border-black/5 px-6 py-4 flex justify-end">
        <button
          type="button"
          onClick={() => onConfirm(status)}
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
            transition-colors disabled:opacity-60"
        >
          {submitting ? 'Changing…' : 'Change Status'}
        </button>
      </div>
    </Dialog>
  );
}
