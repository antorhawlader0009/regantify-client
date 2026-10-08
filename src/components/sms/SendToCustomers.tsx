import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Send } from 'lucide-react';
import { smsApi, type SmsAudience } from '../../lib/smsApi';
import { customersApi } from '../../lib/customersApi';
import { apiErrorMessage } from '../../lib/api';
import { dhakaInputToIso, nowDhakaInput } from '../../lib/dhakaInput';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { Field, productInputClass } from '../product/ProductFormPieces';
import { primaryBtn } from '../ui/PageKit';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ScheduledSmsList } from './ScheduledSmsList';
import { toast } from '../../lib/toast';

/** What the server answers: sent now (queued) or saved for later (scheduled). */
type SendResult = { queued: number; totalCredits: number } | { scheduled: true; id: string; sendAt: string; recipients: number; totalCredits: number };

/** Promotional texts go out between 8 AM and 10 PM Dhaka only (the server refuses other times too). */
function isQuietInput(value: string): boolean {
  const hour = Number(value.slice(11, 13));
  return Number.isFinite(hour) && (hour >= 22 || hour < 8);
}

/**
 * SMS > Send to customers: an offer or news to everyone who ordered from the store, those who ordered
 * recently, those who bought before but haven't for a while (win-back), a tag, or the customers picked on
 * the Customers page (`selectedPhones`). Shows how many get it and the credits it takes before anything is
 * sent. "Send later" saves it for a time (8 AM to 10 PM Dhaka); the audience is then worked out when it goes
 * out, and the scheduled messages are listed underneath.
 */
