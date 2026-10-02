import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface RedxStorePickerProps {
  currentStoreId: number | null;
}

/**
 * The RedX page's pickup store picker (Settings › Pickup Store) — same
 * "pick a pickup store once, reuse on every booking" shape as the Pathao
 * page's Pickup Store card. Picking a store here is what
 * RedxProvider.bookOrder reads as the pickup point for every booking.
 */
export function RedxStorePicker({ currentStoreId }: RedxStorePickerProps) {
  const queryClient = useQueryClient();

  const { data: stores, isLoading, isError } = useQuery({
    queryKey: ['redx-stores'],
    queryFn: courierApi.getRedxStores,
  });

  const mutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => courierApi.selectRedxStore(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['redx-overview'] });
      toast.success('Pickup store saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save your pickup store. Try again in a minute.')),
  });

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading your RedX stores…</p>;
  }
  if (isError || !stores) {
    return <p className="text-sm text-red-600">Could not load your RedX stores. Please try again.</p>;
  }
  if (stores.length === 0) {
    return <p className="text-sm text-neutral-500">No pickup stores on your RedX account yet — add one below.</p>;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-regantify-text mb-1.5">Pickup store</label>
      <select
        value={currentStoreId ?? ''}
        onChange={(e) => {
          const store = stores.find((s) => s.id === Number(e.target.value));
          if (store) mutation.mutate({ id: store.id, name: store.name });
        }}
        disabled={mutation.isPending}
        className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-regantify-text outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500"
      >
        <option value="" disabled>
          Select a pickup store…
        </option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.areaName ? ` — ${s.areaName}` : ''}
          </option>
        ))}
      </select>
      {(() => {
        const current = stores.find((s) => s.id === currentStoreId);
        return current?.address ? (
          <p className="text-xs text-neutral-500 mt-1">
            {current.address}
            {current.phone ? ` · ${current.phone}` : ''}
          </p>
        ) : null;
      })()}
    </div>
  );
}
