import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { ordersApi, type OrderLabelDef } from '../../lib/ordersApi';
import { useCan } from '../../lib/useStaffAccess';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

export const LABEL_COLOR_CLASS: Record<string, string> = {
  gray: 'border-neutral-300 bg-neutral-100 text-neutral-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  orange: 'border-orange-200 bg-orange-50 text-orange-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  green: 'border-green-200 bg-green-50 text-green-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  blue: 'border-sky-200 bg-sky-50 text-sky-700',
  purple: 'border-purple-200 bg-purple-50 text-purple-700',
};
const COLORS = Object.keys(LABEL_COLOR_CLASS);

/** The small colored chip an order row shows for one label. */
export function LabelChip({ name, catalog }: { name: string; catalog: OrderLabelDef[] | undefined }) {
  const color = catalog?.find((l) => l.name === name)?.color ?? 'gray';
  return <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${LABEL_COLOR_CLASS[color] ?? LABEL_COLOR_CLASS.gray}`}>{name}</span>;
}

/**
 * Orders > bulk bar "Labels" (TellMe idea 91): put your own colored labels on the picked orders, or take them off. The owner also edits the
 * list of labels here (up to 12, eight colors). Labels are for the team only; the customer never sees them.
 */
export function OrderLabelsDialog({ ids, open, onOpenChange, onDone }: { ids: string[]; open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const { data: catalog } = useQuery({ queryKey: ['order-labels'], queryFn: ordersApi.labelCatalog, enabled: open });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrderLabelDef[]>([]);
  useEffect(() => {
    if (catalog) setDraft(catalog);
  }, [catalog]);

  const apply = useMutation({
    mutationFn: (p: { add?: string[]; remove?: string[] }) => ordersApi.applyLabels(ids, p.add ?? [], p.remove ?? []),
    onSuccess: (res) => {
      toast.success(res.updated > 0 ? `Updated ${res.updated} ${res.updated === 1 ? 'order' : 'orders'}.` : 'Nothing changed.');
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change the labels.')),
  });
  const save = useMutation({
    mutationFn: () => ordersApi.saveLabelCatalog(draft.filter((l) => l.name.trim())),
    onSuccess: (saved) => {
      queryClient.setQueryData(['order-labels'], saved);
      setEditing(false);
      toast.success('Labels saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the labels.')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Order labels" maxWidth="max-w-md">
      <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
        {!editing ? (
          <>
            <p className="text-neutral-600">
              {ids.length} {ids.length === 1 ? 'order' : 'orders'} picked. Only your team sees labels. An order can have up to 5.
            </p>
            {(catalog ?? []).length === 0 ? (
              <p className="text-neutral-500">No labels yet.{isOwner ? ' Make your first ones below.' : ' Ask the store owner to make some.'}</p>
            ) : (
              <ul className="space-y-2">
                {(catalog ?? []).map((l) => (
                  <li key={l.name} className="flex items-center justify-between gap-2">
                    <LabelChip name={l.name} catalog={catalog} />
                    <span className="flex gap-1.5">
                      <button type="button" disabled={apply.isPending} onClick={() => apply.mutate({ add: [l.name] })} className={outlineBtn}>
                        Put on
                      </button>
                      <button type="button" disabled={apply.isPending} onClick={() => apply.mutate({ remove: [l.name] })} className={outlineBtn}>
                        Take off
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {isOwner && (
              <button type="button" onClick={() => setEditing(true)} className="text-regantify-cta hover:underline">
                Edit my labels
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-neutral-600">Up to 12 labels, 20 letters each. Taking a label away also takes it off the orders that have it.</p>
            <ul className="space-y-2">
              {draft.map((l, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input value={l.name} maxLength={20} onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="h-9 min-w-0 flex-1 rounded-lg border border-line px-2" />
                  <select value={l.color} onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} className="h-9 rounded-lg border border-line bg-white px-2">
                    {COLORS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))} className="text-red-600 hover:underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            {draft.length < 12 && (
              <button type="button" onClick={() => setDraft((d) => [...d, { name: '', color: 'gray' }])} className="text-regantify-cta hover:underline">
                + Add a label
              </button>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setEditing(false); setDraft(catalog ?? []); }} className={outlineBtn}>
                Cancel
              </button>
              <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className={primaryBtn}>
                Save labels
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
