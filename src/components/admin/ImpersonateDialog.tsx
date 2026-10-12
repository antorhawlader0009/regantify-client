import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { adminApi, type AdminVendor, type ImpersonationMode } from '../../lib/adminApi';
import { toast } from '../../lib/toast';

/** "Login as Vendor" (super-admin-plan.md Step 2): a reason is required, and the session is view-only unless "Can make changes" is picked. */
export function ImpersonateDialog({ vendor, onClose }: { vendor: AdminVendor | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<ImpersonationMode>('VIEW');

  const start = useMutation({
    mutationFn: () => adminApi.impersonateVendor(vendor!.id, reason.trim(), mode),
    onSuccess: ({ token }) => {
      window.open(`/vendor-impersonate?token=${encodeURIComponent(token)}`, '_blank', 'noopener');
      setReason('');
      setMode('VIEW');
      onClose();
    },
    onError: () => toast.error('Could not start a vendor session. Please try again.'),
  });

  const ok = reason.trim().length >= 5;
  return (
    <Dialog open={!!vendor} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">Login as {vendor?.storeName}</h2>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-regantify-text">Why are you opening this store?</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="For example: owner called about missing orders"
            className="w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none"
          />
          <p className="mt-1 text-xs text-regantify-text-muted">The reason is saved in the admin log, and the store owner sees it in their Activity log.</p>
        </div>
        <div className="space-y-2">
          {(
            [
              ['VIEW', 'View only', 'You can look around. Every change is refused.'],
              ['EDIT', 'Can make changes', 'Changes are saved as “your name (Super Admin)”, never as the owner.'],
            ] as const
          ).map(([value, label, hint]) => (
            <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === value ? 'border-regantify-black' : 'border-black/10'}`}>
              <input type="radio" name="imp-mode" checked={mode === value} onChange={() => setMode(value)} className="mt-1" />
              <span>
                <span className="block text-sm font-medium text-regantify-text">{label}</span>
                <span className="block text-xs text-regantify-text-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-black/5 px-6 py-4">
        <button type="button" onClick={onClose} className="rounded-xl border border-black/10 px-4 py-2.5 text-sm hover:bg-regantify-content">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => start.mutate()}
          disabled={!ok || start.isPending}
          className="rounded-xl bg-regantify-cta px-6 py-2.5 font-medium text-white transition-colors hover:bg-regantify-cta-dark disabled:opacity-60"
        >
          {start.isPending ? 'Opening…' : 'Open store'}
        </button>
      </div>
    </Dialog>
  );
}
