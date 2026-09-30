import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { Bell, BellOff, CheckCheck, ShoppingBag, Star, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ordersApi, vendorOrderTotal } from '../lib/ordersApi';
import { reviewsApi } from '../lib/reviewsApi';
import { agoPhrase } from './lms/format';

// There is no notification table on the server: the bell is a live digest of
// things in the vendor's store that need attention, built from the existing
// orders and reviews endpoints and refreshed every minute. "Unread" means
// newer than the moment the vendor last pressed "Mark all as read" (kept per
// user in this browser only).

const POLL_MS = 60_000;
const MAX_ITEMS = 12;

interface NotificationItem {
  id: string;
  kind: 'order' | 'review';
  title: string;
  body: string;
  at: string;
  to: string;
}

const seenKey = (userId?: string) => `regantify.notifications.seenAt.${userId ?? 'anon'}`;

function readSeenAt(userId?: string): number {
  try {
    return Number(localStorage.getItem(seenKey(userId))) || 0;
  } catch {
    return 0;
  }
}

function formatTaka(value: string): string {
  return `৳${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const KIND_STYLE: Record<NotificationItem['kind'], { tile: string; icon: ReactNode }> = {
  order: { tile: 'bg-orange-50 text-regantify-cta', icon: <ShoppingBag size={16} /> },
  review: { tile: 'bg-amber-50 text-amber-500', icon: <Star size={16} /> },
};

export function NotificationBell() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [seenAt, setSeenAt] = useState(() => readSeenAt(userId));

  const orders = useQuery({
    queryKey: ['notifications', 'orders'],
    queryFn: () => ordersApi.list({ status: 'PENDING', perPage: 10 }),
    refetchInterval: POLL_MS,
    retry: false,
  });
  const reviews = useQuery({
    queryKey: ['notifications', 'reviews'],
    queryFn: () => reviewsApi.list({ perPage: 20 }),
    refetchInterval: POLL_MS,
    retry: false,
  });

  const items = useMemo<NotificationItem[]>(() => {
    const fromOrders: NotificationItem[] = (orders.data?.orders ?? []).map((o) => ({
      id: `order-${o.id}`,
      kind: 'order',
      title: `New order #${o.invoiceNumber}`,
      body: `${o.customerName} · ${formatTaka(vendorOrderTotal(o))} · waiting to be processed`,
      at: o.createdAt,
      to: `/vendor/orders/${o.id}`,
    }));
    const fromReviews: NotificationItem[] = (reviews.data?.reviews ?? [])
      .filter((r) => !r.approved)
      .map((r) => ({
        id: `review-${r.id}`,
        kind: 'review',
        title: `${r.rating}★ review needs approval`,
        body: `${r.customerName ?? 'A customer'}: ${r.title}`,
        at: r.createdAt,
        to: `/vendor/reviews/${r.id}/edit`,
      }));
    return [...fromOrders, ...fromReviews]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, MAX_ITEMS);
  }, [orders.data, reviews.data]);

  const unreadCount = items.filter((i) => new Date(i.at).getTime() > seenAt).length;
  const loading = orders.isLoading && reviews.isLoading;

  const markAllRead = useCallback(() => {
    const now = Date.now();
    setSeenAt(now);
    try {
      localStorage.setItem(seenKey(userId), String(now));
    } catch {
      // storage blocked — the dots just come back on reload
    }
  }, [userId]);

  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>
        <button
          className="group relative flex h-10 w-10 items-center justify-center rounded-full
            bg-white/10 text-white transition-all duration-200 hover:bg-white/20 hover:scale-105
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40
            data-[state=open]:bg-white/20"
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
                rounded-full bg-regantify-cta px-1 text-[10px] font-bold leading-none text-white
                ring-2 ring-black"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-regantify-cta/60" />
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
              onClick={markAllRead}
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
            {loading ? (
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
                  New orders and reviews will show up here.
                </p>
              </div>
            ) : (
              <ul className="p-2">
                {items.map((item) => {
                  const unread = new Date(item.at).getTime() > seenAt;
                  const style = KIND_STYLE[item.kind];
                  return (
                    <li key={item.id}>
                      <RadixDropdown.Item
                        onSelect={() => navigate(item.to)}
                        className="group/item relative flex cursor-pointer select-none items-start gap-3 rounded-xl
                          p-2.5 outline-none transition-colors data-[highlighted]:bg-regantify-content"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.tile}`}
                        >
                          {style.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-[13px] text-regantify-text ${
                              unread ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-regantify-text-muted">
                            {item.body}
                          </span>
                          <span className="mt-1 block text-[11px] text-regantify-text-muted/70">
                            {agoPhrase(item.at)}
                          </span>
                        </span>
                        {unread ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-regantify-cta" />
                        ) : (
                          <ChevronRight
                            size={14}
                            className="mt-1.5 shrink-0 text-regantify-text-muted opacity-0 transition-opacity group-data-[highlighted]/item:opacity-100"
                          />
                        )}
                      </RadixDropdown.Item>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-black/5 bg-regantify-content/50 p-2">
            <RadixDropdown.Item
              onSelect={() => navigate('/vendor/orders')}
              className="flex cursor-pointer items-center justify-center gap-1 rounded-xl py-2 text-[13px]
                font-medium text-regantify-text outline-none transition-colors data-[highlighted]:bg-regantify-content"
            >
              View all orders
              <ChevronRight size={14} />
            </RadixDropdown.Item>
          </div>
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}
