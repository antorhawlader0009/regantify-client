import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/analyticsApi';
import { addDays, todayDhaka } from '../analytics/dateRanges';
import { OrderMapCard } from '../analytics/OrderMapCard';

/** Dashboard > the order map for the last 30 days (a smaller version of Analytics > Overview's "Where your customers are"). */
export function OrderMapPanel() {
  const to = todayDhaka();
  const from = addDays(to, -29);
  const { data } = useQuery({
    queryKey: ['analytics', 'orderMap', from, to],
    queryFn: () => analyticsApi.orderMap({ from, to }),
    staleTime: 5 * 60_000,
  });
  if (!data) return <div className="h-80 animate-pulse rounded-xl border border-line bg-white" aria-busy />;
  return (
    <OrderMapCard
      compact
      report={data}
      title="Where orders come from"
      subtitle={`Last 30 days · ${data.reached} of 64 districts`}
      link={
        <Link to="/vendor/analytics?tab=overview&preset=last30" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          More in Analytics
          <ArrowRight size={14} aria-hidden />
        </Link>
      }
    />
  );
}
