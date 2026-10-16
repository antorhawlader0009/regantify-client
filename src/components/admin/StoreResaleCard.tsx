import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../lib/api';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { RESALE_REFUSAL_LABEL, resaleAdminApi, type ResaleAccess } from '../../lib/resaleAdminApi';
import { toast } from '../../lib/toast';
import { Dialog } from '../ui/Dialog';
import { ReasonNeed } from './ReasonNeed';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';

function AccessLine({ label, access }: { label: string; access: ResaleAccess }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/5 py-2.5 last:border-0">
      <span className="text-sm text-regantify-text-muted">{label}</span>
      <span className={`text-right text-sm ${access.allowed ? 'text-emerald-700' : 'text-regantify-text'}`}>{access.allowed ? 'Yes' : `No: ${RESALE_REFUSAL_LABEL[access.reason]}`}</span>
    </div>
  );
}

/**
 * Super Admin > a store's page > Reseller system (RESELLER-plan.md Step 1): whether this store can supply or resell right now and why not, its own
 * share for the platform, and a block. Which stores are invited at all is the RESALE_SUPPLY / RESALE_SELL feature flags.
 */
export function StoreResaleCard({ vendorId }: { vendorId: string }) {
  const qc = useQueryClient();
  const viewer = useAdminViewer();
  const canEdit = adminCan(viewer, 'stores.edit');
  const { data } = useQuery({ queryKey: ['admin', 'store-resale', vendorId], queryFn: () => resaleAdminApi.get(vendorId) });
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!data || open) return;
    setFee(data.feePercent === null ? '' : String(data.feePercent));
    setBlocked(data.blocked !== null);
  }, [data, open]);

  // Step 15: lift a supplier's automatic stock-out pause, keeping the fee and block as they are.
  const lift = useMutation({
    mutationFn: () =>
      resaleAdminApi.update(vendorId, { feePercent: data?.feePercent ?? null, blocked: Boolean(data?.blocked), reason: 'Lifted the supplier stock-out pause', liftSupplierPause: true }),
    onSuccess: (r) => {
      qc.setQueryData(['admin', 'store-resale', vendorId], r);
      toast.success('Pause lifted. Its offers are back.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  const save = useMutation({
    mutationFn: () => resaleAdminApi.update(vendorId, { feePercent: fee.trim() === '' ? null : Number(fee), blocked, reason: reason.trim() }),
    onSuccess: (next) => {
      qc.setQueryData(['admin', 'store-resale', vendorId], next);
      toast.success('Saved.');
      setOpen(false);
      setReason('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });

  if (!data) return null;
  const feeNumber = Number(fee);
  const feeValid = fee.trim() === '' || (Number.isFinite(feeNumber) && feeNumber >= 0 && feeNumber <= 50);

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-regantify-text">Reseller system</h2>
        {canEdit && (
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-medium text-regantify-text">
            Change
          </button>
        )}
      </div>
      <AccessLine label="Can supply resellers" access={data.supply} />
      <AccessLine label="Can resell others’ products" access={data.sell} />
      <div className="flex items-start justify-between gap-4 border-b border-black/5 py-2.5">
        <span className="text-sm text-regantify-text-muted">Platform share of its earnings</span>
        <span className="text-right text-sm text-regantify-text">{data.feePercent === null ? `${data.platformFeePercent}% (platform default)` : `${data.feePercent}% (own deal)`}</span>
      </div>
      {/* Steps 13 and 15: the automatic guards. */}
      {data.returnRate !== null && (
        <p className={`text-sm ${data.returnPausedAt ? 'text-red-700' : 'text-neutral-600'}`}>
          As a reseller: {data.returnRate}% of its resale orders came back (limit {data.returnPauseRate}%)
          {data.returnPausedAt ? `, listings paused since ${formatDhakaDateTime(data.returnPausedAt)}` : ''}.
        </p>
      )}
      {data.supplierPause && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-red-700">
          <span className="min-w-0 flex-1">As a supplier: offers paused until {formatDhakaDateTime(data.supplierPause.until)}{data.supplierPause.reason ? ` (${data.supplierPause.reason})` : ''}.</span>
          {canEdit && (
            <button type="button" disabled={lift.isPending} onClick={() => lift.mutate()} className="rounded-lg border border-line px-2 py-1 text-xs text-regantify-text">
              Lift the pause
            </button>
          )}
        </div>
      )}
      {data.blocked && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          Blocked since {formatDhakaDateTime(data.blocked.since)}
          {data.blocked.reason ? `: ${data.blocked.reason}` : ''}
        </p>
      )}
      <p className="mt-2 text-xs text-regantify-text-muted">
        Which stores are invited is set in <Link to="/admin/feature-flags" className="text-regantify-cta hover:underline">Feature flags</Link> (RESALE_SUPPLY, RESALE_SELL); the verification rule and the default share are in{' '}
        <Link to="/admin/settings?tab=resale" className="text-regantify-cta hover:underline">Settings</Link>.
      </p>

      <Dialog open={open} onOpenChange={setOpen} maxWidth="max-w-md">
        <div className="space-y-4 p-6">
          <h2 className="font-semibold text-regantify-text">Reseller system for this store</h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">Platform share of its earnings (%)</label>
            <input inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, ''))} placeholder={`Empty = platform default (${data.platformFeePercent}%)`} className={field} />
            {!feeValid && <p className="mt-1 text-xs text-red-600">Use a number from 0 to 50.</p>}
          </div>
          <label className="flex items-start gap-2 text-sm text-regantify-text">
            <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-regantify-cta" />
            <span>
              Block this store
              <span className="block text-xs text-regantify-text-muted">It can neither supply nor resell, whatever the feature flags say.</span>
            </span>
          </label>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} className={field} placeholder="Saved in the admin log" />
            <ReasonNeed value={reason} />
          </div>
          <button
            type="button"
            disabled={!feeValid || reason.trim().length < 5 || save.isPending}
            onClick={() => save.mutate()}
            className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Dialog>
    </section>
  );
}
