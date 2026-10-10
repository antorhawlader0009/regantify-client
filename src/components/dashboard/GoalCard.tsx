import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Target } from 'lucide-react';
import { dashboardApi, type SalesTargetProgress } from '../../lib/dashboardApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { formatValue } from '../analytics/format';

const money = (n: number) => formatValue(n, 'money');

/** One goal's bar: how far, and where the month is heading at this pace. */
function Bar({ label, done, goal, projected, daysLeft, fmt }: { label: string; done: number; goal: number; projected: number | null; daysLeft: number; fmt: (n: number) => string }) {
  const pct = Math.round((done / goal) * 100);
  const reached = done >= goal;
  const onTrack = projected !== null && projected >= goal;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-neutral-600">{label}</span>
        <span className="font-medium text-regantify-text">{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} goal`}>
        <div className={`h-full rounded-full ${reached ? 'bg-emerald-500' : 'bg-brand'}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="dash-money mt-1 text-xs text-neutral-500">
        {fmt(done)} of {fmt(goal)}
        {reached ? ' · goal reached' : ` · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
      </p>
      {!reached && projected !== null && (
        <p className={`dash-money text-xs ${onTrack ? 'text-emerald-700' : 'text-amber-700'}`}>
          At this pace the month ends at {fmt(projected)}
          {onTrack ? ': on track' : ': behind'}
        </p>
      )}
    </div>
  );
}

/**
 * Dashboard > "Monthly goal" (TellMe idea 33): what the owner wants to sell this month, in taka and/or orders, with a
 * progress bar and where the month is heading at the current pace. Counted as Analytics counts sales. Only the owner can
 * set it; a role that sees money sees the progress; with no goal, only the owner sees an invitation to set one.
 */
export function GoalCard({ target, isOwner }: { target: SalesTargetProgress; isOwner: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sales, setSales] = useState('');
  const [orders, setOrders] = useState('');

  const has = !!target.salesTarget || !!target.ordersTarget;
  if (!has && !isOwner) return null;

  const save = useMutation({
    mutationFn: () => dashboardApi.setTarget({ salesTarget: Number(sales) || null, ordersTarget: Number(orders) || null }),
    onSuccess: () => {
      toast.success('Monthly goal saved.');
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save the goal. Please try again.')),
  });

  const edit = () => {
    setSales(target.salesTarget ? String(target.salesTarget) : '');
    setOrders(target.ordersTarget ? String(target.ordersTarget) : '');
    setOpen(true);
  };
  const monthName = new Date(`${target.month}-15T12:00:00+06:00`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'Asia/Dhaka' });

  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-regantify-text">
          <Target size={15} className="text-brand" aria-hidden />
          {monthName} goal
        </h2>
        {isOwner && has && (
          <button type="button" onClick={edit} aria-label="Change the goal" className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100">
            <Pencil size={14} />
          </button>
        )}
      </div>

      {has ? (
        <div className="space-y-3.5">
          {target.salesTarget ? <Bar label="Sales" done={target.sales} goal={target.salesTarget} projected={target.projectedSales} daysLeft={target.daysLeft} fmt={money} /> : null}
          {target.ordersTarget ? <Bar label="Orders" done={target.orders} goal={target.ordersTarget} projected={target.projectedOrders} daysLeft={target.daysLeft} fmt={(n) => n.toLocaleString('en-US')} /> : null}
        </div>
      ) : (
        <div>
          <p className="text-sm text-neutral-600">Set what you want to sell each month and see here how you are doing.</p>
          <button type="button" onClick={edit} className={`${outlineBtn} mt-3`}>
            Set a monthly goal
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="Monthly goal" maxWidth="max-w-sm">
        <div className="space-y-3 px-6 pb-6 pt-3 text-sm">
          <p className="text-neutral-600">It stays the same every month until you change it. Leave a box empty for no goal of that kind.</p>
          <label className="block">
            <span className="mb-1 block text-neutral-700">Sales goal (taka)</span>
            <input value={sales} onChange={(e) => setSales(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder="e.g. 500000" className="h-10 w-full rounded-lg border border-line px-3 outline-none focus:border-brand" />
          </label>
          <label className="block">
            <span className="mb-1 block text-neutral-700">Orders goal</span>
            <input value={orders} onChange={(e) => setOrders(e.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" placeholder="e.g. 300" className="h-10 w-full rounded-lg border border-line px-3 outline-none focus:border-brand" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={outlineBtn}>
              Cancel
            </button>
            <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className={primaryBtn}>
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
