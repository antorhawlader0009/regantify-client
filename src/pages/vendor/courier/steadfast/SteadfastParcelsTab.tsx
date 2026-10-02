import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { courierApi, type SteadfastParcel, type SteadfastParcelGroup } from '../../../../lib/courierApi';
import { apiErrorMessage } from '../../../../lib/api';
import { Dialog } from '../../../../components/ui/Dialog';
import { DropdownMenuItem } from '../../../../components/ui/DropdownMenu';
import { CourierTimeline } from '../../../../components/courier/CourierTimeline';
import { SteadfastReturnDialog, steadfastReturnable } from '../../../../components/courier/SteadfastReturnDialog';
import { CourierParcelsTable } from '../../../../components/courier/CourierKit';

const GROUPS: { id: SteadfastParcelGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'On the way' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'returned', label: 'Returned' },
  { id: 'attention', label: 'Needs attention' },
];

/** SteadFast's own step-by-step log for one parcel (trackings_by_invoice), fetched live. */
function TrackingHistory({ orderId }: { orderId: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['steadfast-tracking', orderId],
    queryFn: () => courierApi.getSteadfastTracking(orderId),
  });
  if (isLoading) return <p className="text-sm text-neutral-500">Asking SteadFast…</p>;
  if (isError || !data) return <p className="text-sm text-red-600">{apiErrorMessage(error, 'SteadFast didn’t send the history just now. Try again in a minute.')}</p>;
  return (
    <div className="space-y-3">
      {data.trackingUrl && (
        <a href={data.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
          Open SteadFast’s tracking page <ExternalLink size={13} aria-hidden />
        </a>
      )}
      {data.steps.length === 0 ? (
        <p className="text-sm text-neutral-500">SteadFast has no steps for this parcel yet.</p>
      ) : (
        <ol className="space-y-2.5 border-l border-line pl-4">
          {[...data.steps].reverse().map((step, i) => (
            <li key={i} className="text-sm">
              <p className="text-regantify-text">{step.message || step.status}</p>
              <p className="text-xs text-neutral-500">
                {step.at ?? ''}
                {step.status && step.message && <> · {step.status}</>}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Courier Integration > SteadFast > Parcels: every order booked with
 * SteadFast, filterable by where the parcel is, searchable by invoice /
 * phone / name / consignment ID / tracking code, paginated on the server.
 */
export function SteadfastParcelsTab() {
  const [timelineFor, setTimelineFor] = useState<SteadfastParcel | null>(null);
  const [historyFor, setHistoryFor] = useState<SteadfastParcel | null>(null);
  const [returnFor, setReturnFor] = useState<SteadfastParcel | null>(null);

  return (
    <CourierParcelsTable<SteadfastParcel, SteadfastParcelGroup>
      provider="STEADFAST"
      courier="SteadFast"
      queryKey="steadfast-parcels"
      fetchPage={courierApi.getSteadfastParcels}
      groups={GROUPS}
      searchPlaceholder="Invoice, phone, name or tracking ID"
      idColumns={[
        { header: 'Tracking ID', what: 'Tracking ID', value: (p) => p.courierTrackingCode },
        { header: 'Consignment ID', what: 'Consignment ID', value: (p) => p.courierConsignmentId },
      ]}
      actions={(parcel, refresh) => (
        <>
          <DropdownMenuItem onSelect={() => setTimelineFor(parcel)}>View timeline</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setHistoryFor(parcel)}>SteadFast tracking history</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => refresh.mutate()} disabled={refresh.isPending}>
            {refresh.isPending ? 'Refreshing…' : 'Refresh status'}
          </DropdownMenuItem>
          {parcel.courierTrackingUrl && (
            <DropdownMenuItem onSelect={() => window.open(parcel.courierTrackingUrl!, '_blank', 'noopener')}>Open tracking page</DropdownMenuItem>
          )}
          {steadfastReturnable(parcel.courierStatus) && <DropdownMenuItem onSelect={() => setReturnFor(parcel)}>Ask for a return</DropdownMenuItem>}
        </>
      )}
    >
      <Dialog
        open={timelineFor != null}
        onOpenChange={(open) => !open && setTimelineFor(null)}
        title={timelineFor ? `ORDER-${timelineFor.invoiceNumber} timeline` : undefined}
        maxWidth="max-w-md"
      >
        <div className="p-6 pt-4">{timelineFor && <CourierTimeline orderId={timelineFor.id} showEmpty />}</div>
      </Dialog>

      <Dialog
        open={historyFor != null}
        onOpenChange={(open) => !open && setHistoryFor(null)}
        title={historyFor ? `SteadFast history · ORDER-${historyFor.invoiceNumber}` : undefined}
        maxWidth="max-w-md"
      >
        <div className="p-6 pt-4">{historyFor && <TrackingHistory orderId={historyFor.id} />}</div>
      </Dialog>

      <SteadfastReturnDialog order={returnFor} onClose={() => setReturnFor(null)} />
    </CourierParcelsTable>
  );
}
