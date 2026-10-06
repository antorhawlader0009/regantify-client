import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Headphones,
  Hourglass,
  MessageSquare,
  PackageX,
  PhoneCall,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardTodo } from '../../lib/dashboardApi';
import { useViewer } from '../../lib/useStaffAccess';
import { canOpenPath } from '../../lib/staffPermissions';

type Tone = 'neutral' | 'warning' | 'danger';

interface Row {
  key: string;
  icon: LucideIcon;
  /** The count, shown bold, then the rest of the sentence. */
  count: number;
  text: string;
  tone: Tone;
  to: string;
}

const TONE: Record<Tone, string> = {
  neutral: 'bg-neutral-100 text-neutral-600',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60_000)));
}

/**
 * Dashboard > "Needs your attention" (dashboard-plan.md Step 5): one row
 * per open to-do, in the order a seller's day goes (confirm → courier →
 * returns → stock → the rest). Rows with nothing to do are left out.
 * Every row opens the page or filtered list that holds those items.
 */
export function AttentionList({ todo, isOwner, planName }: { todo: DashboardTodo; isOwner: boolean; planName: string }) {
  const viewer = useViewer();
  const days = todo.recentDays;
  const lmsDue = todo.lmsTasks ? todo.lmsTasks.overdue + todo.lmsTasks.today : 0;

  const candidates: Row[] = [
    {
      key: 'pending',
      icon: ClipboardCheck,
      count: todo.pendingOrders,
      text: plural(todo.pendingOrders, 'order waiting for confirmation', 'orders waiting for confirmation'),
      tone: 'neutral',
      to: '/vendor/orders?status=PENDING',
    },
    {
      key: 'codVerification',
      icon: ShieldCheck,
      count: todo.codVerification,
      text: `COD ${plural(todo.codVerification, 'order', 'orders')} waiting for the shopper’s SMS code`,
      tone: 'neutral',
      to: '/vendor/orders?status=ON_HOLD',
    },
    {
      key: 'notBooked',
      icon: Truck,
      count: todo.notBooked,
      text: `processing ${plural(todo.notBooked, 'order', 'orders')} not sent to a courier yet`,
      tone: 'neutral',
      to: '/vendor/orders?status=PROCESSING&courierBooking=NOT_BOOKED',
    },
    {
      key: 'bookingFailed',
      icon: AlertTriangle,
      count: todo.bookingFailed,
      text: `courier ${plural(todo.bookingFailed, 'booking', 'bookings')} failed. Try again or pick another courier`,
      tone: 'danger',
      to: '/vendor/orders?courierBooking=FAILED',
    },
    {
      key: 'incompletePayment',
      icon: CreditCard,
      count: todo.incompletePayment,
      text: `${plural(todo.incompletePayment, 'order', 'orders')} with an online payment not completed`,
      tone: 'neutral',
      to: '/vendor/orders?status=PAYMENT_INITIATED',
    },
    {
      key: 'returned',
      icon: Undo2,
      count: todo.returnedRecently,
      text: `${plural(todo.returnedRecently, 'parcel', 'parcels')} returned in the last ${days} days. Receive and restock`,
      tone: 'neutral',
      to: '/vendor/orders?status=RETURN',
    },
    {
      key: 'lowStock',
      icon: PackageX,
      count: todo.lowStock,
      text: `${plural(todo.lowStock, 'product', 'products')} low on stock (under ${todo.lowStockThreshold})`,
      tone: 'neutral',
      to: '/vendor/product/low-stock',
    },
    {
      key: 'sellingOut',
      icon: Hourglass,
      count: todo.sellingOutSoon,
      text: `${plural(todo.sellingOutSoon, 'product', 'products')} will sell out within 14 days at this pace`,
      tone: 'neutral',
      to: '/vendor/analytics?tab=products',
    },
    // Money and plan matters are the owner's to fix.
    ...(isOwner && todo.smsLow
      ? [
          {
            key: 'sms',
            icon: MessageSquare,
            count: todo.smsLow.credits,
            text: `SMS ${plural(todo.smsLow.credits, 'credit', 'credits')} left. Order and COD Guard SMS stop at 0`,
            tone: 'warning' as const,
            to: '/vendor/sms',
          },
        ]
      : []),
    ...(isOwner && todo.planExpiresAt
      ? [
          {
            key: 'plan',
            icon: CalendarClock,
            count: daysUntil(todo.planExpiresAt),
            text: `${plural(daysUntil(todo.planExpiresAt), 'day', 'days')} left on your ${planName} plan. Renew to keep its features`,
            tone: 'warning' as const,
            to: '/vendor/billing',
          },
        ]
      : []),
    ...(todo.lmsTasks
      ? [
          {
            key: 'lms',
            icon: PhoneCall,
            count: lmsDue,
            text:
              todo.lmsTasks.overdue > 0
                ? `LMS ${plural(lmsDue, 'follow-up', 'follow-ups')} due (${todo.lmsTasks.overdue} overdue)`
                : `LMS ${plural(lmsDue, 'follow-up', 'follow-ups')} due today`,
            tone: todo.lmsTasks.overdue > 0 ? ('warning' as const) : ('neutral' as const),
            to: `/vendor/lms/tasks?view=${todo.lmsTasks.overdue > 0 ? 'OVERDUE' : 'TODAY'}${isOwner ? '&who=ALL' : ''}`,
          },
        ]
      : []),
    {
      key: 'badReviews',
      icon: Star,
      count: todo.badReviews,
      text: `new 1-2 star ${plural(todo.badReviews, 'review', 'reviews')} in the last ${days} days`,
      tone: 'neutral',
      to: '/vendor/reviews',
    },
    {
      key: 'abandoned',
      icon: ShoppingCart,
      count: todo.abandonedCarts,
      text: `abandoned ${plural(todo.abandonedCarts, 'cart', 'carts')} in the last ${days} days`,
      tone: 'neutral',
      to: '/vendor/orders?tab=abandoned-cart',
    },
    {
      key: 'support',
      icon: Headphones,
      count: todo.supportUnread,
      text: `support ${plural(todo.supportUnread, 'reply', 'replies')} to read`,
      tone: 'neutral',
      to: '/vendor/support',
    },
  ];
  // SMS at 0 credits and a plan ending today are the most urgent of all, so those two show even at 0.
  // A row only shows when its page opens for this person's role (rule-plan.md Step 7).
  const rows = candidates.filter((r) => (r.count > 0 || r.key === 'sms' || r.key === 'plan') && canOpenPath(viewer, r.to));

  return (
    <section className="h-full rounded-xl border border-line bg-white" aria-labelledby="attention-title">
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <h2 id="attention-title" className="text-[15px] font-semibold text-regantify-text">
          Needs your attention
        </h2>
        {rows.length > 0 && (
          <span className="rounded-full bg-brand-lime px-2 py-0.5 text-xs font-medium text-brand">{rows.length}</span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center gap-3 border-t border-line px-4 py-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
            <Check size={17} strokeWidth={2.5} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-regantify-text">You’re all caught up</p>
            <p className="mt-0.5 text-xs text-neutral-500">Nothing needs you right now. New orders will show here.</p>
          </div>
        </div>
      ) : (
        <ul className="border-t border-line">
          {rows.map((row) => {
            const Icon = row.icon;
            const content = (
              <>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE[row.tone]}`}>
                  <Icon size={16} strokeWidth={1.8} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm text-regantify-text">
                  <span className="font-semibold tabular-nums">{row.count.toLocaleString()}</span> {row.text}
                </span>
                <ChevronRight size={16} className="shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </>
            );
            const cls =
              'group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none';
            return (
              <li key={row.key} className="border-b border-line last:border-b-0">
                <Link to={row.to} className={cls}>
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
