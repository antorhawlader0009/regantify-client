import { useQuery } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { rewardsApi, type RewardEntry } from '../../../lib/rewardsApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';

const TYPE_LABEL: Record<RewardEntry['type'], string> = {
  EARN: 'Earned',
  SPEND: 'Spent',
  REFUND_SPEND: 'Given back',
  REVERSE_EARN: 'Taken back',
};

/** Customer Detail > Reward points (TellMe idea 41): the balance and the history. Hidden until the customer has any. */
export function CustomerRewardsCard({ phone }: { phone: string }) {
  const { data } = useQuery({ queryKey: ['reward-ledger', phone], queryFn: () => rewardsApi.customerLedger(phone) });
  if (!data || data.entries.length === 0) return null;
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Award size={15} /> Reward points: <span className="tabular-nums">{data.balance}</span>
      </h2>
      <ul className="mt-3 divide-y divide-neutral-100 text-sm">
        {data.entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p>
                {TYPE_LABEL[e.type]}
                {e.note ? <span className="text-neutral-500"> · {e.note}</span> : null}
              </p>
              <p className="text-xs text-neutral-500">{formatDhakaDateTime(e.createdAt)}</p>
            </div>
            <span className={`shrink-0 font-semibold tabular-nums ${e.points >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {e.points > 0 ? '+' : ''}
              {e.points}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
