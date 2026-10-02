import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

/** RedX's own step-by-step log for one parcel (GET /parcel/track), fetched live. Used by the RedX Parcels tab and Order Detail. */
export function RedxTrackingHistory({ orderId }: { orderId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['redx-tracking', orderId],
    queryFn: () => courierApi.getRedxTracking(orderId),
  });
  if (isLoading) return <p className="text-sm text-neutral-500">Asking RedX…</p>;
  if (isError || !data) return <p className="text-sm text-red-600">{apiErrorMessage(error, 'Could not load the history from RedX.')}</p>;
  return (
    <div className="space-y-3">
      {data.trackingUrl && (
        <a href={data.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
          Open RedX’s tracking page <ExternalLink size={13} />
        </a>
      )}
      {data.steps.length === 0 ? (
        <p className="text-sm text-neutral-500">RedX has no steps for this parcel yet.</p>
      ) : (
        <ol className="space-y-2.5 border-l border-line pl-4">
          {[...data.steps].reverse().map((step, i) => (
            <li key={i} className="text-sm">
              <p className="text-regantify-text">{step.message || step.messageBn}</p>
              {step.messageBn && step.message && <p className="text-xs text-neutral-500">{step.messageBn}</p>}
              {step.at && <p className="text-xs text-neutral-500">{formatDateTime(step.at)}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
