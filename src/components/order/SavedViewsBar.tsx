import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, X } from 'lucide-react';
import { ordersApi, type OrderViewFilters } from '../../lib/ordersApi';
import { useCan } from '../../lib/useStaffAccess';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

/**
 * A row of saved views above the Orders list (TellMe idea 127): one tap puts a saved mix of filters back ("Pending, inside Dhaka, today"), with how many orders it
 * matches now (kept 15 seconds). "Save this view" keeps the filters now set, with a name, for you or (with orders.edit) for the whole team. A date that means
 * "today" is saved as the word, so it still means today tomorrow. Up to 10 private and 10 shared views.
 */
export function SavedViewsBar({ current, onApply }: { current: OrderViewFilters; onApply: (filters: OrderViewFilters) => void }) {
  const queryClient = useQueryClient();
  const canShare = useCan('orders.edit');
  const { data: views = [] } = useQuery({ queryKey: ['order-views'], queryFn: ordersApi.listViews, staleTime: 15_000, refetchInterval: 60_000 });
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const hasFilters = Object.keys(current).length > 0;

  const save = useMutation({
    mutationFn: () => ordersApi.createView(name.trim(), current, shared),
    onSuccess: () => {
      toast.success('View saved.');
      setNaming(false);
      setName('');
      setShared(false);
      queryClient.invalidateQueries({ queryKey: ['order-views'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the view.')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => ordersApi.deleteView(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order-views'] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete the view.')),
  });

  if (views.length === 0 && !hasFilters) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {views.map((v) => (
        <span key={v.id} className="inline-flex items-center overflow-hidden rounded-full border border-line bg-white text-xs">
          <button type="button" onClick={() => onApply(v.filters)} className="flex items-center gap-1.5 px-3 py-1.5 text-regantify-text hover:bg-neutral-50" title={v.shared ? 'Shared with your team' : 'Only you'}>
            <Bookmark size={12} className={v.shared ? 'text-brand' : 'text-neutral-400'} aria-hidden />
            {v.name}
            {v.count !== null && <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-neutral-700">{v.count}</span>}
          </button>
          {(v.mine || canShare) && (
            <button
              type="button"
              aria-label={`Delete ${v.name}`}
              onClick={() => {
                if (window.confirm(`Delete the view “${v.name}”?`)) remove.mutate(v.id);
              }}
              className="border-l border-line px-1.5 py-1.5 text-neutral-400 hover:text-red-600"
            >
              <X size={11} />
            </button>
          )}
        </span>
      ))}
      {hasFilters && !naming && (
        <button type="button" onClick={() => setNaming(true)} className="rounded-full border border-dashed border-line px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
          + Save this view
        </button>
      )}
      {naming && (
        <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-line bg-neutral-50 px-2 py-1.5">
          <input autoFocus type="text" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name of this view" className="h-7 w-44 rounded border border-line px-2 text-xs" />
          {canShare && (
            <label className="flex items-center gap-1 text-xs text-neutral-600">
              <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
              Share with the team
            </label>
          )}
          <button type="button" onClick={() => save.mutate()} disabled={!name.trim() || save.isPending} className="h-7 rounded bg-brand px-3 text-xs font-medium text-white disabled:opacity-50">
            Save
          </button>
          <button type="button" onClick={() => setNaming(false)} className="text-xs text-neutral-500">
            Cancel
          </button>
        </span>
      )}
    </div>
  );
}
