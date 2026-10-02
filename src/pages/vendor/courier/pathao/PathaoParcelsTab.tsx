import { useState } from 'react';
import { courierApi, openPathaoLabels, type ParcelGroup, type PathaoParcel } from '../../../../lib/courierApi';
import { Dialog } from '../../../../components/ui/Dialog';
import { DropdownMenuItem } from '../../../../components/ui/DropdownMenu';
import { CourierTimeline } from '../../../../components/courier/CourierTimeline';
import { CourierParcelsTable, copyText } from '../../../../components/courier/CourierKit';

const GROUPS: { id: ParcelGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in_progress', label: 'On the way' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'returned', label: 'Returned' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'cancelled', label: 'Cancelled' },
];

const PATHAO_PANEL_URL = 'https://merchant.pathao.com';

/**
 * Courier Integration > Pathao > Parcels (pathao-plan.md Step 9): every
 * order booked with Pathao, filterable by where the parcel is, searchable
 * by invoice / phone / name / consignment ID, paginated on the server.
 */
export function PathaoParcelsTab() {
  const [timelineFor, setTimelineFor] = useState<PathaoParcel | null>(null);

  return (
    <CourierParcelsTable<PathaoParcel, ParcelGroup>
      provider="PATHAO"
      courier="Pathao"
      queryKey="pathao-parcels"
      fetchPage={courierApi.getPathaoParcels}
      groups={GROUPS}
      searchPlaceholder="Invoice, phone, name or consignment ID"
      idColumns={[{ header: 'Consignment ID', what: 'Consignment ID', value: (p) => p.courierConsignmentId }]}
      actions={(parcel, refresh) => {
        const booked = parcel.courierBookingStatus === 'BOOKED';
        const consignment = parcel.courierConsignmentId;
        return (
          <>
            <DropdownMenuItem onSelect={() => setTimelineFor(parcel)}>View timeline</DropdownMenuItem>
            {booked && (
              <DropdownMenuItem onSelect={() => refresh.mutate()} disabled={refresh.isPending}>
                {refresh.isPending ? 'Refreshing…' : 'Refresh status'}
              </DropdownMenuItem>
            )}
            {booked && <DropdownMenuItem onSelect={() => openPathaoLabels([parcel.id])}>Print label</DropdownMenuItem>}
            {consignment && (
              <DropdownMenuItem
                onSelect={() => {
                  // Pathao's panel has no stable deep link to one order, so
                  // copy the ID for its search box and open the panel.
                  void copyText(consignment, 'Consignment ID');
                  window.open(PATHAO_PANEL_URL, '_blank', 'noopener');
                }}
              >
                Open in Pathao panel
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
    </CourierParcelsTable>
  );
}
