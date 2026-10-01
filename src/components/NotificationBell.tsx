import { type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  CreditCard,
  Landmark,
  ShoppingBag,
  Star,
  Wallet,
  Info,
  LifeBuoy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  notificationsApi,
  type NotificationList,
  type NotificationTone,
  type NotificationType,
  type VendorNotification,
} from '../lib/notificationsApi';
import { agoPhrase } from './lms/format';

// The feed is written by the server where events really happen (withdraw
// approved/rejected/paid, wallet top-up, plan changes, new orders, reviews...),
// see server/src/notifications. The bell just polls it once a minute.

const POLL_MS = 60_000;
const QUERY_KEY = ['notifications'];

const TYPE_ICON: Record<NotificationType, ReactNode> = {
  ORDER: <ShoppingBag size={16} />,
  WITHDRAW: <Landmark size={16} />,
  WALLET: <Wallet size={16} />,
  SUBSCRIPTION: <CreditCard size={16} />,
  REVIEW: <Star size={16} />,
  SUPPORT: <LifeBuoy size={16} />,
  SYSTEM: <Info size={16} />,
};

const TONE_TILE: Record<NotificationTone, string> = {
  INFO: 'bg-sky-50 text-sky-600',
  SUCCESS: 'bg-emerald-50 text-emerald-600',
  WARNING: 'bg-amber-50 text-amber-600',
  DANGER: 'bg-red-50 text-red-600',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificationsApi.list(),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

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

  const open = (item: VendorNotification) => {
    if (!item.readAt) {
      patchCache((l) => ({
        unreadCount: Math.max(0, l.unreadCount - 1),
        items: l.items.map((i) => (i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i)),
      }));
      markRead.mutate(item.id);
    }
    if (item.link) navigate(item.link);
  };

  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>
        <button
          className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line
            bg-white text-regantify-text transition-all duration-200 hover:border-neutral-300 hover:shadow-sm
            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20
            data-[state=open]:border-neutral-300 data-[state=open]:bg-neutral-50"
          title="Notifications"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell
            size={18}
            className="transition-transform duration-300 origin-top group-hover:rotate-[14deg]"
          />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center
                rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white
                ring-2 ring-white"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-orange-500/60" />
              <span className="relative">{unreadCount > 9 ? '9+' : unreadCount}</span>
            </span>
          )}
        </button>
      </RadixDropdown.Trigger>

      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align="end"
          sideOffset={12}
          collisionPadding={12}
          className="z-30 w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-black/10
            bg-white shadow-2xl shadow-black/25 focus:outline-none"
        >
          <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-regantify-text">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-regantify-cta/10 px-2 py-0.5 text-[11px] font-semibold text-regantify-cta">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
                text-regantify-text-muted transition-colors hover:bg-regantify-content hover:text-regantify-text
                disabled:pointer-events-none disabled:opacity-40"
            >
              <CheckCheck size={14} />
              Mark all as read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-1 p-3">
                {[0, 1, 2].map((n) => (
                  <div key={n} className="flex animate-pulse gap-3 rounded-xl p-2.5">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-regantify-content" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 w-2/5 rounded bg-regantify-content" />
                      <div className="h-3 w-4/5 rounded bg-regantify-content" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-regantify-content text-regantify-text-muted">
                  <BellOff size={22} />
                </div>
                <p className="text-sm font-semibold text-regantify-text">You're all caught up</p>
                <p className="mt-1 text-xs text-regantify-text-muted">
                  Orders, payments, withdrawals and plan updates will show up here.
                </p>
              </div>
            ) : (
              <ul className="p-2">
                {items.map((item) => {
                  const unread = !item.readAt;
                  return (
                    <li key={item.id}>
                      <RadixDropdown.Item
                        onSelect={() => open(item)}
                        className="group/item relative flex cursor-pointer select-none items-start gap-3 rounded-xl
                          p-2.5 outline-none transition-colors data-[highlighted]:bg-regantify-content"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_TILE[item.tone]}`}
                        >
                          {TYPE_ICON[item.type]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[13px] leading-snug text-regantify-text ${
                              unread ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.body && (
                            <span className="mt-0.5 block line-clamp-2 text-xs text-regantify-text-muted">
                              {item.body}
                            </span>
                          )}
                          <span className="mt-1 block text-[11px] text-regantify-text-muted/70">
                            {agoPhrase(item.createdAt)}
                          </span>
                        </span>
                        {unread ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-regantify-cta" />
                        ) : (
                          item.link && (
                            <ChevronRight
                              size={14}
                              className="mt-1.5 shrink-0 text-regantify-text-muted opacity-0 transition-opacity group-data-[highlighted]/item:opacity-100"
                            />
                          )
                        )}
                      </RadixDropdown.Item>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}
