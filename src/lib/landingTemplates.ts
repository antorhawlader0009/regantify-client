/**
 * Store > Landing Pages > Ready-made pages: three starting layouts a store opens with one tap. Each builds an ordinary
 * DRAFT landing page from the section registry (landingSections.ts), filled with the store's own product(s): photos,
 * name, price (Price Offer and Sticky Order Bar read the live price), video and summary. Everything stays editable in the
 * builder, and nothing is created until the store picks a template, so the plan's landing-page limit is only used then.
 *
 * Layouts follow common single-product cash-on-delivery practice: one product and one order form, the price and "pay
 * when it arrives" in the first screen, the order form reachable from every button (#checkout) and a sticky order bar
 * on phones. On purpose, no template invents anything a shopper could take as a fact: no customer reviews, no sales
 * numbers and no countdown (a timer with a made-up deadline is fake urgency). The review section is added empty: it stays
 * hidden on the page until the store writes its customers' real words.
 */
import { createSection } from './landingSections';
import type { LandingPageSection } from './landingPagesApi';
import type { Product } from './productsApi';

export type LandingTemplateId = 'single-offer' | 'video-story' | 'multi-product';

export interface LandingTemplate {
  id: LandingTemplateId;
  name: string;
  /** One line under the name. */
  description: string;
  /** Best for... */
  bestFor: string;
  /** The parts of the page, in order, shown on the card. */
  outline: string[];
  /** How many products the template is built for (1, or up to 6 for the multi-product one). */
  maxProducts: number;
}

export const LANDING_TEMPLATES: LandingTemplate[] = [
  {
    id: 'single-offer',
    name: 'Single product offer',
    description: 'One product, its price up top and the order form on the same page.',
    bestFor: 'Facebook and TikTok ads for one product',
    outline: ['Big photo and headline', 'Price and order button', 'Why buy from us', 'Photo gallery', 'Questions', 'Order form'],
    maxProducts: 1,
  },
  {
    id: 'video-story',
    name: 'Product story with video',
    description: 'Shows the product working in a video, then explains it before the order form.',
    bestFor: 'Products that need showing: gadgets, beauty, kitchen',
    outline: ['Headline', 'Product video', 'Photo and details side by side', 'Benefits', 'Price', 'Questions', 'Order form'],
    maxProducts: 1,
  },
  {
    id: 'multi-product',
    name: 'Several products or combo',
    description: 'A few products on one page; the shopper ticks what they want in the order form.',
    bestFor: 'Combos, sizes sold as separate products, Eid or season collections',
    outline: ['Slides of your products', 'Product grid with prices', 'Why buy from us', 'Questions', 'One order form for all'],
    maxProducts: 6,
  },
];

function section<T extends object>(type: string, props: T): LandingPageSection {
  const s = createSection(type);
  return { ...s, props: { ...(s.props as object), ...props } as Record<string, unknown> };
}

/** Plain text of a product's summary or description (they can hold editor HTML), cut to a sentence or two. */
function shortText(p: Product | undefined, max = 220): string {
  const raw = p?.summary || p?.description || '';
  const text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf('।'), cut.lastIndexOf('. '));
  return (end > 60 ? cut.slice(0, end + 1) : cut.trimEnd() + '…').trim();
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Questions every cash-on-delivery shopper asks, answered without promising anything the store hasn't set. */
function commonFaq(): LandingPageSection {
  return section('faq', {
    title: 'সাধারণ প্রশ্ন',
    items: [
      { question: 'কীভাবে অর্ডার করব?', answer: 'নিচের ফর্মে নাম, মোবাইল নম্বর আর ঠিকানা লিখে "অর্ডার করুন" চাপুন। আমরা ফোন করে অর্ডার নিশ্চিত করব।' },
      { question: 'টাকা কখন দিতে হবে?', answer: 'পণ্য হাতে পেয়ে ডেলিভারি ম্যানকে টাকা দেবেন (ক্যাশ অন ডেলিভারি)।' },
      { question: 'ডেলিভারি চার্জ কত?', answer: 'আপনার জেলা বাছলেই অর্ডার ফর্মে ডেলিভারি চার্জ দেখা যাবে।' },
      { question: 'পণ্যে সমস্যা থাকলে কী করব?', answer: 'ডেলিভারির সময় পণ্য দেখে নিন। কোনো সমস্যা থাকলে সাথে সাথে আমাদের জানান।' },
    ],
  });
}

function checkoutForm(products: Product[]): LandingPageSection {
  return section('checkout-form', { productIds: products.map((p) => p.id) });
}

function orderBar(product: Product | undefined): LandingPageSection {
  return section('sticky-order-bar', { productId: product?.id, ctaLabel: 'অর্ডার করুন', ctaLink: '#checkout', showAfterScrollPx: 300 });
}

/** Added empty: the landing page hides it until the store writes real reviews (see Social.tsx's filter). */
function emptyReviews(): LandingPageSection {
  return section('customer-reviews', { title: 'আমাদের ক্রেতারা যা বলছেন', reviews: [{ name: '', text: '' }, { name: '', text: '' }, { name: '', text: '' }] });
}

