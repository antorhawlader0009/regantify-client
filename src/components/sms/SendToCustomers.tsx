import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { smsApi, type SmsAudience } from '../../lib/smsApi';
import { apiErrorMessage } from '../../lib/api';
import { Field, productInputClass } from '../product/ProductFormPieces';
import { primaryBtn } from '../ui/PageKit';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { toast } from '../../lib/toast';

/**
 * SMS > Send to customers: an offer or news to everyone who ordered from the store, those who
 * ordered recently, or the customers picked on the Customers page (`selectedPhones`). Shows how
 * many get it and the credits it takes before anything is sent.
 */
export function SendToCustomers({ selectedPhones }: { selectedPhones?: string[] }) {
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState<SmsAudience>(selectedPhones?.length ? 'SELECTED' : 'ALL');
  const [days, setDays] = useState('30');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [debounced, setDebounced] = useState({ audience, days, message });

  useEffect(() => {
    const id = setTimeout(() => setDebounced({ audience, days, message }), 300);
    return () => clearTimeout(id);
  }, [audience, days, message]);

  const target = {
    audience: debounced.audience,
    days: debounced.audience === 'RECENT' ? Math.max(1, Number(debounced.days) || 30) : undefined,
    phones: debounced.audience === 'SELECTED' ? selectedPhones : undefined,
  };
  const { data: preview } = useQuery({
    queryKey: ['sms-campaign-preview', target, debounced.message],
    queryFn: () => smsApi.previewCampaign({ ...target, message: debounced.message || undefined }),
    placeholderData: (prev) => prev,
  });

  const send = useMutation({
    mutationFn: () => smsApi.sendCampaign({ ...target, message: message.trim() }),
    onSuccess: (res) => {
      setConfirming(false);
      setMessage('');
      toast.success(`Sending to ${res.queued} ${res.queued === 1 ? 'customer' : 'customers'}. It takes a few minutes for a big list.`);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['sms-credits'] });
        queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      }, 5000);
    },
    onError: (err) => {
      setConfirming(false);
      toast.error(apiErrorMessage(err, 'Couldn’t send the SMS. Please try again.'));
    },
  });

  const notEnough = preview ? preview.totalCredits > preview.smsCredits : false;
  const canSend = message.trim().length > 0 && (preview?.recipients ?? 0) > 0 && !notEnough;
  const options: { id: SmsAudience; label: string }[] = [
    ...(selectedPhones?.length ? [{ id: 'SELECTED' as const, label: `Customers you picked (${selectedPhones.length})` }] : []),
    { id: 'ALL', label: 'Everyone who ordered' },
    { id: 'RECENT', label: 'Ordered in the last…' },
  ];

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-neutral-600">Send an offer or news to your customers. Blacklisted customers are left out.</p>
      <Field label="Send to">
        <div className="flex flex-wrap items-center gap-2">
          {options.map((o) => (
            <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${audience === o.id ? 'border-brand bg-brand/5' : 'border-line'}`}>
              <input type="radio" name="sms-audience" checked={audience === o.id} onChange={() => setAudience(o.id)} />
              {o.label}
            </label>
          ))}
          {audience === 'RECENT' && (
            <span className="flex items-center gap-1.5 text-sm text-neutral-600">
              <input
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))}
                aria-label="Days"
                className={`${productInputClass} !w-20 !py-1.5`}
              />
              days
            </span>
          )}
        </div>
      </Field>
      <Field label="Message" hint="English: 160 letters = 1 SMS. Bangla: 70 letters = 1 SMS.">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
          rows={4}
          placeholder="e.g. Eid offer! 20% off everything till Friday. Shop: yourstore.com"
          className={productInputClass}
        />
      </Field>
      {preview && (
        <p className={`text-sm ${notEnough ? 'text-red-600' : 'text-neutral-600'}`}>
          {preview.recipients} {preview.recipients === 1 ? 'customer' : 'customers'} × {preview.smsPerMessage} SMS ={' '}
          <span className="font-medium">{preview.totalCredits} credits</span> (you have {preview.smsCredits}).
          {notEnough && ' Buy more SMS first.'}
        </p>
      )}
      <button type="button" disabled={!canSend || send.isPending} onClick={() => setConfirming(true)} className={`${primaryBtn} h-10 px-4`}>
        <Send size={14} aria-hidden />
        Send SMS
      </button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Send to ${preview?.recipients ?? 0} customers?`}
        message={`This uses ${preview?.totalCredits ?? 0} SMS credits and can’t be stopped once it starts.`}
        confirmLabel="Send SMS"
        busy={send.isPending}
        onConfirm={() => send.mutate()}
      />
    </div>
  );
}
