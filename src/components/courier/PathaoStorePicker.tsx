import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courierApi } from '../../lib/courierApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

interface PathaoStorePickerProps {
  currentStoreId: number | null;
}

/**
 * Settings > Courier Integration's Pathao store picker — shown once an
 * account is connected (Pathao's stores endpoint needs a valid OAuth
 * token, so this can't be fetched before that). Picking a store here is
 * what PathaoProvider.bookOrder reads as the pickup point for every
 * booking — see COURIER-PLAN.md §3.2/§7 Phase 2.
 */
export function PathaoStorePicker({ currentStoreId }: PathaoStorePickerProps) {
  const queryClient = useQueryClient();

  const { data: stores, isLoading, isError } = useQuery({
    queryKey: ['pathao-stores'],
    queryFn: courierApi.getPathaoStores,
  });

  const mutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => courierApi.selectPathaoStore(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success('Pickup store saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save your pickup store. Please try again.')),
  });

  if (isLoading) {
    return <p className="text-sm text-regantify-text-muted">Loading your Pathao stores…</p>;
  }
  if (isError || !stores) {
    return <p className="text-sm text-red-500">Could not load your Pathao stores. Please try again.</p>;
  }
  if (stores.length === 0) {
    return <p className="text-sm text-regantify-text-muted">No stores found on your Pathao account yet — add one from merchant.pathao.com first.</p>;
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
