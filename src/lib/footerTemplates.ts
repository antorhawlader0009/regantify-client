/**
 * Client (dashboard) mirror of the shared footer template registry —
 * canonical copy lives at server/src/vendor/footer-templates.ts. Keep
 * the two in sync by hand (same convention CLAUDE.md documents for
 * storefrontApi.ts across repos). This copy additionally carries the
 * "Select Footer Template" gallery's own display metadata (label/
 * description), which the storefront renderer's own mirror doesn't need.
 */

export type FooterTemplateColumn = 'logo' | 'menu' | 'info' | 'about';

export interface FooterTemplateDef {
  label: string;
  description: string;
  columns: FooterTemplateColumn[];
  logoCarriesAbout: boolean;
  background: 'white' | 'band';
  supportsSubscribe: boolean;
}

export const FOOTER_TEMPLATES = {
  CLASSIC: {
    label: 'Classic',
    description: 'Logo & about, two link columns, plain background.',
    columns: ['logo', 'menu', 'info'],
    logoCarriesAbout: true,
    background: 'white',
    supportsSubscribe: false,
  },
  SUBSCRIBE: {
    label: 'Subscribe',
    description: 'Adds social icons and an email subscribe block on a shaded band.',
    columns: ['logo', 'menu', 'info', 'about'],
    logoCarriesAbout: true,
    background: 'band',
    supportsSubscribe: true,
  },
  STOREFRONT: {
    label: 'Storefront',
    description: 'Compact logo column, two link columns, subscribe block, payment icons.',
    columns: ['logo', 'menu', 'info', 'about'],
    logoCarriesAbout: false,
    background: 'white',
    supportsSubscribe: true,
  },
  MINIMAL: {
    label: 'Minimal',
    description: 'Logo plus two plain link columns — no subscribe, no icons.',
    columns: ['logo', 'menu', 'info'],
    logoCarriesAbout: false,
    background: 'white',
    supportsSubscribe: false,
  },
} as const satisfies Record<string, FooterTemplateDef>;

export type FooterTemplateKey = keyof typeof FOOTER_TEMPLATES;

export const FOOTER_TEMPLATE_KEYS = Object.keys(FOOTER_TEMPLATES) as FooterTemplateKey[];

export const PAYMENT_ICON_KEYS = ['VISA', 'MASTERCARD', 'AMEX', 'BKASH', 'NAGAD', 'ROCKET', 'COD'] as const;

export type PaymentIconKey = (typeof PAYMENT_ICON_KEYS)[number];

export const PAYMENT_ICON_LABELS: Record<PaymentIconKey, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  AMEX: 'Amex',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  ROCKET: 'Rocket',
  COD: 'Cash on Delivery',
};
