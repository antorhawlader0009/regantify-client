import { api } from './api';

// Store > Design > Product Display / Product Card / Site Banner / Header
// Editor / Layout Settings — mirrors the server's DesignSettingsService
// (server/src/store-settings/). One owner-only row per vendor; each page
// PATCHes only its own fields. Only the StorePal storefront reads it.

export type ProductImageShape = 'SQUARE' | 'PORTRAIT';
export type ProductGalleryStyle = 'LEFT' | 'BOTTOM' | 'RIGHT';
export type SiteBannerStyle = 'STATIC' | 'MARQUEE';

/** One scheduled banner (TellMe idea 110): shown from startAt to endAt (ISO instants, null = no limit). */
export type TrustIcon = 'truck' | 'return' | 'shield' | 'support' | 'genuine' | 'lock' | 'cash' | 'gift';
export interface TrustStripItem {
  icon: TrustIcon;
  title: string;
  text: string;
}
/** Store > Design > Trust Strip (TellMe idea 130). */
export interface TrustStripSettings {
  enabled: boolean;
  items: TrustStripItem[];
  product: boolean;
  checkout: boolean;
  home: boolean;
  /** "Fast delivery" under the product page's Buy button; on by default. Missing on older saves means on. */
  fastDelivery?: boolean;
}

/** Store > Design > Store reputation (TellMe idea 147): which counted figures to show; the numbers themselves come from the server. */
export interface ReputationSettings {
  enabled: boolean;
  orders: boolean;
  rating: boolean;
  reviews: boolean;
  since: boolean;
}

export interface ScheduledBanner {
  id: string;
  content: string;
  startAt: string | null;
  endAt: string | null;
  style: SiteBannerStyle | null;
  backgroundColor: string | null;
}
export type StoreLayoutType = 'COMPACT' | 'EXTENDED';
export type ChatButtonChannel = 'WHATSAPP' | 'MESSENGER';
/** HOME = home and shop lists, PRODUCT = product pages, OTHER = cart, info pages, account... */
export type ChatButtonPage = 'HOME' | 'PRODUCT' | 'OTHER';

export type StoreMenuItemType = 'PAGE' | 'PRODUCT' | 'CATEGORY' | 'BRAND' | 'OTHER' | 'CUSTOM';
export type StoreMenuOtherTarget = 'ACCOUNT' | 'SHOP' | 'TRACK_ORDER';

/**
 * `value` is a page/product slug, a category/brand name, an
 * StoreMenuOtherTarget, or a URL for CUSTOM. The storefront builds the
 * actual link from type + value.
 */
export interface StoreMenuItem {
  id: string;
  label: string;
  type: StoreMenuItemType;
  value: string;
}

/** The StorePal home page's sections, for Store > Design > Customize. Mirrored by the server's HOME_SECTION_IDS and the storefront's homeSections.ts. */
export type HomeSectionId =
  | 'HERO'
  | 'FLASH_SALE'
  | 'CAMPAIGNS'
  | 'TOP_SELLING'
  | 'CATEGORY_SHORTCUTS'
  | 'CATEGORY_SECTIONS'
  | 'HIGHLIGHTS'
  | 'REVIEWS'
  | 'MAGAZINE'
  | 'FAQ'
  | 'SOCIAL_FEED';

export interface HomeSection {
  id: HomeSectionId;
  enabled: boolean;
}

/** The icons a highlight can use; mirrored by the server's HOME_HIGHLIGHT_ICONS and the storefront's highlightIcons.ts. */
export type HomeHighlightIcon =
  | 'TRUCK'
  | 'SHIELD_CHECK'
  | 'HAND_COINS'
  | 'ROTATE_CCW'
  | 'HEADSET'
  | 'BADGE_CHECK'
  | 'CLOCK'
  | 'GIFT'
  | 'LEAF'
  | 'LOCK'
  | 'STAR'
  | 'TAG'
  | 'PACKAGE'
  | 'MAP_PIN'
  | 'HEART'
  | 'SPARKLES';

/** One entry of the home page's highlights band (free delivery, easy returns...). `id` only keys the list in the editor. */
export interface HomeHighlight {
  id: string;
  icon: HomeHighlightIcon;
  title: string;
  text: string;
}

export interface DesignSettings {
  productImageShape: ProductImageShape;
  galleryStyle: ProductGalleryStyle;
  inStockMessage: string | null;
  outOfStockMessage: string | null;
  preOrderMessage: string | null;

  cardShowSummary: boolean;
  cardShowDefaultButton: boolean;
  cardShowViewButton: boolean;
  cardShowBuyNow: boolean;
  cardShowAddToCart: boolean;
  cardOptionsAsButtons: boolean;
  cardOptionsAsSelect: boolean;
  cardDisplayAsCard: boolean;
  cardShowVideo: boolean;
  cardShowWishlist: boolean;
  /** The one colour of every product badge (Product > Badge); null = the theme's accent. */
  productBadgeColor: string | null;

