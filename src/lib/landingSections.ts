/**
 * Client-side mirror of the shared section registry contract — see
 * `landing-page-sections.md` at the workspace root, which is the source
 * of truth both this file and the storefront renderer are built against.
 * Keep the two in sync by hand (same convention CLAUDE.md already
 * documents for storefrontApi.ts's types across repos).
 *
 * This file owns three things per section type:
 *   - its `type` string constant + props TypeScript shape
 *   - its default props for a freshly-added instance
 *   - its picker-modal metadata (label, category, description)
 */
import type { LandingPageSection } from './landingPagesApi';

// -- Shared -------------------------------------------------------------

export interface SectionStyle {
  backgroundColor?: string;
  backgroundImageUrl?: string;
  paddingTop?: number;
  paddingBottom?: number;
}

export type SectionCategory = 'Basic' | 'Hero' | 'Products' | 'Reviews' | 'Offer' | 'FAQ' | 'Checkout';

export const SECTION_CATEGORIES: SectionCategory[] = [
  'Basic',
  'Hero',
  'Products',
  'Reviews',
  'Offer',
  'FAQ',
  'Checkout',
];

// -- Per-type props -----------------------------------------------------

export interface HeadingProps {
  text: string;
  level: 'h1' | 'h2' | 'h3';
  align: 'left' | 'center' | 'right';
  style?: SectionStyle;
}

export interface TextProps {
  html: string;
  align?: 'left' | 'center' | 'right';
  style?: SectionStyle;
}

export interface ImageProps {
  imageUrl: string;
  alt: string;
  link?: string;
  fit: 'cover' | 'contain';
  style?: SectionStyle;
}

export interface SpacerProps {
  heightPx: number;
  showLine?: boolean;
  lineStyle?: 'solid' | 'dashed';
}

export interface ButtonProps {
  label: string;
  link: string;
  variant: 'primary' | 'secondary' | 'outline';
  align: 'left' | 'center' | 'right';
  openInNewTab?: boolean;
}

