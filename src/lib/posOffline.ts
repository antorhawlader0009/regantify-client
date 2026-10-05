import type { CreatePosSale, PosCatalogProduct, PosReceipt, PosSettings, PosUnlock } from './posApi';

/*
 * Offline selling (POS-system-plan.md Step 13), kept in this browser's IndexedDB:
 * - the catalog (with the prices the counter sells at), so the screen works with no internet;
 * - the counter itself (store, register, its open shift, POS settings), so a reload offline can
 *   carry on (sessionStorage keeps the login user and the unlocked cashier for that tab only);
 * - the queue of sales made offline, each with its clientSaleId, sent in order when the internet
 *   is back. The server makes each sale once however many times it's sent.
 * No PIN or PIN hash is ever stored here.
 */

const DB = 'regantify-pos';
const VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'clientSaleId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(store: 'kv' | 'queue', mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// ---- The catalog and the counter -------------------------------------------------------------

export interface SavedCatalog {
  serverTime: string;
  products: PosCatalogProduct[];
  savedAt: string;
}

export interface SavedCounter {
  storeName: string;
  registerId: string;
  registerName: string;
  sessionId: string;
  settings: PosSettings | undefined;
  savedAt: string;
}

export const saveCatalog = (c: SavedCatalog) => run('kv', 'readwrite', (s) => s.put(c, 'catalog')).catch(() => undefined);
export const loadCatalog = () => run<SavedCatalog | undefined>('kv', 'readonly', (s) => s.get('catalog')).catch(() => undefined);
export const saveCounter = (c: SavedCounter) => run('kv', 'readwrite', (s) => s.put(c, 'counter')).catch(() => undefined);
export const loadCounter = () => run<SavedCounter | undefined>('kv', 'readonly', (s) => s.get('counter')).catch(() => undefined);

// ---- The queue -------------------------------------------------------------------------------

export interface QueuedSale {
  clientSaleId: string;
  /** The body sent to POST /v1/pos/sales, with `offline` filled in. */
  sale: CreatePosSale;
  /** The receipt printed at the counter, for "Reprint last" and the list. */
  receipt: PosReceipt;
  queuedAt: string;
  /** Set when the server refused it (not a network error): kept until someone looks. */
  error?: string;
}

export const enqueueSale = (q: QueuedSale) => run('queue', 'readwrite', (s) => s.put(q));
export const queuedSales = async () =>
  ((await run<QueuedSale[]>('queue', 'readonly', (s) => s.getAll()).catch(() => [])) ?? []).sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
export const removeQueued = (id: string) => run('queue', 'readwrite', (s) => s.delete(id));
export const markQueuedFailed = async (id: string, error: string) => {
  const all = await queuedSales();
  const row = all.find((q) => q.clientSaleId === id);
  if (row) await enqueueSale({ ...row, error });
};

// ---- This tab: who's logged in and who's at the counter ---------------------------------------

const USER_KEY = 'pos.offlineUser';
const UNLOCK_KEY = 'pos.unlock';

function tabGet<T>(key: string): T | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}
function tabSet(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not kept: a reload offline then needs the internet, as before Step 13.
  }
}

/** The dashboard user, so the counter tab can be reloaded with no internet (AuthBootstrap). */
export const rememberOfflineUser = (user: unknown) => tabSet(USER_KEY, user);
export const offlineUser = <T>() => tabGet<T>(USER_KEY);

/** The unlocked cashier, kept only while unlocked, only in this tab, only used when offline. */
export const rememberUnlock = (u: PosUnlock | null) => tabSet(UNLOCK_KEY, u);
export const rememberedUnlock = () => tabGet<PosUnlock>(UNLOCK_KEY);

// ---- Local receipt numbers --------------------------------------------------------------------

/** "OFF-3F2A-0007": the register's first 4 id characters and a counter kept on this device. */
export function nextLocalNumber(registerId: string) {
  const key = `pos.offlineSeq.${registerId}`;
  let n = 0;
  try {
    n = Number(localStorage.getItem(key) ?? '0') + 1;
    localStorage.setItem(key, String(n));
  } catch {
    n = Math.floor(Date.now() / 1000) % 10000;
  }
  return `OFF-${registerId.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()}-${String(n).padStart(4, '0')}`;
}

/** True when the request never got an answer (no internet, server down), not a refusal. */
export function isNetworkError(err: unknown) {
  const e = err as { response?: unknown; code?: string; message?: string };
  return !e?.response && (e?.code === 'ERR_NETWORK' || e?.code === 'ECONNABORTED' || e?.message === 'Network Error' || !navigator.onLine);
}
