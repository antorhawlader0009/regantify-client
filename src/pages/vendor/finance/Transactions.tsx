import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financeApi, type TransactionType } from '../../../lib/financeApi';

function formatAmount(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const TYPE_BADGE: Record<TransactionType, string> = {
  CREDIT: 'bg-green-100 text-green-700',
  DEBIT: 'bg-red-100 text-red-700',
};

export default function Transactions() {
  const [page, setPage] = useState(1);
  const perPage = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'transactions', page],
    queryFn: () => financeApi.getTransactions(page, perPage),
  });

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Transactions</h1>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content text-left text-regantify-text-muted">
              <th className="px-5 py-3 font-medium">DATE</th>
              <th className="px-5 py-3 font-medium">DESCRIPTION</th>
              <th className="px-5 py-3 font-medium">TYPE</th>
              <th className="px-5 py-3 font-medium">AMOUNT</th>
              <th className="px-5 py-3 font-medium">BALANCE AFTER</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-regantify-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-regantify-text-muted">
                  No transactions yet.
                </td>
              </tr>
            )}
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-black/5">
                <td className="px-5 py-3.5 text-regantify-text whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                <td className="px-5 py-3.5 text-regantify-text">{t.description}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md ${TYPE_BADGE[t.type]}`}>{t.type}</span>
                </td>
                <td className={`px-5 py-3.5 font-medium ${t.type === 'DEBIT' ? 'text-red-600' : 'text-green-700'}`}>
                  {t.type === 'DEBIT' ? '-' : '+'}
                  {formatAmount(t.amount)}
                </td>
                <td className="px-5 py-3.5 text-regantify-text">{formatAmount(t.balanceAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text
                  hover:bg-regantify-content disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              <span className="px-2 text-sm text-regantify-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text
                  hover:bg-regantify-content disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
