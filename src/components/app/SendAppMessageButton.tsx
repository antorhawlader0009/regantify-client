import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Can } from '../../lib/useStaffAccess';
import { appNotificationsApi } from '../../lib/appNotificationsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const WORDS = ['{name}', '{store}', '{order}'];

/**
 * "App message" (STORE-APP-plan.md Step 7): one notification to one customer, only offered when that phone belongs to a shopper with the
 * Regantify app. Free. The words {name}, {store} and {order} are filled in for that customer; {order} is the order this is sent from
 * (Order detail), else their latest one.
 */
export function SendAppMessageButton({ phone, orderId, className }: { phone: string; orderId?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const has = useQuery({ queryKey: ['app-has', phone], queryFn: () => appNotificationsApi.hasApp(phone), enabled: phone.replace(/\D/g, '').length >= 10, staleTime: 5 * 60_000 });
  const send = useMutation({
    mutationFn: () => appNotificationsApi.sendOne({ phone, message: message.trim(), ...(orderId ? { orderId } : {}) }),
    onSuccess: () => {
      toast.success('Notification sent');
      setOpen(false);
      setMessage('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send. Try again.')),
  });

  if (!has.data) return null;
  return (
    <Can perm="sms.manage">
      <button type="button" onClick={() => setOpen(true)} className={className ?? 'inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50'}>
        <Bell size={14} /> App message
      </button>
      <Dialog open={open} onOpenChange={setOpen} title="Send an app notification">
        <div className="space-y-3 px-6 pb-6 pt-3">
          <p className="text-xs text-neutral-600">This customer has the Regantify app. It is free and shows your shop's name first.</p>
          <textarea
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            rows={4}
            maxLength={250}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi {name}, your order {order} is packed and will go out today."
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {WORDS.map((w) => (
              <button key={w} type="button" onClick={() => setMessage((m) => `${m}${m && !m.endsWith(' ') ? ' ' : ''}${w}`)} className="rounded-md border border-neutral-300 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600 hover:bg-neutral-50">
                {w}
              </button>
            ))}
            <span className="ml-auto text-xs text-neutral-500">{message.length} of 250</span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-neutral-700">
              Cancel
            </button>
            <button type="button" disabled={send.isPending || !message.trim()} onClick={() => send.mutate()} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {send.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </Dialog>
    </Can>
  );
}
