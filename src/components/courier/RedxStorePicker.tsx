import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface RedxStorePickerProps {
  currentStoreId: number | null;
}

/**
 * The Courier Integration page's RedX store picker — same "pick a
 * pickup store once, reuse on every booking" shape as the Pathao page's Pickup Store card.
 * Picking a store here is what RedxProvider.bookOrder reads as the
 * pickup point for every booking.
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
      toast.success('Pickup store saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save your pickup store. Please try again.')),
  });

  if (isLoading) {
    return <p className="text-sm text-regantify-text-muted">Loading your RedX stores…</p>;
  }
  if (isError || !stores) {
    return <p className="text-sm text-red-500">Could not load your RedX stores. Please try again.</p>;
  }
  if (stores.length === 0) {
    return <p className="text-sm text-regantify-text-muted">No stores found on your RedX account yet — add one from your RedX merchant panel first.</p>;
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
        className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none disabled:opacity-60"
      >
        <option value="" disabled>
          Select a pickup store…
        </option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
