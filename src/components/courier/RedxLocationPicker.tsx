import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { RedxAreaSelect } from './RedxAreaSelect';

interface RedxLocationPickerProps {
  orderId: string;
  currentAreaId: number | null | undefined;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingDistrict?: string | null;
  shippingZip?: string | null;
  /** Read-only once the parcel is booked — the area can't change on RedX's side from here. */
  locked?: boolean;
}

/**
 * The order's RedX delivery area (Order.redxAreaId, Order Detail) —
 * RedX has only ONE location tier, unlike PathaoLocationPicker's City →
 * Zone → Area cascade. With no area saved yet, it suggests one from the
 * order's ZIP and address (the same match booking uses when "detect the
 * area" is on), which the vendor confirms with Save.
 */
export function RedxLocationPicker({
  orderId,
  currentAreaId,
  shippingAddress,
  shippingCity,
  shippingDistrict,
  shippingZip,
  locked,
}: RedxLocationPickerProps) {
  const queryClient = useQueryClient();
  const [areaId, setAreaId] = useState<number | null>(currentAreaId ?? null);
  useEffect(() => setAreaId(currentAreaId ?? null), [currentAreaId]);

  const { data: suggestion } = useQuery({
    queryKey: ['redx-area-suggest', orderId, shippingAddress, shippingZip],
    queryFn: () =>
      courierApi.suggestRedxArea({
        address: shippingAddress ?? undefined,
        city: shippingCity ?? undefined,
        district: shippingDistrict ?? undefined,
        zip: shippingZip ?? undefined,
      }),
    enabled: currentAreaId == null && !locked && Boolean(shippingAddress || shippingZip),
    staleTime: Infinity,
  });

  // Pre-select a confident suggestion; the vendor still saves it.
  useEffect(() => {
    if (currentAreaId == null && areaId == null && suggestion?.autoApply) setAreaId(suggestion.areaId);
  }, [suggestion, currentAreaId, areaId]);

  const saveMutation = useMutation({
    mutationFn: (id: number) => courierApi.updateOrderRedxLocation(orderId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['redx-quote', orderId] });
      toast.success('RedX delivery area saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the delivery area. Please try again.')),
  });

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-regantify-text-muted uppercase tracking-wide">RedX delivery area</p>
      {currentAreaId == null && suggestion && (
        <p className="flex items-start gap-1.5 text-xs text-regantify-text-muted">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-regantify-cta" />
          <span>
            From the address: <span className="text-regantify-text">{suggestion.areaName}</span>
            {suggestion.autoApply ? ' (pre-selected — save to keep it).' : ' — not sure, please check.'}
            {!suggestion.autoApply && (
              <button type="button" onClick={() => setAreaId(suggestion.areaId)} className="ml-1 underline hover:text-regantify-text">
                Use it
              </button>
            )}
          </span>
        </p>
      )}
      <RedxAreaSelect value={areaId} onChange={(area) => setAreaId(area?.id ?? null)} disabled={locked} />
      {!locked && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!areaId || areaId === currentAreaId || saveMutation.isPending}
            onClick={() => areaId && saveMutation.mutate(areaId)}
            className="px-3 py-1.5 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-xs font-medium disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save area'}
          </button>
        </div>
      )}
    </div>
  );
}
