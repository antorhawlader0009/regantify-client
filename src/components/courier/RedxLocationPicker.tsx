import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface RedxLocationPickerProps {
  orderId: string;
  currentAreaId: number | null | undefined;
}

/**
 * Single Area dropdown for RedX's numeric delivery_area_id (Order
 * Detail) — RedX has only ONE location tier, unlike PathaoLocationPicker's
 * City → Zone → Area cascade. Requires a connected RedX account (the
 * areas endpoint needs a valid access token).
 */
export function RedxLocationPicker({ orderId, currentAreaId }: RedxLocationPickerProps) {
  const queryClient = useQueryClient();
  const [areaId, setAreaId] = useState<number | null>(currentAreaId ?? null);

  const { data: accounts } = useQuery({ queryKey: ['courier-accounts'], queryFn: courierApi.getAccounts });
  const redxConnected = accounts?.some((a) => a.provider === 'REDX' && a.isActive) ?? false;

  const { data: areas, isLoading: areasLoading } = useQuery({
    queryKey: ['redx-areas'],
    queryFn: courierApi.getRedxAreas,
    enabled: redxConnected,
  });

  const saveMutation = useMutation({
    mutationFn: (vars: { areaId: number }) => courierApi.updateOrderRedxLocation(orderId, vars.areaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('RedX delivery area saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the delivery area. Please try again.')),
  });

  if (!redxConnected) {
    return (
      <p className="text-xs text-regantify-text-muted">
        Connect your RedX account on the Courier Integration page to set a delivery area for RedX.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-regantify-text-muted uppercase tracking-wide">RedX Delivery Area</p>
      <div className="flex gap-2">
        <select
          value={areaId ?? ''}
          disabled={areasLoading}
          onChange={(e) => setAreaId(Number(e.target.value))}
          className="flex-1 px-3 py-2 rounded-lg border border-black/10 text-sm text-regantify-text focus:outline-none disabled:opacity-60"
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
        <button
          type="button"
          disabled={!areaId || saveMutation.isPending}
          onClick={() => areaId && saveMutation.mutate({ areaId })}
          className="px-3 py-1.5 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-xs font-medium disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
