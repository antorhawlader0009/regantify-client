import { useCallback, useEffect, useRef, useState } from 'react';
import { posApi, type PosCatalogProduct } from '../../../lib/posApi';
import { loadCatalog, saveCatalog } from '../../../lib/posOffline';

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
  // Step 13: true while the list on screen is the copy saved on this device (no internet).
  const [fromDevice, setFromDevice] = useState(false);
  const since = useRef<string | null>(null);
  const lastFull = useRef(0);
  const current = useRef<Map<string, PosCatalogProduct>>(new Map());

  const keep = useCallback((next: Map<string, PosCatalogProduct>) => {
    current.current = next;
    setProducts(next);
    // The copy the counter falls back on when the internet drops (Step 13).
    if (since.current) void saveCatalog({ serverTime: since.current, products: [...next.values()], savedAt: new Date().toISOString() });
  }, []);

  const load = useCallback(
    async (full: boolean) => {
      try {
        const answer = await posApi.catalog(full ? undefined : (since.current ?? undefined));
        since.current = answer.serverTime;
        if (answer.full) {
          lastFull.current = Date.now();
          keep(new Map(answer.products.map((p) => [p.id, p])));
        } else if (answer.products.length > 0) {
          const next = new Map(current.current);
          for (const p of answer.products) next.set(p.id, p);
          keep(next);
        }
        setFromDevice(false);
        setStatus('ready');
      } catch {
        // No server: the copy saved on this device, if there is one and nothing is on screen yet.
        if (current.current.size === 0) {
          const saved = await loadCatalog();
          if (saved?.products.length) {
            current.current = new Map(saved.products.map((p) => [p.id, p]));
            since.current = saved.serverTime;
            setProducts(current.current);
            setFromDevice(true);
            setStatus('ready');
            return;
          }
        }
        setStatus((s) => (s === 'ready' ? s : 'error'));
      }
    },
    [keep],
  );

  useEffect(() => {
    void load(true);
    const timer = setInterval(() => void load(Date.now() - lastFull.current > FULL_EVERY_MS), DELTA_EVERY_MS);
    return () => clearInterval(timer);
  }, [load]);

  /** Pull changes now (after a sale, so stock on screen is current). */
  const refresh = useCallback(() => void load(false), [load]);
  /** Put one product in straight away (a lookup the list didn't have yet). */
  const put = useCallback((p: PosCatalogProduct) => keep(new Map(current.current).set(p.id, p)), [keep]);
  /** An offline sale: take its quantities off the stock shown (the server does the real count at sync). */
  const takeStock = useCallback(
    (lines: Array<{ productId: string; variantId: string | null; quantity: number }>) => {
      const next = new Map(current.current);
      for (const l of lines) {
        const p = next.get(l.productId);
        if (!p) continue;
        next.set(
          p.id,
          l.variantId
            ? { ...p, variants: p.variants.map((v) => (v.id === l.variantId ? { ...v, stock: Math.max(0, v.stock - l.quantity) } : v)) }
            : { ...p, stock: p.stock === null ? null : Math.max(0, p.stock - l.quantity) },
        );
      }
      keep(next);
    },
    [keep],
  );

  return { products, status, fromDevice, refresh, put, takeStock, retry: () => void load(true) };
}
