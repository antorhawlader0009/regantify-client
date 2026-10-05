import { useCallback, useEffect, useRef, useState } from 'react';
import { posApi } from '../../../lib/posApi';
import { apiErrorMessage } from '../../../lib/api';
import { enqueueSale, isNetworkError, markQueuedFailed, queuedSales, removeQueued, type QueuedSale } from '../../../lib/posOffline';

const CHECK_EVERY_MS = 20_000;

/**
 * The counter's link to the server (POS-system-plan.md Step 13): whether it's online, and the
 * offline sales waiting to go. They're sent one at a time, oldest first, when the internet comes
 * back (the browser's "online" event, and a check every 20 seconds). A sale the server refuses
 * (not a network error) is kept with the reason, so nothing is lost; the rest keep going.
 */
export function useOfflineSync(token: string, onSent?: () => void) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [queue, setQueue] = useState<QueuedSale[]>([]);
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const sentRef = useRef(onSent);
  sentRef.current = onSent;

  const reload = useCallback(async () => setQueue(await queuedSales()), []);

  const sync = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSyncing(true);
    let sent = 0;
    try {
      for (const q of await queuedSales()) {
        if (q.error) continue;
        try {
          await posApi.createSale(q.sale, tokenRef.current);
          await removeQueued(q.clientSaleId);
          sent++;
          setOnline(true);
        } catch (err) {
          if (isNetworkError(err)) {
            setOnline(false);
            break;
          }
          // The cashier's unlock ran out: the next unlock sends the rest.
          if ((err as { response?: { data?: { code?: string } } }).response?.data?.code === 'POS_PIN_REQUIRED') break;
          await markQueuedFailed(q.clientSaleId, apiErrorMessage(err, 'The server refused this sale.'));
        }
      }
    } finally {
      busy.current = false;
      setSyncing(false);
      await reload();
      if (sent > 0) sentRef.current?.();
    }
  }, [reload]);

  // Is the server reachable again? (navigator.onLine is true whenever the Wi-Fi is up, even with no internet.)
  const probe = useCallback(async () => {
    try {
      await posApi.me();
      setOnline(true);
      return true;
    } catch (err) {
      if (isNetworkError(err)) setOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    void reload();
    const goOnline = () =>
      void probe().then((ok) => {
        if (ok) void sync();
      });
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const timer = setInterval(async () => {
      const waiting = (await queuedSales()).some((q) => !q.error);
      if (waiting) void sync();
      else if (!online) void probe();
    }, CHECK_EVERY_MS);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(timer);
    };
  }, [online, probe, reload, sync]);

  /** A sale that couldn't reach the server: keep it for later. */
  const queue_ = useCallback(
    async (q: QueuedSale) => {
      await enqueueSale(q);
      setOnline(false);
      await reload();
    },
    [reload],
  );

  /** Try a refused sale again (after fixing what was wrong, e.g. a deleted product). */
  const retry = useCallback(
    async (id: string) => {
      const row = (await queuedSales()).find((q) => q.clientSaleId === id);
      if (row) await enqueueSale({ ...row, error: undefined });
      await reload();
      void sync();
    },
    [reload, sync],
  );

  return {
    online,
    waiting: queue.filter((q) => !q.error),
    failed: queue.filter((q) => !!q.error),
    syncing,
    sync,
    retry,
    enqueue: queue_,
    markOffline: () => setOnline(false),
  };
}