  bannerEnabled: boolean;
  /** Scheduled banners (TellMe idea 110). */
  bannerSchedule: ScheduledBanner[];
  trustStrip: TrustStripSettings;
  reputation: ReputationSettings;
  bannerContent: string | null;
  bannerStyle: SiteBannerStyle;
  bannerBackgroundColor: string | null;

  layoutType: StoreLayoutType;
  siteMenu: StoreMenuItem[];
  headerLeftMenu: StoreMenuItem[];
  headerRightMenu: StoreMenuItem[];
  mobileMenu: StoreMenuItem[];

  // "Call Us Now" and a number beside the search bar (StorePal header). Off by default.
  headerPhoneEnabled: boolean;
  headerPhoneLabel: string | null;
  headerPhone: string | null;
  headerLogoSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  headerShowCartTotal: boolean;
  // Install as app: the home-screen banner for returning shoppers, and the name under the icon (null = the store name).
  appInstallEnabled: boolean;
  appName: string | null;
  headerShowLogo: boolean;
  headerShowStoreName: boolean;

  // Empty = StorePal's own order with everything on / its three built-in highlights.
  homeSections: HomeSection[];
  homeHighlights: HomeHighlight[];
  homeHighlightsHeading: string | null;

  /** StorePal's own buttons and labels: English or Bangla. Product names and descriptions stay as written. */
  storeLanguage: 'en' | 'bn';
  /** Prices in Bangla digits (৳1,250) while storeLanguage is "bn". */
  storeBanglaDigits: boolean;
  /** The store AI chat's reply language (Settings > Language): Bangla, English, or the shopper's own. */
  aiChatLanguage: 'bn' | 'en' | 'auto';
  /** The store owner's own notes for the store AI chat (AI Usages), at most 1,500 characters; null = none. */
  aiChatInstructions: string | null;
  /** Search by photo: the AI looks at the photo when the free picture match finds nothing (uses AI Credits; off by default). */
  photoSearchAi: boolean;
  /** The store AI assistant's own name, picture, first message, ready questions, voice-call opening, speed and corner (AI Usages). Texts are Bangla only. */
  aiAssistantName: string | null;
  aiAssistantAvatarUrl: string | null;
  aiChatGreeting: string | null;
  aiChatStarters: string[];
  aiVoiceGreeting: string | null;
  aiVoiceSpeed: 'SLOW' | 'NORMAL' | 'FAST';
  aiChatSide: 'RIGHT' | 'LEFT';

  /** The floating chat bubble on the storefront (Store > Design > Chat Button). Mirrored by the server's CHAT_BUTTON_* lists. */
  chatButtonEnabled: boolean;
  chatButtonChannel: ChatButtonChannel;
  /** Messenger only, saved as https://m.me/<page>. */
  chatButtonMessengerLink: string | null;
  chatButtonSide: 'LEFT' | 'RIGHT';
  chatButtonPages: ChatButtonPage[];
  chatButtonProductMessage: boolean;
  /** Share button on the product page (TellMe idea 61). */
  productShareEnabled: boolean;
  /** Average star rating on the product page, cards and Google (from 3 approved reviews); on by default. */
  showRatings?: boolean;
  /** "N bought in the last X days" window (TellMe idea 63): 0 = off, 7 or 30. */
  socialProofDays: number;
  /** Wishlist price / restock alerts by SMS (TellMe idea 62). */
  wishlistAlertsEnabled: boolean;
  /** Automatic badges (TellMe idea 108), all off by default. */
  autoBadgeNew: boolean;
  autoBadgeNewDays: number;
  autoBadgeSale: boolean;
  autoBadgeBestSeller: boolean;
  /** "Someone bought" popup (TellMe idea 123), off by default. */
  /** Checkout form fields (TellMe idea 128). */
  checkoutAltPhone: 'HIDDEN' | 'OPTIONAL' | 'REQUIRED';
  checkoutEmail: 'HIDDEN' | 'OPTIONAL' | 'REQUIRED';
  checkoutThana: 'OPTIONAL' | 'REQUIRED';
  checkoutNote: 'SHOWN' | 'HIDDEN';
  recentBuyersEnabled: boolean;
  recentBuyersPosition: 'LEFT' | 'RIGHT';
  recentBuyersSeconds: number;
}

// Text fields go out as "" to clear them (the server stores null).
export type DesignSettingsUpdate = Partial<{
  [K in keyof DesignSettings]: DesignSettings[K] extends string | null ? string : DesignSettings[K];
}>;

export const DESIGN_SETTINGS_KEY = ['design-settings'] as const;

export const designSettingsApi = {
  get: async () => (await api.get<DesignSettings>('/v1/vendor/design-settings')).data,
  update: async (body: Omit<DesignSettingsUpdate, 'bannerEnabled'>) =>
    (await api.patch<DesignSettings>('/v1/vendor/design-settings', body)).data,
  deleteBanner: async () => (await api.delete<DesignSettings>('/v1/vendor/design-settings/site-banner')).data,
};
