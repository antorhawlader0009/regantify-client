import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Popover from '@radix-ui/react-popover';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi, type NotificationList, type VendorNotification } from '../lib/notificationsApi';
import { DayHeading, NotificationRow, groupByDay } from './notifications/notificationUi';
import { alertFor, takeNewForAlert } from '../lib/notificationAlerts';

// The feed is written by the server where events really happen (withdraw
// approved/rejected/paid, wallet top-up, plan changes, new orders, reviews...),
// see server/src/notifications. The bell polls it every 30 seconds, and a
// new one also rings / pops up as this device's Alert settings say
// (lib/notificationAlerts.ts).

const POLL_MS = 30_000;
const QUERY_KEY = ['notifications'];

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationsApi.list(),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Sound and desktop pop-up for what arrived since the last look (once across tabs and bells).
  useEffect(() => {
    if (!data) return;
    alertFor(takeNewForAlert(data.items), (item) => openItemRef.current(item));
  }, [data]);

  const all = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const items = unreadOnly ? all.filter((i) => !i.readAt) : all;
  const groups = groupByDay(items);

  // Flip read state in the cache right away; the next poll confirms it.
  const patchCache = (fn: (list: NotificationList) => NotificationList) =>
    queryClient.setQueryData<NotificationList>(QUERY_KEY, (old) => (old ? fn(old) : old));

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: () => {
      const now = new Date().toISOString();
      patchCache((l) => ({
        unreadCount: 0,
        items: l.items.map((i) => (i.readAt ? i : { ...i, readAt: now })),
      }));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const openItem = (item: VendorNotification) => {
    if (!item.readAt) {
      patchCache((l) => ({
        unreadCount: Math.max(0, l.unreadCount - 1),
        items: l.items.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i)),
      }));
      markRead.mutate(item.id);
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  };
  const openItemRef = useRef(openItem);
  openItemRef.current = openItem;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line
            bg-white text-regantify-text transition-colors hover:border-neutral-300
            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20
            data-[state=open]:border-neutral-300 data-[state=open]:bg-neutral-50"
          title="Notifications"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell size={18} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center
                rounded-full bg-orange-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-30 flex max-h-[min(560px,calc(100vh-96px))] w-[400px] max-w-[calc(100vw-24px)] flex-col overflow-hidden
            rounded-md border border-line bg-white shadow-lg focus:outline-none"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <h3 className="text-sm font-semibold text-regantify-text">Notifications</h3>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0}
              className="rounded-sm text-[13px] font-medium text-regantify-cta underline-offset-2 hover:underline
                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:text-regantify-text-muted disabled:opacity-60"
            >
              Mark all as read
            </button>
          </div>

          <div role="tablist" aria-label="Show" className="flex gap-5 border-b border-line px-4">
            {[
              { label: 'All', value: false },
              { label: unreadCount ? `Unread ${unreadCount}` : 'Unread', value: true },
            ].map((tab) => (
              <button
                key={tab.label}
                role="tab"
                aria-selected={unreadOnly === tab.value}
                onClick={() => setUnreadOnly(tab.value)}
                className={`-mb-px border-b-2 pb-2 text-[13px] font-medium transition-colors focus:outline-none focus-visible:text-regantify-text ${
                  unreadOnly === tab.value ? 'border-regantify-text text-regantify-text' : 'border-transparent text-regantify-text-muted hover:text-regantify-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="divide-y divide-line" aria-busy>
                {[0, 1, 2].map((n) => (
                  <div key={n} className="flex animate-pulse gap-3 px-4 py-3">
                    <div className="mt-0.5 h-4 w-4 shrink-0 rounded-sm bg-regantify-content" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/5 rounded-sm bg-regantify-content" />
                      <div className="h-3 w-4/5 rounded-sm bg-regantify-content" />
                    </div>
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-regantify-text-muted">
                {unreadOnly ? 'No unread notifications.' : 'No notifications yet. Orders, payments and plan updates will show up here.'}
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.heading}>
                  <DayHeading>{group.heading}</DayHeading>
                  {group.items.map((item) => (
                    <NotificationRow key={item.id} item={item} onOpen={openItem} />
                  ))}
                </section>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/vendor/notifications');
            }}
            className="border-t border-line px-4 py-2.5 text-center text-[13px] font-medium text-regantify-text transition-colors
              hover:bg-regantify-content/50 focus:outline-none focus-visible:bg-regantify-content/50"
          >
            See all notifications
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
