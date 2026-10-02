import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Eye, EyeOff, Plus, Receipt } from 'lucide-react';
import { financeApi } from '../../../lib/financeApi';
import { EmptyState, PageHeader, StackedList, outlineBtn, primaryBtn, secondaryBtn } from '../../../components/ui/PageKit';
import { AddMoneyDialog } from './AddMoneyDialog';
import { TransactionItem, formatTaka } from './financeUi';

function Figure({ label, value, hint, loading }: { label: string; value: ReactNode; hint: ReactNode; loading: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-white p-3.5">
      <p className="text-xs text-neutral-500">{label}</p>
      {loading ? (
        <div className="mt-1.5 h-6 w-24 animate-pulse rounded bg-neutral-100" />
      ) : (
        <p className="mt-1 truncate text-xl font-semibold tabular-nums text-regantify-text">{value}</p>
      )}
      <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

/**
 * Finance > Wallet — the balance block from the Dashboard's Money card
 * (green, eye toggle), where that money comes from, what's on its way
 * (withdrawals in progress, COD the couriers still hold) and the last
 * few transactions. Add money / Withdraw are the two actions.
 */
export default function Wallet() {
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [shown, setShown] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'wallet'],
    queryFn: () => financeApi.getWallet(),
  });
  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['finance', 'transactions', { page: 1, perPage: 5 }],
    queryFn: () => financeApi.getTransactions({ page: 1, perPage: 5 }),
  });

  const balance = Number(data?.balance ?? '0');
  const isNegative = balance < 0;
  const cod = data?.codWithCouriers;

  return (
    <div>
      <PageHeader
        className="mb-4"
        title="Wallet"
        description="Money from your online orders, minus platform charges. Withdraw it to bKash, Nagad or your bank."
        actions={
          <div className="flex w-full gap-2 sm:w-auto">
            <button type="button" onClick={() => setAddMoneyOpen(true)} className={`${secondaryBtn} h-10 flex-1 sm:h-9 sm:flex-none`}>
              <Plus size={15} aria-hidden />
              Add money
            </button>
            <Link to="/vendor/finance/withdraw" className={`${primaryBtn} h-10 flex-1 sm:h-9 sm:flex-none`}>
              Withdraw
            </Link>
          </div>
        }
      />

      <AddMoneyDialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen} currentBalance={balance} />

      {isNegative && !isLoading && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <p>
            Your balance is {formatTaka(balance)}: platform charges were taken while it was empty. It clears with your next paid online order,
            or when you add money, buy SMS or AI chat credits, or upgrade your plan.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-3">
          <section className="rounded-xl bg-brand p-4 text-white">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-white/75">Wallet balance</p>
              <button
                type="button"
                onClick={() => setShown((s) => !s)}
                aria-label={shown ? 'Hide balance' : 'Show balance'}
                title={shown ? 'Hide balance' : 'Show balance'}
                className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
              >
                {shown ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isLoading ? (
              <div className="mt-1 h-9 w-40 animate-pulse rounded bg-white/15" />
            ) : (
              <p className={`mt-0.5 text-3xl font-semibold tabular-nums ${isNegative ? 'text-red-200' : ''}`}>{shown ? formatTaka(balance) : '৳ ••••••'}</p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-white/75">
              Online payments land here once the customer pays. Cash on delivery goes from your courier to you directly; only its platform
              charge is taken from here when the order completes.
            </p>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Figure
              label="Withdrawals in progress"
              value={formatTaka(data?.pendingWithdrawals ?? '0')}
              hint="Set aside, waiting to be paid"
              loading={isLoading}
            />
            <Figure label="Withdrawn so far" value={formatTaka(data?.totalWithdrawn ?? '0')} hint="Paid to you, all time" loading={isLoading} />
          </div>
          <Figure
            label="COD still with couriers"
            value={formatTaka(cod?.amount ?? 0)}
            hint={
              cod && cod.count > 0
                ? `${cod.count} delivered ${cod.count === 1 ? 'parcel' : 'parcels'}. Your couriers pay this to you directly, not into the wallet.`
                : 'Nothing waiting. Your couriers pay COD to you directly, not into the wallet.'
            }
            loading={isLoading}
          />
        </div>

        <section className="min-w-0 rounded-xl border border-line bg-white p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
            <h2 className="text-[15px] font-semibold text-regantify-text">Recent transactions</h2>
            <Link to="/vendor/finance/transactions" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              See all
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
          {recentLoading ? (
            <div className="space-y-2" aria-busy>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-100" />
              ))}
            </div>
          ) : !recent || recent.transactions.length === 0 ? (
            <div className="rounded-lg border border-line">
              <EmptyState
                icon={Receipt}
                title="No transactions yet"
                hint="Money shows up here when online orders are paid, orders complete, or you add or withdraw money."
                action={
                  <button type="button" onClick={() => setAddMoneyOpen(true)} className={outlineBtn}>
                    Add money
                  </button>
                }
              />
            </div>
          ) : (
            <StackedList>
              {recent.transactions.slice(0, 5).map((t) => (
                <TransactionItem key={t.id} t={t} />
              ))}
            </StackedList>
          )}
        </section>
      </div>
    </div>
  );
}
