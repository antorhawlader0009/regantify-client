import type { FooterConfig } from './footerApi';

/**
 * The footer every store starts with (2026-10-28, the owner's request: everything a footer needs is there by default).
 * Built on what footer research agrees on: separate, plainly named links to delivery and returns (Baymard: a bare "Help"
 * link is not enough), About / Privacy / Terms, contact details and social links, in two short link groups.
 * The page links go to the default pages (lib/demoPages.ts), which show a demo text until the store writes its own.
 * The store shows the same layout while it has never saved a footer (storefront StoreFooter, no saved config).
 */
export interface FooterFacts {
  storeName: string;
  phone: string | null;
  address: string | null;
  lang: 'en' | 'bn';
}

const TEXT = {
  en: {
    help: 'Customer help',
    store: 'Our store',
    contact: 'Contact us',
    links: {
      track: 'Track order',
      delivery: 'Delivery Policy',
      returns: 'Return & Refund Policy',
      contact: 'Contact us',
      about: 'About Us',
      privacy: 'Privacy Policy',
      terms: 'Terms & Conditions',
    },
    about: (name: string) => `${name} brings you carefully chosen products at fair prices, delivered all over Bangladesh.`,
  },
  bn: {
    help: 'গ্রাহক সহায়তা',
    store: 'দোকানের তথ্য',
    contact: 'যোগাযোগ',
    links: {
      track: 'অর্ডার ট্র্যাক করুন',
      delivery: 'ডেলিভারি নীতি',
      returns: 'রিটার্ন ও রিফান্ড নীতি',
      contact: 'যোগাযোগ করুন',
      about: 'আমাদের সম্পর্কে',
      privacy: 'প্রাইভেসি নীতি',
      terms: 'শর্তাবলী',
    },
    about: (name: string) => `${name} যত্ন করে বাছাই করা পণ্য ন্যায্য দামে সারা বাংলাদেশে পৌঁছে দেয়।`,
  },
} as const;

/** The recommended footer on top of `base` (keeps the template, credit line and app links the store already has). */
export function recommendedFooter(base: FooterConfig, f: FooterFacts): FooterConfig {
  const x = TEXT[f.lang];
  return {
    ...base,
    menuTitle: x.help,
    menuLinks: [
      { label: x.links.track, url: '/orders' },
      { label: x.links.delivery, url: '/page/delivery-policy' },
      { label: x.links.returns, url: '/page/return-policy' },
      { label: x.links.contact, url: '/contact' },
    ],
    infoTitle: x.store,
    infoLinks: [
      { label: x.links.about, url: '/page/about-us' },
      { label: x.links.privacy, url: '/page/privacy-policy' },
      { label: x.links.terms, url: '/page/terms-and-conditions' },
    ],
    aboutBlurb: `<p>${x.about(f.storeName).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`,
    showSocialIcons: true,
    showPaymentIcons: false,
    showContact: Boolean(f.phone || f.address),
    contactTitle: x.contact,
    contactPhone: f.phone,
    contactAddress: f.address,
  };
}

/** A store that never saved a footer gets the server's empty defaults: no links and no about text. */
export function isUntouchedFooter(c: FooterConfig): boolean {
  return c.menuLinks.length === 0 && c.infoLinks.length === 0 && !c.aboutBlurb?.trim();
}
