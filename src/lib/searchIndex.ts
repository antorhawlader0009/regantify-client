import { isNavGroup, navLinks, vendorNav } from './navConfig';
import { SETTINGS_CATALOG } from './searchCatalog';

/*
 * The part of the top-bar search that needs no server: dashboard pages
 * (built from the sidebar itself, so a new menu entry is searchable
 * automatically), the settings that live inside pages (searchCatalog.ts),
 * "Add ..." actions, a typo-tolerant matcher (plurals, one or two wrong
 * letters, Banglish and Bangla keywords) and the recent-search list kept
 * in this browser.
 */

export interface StaticEntry {
  kind: 'page' | 'action' | 'setting';
  title: string;
  /** "Store > Branding" style breadcrumb shown under the title. */
  subtitle?: string;
  path: string;
  keywords?: string;
}

const ACTIONS: StaticEntry[] = [
  { kind: 'action', title: 'Add product', path: '/vendor/product/add', keywords: 'new create item' },
  { kind: 'action', title: 'Add order', path: '/vendor/orders/add', keywords: 'new create manual' },
  { kind: 'action', title: 'Add customer', path: '/vendor/customers/add', keywords: 'new create' },
  { kind: 'action', title: 'Import customers', path: '/vendor/customers/bulk-upload', keywords: 'bulk upload csv' },
  { kind: 'action', title: 'Add collection', path: '/vendor/product/collections/add', keywords: 'new create' },
  { kind: 'action', title: 'Add coupon', path: '/vendor/marketing/coupons/add', keywords: 'new create discount code' },
  { kind: 'action', title: 'Add campaign', path: '/vendor/marketing/campaigns/add', keywords: 'new create' },
  { kind: 'action', title: 'Add discount', path: '/vendor/marketing/discounts/add', keywords: 'new create offer' },
  { kind: 'action', title: 'Add flash sale', path: '/vendor/marketing/flash-sale/add', keywords: 'new create offer' },
  { kind: 'action', title: 'Add gift card', path: '/vendor/marketing/gift-cards/add', keywords: 'new create voucher' },
  { kind: 'action', title: 'Add page', path: '/vendor/store/pages/add', keywords: 'new create about contact' },
  { kind: 'action', title: 'Add review', path: '/vendor/reviews/add', keywords: 'new create' },
  { kind: 'action', title: 'Abandoned carts', path: '/vendor/orders?tab=abandoned-cart', keywords: 'incomplete orders recover' },
];

let cachedPages: StaticEntry[] | null = null;

/** Every sidebar page, with its section in the breadcrumb. */
function pages(): StaticEntry[] {
  if (cachedPages) return cachedPages;
  const out: StaticEntry[] = [];
  for (const s of vendorNav) {
    if (s.path) out.push({ kind: 'page', title: s.label, subtitle: s.group, path: s.path });
    for (const child of s.children ?? []) {
      if (isNavGroup(child)) {
        for (const l of child.children) out.push({ kind: 'page', title: l.label, subtitle: `${s.label} > ${child.label}`, path: l.path });
      } else {
        for (const l of navLinks([child])) out.push({ kind: 'page', title: l.label, subtitle: s.label, path: l.path });
      }
    }
  }
  cachedPages = out;
  return out;
}

export const quickActions = () => ACTIONS;

/** Lower-case, no punctuation. Marks are kept so Bangla words (whose vowel signs are marks) stay whole. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Words an entry can be found by, worked out once. */
interface Indexed {
  entry: StaticEntry;
  title: string;
  titleWords: string[];
  /** The section breadcrumb's words, then the keyword list's. */
  otherWords: string[];
}

let cachedIndex: Indexed[] | null = null;

