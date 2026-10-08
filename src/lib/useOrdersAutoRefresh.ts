import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from './ordersApi';

const POLL_MS = 8_000;

/**
 * Keeps an open Orders list or Order detail in step with the server. An order can change without this tab doing
 * anything: a courier update, a teammate, the LMS call desk, a "/confirm" sent from Telegram. It polls a tiny
 * "pulse" route (cached on the server, see OrdersPulseService) and only reloads the order queries when its marker
 * moves. Polling pauses while the tab is hidden and checks again the moment it is visible, and stops if the
 * route refuses (a role that can't see orders).
 */
export function useOrdersAutoRefresh() {
  const queryClient = useQueryClient();
  // Each tab gets its own small offset so a team's polls spread out instead of landing together.
  const interval = useRef(POLL_MS + Math.round(Math.random() * 3_000));
  const pulse = useQuery({
    queryKey: ['orders-pulse'],
    queryFn: ordersApi.pulse,
    refetchInterval: (query) => (query.state.status === 'error' ? false : interval.current),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 3_000,
    retry: false,
  });

  const last = useRef<string | undefined>(undefined);
  const marker = pulse.data?.marker;
  useEffect(() => {
    if (marker === undefined) return;
    // The first value is just the baseline; only a later change reloads the orders.
    if (last.current !== undefined && last.current !== marker) {
      for (const key of ['orders', 'order', 'order-history', 'courier-events']) {
        void queryClient.invalidateQueries({ queryKey: [key], refetchType: 'active' });
      }
    }
    last.current = marker;
  }, [marker, queryClient]);
}