export interface HeroSlide {
  imageUrl: string;
  headline: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

export interface HeroSliderProps {
  slides: HeroSlide[];
  autoplayMs?: number;
  style?: SectionStyle;
}

export interface BannerVideoProps {
  videoUrl: string;
  posterImageUrl?: string;
  overlayText?: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  style?: SectionStyle;
}

export type TwoColumnSide =
  | { kind: 'image'; imageUrl: string; alt?: string }
  | { kind: 'html'; html: string };

export interface TwoColumnProps {
  left: TwoColumnSide;
  right: TwoColumnSide;
  stackOnMobile: boolean;
  style?: SectionStyle;
}

export interface SelectProductsProps {
  productIds: string[];
  layout: 'single' | 'grid' | 'carousel';
  showPrice: boolean;
  showStock: boolean;
  columns?: 2 | 3 | 4;
  style?: SectionStyle;
}

export interface PriceOfferProps {
  productId?: string;
  wasPrice: number;
  nowPrice: number;
  ctaLabel: string;
  ctaLink: string;
  backgroundImageUrl?: string;
  style?: SectionStyle;
}

export interface CountdownTimerProps {
  endsAt: string;
  style_: 'boxes' | 'inline'; // `style_` because `style` is the shared SectionStyle slot
  expiredBehavior: 'hide' | 'showMessage';
  expiredMessage?: string;
  style?: SectionStyle;
}

export interface StickyOrderBarProps {
  productId?: string;
  ctaLabel: string;
  ctaLink: string;
  showAfterScrollPx: number;
}

export interface CustomerReview {
  name: string;
  avatarUrl?: string;
  text: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  timeAgo?: string;
  reactionCounts?: { love?: number; wow?: number; sad?: number };
}

export interface CustomerReviewsProps {
  reviews: CustomerReview[];
  title?: string;
  style?: SectionStyle;
}

export interface TrustBadgesProps {
  badges: Array<{ imageUrl: string; label?: string }>;
  title?: string;
  style?: SectionStyle;
}

export interface StatsProps {
  stats: Array<{ value: string; label: string }>;
  style?: SectionStyle;
}

export interface FaqProps {
  items: Array<{ question: string; answer: string }>;
  title?: string;
  style?: SectionStyle;
}

export interface FeatureGridProps {
  title?: string;
  items: Array<{ imageUrl: string; title: string; description?: string }>;
  columns?: 2 | 3 | 4;
  hoverReveal: boolean;
  style?: SectionStyle;
}

export interface CarouselProps {
  items: Array<{ imageUrl: string; caption?: string; link?: string }>;
  autoplayMs?: number;
  style?: SectionStyle;
}

export interface CheckoutFormProps {
  productIds: string[];
  codOnly: boolean;
  collectFields: {
    name: true;
    phone: true;
    address: true;
    district: boolean;
    shippingOption: boolean;
  };
  fraudCheckEnabled: boolean;
  style?: SectionStyle;
}

export interface LeadFormProps {
  collectFields: { name: true; phone: true; email: boolean };
  destination: 'vendor-dashboard' | 'whatsapp';
  whatsappNumber?: string;
  successMessage?: string;
  style?: SectionStyle;
}

// -- Registry -----------------------------------------------------------

export interface SectionTypeMeta {
  type: string;
  label: string;
  category: SectionCategory;
  /** One line shown under the label in the "Add Section" picker. */
  description: string;
  /**
   * Props a freshly-added instance starts with. Returns `object` rather
   * than `Record<string, unknown>` so each entry below can annotate its
   * own concrete props interface (which type-checks the literal) without
   * needing an index signature on every interface.
   */
  defaults: () => object;
}

function in24Hours(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export const SECTION_REGISTRY: SectionTypeMeta[] = [
  // Basic
  {
    type: 'heading',
    label: 'Heading',
    category: 'Basic',
    description: 'A title or section header.',
    defaults: (): HeadingProps => ({ text: 'Your Heading Here', level: 'h2', align: 'center' }),
  },
  {
    type: 'text',
    label: 'Text',
    category: 'Basic',
    description: 'A rich text block.',
    defaults: (): TextProps => ({ html: '<p>Write something...</p>' }),
  },
  {
    type: 'image',
    label: 'Image',
    category: 'Basic',
    description: 'A single image, optionally linked.',
    defaults: (): ImageProps => ({ imageUrl: '', alt: '', fit: 'cover' }),
  },
  {
    type: 'spacer',
    label: 'Spacer / Divider',
    category: 'Basic',
    description: 'Blank space or a dividing line.',
    defaults: (): SpacerProps => ({ heightPx: 40, showLine: false }),
  },
  {
    type: 'button',
    label: 'Button',
    category: 'Basic',
    description: 'A call-to-action button.',
    defaults: (): ButtonProps => ({ label: 'Click Here', link: '', variant: 'primary', align: 'center' }),
  },
  {
    type: 'feature-grid',
    label: 'Feature Grid',
    category: 'Basic',
    description: 'Why customers should buy — icons and short copy.',
    defaults: (): FeatureGridProps => ({
      title: 'কেন আমাদের প্রোডাক্ট নিবেন?',
      items: [
        { imageUrl: '', title: 'Feature one', description: '' },
        { imageUrl: '', title: 'Feature two', description: '' },
        { imageUrl: '', title: 'Feature three', description: '' },
      ],
      columns: 3,
      hoverReveal: true,
    }),
  },
  {
    type: 'carousel',
    label: 'Image Carousel',
    category: 'Basic',
    description: 'A swipeable row of images.',
    defaults: (): CarouselProps => ({ items: [], autoplayMs: 0 }),
  },

  // Hero
  {
    type: 'hero-slider',
    label: 'Hero Slider',
    category: 'Hero',
    description: 'Full-width slides with a headline and CTA.',
    defaults: (): HeroSliderProps => ({
      slides: [
        {
          imageUrl: '',
          headline: 'Headline',
          subheadline: '',
          ctaLabel: 'Shop Now',
          ctaLink: '#checkout',
        },
      ],
      autoplayMs: 4000,
    }),
  },
  {
    type: 'banner-video',
    label: 'Banner Video',
    category: 'Hero',
    description: 'A full-width video banner.',
    defaults: (): BannerVideoProps => ({ videoUrl: '', autoplay: true, muted: true, loop: true }),
  },
  {
    type: 'two-column',
    label: 'Two Column',
    category: 'Hero',
    description: 'Image and text side by side.',
    defaults: (): TwoColumnProps => ({
      left: { kind: 'image', imageUrl: '', alt: '' },
      right: { kind: 'html', html: '<p>Text here</p>' },
      stackOnMobile: true,
    }),
  },

  // Products
  {
    type: 'select-products',
    label: 'Select Products',
    category: 'Products',
    description: 'Show one or more of your products.',
    defaults: (): SelectProductsProps => ({
      productIds: [],
      layout: 'single',
      showPrice: true,
      showStock: false,
    }),
  },
  {
    type: 'sticky-order-bar',
    label: 'Sticky Order Bar',
    category: 'Products',
    description: 'A floating order button that follows the shopper.',
    defaults: (): StickyOrderBarProps => ({
      ctaLabel: 'অর্ডার করুন',
      ctaLink: '#checkout',
      showAfterScrollPx: 300,
    }),
  },

  // Offer
  {
    type: 'price-offer',
    label: 'Price Offer',
    category: 'Offer',
    description: 'Was/now pricing with a CTA.',
    defaults: (): PriceOfferProps => ({
      wasPrice: 0,
      nowPrice: 0,
      ctaLabel: 'অর্ডার করুন',
      ctaLink: '#checkout',
    }),
  },
  {
    type: 'countdown-timer',
    label: 'Countdown Timer',
    category: 'Offer',
    description: 'Urgency — counts down to a deadline.',
    defaults: (): CountdownTimerProps => ({
      endsAt: in24Hours(),
      style_: 'boxes',
      expiredBehavior: 'hide',
    }),
  },

  // Reviews
  {
    type: 'customer-reviews',
    label: 'Customer Reviews',
    category: 'Reviews',
    description: 'Testimonials with names and photos.',
    defaults: (): CustomerReviewsProps => ({
      title: 'আমাদের সম্মানিত কাস্টমারদের রিভিউ',
      reviews: [
        { name: '', text: '', timeAgo: '' },
        { name: '', text: '', timeAgo: '' },
        { name: '', text: '', timeAgo: '' },
      ],
    }),
  },
  {
    type: 'trust-badges',
    label: 'Trust Badges',
    category: 'Reviews',
    description: 'Payment and delivery partner logos.',
    defaults: (): TrustBadgesProps => ({ badges: [], title: 'আমাদের পার্টনারস' }),
  },
  {
    type: 'stats',
    label: 'Stats',
    category: 'Reviews',
    description: 'Numbers that build trust — customers, ratings.',
    defaults: (): StatsProps => ({
      stats: [
        { value: '0', label: 'Label' },
        { value: '0', label: 'Label' },
        { value: '0', label: 'Label' },
      ],
    }),
  },

  // FAQ
  {
    type: 'faq',
    label: 'FAQ',
    category: 'FAQ',
    description: 'Expandable questions and answers.',
    defaults: (): FaqProps => ({
      title: '',
      items: [{ question: 'Question?', answer: 'Answer.' }],
    }),
  },

  // Checkout
  {
    type: 'checkout-form',
    label: 'Checkout Form',
    category: 'Checkout',
    description: 'Cash-on-delivery order form.',
    defaults: (): CheckoutFormProps => ({
      productIds: [],
      codOnly: true,
      collectFields: { name: true, phone: true, address: true, district: true, shippingOption: true },
      fraudCheckEnabled: false,
    }),
  },
  {
    type: 'lead-form',
    label: 'Lead Form',
    category: 'Checkout',
    description: 'Collect a name and phone number, no purchase.',
    defaults: (): LeadFormProps => ({
      collectFields: { name: true, phone: true, email: false },
      destination: 'vendor-dashboard',
      successMessage: 'ধন্যবাদ! আমরা শীঘ্রই যোগাযোগ করব।',
    }),
  },
];

export function sectionMeta(type: string): SectionTypeMeta | undefined {
  return SECTION_REGISTRY.find((s) => s.type === type);
}

/** Human label for a section type, falling back to the raw type for anything unrecognized (e.g. a section saved by a newer build). */
export function sectionLabel(type: string): string {
  return sectionMeta(type)?.label ?? type;
}

/** Builds a brand-new section entry of the given type, ready to push into `sections`. */
export function createSection(type: string): LandingPageSection {
  const meta = sectionMeta(type);
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    props: (meta ? meta.defaults() : {}) as Record<string, unknown>,
    visibility: { desktop: true, mobile: true },
  };
}
