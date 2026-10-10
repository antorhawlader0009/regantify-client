import type { ReactNode } from 'react';
import { Newspaper } from 'lucide-react';
import type { DashboardSummary } from '../../lib/dashboardApi';
import { formatValue } from '../analytics/format';
import { useViewer } from '../../lib/useStaffAccess';

/** A money amount inside a sentence; masked by "Hide numbers" like every other one. */
function Money({ value }: { value: number }) {
  return <strong className="dash-money font-semibold text-regantify-text">{formatValue(value, 'money')}</strong>;
}

function Num({ value }: { value: number }) {
  return <strong className="font-semibold text-regantify-text">{value.toLocaleString()}</strong>;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Today's sales vs yesterday at the same time, in words. */
function salesSentence(data: DashboardSummary): ReactNode {
  if (!data.today) return null; // a staff role without dashboard.view
  const { current, previous } = data.today.sales;
  const orders = data.today.orders.current;
  if (current > 0) {
    const change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
    return (
      <>
        So far today you’ve sold <Money value={current} /> from <Num value={orders} /> {plural(orders, 'order', 'orders')}
        {change == null
          ? ', more than yesterday by this time.'
          : change === 0
            ? ', the same as yesterday by this time.'
            : `, ${Math.abs(change)}% ${change > 0 ? 'more' : 'less'} than yesterday by this time.`}
      </>
    );
  }
  if (previous > 0) {
    return (
      <>
        No sales yet today. Yesterday by this time you had <Money value={previous} />.
      </>
    );
  }
  return 'It’s quiet so far today: no sales yet.';
}

/** The most urgent to-do, plus how many more are waiting below. */
function todoSentence(data: DashboardSummary, isOwner: boolean): ReactNode {
  const t = data.todo;
  // Same order as the "Needs your attention" list.
  const items: { count: number; text: (n: number) => string }[] = [
    { count: t.pendingOrders, text: (n) => `${plural(n, 'order is', 'orders are')} waiting for confirmation` },
    { count: t.codVerification, text: (n) => `COD ${plural(n, 'order is', 'orders are')} waiting for the shopper’s SMS code` },
    { count: t.notBooked, text: (n) => `processing ${plural(n, 'order hasn’t', 'orders haven’t')} been sent to a courier` },
    { count: t.bookingFailed, text: (n) => `courier ${plural(n, 'booking', 'bookings')} failed` },
    { count: t.incompletePayment, text: (n) => `online ${plural(n, 'payment is', 'payments are')} not completed` },
    { count: t.returnedRecently, text: (n) => `${plural(n, 'parcel', 'parcels')} came back recently` },
    { count: t.returnsToCheck, text: (n) => `returned ${plural(n, 'parcel', 'parcels')} to check in at the shop` },
  ];
  const open = items.filter((i) => i.count > 0);
  // The rest of the list's rows, so "N more" always matches what the list shows (SMS / plan rows are owner only, like there).
  // isOwner from the signed-in user, not `data.money != null`: staff with finance.view get the money card too (rule-plan.md Step 7).
  const otherRows =
    [t.lowStock, t.sellingOutSoon, t.badReviews, t.abandonedCarts, t.supportUnread, t.lmsTasks ? t.lmsTasks.overdue + t.lmsTasks.today : 0].filter((n) => n > 0)
      .length +
    (isOwner && t.smsLow ? 1 : 0) +
    (isOwner && t.planExpiresAt ? 1 : 0);
  const more = open.length - 1 + otherRows;

  if (open.length === 0) {
    return otherRows > 0 ? `No orders need you right now; ${otherRows} other ${plural(otherRows, 'thing is', 'things are')} listed below.` : 'Nothing needs you right now.';
  }
  const first = open[0];
  return (
    <>
      <Num value={first.count} /> {first.text(first.count)}
      {more > 0 ? `, and ${more} more ${plural(more, 'thing needs', 'things need')} you below.` : '.'}
    </>
  );
}

function stockSentence(data: DashboardSummary): ReactNode | null {
  const first = data.todo.sellingOutFirst;
  if (first) {
    return first.daysLeft <= 0 ? (
      <>
        <strong className="font-semibold text-regantify-text">{first.name}</strong> is about to run out.
      </>
    ) : (
      <>
        <strong className="font-semibold text-regantify-text">{first.name}</strong> will run out in about {first.daysLeft}{' '}
        {plural(first.daysLeft, 'day', 'days')} at this pace.
      </>
    );
  }
  if (data.todo.lowStock > 0) {
    return (
      <>
        <Num value={data.todo.lowStock} /> {plural(data.todo.lowStock, 'product is', 'products are')} low on stock.
      </>
    );
  }
  return null;
}

function moneySentence(data: DashboardSummary): ReactNode | null {
  const cod = data.money?.codWithCouriers;
  if (!cod || cod.amount <= 0) return null;
  return (
    <>
      Couriers are holding <Money value={cod.amount} /> of COD money for you from <Num value={cod.count} />{' '}
      {plural(cod.count, 'parcel', 'parcels')}.
    </>
  );
}

/**
 * Dashboard > "Today's brief" (dashboard-plan.md Step 10, version 1): a
 * few plain sentences built from the same numbers as the cards below, so
 * it's free, instant and can never say something the data doesn't. It
 * only describes; nothing here acts. Not shown before the first order
 * (the setup checklist is the story then).
 */
export function DailyBrief({ data }: { data: DashboardSummary }) {
  const isOwner = useViewer().isOwner;
  if (!data.setup.hasOrder) return null;
  const sentences = [salesSentence(data), todoSentence(data, isOwner), stockSentence(data), moneySentence(data)].filter(Boolean).slice(0, 4);

  return (
    <section className="flex gap-3 rounded-xl border border-line bg-white p-4" aria-labelledby="brief-title">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-lime/60 text-brand">
        <Newspaper size={17} strokeWidth={1.8} aria-hidden />
      </span>
      <div className="min-w-0">
        <h2 id="brief-title" className="text-[15px] font-semibold text-regantify-text">
          Today’s brief
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
          {sentences.map((s, i) => (
            <span key={i}>
              {i > 0 && ' '}
              {s}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
