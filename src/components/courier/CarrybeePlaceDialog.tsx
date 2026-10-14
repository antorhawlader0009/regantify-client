import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { carrybeeApi } from '../../lib/carrybeeApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface CarrybeePlaceDialogProps {
  /** The order to book; null closes the dialog. The address is shown so the place can be picked from it. */
  order: { id: string; invoiceNumber: number; shippingAddress?: string | null; shippingCity?: string | null; shippingDistrict?: string | null } | null;
  onClose: () => void;
}

const select =
  'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-regantify-text outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-neutral-50 disabled:text-neutral-400';

/**
 * "Book with CarryBee" when CarryBee couldn't find the city and zone in the order's address: the store picks the city,
 * zone and (optionally) area from CarryBee's own lists (the plugin's three dropdowns), then the order is booked with
 * them. Nothing on the order's address changes.
 */
export function CarrybeePlaceDialog({ order, onClose }: CarrybeePlaceDialogProps) {
  const queryClient = useQueryClient();
  const [cityId, setCityId] = useState(0);
  const [zoneId, setZoneId] = useState(0);
  const [areaId, setAreaId] = useState(0);
  useEffect(() => {
    setCityId(0);
    setZoneId(0);
    setAreaId(0);
  }, [order]);

  const open = order != null;
  const cities = useQuery({ queryKey: ['carrybee-cities'], queryFn: carrybeeApi.cities, enabled: open, staleTime: 60 * 60_000 });
  const zones = useQuery({ queryKey: ['carrybee-zones', cityId], queryFn: () => carrybeeApi.zones(cityId), enabled: open && cityId > 0, staleTime: 60 * 60_000 });
  const areas = useQuery({
    queryKey: ['carrybee-areas', cityId, zoneId],
    queryFn: () => carrybeeApi.areas(cityId, zoneId),
    enabled: open && cityId > 0 && zoneId > 0,
    staleTime: 60 * 60_000,
  });

  const book = useMutation({
    mutationFn: (orderId: string) => carrybeeApi.bookWithPlace(orderId, { cityId, zoneId, areaId: areaId || null }),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['courier-events', orderId] });
      queryClient.invalidateQueries({ queryKey: ['carrybee-parcels'] });
      queryClient.invalidateQueries({ queryKey: ['carrybee-stats'] });
      toast.success(`ORDER-${order?.invoiceNumber} booked with CarryBee.`);
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'CarryBee could not book this order.')),
  });

  const address = [order?.shippingAddress, order?.shippingCity, order?.shippingDistrict].filter((x) => x && x.trim()).join(', ');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !book.isPending && onClose()} title={`Book ORDER-${order?.invoiceNumber ?? ''} with CarryBee`} maxWidth="max-w-md">
      <div className="space-y-4 p-6 pt-4">
        <p className="text-sm text-neutral-500">CarryBee couldn’t find the city and zone in this address. Pick them from CarryBee’s list and book.</p>
        {address && <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-regantify-text">{address}</p>}
        {cities.isError ? (
          <p className="text-sm text-red-600">{apiErrorMessage(cities.error, 'Couldn’t load CarryBee’s cities.')}</p>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs text-neutral-500">
              City
              <select
                value={cityId || ''}
                onChange={(e) => {
                  setCityId(Number(e.target.value) || 0);
                  setZoneId(0);
                  setAreaId(0);
                }}
                disabled={cities.isLoading}
                className={`${select} mt-1`}
              >
                <option value="">{cities.isLoading ? 'Loading…' : 'Choose a city'}</option>
                {(cities.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-neutral-500">
              Zone
              <select
                value={zoneId || ''}
                onChange={(e) => {
                  setZoneId(Number(e.target.value) || 0);
                  setAreaId(0);
                }}
                disabled={!cityId || zones.isLoading}
                className={`${select} mt-1`}
              >
                <option value="">{cityId && zones.isLoading ? 'Loading…' : 'Choose a zone'}</option>
                {(zones.data ?? []).map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-neutral-500">
              Area (optional)
              <select value={areaId || ''} onChange={(e) => setAreaId(Number(e.target.value) || 0)} disabled={!zoneId || areas.isLoading} className={`${select} mt-1`}>
                <option value="">{zoneId && areas.isLoading ? 'Loading…' : 'Any area'}</option>
                {(areas.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={book.isPending}
            className="px-4 py-2 rounded-lg border border-line text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => order && book.mutate(order.id)}
            disabled={!cityId || !zoneId || book.isPending}
            className="px-4 py-2 rounded-lg bg-regantify-cta text-white text-sm font-medium disabled:opacity-50"
          >
            {book.isPending ? 'Booking…' : 'Book with CarryBee'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
