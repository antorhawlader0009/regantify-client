import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';

interface ChangeStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  currentStatus: 'PUBLIC' | 'DRAFT';
  onConfirm: (next: 'PUBLIC' | 'DRAFT') => void;
  submitting?: boolean;
}

/** Matches the reference "Change Status of <product>" modal — a dropdown plus an explicit confirm button, not an instant toggle. */
export function ChangeStatusModal({
  open,
  onOpenChange,
  productName,
  currentStatus,
  onConfirm,
  submitting,
}: ChangeStatusModalProps) {
  const [status, setStatus] = useState<'PUBLIC' | 'DRAFT'>(currentStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-md">
      <div className="p-6 space-y-5">
        <h2 className="font-semibold text-regantify-text">Change Status of {productName}</h2>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'PUBLIC' | 'DRAFT')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-regantify-search text-regantify-text text-sm focus:outline-none"
          >
            <option value="PUBLIC">Public</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
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