function index(): Indexed[] {
  if (cachedIndex) return cachedIndex;
  const settings: StaticEntry[] = SETTINGS_CATALOG.map((c) => ({ kind: 'setting', title: c.title, subtitle: c.where, path: c.path, keywords: c.keywords }));
  const byKey = new Map<string, Indexed>();
  const out: Indexed[] = [];
  for (const entry of [...pages(), ...settings, ...ACTIONS]) {
    const words = norm(`${entry.subtitle ?? ''} ${entry.keywords ?? ''}`).split(' ').filter(Boolean);
    // The same title for the same page (the "Coupons" menu entry and the "Coupons" setting) is listed once,
    // keeping the words of both so either is found by the other's keywords (Banglish, Bangla).
    const key = `${entry.path.split(/[?#]/)[0]}|${norm(entry.title)}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.otherWords.push(...words);
      continue;
    }
    const title = norm(entry.title);
    const ix: Indexed = { entry, title, titleWords: title.split(' '), otherWords: words };
    byKey.set(key, ix);
    out.push(ix);
  }
  cachedIndex = out;
  return out;
}

/** Plural-insensitive: "coupons" finds "coupon", "addresses" finds "address". */
const stem = (w: string) => (w.length > 3 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);

/** Edits (insert, delete, change, swap of two letters) between two words; stops early and answers limit + 1 once it is past `limit`. */
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > limit) return limit + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const c of hay) if (c === needle[i] && ++i === needle.length) return true;
  return false;
}

/** Higher is better; 0 means no match. Every word typed has to match something: the title first, then the section and keywords. */
function score(tokens: string[], ix: Indexed): number {
  const { title, titleWords, otherWords } = ix;
  let total = 0;
  for (const t of tokens) {
    const ts = stem(t);
    // One wrong letter is forgiven in a word of 4 to 7 letters, two in a longer one.
    const maxEdits = t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0;
    let s = 0;
    if (title === t) s = 120;
    else if (title.startsWith(t)) s = 100;
    else if (titleWords.some((w) => w.startsWith(t))) s = 80;
    else if (titleWords.some((w) => stem(w) === ts)) s = 75;
    else if (title.includes(t)) s = 60;
    else if (otherWords.some((w) => w === t || stem(w) === ts)) s = 50;
    else if (otherWords.some((w) => w.startsWith(t))) s = 40;
    else if (t.length >= 3 && otherWords.some((w) => w.includes(t))) s = 25;
    else if (maxEdits > 0 && titleWords.some((w) => editDistance(t, w, maxEdits) <= maxEdits)) s = 30; // a typo in the title
    else if (maxEdits > 0 && otherWords.some((w) => editDistance(t, w, maxEdits) <= maxEdits)) s = 20; // a typo in a keyword
    else if (t.length >= 3 && title.length <= 24 && isSubsequence(t, title)) s = 12; // letters in order, short titles only
    if (!s) return 0;
    total += s;
  }
  // The whole phrase inside the title beats the same words found apart.
  if (tokens.length > 1 && title.includes(tokens.join(' '))) total += 40;
  return total;
}

/** Pages, settings and actions matching `query`, best first. */
export function searchStatic(query: string, limit = 8): StaticEntry[] {
  const tokens = norm(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  return index()
    .map((ix) => ({ e: ix.entry, s: score(tokens, ix) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.e);
}

/* ------------------------------------------------------------- recents */

export interface RecentEntry {
  title: string;
  subtitle?: string;
  path: string;
}

const RECENT_MAX = 8;
const recentKey = (userId: string) => `regantify-search-recent:${userId}`;

export function loadRecents(userId: string): RecentEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(recentKey(userId)) ?? '[]');
    return Array.isArray(raw) ? raw.filter((r) => r && typeof r.title === 'string' && typeof r.path === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function saveRecent(userId: string, entry: RecentEntry): RecentEntry[] {
  const next = [entry, ...loadRecents(userId).filter((r) => !(r.path === entry.path && r.title === entry.title))].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(recentKey(userId), JSON.stringify(next));
  } catch {
    // Storage full or blocked: recents just aren't remembered.
  }
  return next;
}

export function clearRecents(userId: string) {
  try {
    localStorage.removeItem(recentKey(userId));
  } catch {
    // ignore
  }
}

/** Words to bold inside a result title. */
export const queryTokens = (query: string) => norm(query).split(' ').filter(Boolean);
