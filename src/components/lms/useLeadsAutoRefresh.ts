import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lmsApi } from '../../lib/lmsApi';

const POLL_MS = 20_000;

/**
 * Keeps the Leads list, counts and board fresh without reloading them on a
 * timer: it polls a tiny "pulse" route (server-side cached, see
 * LmsPulseService) and only refetches the lead queries when its marker
 * moves. Polling pauses while the tab is hidden and checks again the moment
 * it is visible, and stops for good if the route refuses (plan lapsed, LMS off).
 */
export function useLeadsAutoRefresh() {
  const queryClient = useQueryClient();
  // Each tab gets its own small offset so a team's polls spread out instead of landing together.
  const interval = useRef(POLL_MS + Math.round(Math.random() * 4_000));
  const pulse = useQuery({
    queryKey: ['lms', 'leads-pulse'],
    queryFn: lmsApi.leadsPulse,
    refetchInterval: (query) => (query.state.status === 'error' ? false : interval.current),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    retry: false,
  });

  const last = useRef<string | undefined>(undefined);
  const marker = pulse.data?.marker;
  useEffect(() => {
    if (marker === undefined) return;
    // The first value is just the baseline; only a later change reloads the leads.
    if (last.current !== undefined && last.current !== marker) {
      queryClient.invalidateQueries({ queryKey: ['lms', 'leads'], refetchType: 'active' });
    }
    last.current = marker;
  }, [marker, queryClient]);
}
