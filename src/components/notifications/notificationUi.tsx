import type { ReactNode } from 'react';
import { CreditCard, Info, Landmark, LifeBuoy, ShoppingBag, Star, Wallet } from 'lucide-react';
import type { NotificationType, VendorNotification } from '../../lib/notificationsApi';
import { agoPhrase } from '../lms/format';

// Shared look of one notification, used by the bell popup and the full page,
// so a notification reads the same in both. Deliberately plain: a small dark
// icon, text first, hairline dividers, no tiles/pills/arrows.

export const TYPE_ICON: Record<NotificationType, ReactNode> = {
  ORDER: <ShoppingBag size={16} strokeWidth={1.75} />,
  WITHDRAW: <Landmark size={16} strokeWidth={1.75} />,
  WALLET: <Wallet size={16} strokeWidth={1.75} />,
  SUBSCRIPTION: <CreditCard size={16} strokeWidth={1.75} />,
  REVIEW: <Star size={16} strokeWidth={1.75} />,
  SUPPORT: <LifeBuoy size={16} strokeWidth={1.75} />,
  SYSTEM: <Info size={16} strokeWidth={1.75} />,
};

export const TYPE_LABEL: Record<NotificationType, string> = {
  ORDER: 'Orders',
  WITHDRAW: 'Withdrawals',
  WALLET: 'Wallet',
  SUBSCRIPTION: 'Plan and billing',
  REVIEW: 'Reviews',
  SUPPORT: 'Support',
  SYSTEM: 'System',
};

const DHAKA = 'Asia/Dhaka';
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: DHAKA });

function dayHeading(date: Date, now: Date): string {
  const key = dayKey(date);
  if (key === dayKey(now)) return 'Today';
  if (key === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: DHAKA });
}

/** Newest-first list cut into Today / Yesterday / dated groups (Dhaka days). */
export function groupByDay(items: VendorNotification[]): { heading: string; items: VendorNotification[] }[] {
  const now = new Date();
  const groups: { key: string; heading: string; items: VendorNotification[] }[] = [];
  for (const item of items) {
    const date = new Date(item.createdAt);
    const key = dayKey(date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, heading: dayHeading(date, now), items: [item] });
  }
  return groups;
}

/** What opening the notification does, in the vendor's words. Null when it has no link. */
export function actionLabel(item: VendorNotification): string | null {
  const link = item.link;
  if (!link) return null;
  if (link.startsWith('/vendor/orders')) return 'Open order';
  if (link.startsWith('/vendor/billing')) return 'Open billing';
  if (link.startsWith('/vendor/finance')) return 'Open finance';
  if (link.startsWith('/vendor/support')) return 'Open ticket';
  if (link.startsWith('/vendor/review')) return 'Open reviews';
  return 'Open';
}

/** A flat band across the list, like a group header in a table. */
export function DayHeading({ children }: { children: ReactNode }) {
  return <h4 className="border-y border-line bg-regantify-content/60 px-4 py-1.5 text-xs font-medium text-regantify-text-muted first:border-t-0">{children}</h4>;
}

interface RowProps {
  item: VendorNotification;
  onOpen: (item: VendorNotification) => void;
  /** Page only: shows the type and the action label, and a "Mark as read" button on hover. */
  detailed?: boolean;
  onMarkRead?: (item: VendorNotification) => void;
}

export function NotificationRow({ item, onOpen, detailed = false, onMarkRead }: RowProps) {
  const unread = !item.readAt;
  const action = actionLabel(item);
  return (
    <div className="group/row relative border-b border-line last:border-b-0">
      {unread && <span aria-hidden className="absolute left-1.5 top-[19px] h-1.5 w-1.5 rounded-full bg-regantify-cta" />}
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-regantify-content/50 focus:outline-none focus-visible:bg-regantify-content/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/30"
      >
        <span className="mt-0.5 shrink-0 text-regantify-text">{TYPE_ICON[item.type]}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className={`text-[13.5px] leading-snug text-regantify-text ${unread ? 'font-semibold' : 'font-normal'}`}>{item.title}</span>
            <time
              dateTime={item.createdAt}
              title={new Date(item.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: DHAKA })}
              className="shrink-0 text-xs tabular-nums text-regantify-text-muted"
            >
              {agoPhrase(item.createdAt)}
            </time>
          </span>
          {item.body && <span className={`mt-0.5 block break-words text-[13px] leading-snug text-regantify-text-muted ${detailed ? '' : 'line-clamp-2'}`}>{item.body}</span>}
          {detailed && (
            <span className="mt-1 flex items-center gap-4 text-xs">
              <span className="text-regantify-text-muted">{TYPE_LABEL[item.type]}</span>
              {action && <span className="font-medium text-regantify-cta">{action}</span>}
            </span>
          )}
        </span>
      </button>
      {detailed && unread && onMarkRead && (
        <button
          type="button"
          onClick={() => onMarkRead(item)}
          className="absolute bottom-2.5 right-4 rounded-sm text-xs font-medium text-regantify-text-muted underline-offset-2 opacity-0 transition-opacity
            hover:text-regantify-text hover:underline focus:opacity-100 focus-visible:ring-2 focus-visible:ring-brand/30 group-hover/row:opacity-100"
        >
          Mark as read
        </button>
      )}
    </div>
  );
}
