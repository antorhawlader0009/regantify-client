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
    <div className="bg-white rounded-2xl border border-black/5 p-5">
      <div className="flex items-center gap-3 text-xs font-medium">
        <button
          onClick={() => onRangeChange('30_DAYS')}
          className={range === '30_DAYS' ? 'text-regantify-text' : 'text-regantify-text-muted'}
        >
          30 Days
        </button>
        <button
          onClick={() => onRangeChange('ALL_TIME')}
          className={range === 'ALL_TIME' ? 'text-regantify-text' : 'text-regantify-text-muted'}
        >
          All Time
        </button>
      </div>
      <p className="text-sm text-regantify-text mt-4">{label}</p>
      <p className="text-2xl font-bold text-regantify-text mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

/** A plain card with no toggle, like Average LTV and the order-status counts. */
function PlainStatCard({ eyebrow, label, value }: { eyebrow: string; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5">
      <p className="text-xs font-medium text-regantify-text-muted">{eyebrow}</p>
      <p className="text-sm text-regantify-text mt-4">{label}</p>
      <p className="text-2xl font-bold text-regantify-text mt-1">{value}</p>
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
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Customers</h1>
      </div>

      <CustomerTabs />

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-regantify-text-muted">
          Loading…
        </div>
      ) : (
        <div className="space-y-6">
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
            <h2 className="text-sm font-semibold text-regantify-text mb-3">Orders</h2>
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
