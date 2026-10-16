/**
 * Slower polls while nobody is using the dashboard (PERFORMANCE-PLAN.md Step 6). A tab nobody has touched for
 * IDLE_AFTER_MS keeps polling, just less often, so an open but forgotten tab costs the server little. Hidden tabs already
 * don't poll (TanStack Query's default `refetchIntervalInBackground: false`).
 *
 * Use `idlePoll(ms)` as a query's `refetchInterval`. It is read again after every fetch, so the slower pace starts
 * from the next poll, and when the person comes back every active query that is out of date is fetched once.
 */
import type { QueryClient } from '@tanstack/react-query';

const IDLE_AFTER_MS = 5 * 60_000;
let lastActive = Date.now();
let started = false;

export function isIdle(): boolean {
  return Date.now() - lastActive > IDLE_AFTER_MS;
}

/** `ms` while someone is using the tab, `ms * factor` once it has been idle a while. */
export function idlePoll(ms: number, factor = 4): () => number {
  return () => (isIdle() ? ms * factor : ms);
}

/** Starts watching for activity (once). On the first activity after an idle spell, stale on-screen data is refreshed. */
export function startIdleWatch(queryClient: QueryClient): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const onActive = () => {
    const wasIdle = isIdle();
    lastActive = Date.now();
    if (wasIdle) void queryClient.refetchQueries({ type: 'active', stale: true });
  };
  const opts: AddEventListenerOptions = { passive: true, capture: true };
  for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const) window.addEventListener(event, onActive, opts);
  // Mouse moves arrive many times a second; one check every few seconds is enough.
  let lastMove = 0;
  window.addEventListener(
    'pointermove',
    () => {
      const now = Date.now();
      if (now - lastMove < 5_000) return;
      lastMove = now;
      onActive();
    },
    opts,
  );
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onActive();
  });
}
