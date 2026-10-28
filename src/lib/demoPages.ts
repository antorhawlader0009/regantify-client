import type { PolicyKind } from './policyTemplates';

/**
 * The store's default pages (mirror of storefront/src/lib/demoPages.ts; keep the slugs and match words in step by hand).
 * Until the store publishes its own page of a kind, the store shows a demo text at that address and links it in the
 * footer; Store > Pages lists those demo pages so the owner can open the ready text, change it and save it as their own.
 */
export const DEMO_PAGES: Array<{ kind: PolicyKind; slug: string; title: string; match: string[] }> = [
  { kind: 'ABOUT', slug: 'about-us', title: 'About Us', match: ['about', 'সম্পর্কে'] },
  { kind: 'DELIVERY', slug: 'delivery-policy', title: 'Delivery Policy', match: ['delivery', 'shipping', 'ডেলিভারি'] },
  { kind: 'RETURN', slug: 'return-policy', title: 'Return & Refund Policy', match: ['return', 'refund', 'রিটার্ন', 'রিফান্ড'] },
  { kind: 'PRIVACY', slug: 'privacy-policy', title: 'Privacy Policy', match: ['privacy', 'প্রাইভেসি', 'গোপনীয়তা'] },
  { kind: 'TERMS', slug: 'terms-and-conditions', title: 'Terms & Conditions', match: ['terms', 'condition', 'শর্ত'] },
];

/** The demo pages still showing on the store: kinds no PUBLISHED page of the store covers (by address or title words). */
export function demoPagesShowing(pages: Array<{ slug: string; title: string; status: string }>) {
  const published = pages.filter((p) => p.status === 'PUBLISHED');
  return DEMO_PAGES.filter((d) => !published.some((p) => d.match.some((w) => `${p.slug} ${p.title}`.toLowerCase().includes(w))));
}

export function demoPageByKind(kind: string) {
  return DEMO_PAGES.find((d) => d.kind === kind) ?? null;
}
