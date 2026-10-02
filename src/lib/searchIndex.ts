import { isNavGroup, navLinks, vendorNav } from './navConfig';

/*
 * The part of the top-bar search that needs no server: dashboard pages
 * (built from the sidebar itself, so a new menu entry is searchable
 * automatically), "Add ..." actions, a small fuzzy matcher and the
 * recent-search list kept in this browser.
 */

export interface StaticEntry {
  kind: 'page' | 'action';
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

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/** Higher is better; 0 means no match. Every word typed has to match something. */
function score(tokens: string[], entry: StaticEntry): number {
  const title = norm(entry.title);
  const words = title.split(' ');
  const rest = norm(`${entry.subtitle ?? ''} ${entry.keywords ?? ''}`);
  let total = 0;
  for (const t of tokens) {
    let s = 0;
    if (title === t) s = 120;
    else if (title.startsWith(t)) s = 100;
    else if (words.some((w) => w.startsWith(t))) s = 80;
    else if (title.includes(t)) s = 60;
    else if (rest.split(' ').some((w) => w.startsWith(t))) s = 40;
    else if (rest.includes(t)) s = 25;
    else if (t.length >= 3 && isSubsequence(t, title)) s = 12; // typo-ish: letters in order
    if (!s) return 0;
    total += s;
  }
  return total;
}

function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const c of hay) if (c === needle[i] && ++i === needle.length) return true;
  return false;
}

/** Pages and actions matching `query`, best first. */
export function searchStatic(query: string, limit = 8): StaticEntry[] {
  const tokens = norm(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  return [...pages(), ...ACTIONS]
    .map((e) => ({ e, s: score(tokens, e) }))
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
