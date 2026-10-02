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
  const match = t.orderId ? t.description.match(/ORDER-\d+/) : null;
  if (!match || match.index == null) return <>{t.description}</>;
  return (
    <>
      {t.description.slice(0, match.index)}
      <Link to={`/vendor/orders/${t.orderId}`} className="font-medium text-brand hover:underline">
        {match[0]}
      </Link>
      {t.description.slice(match.index + match[0].length)}
    </>
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
