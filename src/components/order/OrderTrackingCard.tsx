import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, ExternalLink, Link2, Loader2, RefreshCw, Send } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { outlineBtn } from '../ui/PageKit';

// Order Detail > "Customer tracking" (tracking-plan.md Step 9): what the shopper sees, whether they were
// texted, whether they opened the page, a resend of the tracking text, and a new link when one leaked.

interface TrackingOverview {
  link: string | null;
  views: number;
  lastViewedAt: string | null;
  resendsLeftToday: number;
  messages: Array<{ id: string; event: string; label: string; status: 'QUEUED' | 'SENDING' | 'SENT' | 'SKIPPED' | 'FAILED'; reason: string | null; smsCount: number | null; createdAt: string; sentAt: string | null }>;
}

const trackingApi = {
  overview: (orderId: string) => api.get<TrackingOverview>(`/v1/courier/order-tracking/orders/${orderId}`).then((r) => r.data),
  resend: (orderId: string) => api.post(`/v1/courier/order-tracking/orders/${orderId}/resend`).then((r) => r.data),
  rotate: (orderId: string) => api.post<{ link: string }>(`/v1/courier/order-tracking/orders/${orderId}/rotate-link`).then((r) => r.data),
};

const STATUS_WORDS: Record<string, { text: string; className: string }> = {
  SENT: { text: 'Sent', className: 'text-emerald-700' },
  QUEUED: { text: 'Waiting for 8 am', className: 'text-neutral-600' },
  SENDING: { text: 'Sending', className: 'text-neutral-600' },
  SKIPPED: { text: 'Not sent', className: 'text-amber-700' },
  FAILED: { text: 'Failed', className: 'text-red-600' },
};

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function OrderTrackingCard({ orderId, onLinkChanged }: { orderId: string; onLinkChanged?: () => void }) {
  const queryClient = useQueryClient();
  const key = ['order-tracking', orderId];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => trackingApi.overview(orderId) });
  const [confirmRotate, setConfirmRotate] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const resend = useMutation({
    mutationFn: () => trackingApi.resend(orderId),
    onSuccess: () => {
      toast.success('Tracking text sent.');
      refresh();
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not send the text.'));
      refresh();
    },
  });

  const rotate = useMutation({
    mutationFn: () => trackingApi.rotate(orderId),
    onSuccess: () => {
      setConfirmRotate(false);
      toast.success('New tracking link issued. The old link no longer works.');
      refresh();
      onLinkChanged?.();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not issue a new link.')),
  });

  const copy = () =>
    data?.link &&
    navigator.clipboard
      .writeText(data.link)
      .then(() => toast.success('Tracking link copied. Send it to the customer.'))
      .catch(() => toast.error('Could not copy the link.'));

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.link ? (
        <div className="flex flex-wrap gap-2">
          <a href={data.link} target="_blank" rel="noopener noreferrer" className={outlineBtn}>
            <ExternalLink size={14} />
            See what your customer sees
          </a>
          <button type="button" onClick={copy} className={outlineBtn}>
            <Link2 size={14} />
            Copy tracking link
          </button>
          <button type="button" disabled={resend.isPending || data.resendsLeftToday === 0} onClick={() => resend.mutate()} className={outlineBtn}>
            {resend.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Resend tracking SMS
          </button>
        </div>
      ) : (
        <p className="text-sm text-neutral-600">This order has no tracking link yet.</p>
      )}
      {data.link && (
        <p className="text-xs text-neutral-500">
          Resending uses SMS credits. {data.resendsLeftToday} of 3 left today for this order.
        </p>
      )}

      <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-sm">
        <Eye size={15} className="shrink-0 text-neutral-500" />
        {data.views > 0 ? (
          <p className="text-regantify-text">
            Opened {data.views} {data.views === 1 ? 'time' : 'times'}
            {data.lastViewedAt ? `, last on ${when(data.lastViewedAt)}` : ''}.
            <span className="ml-1 text-xs text-neutral-500">(Includes link previews some chat apps load.)</span>
          </p>
        ) : (
          <p className="text-neutral-600">Your customer has not opened the tracking page yet.</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">Texts sent to the customer</p>
        {data.messages.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No texts yet. Turn them on in Store &gt; Order Tracking, or resend the tracking link above.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {data.messages.map((m) => {
              const status = STATUS_WORDS[m.status] ?? { text: m.status, className: 'text-neutral-600' };
              return (
                <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2 text-sm">
                  <span className="text-regantify-text">{m.label}</span>
                  <span className="text-xs text-neutral-500">
                    <span className={`font-medium ${status.className}`}>{status.text}</span>
                    {m.status === 'SENT' && m.smsCount ? ` · ${m.smsCount} ${m.smsCount === 1 ? 'credit' : 'credits'}` : ''}
                    {' · '}
                    {when(m.sentAt ?? m.createdAt)}
                    {m.reason ? ` · ${m.reason}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {data.link && (
        <div className="border-t border-line pt-3">
          {confirmRotate ? (
            <div className="space-y-2">
              <p className="text-sm text-regantify-text">
                This makes the current link stop working. Anyone with the old link, including the one in an earlier text, will no longer see the order. Send the new link to your customer afterwards.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={rotate.isPending}
                  onClick={() => rotate.mutate()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {rotate.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Issue a new link
                </button>
                <button type="button" onClick={() => setConfirmRotate(false)} className={outlineBtn}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmRotate(true)} className="text-xs text-neutral-500 hover:text-regantify-text hover:underline">
              The link was shared by mistake? Issue a new one
            </button>
          )}
        </div>
      )}
    </div>
  );
}