function whyUs(images: string[]): LandingPageSection {
  return section('feature-grid', {
    title: 'কেন আমাদের থেকে নেবেন?',
    columns: 3,
    hoverReveal: false,
    items: [
      { imageUrl: images[0] ?? '', title: 'পণ্য হাতে পেয়ে টাকা', description: 'আগে কোনো টাকা দিতে হবে না।' },
      { imageUrl: images[1] ?? '', title: 'সহজে অর্ডার', description: 'শুধু নাম, ফোন নম্বর আর ঠিকানা।' },
      { imageUrl: images[2] ?? '', title: 'ফোনে নিশ্চিত করা', description: 'অর্ডারের পর আমরা ফোন করে কথা বলে নিই।' },
    ],
  });
}

export function buildLandingTemplate(id: LandingTemplateId, products: Product[]): { title: string; sections: LandingPageSection[] } {
  const main = products[0];
  const name = main?.name ?? 'আমাদের পণ্য';
  const photos = main?.photoUrls ?? [];

  if (id === 'video-story') {
    const about = shortText(main, 400);
    return {
      title: main ? `${main.name}: video page` : 'Product story with video',
      sections: [
        section('heading', { text: name, level: 'h1', align: 'center' }),
        ...(main?.videoUrl ? [section('banner-video', { videoUrl: main.videoUrl, posterImageUrl: photos[0], autoplay: false, muted: true, loop: false })] : []),
        section('two-column', {
          left: { kind: 'image', imageUrl: photos[0] ?? '', alt: name },
          right: {
            kind: 'html',
            html: `<h3>${escapeHtml(name)}</h3><p>${escapeHtml(about || 'এখানে লিখুন পণ্যটা কী, কার জন্য আর কী কাজে লাগে।')}</p>`,
          },
          stackOnMobile: true,
        }),
        whyUs(photos.slice(1)),
        section('price-offer', { productId: main?.id, wasPrice: 0, nowPrice: 0, ctaLabel: 'এখনই অর্ডার করুন', ctaLink: '#checkout' }),
        ...(photos.length > 1 ? [section('carousel', { items: photos.map((url) => ({ imageUrl: url })), autoplayMs: 0 })] : []),
        emptyReviews(),
        commonFaq(),
        checkoutForm(main ? [main] : []),
        orderBar(main),
      ],
    };
  }

  if (id === 'multi-product') {
    const list = products.slice(0, 6);
    return {
      title: list.length > 1 ? 'Combo offer' : main ? `${main.name}: offer page` : 'Several products',
      sections: [
        section('hero-slider', {
          slides: (list.length ? list : [undefined]).slice(0, 3).map((p) => ({
            imageUrl: p?.photoUrls[0] ?? '',
            headline: p?.name ?? 'আমাদের পণ্য',
            subheadline: 'পছন্দের পণ্য বেছে নিন, পণ্য হাতে পেয়ে টাকা দিন।',
            ctaLabel: 'অর্ডার করুন',
            ctaLink: '#checkout',
          })),
          autoplayMs: 4000,
        }),
        section('heading', { text: 'আমাদের পণ্যগুলো', level: 'h2', align: 'center' }),
        section('select-products', { productIds: list.map((p) => p.id), layout: 'grid', showPrice: true, showStock: false, columns: list.length >= 3 ? 3 : 2 }),
        whyUs(list.slice(1).map((p) => p.photoUrls[0]).filter((u): u is string => !!u)),
        emptyReviews(),
        commonFaq(),
        section('heading', { text: 'যা নিতে চান তাতে টিক দিন', level: 'h2', align: 'center' }),
        checkoutForm(list),
        orderBar(main),
      ],
    };
  }

  // single-offer
  const about = shortText(main);
  return {
    title: main ? `${main.name}: offer page` : 'Single product offer',
    sections: [
      section('hero-slider', {
        slides: [
          {
            imageUrl: photos[0] ?? '',
            headline: name,
            subheadline: about || 'ঘরে বসে অর্ডার করুন, পণ্য হাতে পেয়ে টাকা দিন।',
            ctaLabel: 'এখনই অর্ডার করুন',
            ctaLink: '#checkout',
          },
        ],
        autoplayMs: 0,
      }),
      section('price-offer', { productId: main?.id, wasPrice: 0, nowPrice: 0, ctaLabel: 'অর্ডার করুন', ctaLink: '#checkout' }),
      whyUs(photos.slice(1)),
      ...(photos.length > 1 ? [section('carousel', { items: photos.map((url) => ({ imageUrl: url })), autoplayMs: 0 })] : []),
      ...(main?.videoUrl ? [section('banner-video', { videoUrl: main.videoUrl, posterImageUrl: photos[0], autoplay: false, muted: true, loop: false })] : []),
      emptyReviews(),
      commonFaq(),
      checkoutForm(main ? [main] : []),
      orderBar(main),
    ],
  };
}
