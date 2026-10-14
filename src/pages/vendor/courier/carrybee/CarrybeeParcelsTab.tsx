import { useState } from 'react';
import { carrybeeApi, carrybeeCancellable, type CarrybeeParcel, type CarrybeeParcelGroup } from '../../../../lib/carrybeeApi';
import { Dialog } from '../../../../components/ui/Dialog';
import { DropdownMenuItem } from '../../../../components/ui/DropdownMenu';
import { CourierTimeline } from '../../../../components/courier/CourierTimeline';
import { CarrybeeCancelDialog } from '../../../../components/courier/CarrybeeCancelDialog';
import { CourierParcelsTable } from '../../../../components/courier/CourierKit';

const GROUPS: { id: CarrybeeParcelGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'On the way' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'returned', label: 'Returned' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'cancelled', label: 'Cancelled' },
];

/**
 * Courier Integration > CarryBee > Parcels: every order booked with CarryBee, filterable by where the parcel is,
 * searchable by invoice / phone / name / consignment ID, paginated on the server. Cancelled parcels stay listed under
 * "Cancelled" until the order is booked again.
 */
export function CarrybeeParcelsTab() {
  const [timelineFor, setTimelineFor] = useState<CarrybeeParcel | null>(null);
  const [cancelFor, setCancelFor] = useState<CarrybeeParcel | null>(null);

  return (
    <CourierParcelsTable<CarrybeeParcel, CarrybeeParcelGroup>
      provider="CARRYBEE"
      courier="CarryBee"
      queryKey="carrybee-parcels"
      fetchPage={carrybeeApi.parcels}
      groups={GROUPS}
      searchPlaceholder="Invoice, phone, name or consignment ID"
      idColumns={[{ header: 'Consignment', what: 'Consignment ID', value: (p) => p.courierConsignmentId }]}
      actions={(parcel, refresh) => {
        const booked = parcel.courierBookingStatus === 'BOOKED';
        return (
          <>
            <DropdownMenuItem onSelect={() => setTimelineFor(parcel)}>View timeline</DropdownMenuItem>
            {booked && (
              <DropdownMenuItem onSelect={() => refresh.mutate()} disabled={refresh.isPending}>
                {refresh.isPending ? 'Refreshing…' : 'Refresh status'}
              </DropdownMenuItem>
            )}
            {booked && carrybeeCancellable(parcel.courierStatus) && (
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

      <CarrybeeCancelDialog order={cancelFor} onClose={() => setCancelFor(null)} />
    </CourierParcelsTable>
  );
}
