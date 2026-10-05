import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Transaction } from '../../../lib/financeApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';

// Finance pages (theme-update-plan.md Step 6): one money format and one
// transaction line, shared by Wallet, Transactions and Withdraw.

/** ৳1,250.00, or -৳95.00 for a negative amount (৳ always leads the digits). */
export function formatTaka(value: string | number): string {
  const n = Number(value);
  const formatted = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-৳${formatted}` : `৳${formatted}`;
}

/** "+৳500.00" in green for money in, "−৳20.00" for money out. */
export function SignedAmount({ t, className = '' }: { t: Pick<Transaction, 'type' | 'amount'>; className?: string }) {
  const credit = t.type === 'CREDIT';
  return (
    <span className={`font-medium tabular-nums ${credit ? 'text-emerald-700' : 'text-regantify-text'} ${className}`}>
      {credit ? '+' : '−'}
      {formatTaka(t.amount)}
    </span>
  );
}

/** "ORDER-123" inside a ledger description becomes a link to that order. */
export function TransactionDescription({ t }: { t: Transaction }) {
  const match = t.orderId ? t.description.match(/ORDER-\d+|[A-Z]{3}-\d{6}-[0-9A-Z]{7}/) : null;
  const text =
    !match || match.index == null ? (
      <>{t.description}</>
    ) : (
      <>
        {t.description.slice(0, match.index)}
        <Link to={`/vendor/orders/${t.orderId}`} className="font-medium text-brand hover:underline">
          {match[0]}
        </Link>
        {t.description.slice(match.index + match[0].length)}
      </>
    );
  return (
    <>
      {text}
      <DueBadge t={t} />
      {t.clearedDue && Number(t.clearedDue.amount) > 0 && (
        <span className="mt-0.5 block text-xs text-neutral-500">
          {formatTaka(t.clearedDue.amount)} of this cleared your due
          {t.clearedDue.orders.length > 0 ? ` (${t.clearedDue.orders.join(', ')})` : ''}.
        </span>
      )}
    </>
  );
}

/**
 * A charge taken while the wallet had too little: "Due" until later money covers it, then
 * "Paid from <order>". The charge is only ever counted once; this just says whether it's still owed.
 */
function DueBadge({ t }: { t: Transaction }) {
  if (!t.due) return null;
  if (t.due.status === 'OPEN') {
    return (
      <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
        Due
      </span>
    );
  }
  return (
    <span
      title={`Paid ${formatDhakaDateTime(t.due.paidAt)}`}
      className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200"
    >
      {t.due.paidBy ? `Paid from ${t.due.paidBy}` : 'Paid'}
    </span>
  );
}

/** One transaction as a list row: in/out icon, what it was, when, amount and the balance after. */
export function TransactionItem({ t }: { t: Transaction }) {
  const credit = t.type === 'CREDIT';
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${credit ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}
        aria-label={credit ? 'Money in' : 'Money out'}
      >
        {credit ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-regantify-text">
          <TransactionDescription t={t} />
        </p>
        <p className="mt-0.5 text-xs text-neutral-500">{formatDhakaDateTime(t.createdAt)}</p>
      </div>
      <div className="shrink-0 text-right">
        <SignedAmount t={t} className="text-sm" />
        <p className="mt-0.5 text-xs tabular-nums text-neutral-500">Balance {formatTaka(t.balanceAfter)}</p>
      </div>
    </li>
  );
}
