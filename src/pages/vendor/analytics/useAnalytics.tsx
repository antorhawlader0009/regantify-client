import type { ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { analyticsApi, type DateRange } from '../../../lib/analyticsApi';
import { apiErrorMessage } from '../../../lib/api';
import { TabSkeleton } from '../../../components/analytics/AnalyticsUi';

export interface TabProps {
  range: DateRange;
}

type Report = keyof typeof analyticsApi;
type Data<T extends Report> = Awaited<ReturnType<(typeof analyticsApi)[T]>>;

/** One report's data for the picked dates; the previous numbers stay on screen while new ones load. */
export function useAnalytics<T extends Report>(report: T, range: DateRange) {
  return useQuery({
    queryKey: ['analytics', report, range.from, range.to],
    queryFn: () => analyticsApi[report](range) as Promise<Data<T>>,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Skeleton while the first load runs, a retry card on error, then the tab. */
export function TabState<D>({
  query,
  children,
}: {
  query: { data: D | undefined; isLoading: boolean; isError: boolean; error: unknown; isPlaceholderData: boolean; refetch: () => unknown };
  children: (data: D) => ReactNode;
}) {
  if (query.isLoading) return <TabSkeleton />;
  if (query.isError || !query.data) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/60 p-6 text-sm text-red-700">
        {apiErrorMessage(query.error, 'Could not load your analytics.')}{' '}
        <button type="button" onClick={() => query.refetch()} className="underline font-medium">
          Try again
        </button>
      </div>
    );
  }
  return <div className={`space-y-4 transition-opacity ${query.isPlaceholderData ? 'opacity-60' : ''}`}>{children(query.data)}</div>;
}
