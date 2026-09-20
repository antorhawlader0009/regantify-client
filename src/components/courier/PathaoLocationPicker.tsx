import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface PathaoLocationPickerProps {
  orderId: string;
  currentCityId: number | null | undefined;
  currentZoneId: number | null | undefined;
  currentAreaId: number | null | undefined;
}

/**
 * City → Zone → Area cascading picker for Pathao's numeric
 * recipient_city/recipient_zone/recipient_area (Pathao's order API
 * requires these; free-text shippingCity/shippingDistrict aren't
 * enough — see COURIER-PLAN.md §3.2/§7 Phase 2). Used on both Order
 * Detail (editing an existing order) and, in read-only-until-saved form,
 * conceptually the same shape would work on Add Order — this component
 * always operates against an existing orderId since Pathao location only
 * matters once an order exists to attach it to.
 *
 * Requires the vendor to have a connected Pathao account (the location
 * endpoints need a valid OAuth token) — shows a plain notice instead of
 * the picker if not connected yet, rather than a confusing empty
 * dropdown or a 404.
 */
export function PathaoLocationPicker({ orderId, currentCityId, currentZoneId, currentAreaId }: PathaoLocationPickerProps) {
  const queryClient = useQueryClient();
  // Local selection state, seeded from the order's saved values —
  // separate from currentZoneId/currentAreaId props so picking a new
  // City clears the Zone/Area selects immediately without waiting on a
  // save round-trip.
  const [cityId, setCityId] = useState<number | null>(currentCityId ?? null);
  const [zoneId, setZoneId] = useState<number | null>(currentZoneId ?? null);
  const [areaId, setAreaId] = useState<number | null>(currentAreaId ?? null);

  const { data: accounts } = useQuery({ queryKey: ['courier-accounts'], queryFn: courierApi.getAccounts });
  const pathaoConnected = accounts?.some((a) => a.provider === 'PATHAO' && a.isActive) ?? false;

  const { data: cities, isLoading: citiesLoading } = useQuery({
    queryKey: ['pathao-cities'],
    queryFn: courierApi.getPathaoCities,
    enabled: pathaoConnected,
  });
  const { data: zones, isLoading: zonesLoading } = useQuery({
    queryKey: ['pathao-zones', cityId],
    queryFn: () => courierApi.getPathaoZones(cityId!),
    enabled: pathaoConnected && cityId != null,
  });
  const { data: areas, isLoading: areasLoading } = useQuery({
    queryKey: ['pathao-areas', zoneId],
    queryFn: () => courierApi.getPathaoAreas(zoneId!),
    enabled: pathaoConnected && zoneId != null,
  });

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
        Connect your Pathao account in Settings &gt; Courier Integration to set a delivery location for Pathao.
      </p>
    );
  }

  const selectClass =
    'w-full px-3 py-2 rounded-lg border border-black/10 text-sm text-regantify-text focus:outline-none disabled:opacity-60';

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-regantify-text-muted uppercase tracking-wide">Pathao Delivery Location</p>
      <div className="grid grid-cols-3 gap-2">
        <select
          value={cityId ?? ''}
          disabled={citiesLoading}
          onChange={(e) => {
            const id = Number(e.target.value);
            setCityId(id);
            setZoneId(null);
            setAreaId(null);
          }}
          className={selectClass}
        >
          <option value="" disabled>
            City
          </option>
          {cities?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={zoneId ?? ''}
          disabled={!cityId || zonesLoading}
          onChange={(e) => {
            const id = Number(e.target.value);
            setZoneId(id);
            setAreaId(null);
          }}
          className={selectClass}
        >
          <option value="" disabled>
            Zone
          </option>
          {zones?.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <select
          value={areaId ?? ''}
          disabled={!zoneId || areasLoading}
          onChange={(e) => setAreaId(Number(e.target.value))}
          className={selectClass}
        >
          <option value="" disabled>
            Area
          </option>
          {areas?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
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
