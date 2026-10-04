import { useCallback, useEffect, useRef, useState } from 'react';
import { posApi, type PosCatalogProduct } from '../../../lib/posApi';

const DELTA_EVERY_MS = 60_000;
const FULL_EVERY_MS = 10 * 60_000;

/**
 * The sell screen's product list (GET /v1/pos/catalog). Loaded whole once,
 * then only what changed every minute (`updatedSince`, which includes stock
 * moved by other sales), and whole again every 10 minutes, because a deleted
 * product or a Flash Sale starting/ending doesn't show up as a change.
 */
export function usePosCatalog() {
  const [products, setProducts] = useState<Map<string, PosCatalogProduct>>(new Map());
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const since = useRef<string | null>(null);
  const lastFull = useRef(0);

  const load = useCallback(async (full: boolean) => {
    try {
      const answer = await posApi.catalog(full ? undefined : (since.current ?? undefined));
      since.current = answer.serverTime;
      if (answer.full) {
        lastFull.current = Date.now();
        setProducts(new Map(answer.products.map((p) => [p.id, p])));
      } else if (answer.products.length > 0) {
        setProducts((prev) => {
          const next = new Map(prev);
          for (const p of answer.products) next.set(p.id, p);
          return next;
        });
      }
      setStatus('ready');
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error'));
    }
  }, []);

  useEffect(() => {
    void load(true);
    const timer = setInterval(() => void load(Date.now() - lastFull.current > FULL_EVERY_MS), DELTA_EVERY_MS);
    return () => clearInterval(timer);
  }, [load]);

  /** Pull changes now (after a sale, so stock on screen is current). */
  const refresh = useCallback(() => void load(false), [load]);
  /** Put one product in straight away (a lookup the list didn't have yet). */
  const put = useCallback((p: PosCatalogProduct) => setProducts((prev) => new Map(prev).set(p.id, p)), []);

  return { products, status, refresh, put, retry: () => void load(true) };
}
