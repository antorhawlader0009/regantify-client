import { useState } from 'react';
import { courierApi, redxCancellable, redxTrackingUrl, type RedxParcel, type RedxParcelGroup } from '../../../../lib/courierApi';
import { Dialog } from '../../../../components/ui/Dialog';
import { DropdownMenuItem } from '../../../../components/ui/DropdownMenu';
import { CourierTimeline } from '../../../../components/courier/CourierTimeline';
import { RedxCancelDialog } from '../../../../components/courier/RedxCancelDialog';
import { RedxTrackingHistory } from '../../../../components/courier/RedxTrackingHistory';
import { CourierParcelsTable } from '../../../../components/courier/CourierKit';

const GROUPS: { id: RedxParcelGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'On the way' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'returned', label: 'Returned' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'cancelled', label: 'Cancelled' },
];

/**
 * Courier Integration > RedX > Parcels: every order booked with RedX,
 * filterable by where the parcel is, searchable by invoice / phone /
 * name / tracking ID, paginated on the server. Parcels cancelled before
 * pickup stay listed under "Cancelled" until the order is booked again.
 */
export function RedxParcelsTab() {
  const [timelineFor, setTimelineFor] = useState<RedxParcel | null>(null);
  const [historyFor, setHistoryFor] = useState<RedxParcel | null>(null);
  const [cancelFor, setCancelFor] = useState<RedxParcel | null>(null);

  return (
    <CourierParcelsTable<RedxParcel, RedxParcelGroup>
      provider="REDX"
      courier="RedX"
      queryKey="redx-parcels"
      fetchPage={courierApi.getRedxParcels}
      groups={GROUPS}
      searchPlaceholder="Invoice, phone, name or tracking ID"
      idColumns={[{ header: 'Tracking ID', what: 'Tracking ID', value: (p) => p.courierConsignmentId }]}
      actions={(parcel, refresh) => {
        const booked = parcel.courierBookingStatus === 'BOOKED';
        return (
          <>
            <DropdownMenuItem onSelect={() => setTimelineFor(parcel)}>View timeline</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setHistoryFor(parcel)}>RedX tracking history</DropdownMenuItem>
            {booked && (
              <DropdownMenuItem onSelect={() => refresh.mutate()} disabled={refresh.isPending}>
                {refresh.isPending ? 'Refreshing…' : 'Refresh status'}
              </DropdownMenuItem>
            )}
            {parcel.courierConsignmentId && (
              <DropdownMenuItem onSelect={() => window.open(redxTrackingUrl(parcel.courierConsignmentId!), '_blank', 'noopener')}>
                Open tracking page
              </DropdownMenuItem>
            )}
            {booked && redxCancellable(parcel.courierStatus) && (
              <DropdownMenuItem onSelect={() => setCancelFor(parcel)} danger>
                Cancel parcel
              </DropdownMenuItem>
            )}
          </>
        );
      }}
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
        title={historyFor ? `RedX history · ORDER-${historyFor.invoiceNumber}` : undefined}
        maxWidth="max-w-md"
      >
        <div className="p-6 pt-4">{historyFor && <RedxTrackingHistory orderId={historyFor.id} />}</div>
      </Dialog>

      <RedxCancelDialog order={cancelFor} onClose={() => setCancelFor(null)} />
    </CourierParcelsTable>
  );
}
