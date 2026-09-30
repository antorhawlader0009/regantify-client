import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { lmsApi, type LmsNotification, type LmsNotificationSummary, type LmsNotificationType } from '../../lib/lmsApi';
import { LMS_HOME } from '../../lib/lmsWindow';
import { agoPhrase } from './format';
import { LmsButton } from './ui';

/*
 * LMS notifications (LMS-plan.md Step 8). One poll every minute feeds the
 * bell, the Leads / Tasks badges and the browser alerts. It keeps running
 * while the LMS tab is in the background, so an agent working in another
 * tab still gets an alert within a minute. No websockets.
 */

export const LMS_SUMMARY_KEY = ['lms', 'notifications', 'summary'] as const;

export function useLmsSummary(enabled = true) {
  return useQuery({
    queryKey: LMS_SUMMARY_KEY,
    queryFn: lmsApi.notificationSummary,
    enabled,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    staleTime: 20_000,
  });
}

const TYPE_WORDS: Record<LmsNotificationType, string> = {
  ASSIGNED: 'New lead',
  CAME_AGAIN: 'Came in again',
  TASK_DUE: 'Due now',
  STALE: 'Gone quiet',
  AUTOMATION: 'Automation',
};

/** Where a notification leads: the lead's drawer, keeping the Leads filters when already there. */
function useOpenLead() {
  const navigate = useNavigate();
  const location = useLocation();
  return (leadId: string) => {
    const params = new URLSearchParams(location.pathname === LMS_HOME ? location.search : '');
    params.set('lead', leadId);
    navigate({ pathname: LMS_HOME, search: `?${params}` });
  };
}

// ------------------------------------------------------------------ bell

export function NotificationBell() {
  const queryClient = useQueryClient();
  const summary = useLmsSummary();
  const openLead = useOpenLead();
  const [open, setOpen] = useState(false);
  const unread = summary.data?.unread ?? 0;

  const markRead = useMutation({
    mutationFn: lmsApi.markNotificationsRead,
    onSuccess: (fresh) => queryClient.setQueryData(LMS_SUMMARY_KEY, fresh),
    onError: (err) => toast.error(apiErrorMessage(err, "That didn't work. Try again.")),
  });

  const pick = (n: LmsNotification) => {
    if (!n.readAt) markRead.mutate({ ids: [n.id] });
    setOpen(false);
    if (n.leadId) openLead(n.leadId);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-lms-muted hover:text-lms-ink"
        >
          <Bell size={20} />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 min-w-[18px] rounded-full bg-lms-ink px-1 text-center text-[11px] font-semibold leading-[18px] text-white tabular-nums"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="lms-root z-50 flex max-h-[min(32rem,80vh)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[10px] border border-lms-line bg-lms-surface shadow-lg focus:outline-none"
        >
          <div className="flex items-center justify-between border-b border-lms-line px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            {unread > 0 && (
              <LmsButton variant="quiet" className="-mr-2 !h-8" disabled={markRead.isPending} onClick={() => markRead.mutate({ all: true })}>
                Mark all read
              </LmsButton>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {summary.isPending ? (
              <p className="px-4 py-6 text-sm text-lms-muted">Loading…</p>
            ) : !summary.data?.latest.length ? (
              <div className="px-4 py-8">
                <p className="text-sm font-medium">Nothing yet</p>
                <p className="mt-1 text-sm text-lms-muted">New leads for you, callbacks that come due and leads that go quiet show up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-lms-line">
                {summary.data.latest.map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => pick(n)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-lms-page">
                      {/* The dot is the only unread marker: read rows keep its space so text stays aligned. */}
                      <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? '' : 'bg-lms-ink'}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.readAt ? 'text-lms-muted' : ''}`}>{n.text}</span>
                        <span className="mt-0.5 block text-xs text-lms-muted">
                          {TYPE_WORDS[n.type]}, {agoPhrase(n.createdAt)}
                          {!n.readAt && <span className="sr-only"> (unread)</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <AlertsControl />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------- alerts

type AlertState = 'unsupported' | 'default' | 'granted' | 'denied';

function alertState(): AlertState {
  return typeof window === 'undefined' || !('Notification' in window) ? 'unsupported' : (Notification.permission as AlertState);
}

/** Browser alerts are asked for only here, by the person, never on page load. */
function AlertsControl() {
  const [state, setState] = useState<AlertState>(alertState);
  if (state === 'unsupported') return null;

  const ask = async () => {
    const result = await Notification.requestPermission();
    setState(result as AlertState);
    if (result === 'granted') toast.success('Alerts are on');
  };

  return (
    <div className="border-t border-lms-line bg-lms-page px-4 py-3 text-sm">
      {state === 'granted' ? (
        <p className="text-lms-muted">Alerts are on in this browser, even when this tab is in the background.</p>
      ) : state === 'denied' ? (
        <p className="text-lms-muted">Alerts are blocked for this site. Allow notifications in your browser's site settings, then reload.</p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-lms-muted">Get a pop-up when a lead comes to you, even with this tab in the background.</p>
          <LmsButton variant="primary" className="shrink-0" onClick={ask}>
            Turn on alerts
          </LmsButton>
        </div>
      )}
    </div>
  );
}

/**
 * Pops a browser notification for each new one while the LMS tab isn't in
 * front (in front, the bell already shows it). Only notifications that
 * arrive after the page opened; the id as the tag keeps two open LMS tabs
 * from showing the same one twice.
 */
export function useBrowserAlerts(summary: LmsNotificationSummary | undefined) {
  const openLead = useOpenLead();
  const seenUntil = useRef<number | null>(null);

  useEffect(() => {
    if (!summary) return;
    const newest = summary.latest.reduce((t, n) => Math.max(t, new Date(n.createdAt).getTime()), 0);
    if (seenUntil.current === null) {
      seenUntil.current = newest;
      return;
    }
    const fresh = summary.latest.filter((n) => !n.readAt && new Date(n.createdAt).getTime() > seenUntil.current!);
    seenUntil.current = Math.max(seenUntil.current, newest);
    if (!fresh.length || alertState() !== 'granted' || (document.visibilityState === 'visible' && document.hasFocus())) return;

    for (const n of fresh.slice(0, 3).reverse()) {
      const alert = new Notification(`LMS: ${TYPE_WORDS[n.type]}`, { body: n.text, tag: `lms-${n.id}` });
      alert.onclick = () => {
        window.focus();
        if (n.leadId) openLead(n.leadId);
        alert.close();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);
}

/** Mounted once in the LMS shell (only while the LMS is on). */
export function BrowserAlerts() {
  const summary = useLmsSummary();
  useBrowserAlerts(summary.data);
  return null;
}

// ---------------------------------------------------------------- badges

/** A count on a section tab: ink for "yours to do", red for overdue. */
export function NavBadge({ count, tone, dot = false, label }: { count: number; tone: 'ink' | 'alert'; dot?: boolean; label: string }) {
  if (!count) return null;
  const color = tone === 'alert' ? 'bg-lms-alert' : 'bg-lms-ink';
  const text = count > 99 ? '99+' : count;
  return dot ? (
    <span aria-label={label} className={`absolute -right-2 -top-1.5 min-w-4 rounded-full px-1 text-center text-[10px] font-semibold leading-4 text-white tabular-nums ${color}`}>
      {text}
    </span>
  ) : (
    <span aria-label={label} className={`ml-1.5 rounded-full px-1.5 text-[11px] font-semibold leading-[18px] text-white tabular-nums ${color}`}>
      {text}
    </span>
  );
}
