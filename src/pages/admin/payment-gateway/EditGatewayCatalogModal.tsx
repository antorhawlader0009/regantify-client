import { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import type { PaymentGatewayCatalogEntry } from '../../../lib/paymentGatewaysApi';
import type { UpdateGatewayCatalogPayload } from '../../../lib/adminPaymentGatewaysApi';

interface EditGatewayCatalogModalProps {
  entry: PaymentGatewayCatalogEntry | null;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: UpdateGatewayCatalogPayload) => void;
  submitting?: boolean;
}

/**
 * Super Admin > Payment Gateway > Edit — display name/description for one
 * catalog row. The platform-wide enable/disable switch lives directly in
 * the table (PaymentGatewayManagement.tsx) instead, so this modal only
 * ever edits copy, never `isEnabledPlatformWide`. COD/ONLINE_PAYMENT's
 * fee isn't edited here at all — it's fully plan-driven (Admin > Plans >
 * Manage Plans), there is no "platform charge" concept separate from a
 * plan's own fee anywhere in the product.
 */
export function EditGatewayCatalogModal({ entry, onOpenChange, onSave, submitting }: EditGatewayCatalogModalProps) {
  const [displayName, setDisplayName] = useState(entry?.displayName ?? '');
  const [description, setDescription] = useState(entry?.description ?? '');

  const handleSave = () => {
    onSave({ displayName, description });
  };

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange} title={entry ? `Edit ${entry.displayName}` : ''} maxWidth="max-w-lg">
      {entry && (
        <div className="p-6 pt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-regantify-text-muted mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none resize-none"
            />
          </div>
        </div>
      )}

      <div className="border-t border-black/5 px-6 py-4 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
            transition-colors disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}
