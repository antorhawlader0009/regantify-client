import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../../lib/customersApi';
import { CustomerTabs } from './CustomerTabs';

type Range = '30_DAYS' | 'ALL_TIME';

interface RangeStatCardProps {
  label: string;
  range: Range;
  onRangeChange: (range: Range) => void;
  value: number;
}

/** A card with a "30 Days / All Time" toggle, like Contacts and Accounts Created. */
function RangeStatCard({ label, range, onRangeChange, value }: RangeStatCardProps) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="inline-flex items-center gap-0.5 rounded-md border border-line p-0.5 text-xs">
        {(['30_DAYS', 'ALL_TIME'] as const).map((r) => (
          <button
            key={r}
            onClick={() => onRangeChange(r)}
            className={`rounded px-2 py-0.5 transition-colors ${
              range === r ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            {r === '30_DAYS' ? '30 Days' : 'All Time'}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-neutral-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-regantify-text">{value.toLocaleString()}</p>
    </div>
  );
}

/** A plain card with no toggle, like Average LTV and the order-status counts. */
function PlainStatCard({ eyebrow, label, value }: { eyebrow: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <span className="inline-block rounded-md border border-line px-2 py-0.5 text-xs text-neutral-500">{eyebrow}</span>
      <p className="mt-4 text-sm text-neutral-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-regantify-text">{value}</p>
    </div>
  );
}

export default function CustomerDetails() {
  const [contactsRange, setContactsRange] = useState<Range>('30_DAYS');
  const [accountsRange, setAccountsRange] = useState<Range>('30_DAYS');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', 'stats'],
    queryFn: () => customersApi.getStats(),
  });

  const contacts = contactsRange === '30_DAYS' ? data?.contacts30Days : data?.contactsAllTime;
  const accountsCreated = accountsRange === '30_DAYS' ? data?.accountsCreated30Days : data?.accountsCreatedAllTime;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3.5">
        <h1 className="text-[15px] font-semibold text-regantify-text">Customers</h1>
        <CustomerTabs />
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-neutral-500">
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <RangeStatCard
              label="Contacts"
              range={contactsRange}
              onRangeChange={setContactsRange}
              value={contacts ?? 0}
            />
            <RangeStatCard
              label="Accounts Created"
              range={accountsRange}
              onRangeChange={setAccountsRange}
              value={accountsCreated ?? 0}
            />
            <PlainStatCard eyebrow="All Time" label="Average LTV" value={(data?.averageLtv ?? 0).toFixed(2)} />
          </div>

          <div>
            <h2 className="mb-3 text-[15px] font-semibold text-regantify-text">Orders</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <PlainStatCard eyebrow="All Time" label="Placed Orders" value={String(data?.placedOrders ?? 0)} />
              <PlainStatCard eyebrow="All Time" label="Completed Orders" value={String(data?.completedOrders ?? 0)} />
              <PlainStatCard eyebrow="All Time" label="Cancelled Orders" value={String(data?.cancelledOrders ?? 0)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
