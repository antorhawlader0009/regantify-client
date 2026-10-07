import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../../components/ui/Dialog';
import { StatusBadge } from './StatusBadge';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { adminApi, type AdminVendor } from '../../../lib/adminApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-black/5 last:border-0">
      <span className="text-sm text-regantify-text-muted">{label}</span>
      <span className="text-sm text-regantify-text text-right">{value}</span>
    </div>
  );
}

/**
 * Add or remove AI Credits (ai-token-plan.md Step 8): an ADJUSTMENT on
 * the store's AI Credit history with the reason, and a bell message to the
 * store. A removal stops at 0.
 */
function AiCreditsAdjust({ vendor, onDone }: { vendor: AdminVendor; onDone: (balanceAfter: number) => void }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const n = Math.round(Number(amount));
  const valid = Number.isFinite(n) && n > 0 && reason.trim().length >= 3;

  const mutation = useMutation({
    mutationFn: () => adminApi.adjustAiCredits(vendor.id, mode === 'add' ? n : -n, reason.trim()),
    onSuccess: (res) => {
      toast.success(`${Math.abs(res.amount).toLocaleString('en-US')} AI Credits ${res.amount > 0 ? 'added' : 'removed'}.`);
      setAmount('');
      setReason('');
      onDone(res.balanceAfter);
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change the AI Credits. Please try again.')),
  });

  return (
    <div className="mt-4 rounded-lg border border-black/5 p-3">
      <p className="text-sm font-medium text-regantify-text mb-2">Add or remove AI Credits</p>
      <div className="flex gap-2 mb-2">
        {(['add', 'remove'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm ${mode === m ? 'bg-regantify-cta text-white' : 'bg-regantify-search text-regantify-text'}`}
          >
            {m === 'add' ? 'Add' : 'Remove'}
          </button>
        ))}
      </div>
      <input
        type="number"
        min={1}
        step={100}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Credits, e.g. 500"
        className="w-full px-3 py-2 mb-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
      />
      <input
        type="text"
        maxLength={200}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (the store sees this)"
        className="w-full px-3 py-2 mb-2 rounded-lg bg-regantify-search text-sm text-regantify-text focus:outline-none"
      />
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!valid || mutation.isPending}
        className="w-full px-4 py-2 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {mutation.isPending ? 'Saving…' : mode === 'add' ? 'Add credits' : 'Remove credits'}
      </button>
    </div>
  );
}

/** Store name click target — full vendor details, including Joined/Last Login (moved out of the table). */
export function VendorDetailsDialog({
  vendor,
  onOpenChange,
}: {
  vendor: AdminVendor | null;
  onOpenChange: (open: boolean) => void;
}) {
  // The list row is a snapshot; show the new balance right after a change.
  const [aiCredits, setAiCredits] = useState(vendor?.aiCreditBalance ?? 0);
  useEffect(() => setAiCredits(vendor?.aiCreditBalance ?? 0), [vendor]);

  return (
    <Dialog open={vendor !== null} onOpenChange={onOpenChange} title={vendor?.storeName ?? ''} maxWidth="max-w-lg">
      {vendor && (
        <div className="px-6 pb-6 pt-4">
          <Row label="Vendor ID" value={<span className="font-mono text-xs">{vendor.id}</span>} />
          <Row
            label="Store URL"
            value={
              <a
                href={storefrontStoreUrl(vendor.subdomain)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-regantify-cta hover:underline"
              >
                {vendor.subdomain}
              </a>
            }
          />
          <Row label="Status" value={<StatusBadge status={vendor.status} />} />
          <Row label="Plan" value={vendor.planName} />
          <Row label="Owner" value={vendor.ownerName ?? '—'} />
          <Row label="Phone" value={vendor.phone ?? '—'} />
          <Row label="Email" value={vendor.email ?? '—'} />
          <Row label="Address" value={vendor.address ?? '—'} />
          <Row label="Balance" value={`৳${Number(vendor.balance).toLocaleString('en-US')}`} />
          <Row label="SMS Left" value={vendor.smsCredits} />
          <Row label="AI Credits" value={aiCredits.toLocaleString('en-US')} />
          <Row label="Products" value={vendor.productCount} />
          <Row label="Orders" value={vendor.orderCount} />
          <Row label="Joined" value={formatDateTime(vendor.createdAt)} />
          <Row label="Last Login" value={formatDateTime(vendor.lastLoginAt)} />
          <AiCreditsAdjust vendor={vendor} onDone={setAiCredits} />
        </div>
      )}
    </Dialog>
  );
}
