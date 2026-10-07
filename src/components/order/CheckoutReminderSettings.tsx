import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { Field, productInputClass } from '../product/ProductFormPieces';
import { incompleteOrdersApi } from '../../lib/incompleteOrdersApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const WAITS = [
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 180, label: '3 hours' },
  { minutes: 720, label: '12 hours' },
  { minutes: 1440, label: '1 day' },
];

/**
 * Incomplete Orders > "Reminder SMS": one text to a shopper who left the checkout with their
 * phone filled in, after the chosen wait, from the store's SMS credits (CheckoutReminderService).
 */
export function CheckoutReminderButton({ canChange }: { canChange: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['checkout-reminder-settings'], queryFn: incompleteOrdersApi.getReminderSettings });
  const [enabled, setEnabled] = useState(false);
  const [afterMinutes, setAfterMinutes] = useState(60);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || !data) return;
    setEnabled(data.enabled);
    setAfterMinutes(data.afterMinutes);
    setMessage(data.message);
  }, [open, data]);

  const save = useMutation({
    mutationFn: () => incompleteOrdersApi.updateReminderSettings({ enabled, afterMinutes, message }),
    onSuccess: (next) => {
      queryClient.setQueryData(['checkout-reminder-settings'], next);
      toast.success(next.enabled ? 'Reminder SMS is on.' : 'Reminder SMS is off.');
      setOpen(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text hover:bg-neutral-50">
        <BellRing size={15} />
        Reminder SMS: {data?.enabled ? 'On' : 'Off'}
      </button>
      <Dialog open={open} onOpenChange={setOpen} title="Reminder SMS" maxWidth="max-w-md">
        <div className="space-y-4 px-6 pb-6 pt-3 text-sm">
          <p className="text-neutral-600">
            Someone who fills in their phone at checkout and leaves gets one SMS asking them to finish the order. It uses your SMS credits (1 each),
            is never sent between 10 PM and 8 AM, and isn’t sent if they’ve ordered since.
          </p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enabled} disabled={!canChange} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-brand" />
            <span className="font-medium">Send a reminder SMS</span>
          </label>
          <Field label="Send it after">
            <select value={afterMinutes} disabled={!canChange} onChange={(e) => setAfterMinutes(Number(e.target.value))} className={productInputClass}>
              {WAITS.map((w) => (
                <option key={w.minutes} value={w.minutes}>
                  {w.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Message" hint="{store} becomes your store name and {link} your store link. Leave empty for the default.">
            <textarea
              value={message}
              disabled={!canChange}
              onChange={(e) => setMessage(e.target.value.slice(0, 320))}
              rows={3}
              placeholder={data?.defaultMessage}
              className={productInputClass}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={outlineBtn}>
              Close
            </button>
            {canChange && (
              <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className={primaryBtn}>
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
