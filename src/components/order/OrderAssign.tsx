import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserRound } from 'lucide-react';
import { ordersApi, type Order } from '../../lib/ordersApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useCan } from '../../lib/useStaffAccess';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';

/** The staff list and the auto-assign switch (TellMe idea 60), cached for every box on the Orders pages. */
export function useAssignment() {
  return useQuery({ queryKey: ['order-assignment'], queryFn: ordersApi.assignmentOverview, staleTime: 60_000, retry: false });
}

/** A small "Rahim" tag under an order in the list; nothing when nobody handles it. */
export function AssigneeChip({ order }: { order: Pick<Order, 'assignedStaffId'> }) {
  const { data } = useAssignment();
  if (!order.assignedStaffId) return null;
  const name = data?.staff.find((s) => s.id === order.assignedStaffId)?.name;
  if (!name) return null;
  return (
    <p className="mt-1 inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-800" title="Handled by">
      <UserRound size={10} aria-hidden />
      {name}
    </p>
  );
}

/**
 * Order detail "Handled by" (TellMe idea 60). Only for coordination: anyone with order access can still work on the order.
 * The owner and managers give an order to anyone; other staff can take it for themselves. If someone else already has it,
 * it says so before you start.
 */
export function AssignCard({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const { data } = useAssignment();
  const canGive = useCan('orders.cancel_refund');
  const queryClient = useQueryClient();
  const mutate = useMutation({
    mutationFn: (staffId: string | null) => ordersApi.assign([order.id], staffId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order-assignment'] });
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change who handles this order.')),
  });
  if (!data || data.staff.length === 0 || order.source === 'POS') return null;

  const holder = data.staff.find((s) => s.id === order.assignedStaffId);
  const mine = !!data.myStaffId && order.assignedStaffId === data.myStaffId;
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-sm font-semibold text-regantify-text">Handled by</p>
      {holder && !mine && (
        <p className="mt-1.5 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">{holder.name} is handling this order.</p>
      )}
      {canGive ? (
        <select
          value={order.assignedStaffId ?? ''}
          disabled={mutate.isPending}
          onChange={(e) => mutate.mutate(e.target.value || null)}
          className="mt-2 h-9 w-full rounded-lg border border-line bg-white px-2 text-sm text-regantify-text"
          aria-label="Handled by"
        >
          <option value="">Nobody</option>
          {data.staff
            .filter((s) => s.active || s.id === order.assignedStaffId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
        </select>
      ) : (
        <div className="mt-2 flex items-center gap-2 text-sm text-regantify-text">
          <span>{holder ? (mine ? 'You' : holder.name) : 'Nobody yet'}</span>
          {data.myStaffId && !mine && (
            <button type="button" disabled={mutate.isPending} onClick={() => mutate.mutate(data.myStaffId)} className="text-sm font-medium text-brand hover:underline">
              {holder ? 'Take over' : 'Take it'}
            </button>
          )}
          {mine && (
            <button type="button" disabled={mutate.isPending} onClick={() => mutate.mutate(null)} className="text-sm font-medium text-neutral-500 hover:underline">
              Let go
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The Orders list's bulk "Assign": give the ticked orders to one staff member, or to nobody. */
export function BulkAssignDialog({ ids, open, onOpenChange, onDone }: { ids: string[]; open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  const { data } = useAssignment();
  const canGive = useCan('orders.cancel_refund');
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState('');
  const save = useMutation({
    mutationFn: () => ordersApi.assign(ids, staffId || null),
    onSuccess: (r) => {
      toast.success(`${r.updated} ${r.updated === 1 ? 'order' : 'orders'} updated.`);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      onDone();
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not assign the orders.')),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Assign orders" maxWidth="max-w-md">
      <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
        <p className="text-neutral-600">
          {ids.length} {ids.length === 1 ? 'order' : 'orders'} selected. Who handles an order is only for coordination; everyone with order access can still work on it.
        </p>
        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm" aria-label="Staff member">
          <option value="">Nobody</option>
          {(data?.staff ?? [])
            .filter((s) => s.active && (canGive || s.id === data?.myStaffId))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
        </select>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className={primaryBtn}>
            {save.isPending ? 'Saving…' : 'Assign'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** Owner only: share new orders out automatically, in turn, among the staff ticked here. */
export function AssignSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data } = useAssignment();
  const queryClient = useQueryClient();
  const [auto, setAuto] = useState<boolean | null>(null);
  const [handlers, setHandlers] = useState<Set<string> | null>(null);
  const on = auto ?? data?.autoAssign ?? false;
  const picked = handlers ?? new Set((data?.staff ?? []).filter((s) => s.handlesOrders).map((s) => s.id));
  const save = useMutation({
    mutationFn: () => ordersApi.updateAssignmentSettings({ autoAssignOrders: on, handlerIds: [...picked] }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order-assignment'], updated);
      toast.success('Saved.');
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Share out new orders" maxWidth="max-w-md">
      <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={on} onChange={(e) => setAuto(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
          <span>
            Give each new order to the next person in turn
            <span className="block text-xs text-neutral-500">Only the people ticked below take a turn. Off by default.</span>
          </span>
        </label>
        <ul className="space-y-1.5">
          {(data?.staff ?? [])
            .filter((s) => s.active)
            .map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={picked.has(s.id)}
                    onChange={(e) => {
                      const next = new Set(picked);
                      if (e.target.checked) next.add(s.id);
                      else next.delete(s.id);
                      setHandlers(next);
                    }}
                    className="h-4 w-4 accent-brand"
                  />
                  {s.name} <span className="text-xs text-neutral-500">({s.role})</span>
                </label>
              </li>
            ))}
          {(data?.staff ?? []).length === 0 && <li className="text-neutral-500">Add staff first (Staff page).</li>}
        </ul>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className={primaryBtn}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
