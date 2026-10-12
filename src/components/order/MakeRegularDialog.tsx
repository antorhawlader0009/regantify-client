import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { orderRef, type Order } from '../../lib/ordersApi';
import { standingOrdersApi } from '../../lib/standingOrdersApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const inputClass = 'h-9 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';

/** Where "Make it regular" can show: a delivery order from the store or entered by hand. The server judges the rest. */
export function canMakeRegular(order: Pick<Order, 'source' | 'deliveryZone'>): boolean {
  return order.source !== 'POS' && order.deliveryZone !== 'PICKUP';
}

/**
 * Order detail > "Make it regular" (TellMe idea 149): this order's customer, address and products repeat on a rhythm. On each due day a Pending
 * order is made for you at that day's prices and stock, and you confirm it like any other. Nothing is sent to the customer.
 */
export function MakeRegularDialog({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<'DAYS' | 'WEEKDAY'>('DAYS');
  const [days, setDays] = useState('7');
  const [weekday, setWeekday] = useState('1');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');

  const make = useMutation({
    mutationFn: () =>
      standingOrdersApi.createFromOrder(order.id, {
        ...(kind === 'DAYS' ? { intervalDays: Number(days) } : { weekday: Number(weekday) }),
        ...(startsOn ? { startsOn } : {}),
        ...(endsOn ? { endsOn } : {}),
      }),
    onSuccess: (res) => {
      toast.success(`Done. The first order will be made on ${res.nextRunOn}.`);
      void queryClient.invalidateQueries({ queryKey: ['standing-orders'] });
      onOpenChange(false);
      navigate('/vendor/orders/standing');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t make this regular.')),
  });

  const valid = kind === 'WEEKDAY' || (Number(days) >= 1 && Number(days) <= 90);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Make ${orderRef(order)} regular`} maxWidth="max-w-lg">
      <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
        <p className="text-neutral-600">
          {order.customerName} gets this same order again and again. On each due day a new Pending order is made from these products at that day’s price and stock, and
          you confirm it like any other order. The customer is not texted and nothing is charged.
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="standing-kind" checked={kind === 'DAYS'} onChange={() => setKind('DAYS')} />
            Every
            <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, '').slice(0, 2))} onFocus={() => setKind('DAYS')} inputMode="numeric" className={`${inputClass} !w-16`} />
            days <span className="text-neutral-500">(7 = every week, 30 = every month)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="standing-kind" checked={kind === 'WEEKDAY'} onChange={() => setKind('WEEKDAY')} />
            Every
            <select value={weekday} onChange={(e) => setWeekday(e.target.value)} onFocus={() => setKind('WEEKDAY')} className={inputClass}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="text-neutral-600">
            First order on (optional)
            <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className={`${inputClass} mt-1 block`} />
          </label>
          <label className="text-neutral-600">
            Stop after (optional)
            <input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className={`${inputClass} mt-1 block`} />
          </label>
        </div>
        <p className="text-xs text-neutral-500">With no first day, it starts one step after this order (or tomorrow). Free gifts and personalised items are left out.</p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={() => make.mutate()} disabled={!valid || make.isPending} className={primaryBtn}>
            {make.isPending ? 'Saving…' : 'Make it regular'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
