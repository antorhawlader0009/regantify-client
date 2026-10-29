import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ListChecks } from 'lucide-react';
import { PageHeader, PageSection, primaryBtn } from '../../../components/ui/PageKit';
import { CloseReasonSelect } from '../../../components/order/CloseReasonSelect';
import { RETURN_REASONS, type CloseReasonCode } from '../../../lib/closeReasons';
import { trackingBulkApi, type TrackingBulkPreview, type TrackingBulkResult, type TrackingBulkStatus } from '../../../lib/trackingBulkApi';
import { orderStatusLabel } from './orderStatus';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

/**
 * Orders > Bulk update by tracking ID (TellMe idea 129): paste the IDs from a hand-run courier's daily report and mark them
 * all Completed (delivered) or Return. The list is checked first and nothing changes until "Apply". Every order moves by the
 * single-order rules (money, stock, history); parcels booked through a courier's API are left to that courier's own updates.
 */
export default function TrackingBulk() {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<TrackingBulkStatus>('COMPLETED');
  const [reason, setReason] = useState<CloseReasonCode | ''>('');
  const [preview, setPreview] = useState<TrackingBulkPreview | null>(null);
  const [result, setResult] = useState<TrackingBulkResult | null>(null);

  const check = useMutation({
    mutationFn: () => trackingBulkApi.preview(text, status),
    onSuccess: (res) => {
      setPreview(res);
      setResult(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not check the list. Please try again.')),
  });

  const apply = useMutation({
    mutationFn: () => trackingBulkApi.apply(text, status, status === 'RETURN' && reason ? reason : undefined),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setResult(res);
      setPreview(null);
      setText('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update the orders. Please try again.')),
  });

  const changed = () => {
    setPreview(null);
    setResult(null);
  };
  const canApply = preview !== null && preview.ok > 0 && (status !== 'RETURN' || reason !== '');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bulk update by tracking ID"
        description="Paste the IDs from your courier’s report and mark them delivered or returned in one go."
        back={{ to: '/vendor/orders', label: 'All orders' }}
      />

      <PageSection><h2 className="m-0 mb-2 text-sm font-semibold">1. Paste the IDs</h2>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            changed();
          }}
          rows={7}
          placeholder={'One per line, or separated by commas.\nTracking ID, consignment ID or order number.'}
          className="block w-full rounded-lg border border-line bg-white p-3 font-mono text-sm text-regantify-text focus:border-brand focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-regantify-text">
            Mark them as{' '}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as TrackingBulkStatus);
                changed();
              }}
              className="ml-1 h-9 rounded-lg border border-line bg-white px-3 text-sm font-normal focus:border-brand focus:outline-none"
            >
              <option value="COMPLETED">Completed (delivered)</option>
              <option value="RETURN">Return</option>
            </select>
          </label>
          <button type="button" className={primaryBtn} disabled={text.trim() === '' || check.isPending} onClick={() => check.mutate()}>
            <ListChecks size={15} /> {check.isPending ? 'Checking…' : 'Check the list'}
          </button>
          <span className="text-xs text-neutral-500">Up to 200 IDs.</span>
        </div>
      </PageSection>

      {preview && (
        <PageSection><h2 className="m-0 mb-2 text-sm font-semibold">2. Check, then apply</h2>
          <p className="text-sm">
            <span className="font-semibold text-green-700">{preview.ok} ready</span> · {preview.blocked} can’t change · {preview.notFound} not found
          </p>
          <ul className="mt-3 max-h-96 divide-y divide-line overflow-y-auto rounded-lg border border-line text-sm">
            {preview.rows.map((r) => (
              <li key={r.code} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2">
                <span className="font-mono text-xs">{r.code}</span>
                {r.outcome === 'NOT_FOUND' ? (
                  <span className="text-red-600">Not found</span>
                ) : (
                  <>
                    <span className="font-medium">{r.ref}</span>
                    <span className="text-neutral-600">{r.customerName}</span>
                    <span className="text-xs text-neutral-500">now {orderStatusLabel(r.status as never)}</span>
                    {r.outcome === 'OK' ? <span className="ml-auto text-green-700">Ready</span> : <span className="ml-auto text-amber-700">{r.reason}</span>}
                  </>
                )}
              </li>
            ))}
          </ul>
          {status === 'RETURN' && <CloseReasonSelect choices={RETURN_REASONS} value={reason} onChange={setReason} label="Why did the parcels come back?" />}
          <div className="mt-4 flex justify-end">
            <button type="button" className={primaryBtn} disabled={!canApply || apply.isPending} onClick={() => apply.mutate()}>
              {apply.isPending ? 'Updating…' : `Apply to ${preview.ok} ${preview.ok === 1 ? 'order' : 'orders'}`}
            </button>
          </div>
        </PageSection>
      )}

      {result && (
        <PageSection><h2 className="m-0 mb-2 text-sm font-semibold">Done</h2>
          <p className="text-sm">
            {result.updated} {result.updated === 1 ? 'order' : 'orders'} updated.
            {result.blocked + result.notFound > 0 && ` ${result.blocked} couldn’t change and ${result.notFound} weren’t found, so they were left as they are.`}
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {result.failed.map((f) => (
                <li key={f.code}>
                  <span className="font-medium">{f.ref}</span> <span className="text-neutral-600">- {f.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </PageSection>
      )}
    </div>
  );
}
