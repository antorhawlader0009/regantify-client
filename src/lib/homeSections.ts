import type { HomeHighlight, HomeSection, HomeSectionId } from './designSettingsApi';

/**
 * What Store > Design > Customize knows about the StorePal home page: the
 * sections in StorePal's own order, and the built-in and suggested highlights.
 * Keep in lockstep by hand with the storefront's themes/storepal/lib/
 * homeSections.ts (and its built-in highlights), since the defaults here are
 * what a shopper sees until the vendor writes their own.
 */
export const HOME_SECTION_INFO: Record<HomeSectionId, { label: string; description: string }> = {
  HERO: { label: 'Banner', description: 'The big banner at the top, made from your category photos.' },
  FLASH_SALE: { label: 'Flash Sale', description: 'Products on a running Flash Sale, with a countdown. Hidden on its own when no sale is running.' },
  CAMPAIGNS: { label: 'Offers & Campaigns', description: 'A card for each of your campaign pages. Hidden on its own when you have none.' },
  TOP_SELLING: { label: 'Top Selling', description: 'Your four newest products.' },
  CATEGORY_SHORTCUTS: { label: 'Category shortcuts', description: 'A row of round category photos that open that category.' },
  CATEGORY_SECTIONS: { label: 'Products by category', description: 'A row of products for each category, with a View all link.' },
  HIGHLIGHTS: { label: 'Store highlights', description: 'Short points with an icon, such as free delivery or easy returns. You write them below.' },
  REVIEWS: { label: 'Customer reviews', description: 'Recent reviews from your customers. Hidden on its own when there are none.' },
};

export const HOME_SECTION_ORDER: HomeSectionId[] = [
  'HERO',
  'FLASH_SALE',
  'CAMPAIGNS',
  'TOP_SELLING',
  'CATEGORY_SHORTCUTS',
  'CATEGORY_SECTIONS',
  'HIGHLIGHTS',
  'REVIEWS',
];

/** The saved sections in the vendor's order, then any StorePal section they haven't placed yet (shown), so the list is always complete. */
export function completeHomeSections(saved: HomeSection[]): HomeSection[] {
  const seen = new Set<HomeSectionId>();
  const result: HomeSection[] = [];
  for (const s of saved) {
    if (!HOME_SECTION_INFO[s.id] || seen.has(s.id)) continue;
    seen.add(s.id);
    result.push({ id: s.id, enabled: s.enabled });
  }
  for (const id of HOME_SECTION_ORDER) {
    if (!seen.has(id)) result.push({ id, enabled: true });
  }
  return result;
}

export const MAX_HIGHLIGHTS = 9;
/** Past this many, a row of highlights starts to feel crowded (especially on phones); the editor says so, but never blocks. */
export const COMFORTABLE_HIGHLIGHTS = 4;

/** What a store shows until the vendor edits it. Same words as the storefront's built-in highlights. */
export const DEFAULT_HIGHLIGHTS: HomeHighlight[] = [
  { id: 'default-1', icon: 'TRUCK', title: 'Fast delivery', text: 'Quick delivery to your doorstep.' },
  { id: 'default-2', icon: 'SHIELD_CHECK', title: 'Genuine products', text: 'Quality-checked items you can trust.' },
  { id: 'default-3', icon: 'HAND_COINS', title: 'Cash on delivery', text: 'Pay when your order arrives at your door.' },
];

export const sameHighlights = (a: HomeHighlight[], b: HomeHighlight[]) =>
  a.length === b.length && a.every((x, i) => x.icon === b[i].icon && x.title === b[i].title && x.text === b[i].text);

/**
 * One-tap suggestions for the editor, picked to suit very different shops
 * (clothes, food, electronics, services, handmade). Plain wording with no
 * numbers or promises, since the vendor must make each one true for their store.
 */
export const HIGHLIGHT_PRESETS: Omit<HomeHighlight, 'id'>[] = [
  { icon: 'TRUCK', title: 'Fast delivery', text: 'Quick delivery to your doorstep.' },
  { icon: 'TAG', title: 'Free delivery', text: 'Free delivery on selected orders.' },
  { icon: 'HAND_COINS', title: 'Cash on delivery', text: 'Pay when your order arrives.' },
  { icon: 'ROTATE_CCW', title: 'Easy returns', text: 'Easy returns and exchanges.' },
  { icon: 'SHIELD_CHECK', title: 'Genuine products', text: 'Quality-checked before it ships.' },
  { icon: 'LOCK', title: 'Secure payment', text: 'Your payment details stay safe.' },
  { icon: 'HEADSET', title: 'Friendly support', text: 'Message us any time and we will help.' },
  { icon: 'BADGE_CHECK', title: 'Warranty', text: 'Covered by our warranty.' },
  { icon: 'LEAF', title: 'Fresh and natural', text: 'Fresh stock, carefully sourced.' },
  { icon: 'HEART', title: 'Handmade with care', text: 'Made by hand, one at a time.' },
  { icon: 'GIFT', title: 'Gift ready', text: 'Gift wrapping on request.' },
  { icon: 'MAP_PIN', title: 'Pickup available', text: 'Pick up your order from our store.' },
];

export function newHighlightId(): string {
  return `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
