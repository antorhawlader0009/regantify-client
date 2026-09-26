import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { PathaoLocationSelects, type PathaoLocationValue } from './PathaoLocationSelects';

interface PathaoLocationPickerProps {
  orderId: string;
  currentCityId: number | null | undefined;
  currentZoneId: number | null | undefined;
  currentAreaId: number | null | undefined;
  /** The order's address — suggests a location when none is saved yet. */
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingDistrict?: string | null;
}

/**
 * Order Detail's "Pathao Delivery Location" — saves Pathao's numeric
 * city/zone/area onto an existing order (the dropdowns themselves are
 * the shared PathaoLocationSelects). Optional: Pathao can work the
 * location out from the address, and the booking popup can set it too;
 * this is for vendors who want it fixed on the order ahead of booking.
 *
 * Requires the vendor to have a connected Pathao account (the location
 * endpoints need a valid OAuth token) — shows a plain notice instead of
 * the picker if not connected yet, rather than a confusing empty
 * dropdown or a 404.
 */
export function PathaoLocationPicker({
  orderId,
  currentCityId,
  currentZoneId,
  currentAreaId,
  shippingAddress,
  shippingCity,
  shippingDistrict,
}: PathaoLocationPickerProps) {
  const queryClient = useQueryClient();
  // Local selection, seeded from the order's saved values, so picking a
  // new City clears Zone/Area immediately without a save round-trip.
  const [location, setLocation] = useState<PathaoLocationValue>({
    cityId: currentCityId ?? null,
    zoneId: currentZoneId ?? null,
    areaId: currentAreaId ?? null,
  });

  const { data: accounts } = useQuery({ queryKey: ['courier-accounts'], queryFn: courierApi.getAccounts });
  const pathaoConnected = accounts?.some((a) => a.provider === 'PATHAO' && a.isActive) ?? false;

  const saveMutation = useMutation({
    mutationFn: (vars: { cityId: number; zoneId: number; areaId: number }) =>
      courierApi.updateOrderPathaoLocation(orderId, vars.cityId, vars.zoneId, vars.areaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Pathao delivery location saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the delivery location. Please try again.')),
  });

  if (!pathaoConnected) {
    return (
      <p className="text-xs text-regantify-text-muted">
        Connect your Pathao account in Courier Integration &gt; Pathao to set a delivery location for Pathao.
      </p>
    );
  }

  const { cityId, zoneId, areaId } = location;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-regantify-text-muted uppercase tracking-wide">Pathao Delivery Location</p>
      <PathaoLocationSelects
        value={location}
        onChange={setLocation}
        suggestFrom={{ address: shippingAddress, city: shippingCity, district: shippingDistrict }}
      />
      <button
        type="button"
        disabled={!cityId || !zoneId || !areaId || saveMutation.isPending}
        onClick={() => cityId && zoneId && areaId && saveMutation.mutate({ cityId, zoneId, areaId })}
        className="px-3 py-1.5 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-xs font-medium disabled:opacity-60"
      >
        {saveMutation.isPending ? 'Saving…' : 'Save Location'}
      </button>
    </div>
  );
}
