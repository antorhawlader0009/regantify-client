import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { financeApi, type TransactionType } from '../../../lib/financeApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import {
  EmptyState,
  PageHeader,
  PageSection,
  PillTabs,
  StackedList,
  TableFooter,
  TableFrame,
  TableSkeleton,
  outlineBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';
import { DateRangeFilter } from '../order/DateRangeFilter';
import { SignedAmount, TransactionDescription, TransactionItem, formatTaka } from './financeUi';

type TypeFilter = 'ALL' | TransactionType;

/**
 * Finance > Transactions — the wallet's ledger, newest first: money in
 * (green, "+") and money out ("−"), with the balance after each. Filter
 * by money in / out and by dates (server-side, see FinanceService
 * .listTransactions); "ORDER-…" in a description links to the order.
 */
export default function Transactions() {
  const [type, setType] = useState<TypeFilter>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const query = { page, perPage, type: type === 'ALL' ? undefined : type, from: dateFrom, to: dateTo };
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['finance', 'transactions', query],
    queryFn: () => financeApi.getTransactions(query),
    placeholderData: keepPreviousData,
  });

  const transactions = data?.transactions ?? [];
  const filtered = type !== 'ALL' || Boolean(dateFrom || dateTo);
  const COLS = 4;
  const empty = filtered
    ? { title: 'Nothing matches', hint: 'Try All, or clear the dates.', action: undefined }
    : {
        title: 'No transactions yet',
        hint: 'Money shows up here when online orders are paid, orders complete, or you add or withdraw money.',
        action: (
          <Link to="/vendor/finance/wallet" className={outlineBtn}>
            Go to wallet
          </Link>
        ),
      };

  return (
    <PageSection>
      <PageHeader title="Transactions" description="Every change to your wallet balance, newest first." />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <PillTabs<TypeFilter>
          className="w-full sm:w-fit"
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
          tabs={[
            { id: 'ALL', label: 'All' },
            { id: 'CREDIT', label: 'Money in' },
            { id: 'DEBIT', label: 'Money out' },
          ]}
        />
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(from, to) => {
            setDateFrom(from);
            setDateTo(to);
            setPage(1);
          }}
        />
      </div>

      {isError && !data ? (
        <div className="rounded-lg border border-line">
          <EmptyState icon={Receipt} title="Couldn’t load your transactions" hint="Refresh the page to try again." />
        </div>
      ) : (
        <div className={`transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
          <div className="hidden md:block">
            <TableFrame minWidth="min-w-[720px]">
              <thead>
                <tr className={theadRow}>
                  <th className={`${th} w-48`}>Date</th>
                  <th className={th}>What it was</th>
                  <th className={`${th} w-40 text-right`}>Amount</th>
                  <th className={`${th} w-40 text-right`}>Balance after</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton rows={8} colSpan={COLS} />
                ) : transactions.length === 0 ? (
                  <EmptyState as="row" colSpan={COLS} icon={Receipt} title={empty.title} hint={empty.hint} action={empty.action} />
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className={trClass()}>
                      <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDhakaDateTime(t.createdAt)}</td>
                      <td className={td}>
                        <TransactionDescription t={t} />
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <SignedAmount t={t} />
                      </td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums text-neutral-600`}>{formatTaka(t.balanceAfter)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </TableFrame>
          </div>

          <div className="md:hidden">
            {isLoading ? (
              <div className="space-y-2" aria-busy>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-100" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-lg border border-line">
                <EmptyState icon={Receipt} title={empty.title} hint={empty.hint} action={empty.action} />
              </div>
            ) : (
              <StackedList>
                {transactions.map((t) => (
                  <TransactionItem key={t.id} t={t} />
                ))}
              </StackedList>
            )}
          </div>

          {data && data.total > 0 && (
            <TableFooter
              page={page}
              perPage={perPage}
              total={data.total}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n);
                setPage(1);
              }}
              perPageOptions={[20, 50, 100]}
            />
          )}
        </div>
      )}
    </PageSection>
  );
}
