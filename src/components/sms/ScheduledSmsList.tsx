import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { smsApi, type ScheduledSms, type ScheduledSmsStatus } from '../../lib/smsApi';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const QUERY_KEY = ['sms-scheduled'];

const STATUS: Record<ScheduledSmsStatus, { label: string; cls: string }> = {
  SCHEDULED: { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700' },
  SENDING: { label: 'Sending', cls: 'bg-amber-50 text-amber-700' },
  SENT: { label: 'Sent', cls: 'bg-emerald-50 text-emerald-700' },
  FAILED: { label: 'Not sent', cls: 'bg-red-50 text-red-700' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-neutral-100 text-neutral-600' },
};

function audienceText(row: ScheduledSms): string {
  switch (row.audience) {
    case 'ALL':
      return 'Everyone who ordered';
    case 'RECENT':
      return `Ordered in the last ${row.days ?? 30} days`;
    case 'INACTIVE':
      return `Haven’t ordered for ${row.days ?? 60} days`;
    case 'TAG':
      return `Customers tagged ${row.tag ?? ''}`;
    default:
      return `${row.selectedCount} picked ${row.selectedCount === 1 ? 'customer' : 'customers'}`;
  }
}

/** SMS > Send to customers > "Scheduled messages": what is waiting to go out, and what already did. */
export function ScheduledSmsList() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: smsApi.listScheduled,
    // While something is waiting or sending, look again each minute so the status moves on by itself.
    refetchInterval: (query) => (query.state.data?.some((r) => r.status === 'SCHEDULED' || r.status === 'SENDING') ? 60_000 : false),
  });

  const cancel = useMutation({
    mutationFn: smsApi.cancelScheduled,
    onSuccess: () => {
      toast.success('Cancelled. Nothing will be sent.');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not cancel it.'));
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  if (!data || data.length === 0) return null;

  return (
    <section className="border-t border-line pt-5">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-regantify-text">
        <CalendarClock size={15} aria-hidden />
        Scheduled messages
      </h3>
      <ul className="divide-y divide-line rounded-lg border border-line">
        {data.map((row) => {
          const status = STATUS[row.status];
          return (
            <li key={row.id} className="space-y-1 px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
                  <span className="text-neutral-600">{formatDhakaDateTime(row.sendAt)}</span>
                </span>
                {row.status === 'SCHEDULED' && (
                  <button
                    type="button"
                    onClick={() => cancel.mutate(row.id)}
                    disabled={cancel.isPending}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <p className="line-clamp-2 text-regantify-text">{row.message}</p>
              <p className="text-xs text-neutral-500">
                {audienceText(row)}
                {row.status === 'SENT' && row.sentCount !== null ? ` · sent to ${row.sentCount} of ${row.recipients ?? row.sentCount}` : ''}
                {row.status === 'FAILED' && row.error ? ` · ${row.error}` : ''}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
