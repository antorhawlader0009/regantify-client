import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import type { VendorStatus } from '../../../lib/adminApi';

interface ChangeVendorStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  currentStatus: VendorStatus;
  /** `reason` is given when suspending: the owner is texted it. */
  onConfirm: (next: VendorStatus, reason?: string) => void;
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
  const [status, setStatus] = useState<VendorStatus>(currentStatus === 'CLOSED' ? 'ACTIVE' : currentStatus);
  const [reason, setReason] = useState('');
  const needsReason = status === 'SUSPENDED' && currentStatus !== 'SUSPENDED';

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

        {needsReason && (
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Reason (texted to the owner)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-regantify-search text-regantify-text text-sm focus:outline-none"
            />
          </div>
        )}
      </div>

      <div className="border-t border-black/5 px-6 py-4 flex justify-end">
        <button
          type="button"
          onClick={() => onConfirm(status, needsReason ? reason.trim() : undefined)}
          disabled={submitting || (needsReason && reason.trim().length < 5)}
          className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
            transition-colors disabled:opacity-60"
        >
          {submitting ? 'Changing…' : 'Change Status'}
        </button>
      </div>
    </Dialog>
  );
}
