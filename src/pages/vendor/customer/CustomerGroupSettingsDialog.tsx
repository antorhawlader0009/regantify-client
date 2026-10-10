import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, type CustomerGroupSettings } from '../../../lib/customersApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Dialog } from '../../../components/ui/Dialog';
import { Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';

/**
 * Customers > "Group settings": who counts as VIP and when a customer is Sleeping. The groups are worked
 * out from these whenever they are read, so a change shows straight away on every customer.
 */
export function CustomerGroupSettingsDialog({
  open,
  onOpenChange,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: CustomerGroupSettings | undefined;
}) {
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState('');
  const [spent, setSpent] = useState('');
  const [days, setDays] = useState('');

  useEffect(() => {
    if (!open || !current) return;
    setOrders(String(current.vipMinOrders));
    setSpent(String(current.vipMinSpent));
    setDays(String(current.sleepingDays));
  }, [open, current]);

  const payload: CustomerGroupSettings = { vipMinOrders: Number(orders) || 0, vipMinSpent: Number(spent) || 0, sleepingDays: Number(days) || 0 };
  const problem =
    payload.vipMinOrders === 0 && payload.vipMinSpent === 0
      ? 'Set at least one VIP limit.'
      : payload.sleepingDays < 7 || payload.sleepingDays > 730
        ? 'Sleeping needs between 7 and 730 days.'
        : null;

  const save = useMutation({
    mutationFn: () => customersApi.updateGroupSettings(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer groups updated.');
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save the group settings. Please try again.')),
  });

  const numberInput = (value: string, set: (v: string) => void, label: string) => (
    <input type="number" min={0} value={value} onChange={(e) => set(e.target.value.replace(/\D/g, ''))} aria-label={label} className={`${productInputClass} !w-28`} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Customer groups" maxWidth="max-w-md">
      <div className="space-y-4 px-6 pb-5 pt-3">
        <p className="text-sm text-neutral-600">
          Every customer is put in a group on their own. Only orders that went through count: cancelled, returned and unpaid orders are left out.
        </p>
        <ul className="space-y-1 text-sm text-neutral-600">
          <li>
            <span className="font-medium text-regantify-text">New:</span> 1 order
          </li>
          <li>
            <span className="font-medium text-regantify-text">Returning:</span> 2 or more orders
          </li>
        </ul>
        <Field label="VIP: whichever comes first">
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            {numberInput(orders, setOrders, 'VIP orders')}
            orders, or ৳
            {numberInput(spent, setSpent, 'VIP amount spent')}
            spent
          </div>
          <p className="mt-1 text-xs text-neutral-500">Put 0 to turn one of the two off.</p>
        </Field>
        <Field label="Sleeping: no order for">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            {numberInput(days, setDays, 'Sleeping days')}
            days
          </div>
          <p className="mt-1 text-xs text-neutral-500">A sleeping customer stays Sleeping even if they were VIP, until they order again.</p>
        </Field>
        {problem && <p className="text-sm text-red-600">{problem}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={() => save.mutate()} disabled={problem !== null || save.isPending} className={primaryBtn}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