export function SendToCustomers({ selectedPhones }: { selectedPhones?: string[] }) {
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState<SmsAudience>(selectedPhones?.length ? 'SELECTED' : 'ALL');
  const [recentDays, setRecentDays] = useState('30');
  const [inactiveDays, setInactiveDays] = useState('60');
  const [tag, setTag] = useState('');
  const [message, setMessage] = useState('');
  const [when, setWhen] = useState<'NOW' | 'LATER'>('NOW');
  // "Send later" time in Dhaka time, as a datetime-local value.
  const [sendInput, setSendInput] = useState('');
  const [confirming, setConfirming] = useState(false);
  const days = audience === 'INACTIVE' ? inactiveDays : recentDays;
  const [debounced, setDebounced] = useState({ audience, days, message });
  const { data: storeTags } = useQuery({ queryKey: ['customer-tags'], queryFn: customersApi.listTags });

  useEffect(() => {
    const id = setTimeout(() => setDebounced({ audience, days, message }), 300);
    return () => clearTimeout(id);
  }, [audience, days, message]);

  const target = {
    audience: debounced.audience,
    days: debounced.audience === 'RECENT' || debounced.audience === 'INACTIVE' ? Math.max(1, Number(debounced.days) || (debounced.audience === 'INACTIVE' ? 60 : 30)) : undefined,
    phones: debounced.audience === 'SELECTED' ? selectedPhones : undefined,
    tag: debounced.audience === 'TAG' ? tag : undefined,
  };
  const needsTag = debounced.audience === 'TAG' && !tag;
  const { data: preview } = useQuery({
    queryKey: ['sms-campaign-preview', target, debounced.message],
    queryFn: () => smsApi.previewCampaign({ ...target, message: debounced.message || undefined }),
    placeholderData: (prev) => prev,
    enabled: !needsTag,
  });

  const sendAtIso = dhakaInputToIso(sendInput);
  const laterProblem =
    when !== 'LATER'
      ? null
      : !sendAtIso
        ? 'Pick the date and time to send.'
        : new Date(sendAtIso).getTime() < Date.now() + 5 * 60_000
          ? 'Pick a time at least a few minutes from now.'
          : isQuietInput(sendInput)
            ? 'Promotional texts go out between 8 AM and 10 PM only. Pick a time in that window.'
            : null;

  const refreshAfterSend = () =>
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['sms-credits'] });
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
    }, 5000);

  const send = useMutation<SendResult>({
    mutationFn: async () => {
      const body = { ...target, message: message.trim() };
      return when === 'LATER' ? smsApi.scheduleCampaign({ ...body, sendAt: sendAtIso! }) : smsApi.sendCampaign(body);
    },
    onSuccess: (res) => {
      setConfirming(false);
      setMessage('');
      if ('scheduled' in res) {
        toast.success(`Scheduled for ${formatDhakaDateTime(res.sendAt)}. You can cancel it until then.`);
        setSendInput('');
        setWhen('NOW');
        void queryClient.invalidateQueries({ queryKey: ['sms-scheduled'] });
        return;
      }
      toast.success(`Sending to ${res.queued} ${res.queued === 1 ? 'customer' : 'customers'}. It takes a few minutes for a big list.`);
      refreshAfterSend();
    },
    onError: (err) => {
      setConfirming(false);
      toast.error(apiErrorMessage(err, when === 'LATER' ? 'Couldn’t schedule the SMS. Please try again.' : 'Couldn’t send the SMS. Please try again.'));
    },
  });

  const notEnough = preview ? preview.totalCredits > preview.smsCredits : false;
  // Sending now needs the credits now; a scheduled one is checked when it goes out, so it may be bought before then.
  const canSend =
    message.trim().length > 0 && !needsTag && (preview?.recipients ?? 0) > 0 && (when === 'LATER' ? laterProblem === null : !notEnough);
  const options: { id: SmsAudience; label: string }[] = [
    ...(selectedPhones?.length ? [{ id: 'SELECTED' as const, label: `Customers you picked (${selectedPhones.length})` }] : []),
    { id: 'ALL', label: 'Everyone who ordered' },
    { id: 'RECENT', label: 'Ordered in the last…' },
    { id: 'INACTIVE', label: 'Haven’t ordered for…' },
    // Customers > note and tags: only once the store has tagged someone.
    ...((storeTags?.length ?? 0) > 0 ? [{ id: 'TAG' as const, label: 'Customers with a tag…' }] : []),
  ];

  const daysInput = (value: string, set: (v: string) => void) => (
    <span className="flex items-center gap-1.5 text-sm text-neutral-600">
      <input type="number" min={1} value={value} onChange={(e) => set(e.target.value.replace(/\D/g, ''))} aria-label="Days" className={`${productInputClass} !w-20 !py-1.5`} />
      days
    </span>
  );

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
          {audience === 'RECENT' && daysInput(recentDays, setRecentDays)}
          {audience === 'INACTIVE' && daysInput(inactiveDays, setInactiveDays)}
          {audience === 'TAG' && (
            <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag" className={`${productInputClass} !w-auto !py-1.5`}>
              <option value="">Pick a tag</option>
              {(storeTags ?? []).map((t) => (
                <option key={t.tag} value={t.tag}>
                  {t.tag} ({t.count})
                </option>
              ))}
            </select>
          )}
        </div>
        {audience === 'INACTIVE' && (
          <p className="mt-1.5 text-xs text-neutral-500">Customers who bought before, but not in the last {inactiveDays || '…'} days. A good way to bring them back.</p>
        )}
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

      <Field label="When">
        <div className="flex flex-wrap items-center gap-2">
          {(['NOW', 'LATER'] as const).map((w) => (
            <label key={w} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${when === w ? 'border-brand bg-brand/5' : 'border-line'}`}>
              <input type="radio" name="sms-when" checked={when === w} onChange={() => setWhen(w)} />
              {w === 'NOW' ? 'Send now' : 'Send later'}
            </label>
          ))}
        </div>
        {when === 'LATER' && (
          <div className="mt-2">
            <input
              type="datetime-local"
              value={sendInput}
              min={nowDhakaInput()}
              onChange={(e) => setSendInput(e.target.value)}
              aria-label="Send at (Dhaka time)"
              className={`${productInputClass} !w-auto`}
            />
            <p className={`mt-1.5 text-xs ${laterProblem && sendInput ? 'text-red-600' : 'text-neutral-500'}`}>
              {laterProblem && sendInput
                ? laterProblem
                : 'Dhaka time, between 8 AM and 10 PM. The customers are picked when it goes out, and the SMS credits are used then (not now), so have enough by that time.'}
            </p>
          </div>
        )}
      </Field>

      {preview && !needsTag && (
        <p className={`text-sm ${notEnough && when === 'NOW' ? 'text-red-600' : 'text-neutral-600'}`}>
          {preview.recipients} {preview.recipients === 1 ? 'customer' : 'customers'} × {preview.smsPerMessage} SMS ={' '}
          <span className="font-medium">{preview.totalCredits} credits</span> (you have {preview.smsCredits}).
          {notEnough && (when === 'NOW' ? ' Buy more SMS first.' : ' You need more by then.')}
        </p>
      )}
      <button type="button" disabled={!canSend || send.isPending} onClick={() => setConfirming(true)} className={`${primaryBtn} h-10 px-4`}>
        {when === 'LATER' ? <CalendarClock size={14} aria-hidden /> : <Send size={14} aria-hidden />}
        {when === 'LATER' ? 'Schedule SMS' : 'Send SMS'}
      </button>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={when === 'LATER' && sendAtIso ? `Send on ${formatDhakaDateTime(sendAtIso)}?` : `Send to ${preview?.recipients ?? 0} customers?`}
        message={
          when === 'LATER'
            ? `About ${preview?.recipients ?? 0} customers right now, about ${preview?.totalCredits ?? 0} SMS credits, used when it goes out. You can cancel it until then.`
            : `This uses ${preview?.totalCredits ?? 0} SMS credits and can’t be stopped once it starts.`
        }
        confirmLabel={when === 'LATER' ? 'Schedule SMS' : 'Send SMS'}
        busy={send.isPending}
        onConfirm={() => send.mutate()}
      />

      <ScheduledSmsList />
    </div>
  );
}
