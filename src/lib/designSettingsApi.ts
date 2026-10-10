import { api } from './api';

// Store > Design > Product Display / Product Card / Site Banner / Header
// Editor / Layout Settings — mirrors the server's DesignSettingsService
// (server/src/store-settings/). One owner-only row per vendor; each page
// PATCHes only its own fields. Only the StorePal storefront reads it.

export type ProductImageShape = 'SQUARE' | 'PORTRAIT';
export type ProductGalleryStyle = 'LEFT' | 'BOTTOM' | 'RIGHT';
export type SiteBannerStyle = 'STATIC' | 'MARQUEE';
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
  | 'REVIEWS';

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
  bannerContent: string | null;
  bannerStyle: SiteBannerStyle;
  bannerBackgroundColor: string | null;

  layoutType: StoreLayoutType;
  siteMenu: StoreMenuItem[];
  headerLeftMenu: StoreMenuItem[];
  headerRightMenu: StoreMenuItem[];
  mobileMenu: StoreMenuItem[];

  // Empty = StorePal's own order with everything on / its three built-in highlights.
  homeSections: HomeSection[];
  homeHighlights: HomeHighlight[];
  homeHighlightsHeading: string | null;

  /** StorePal's own buttons and labels: English or Bangla. Product names and descriptions stay as written. */
  storeLanguage: 'en' | 'bn';

  /** The floating chat bubble on the storefront (Store > Design > Chat Button). Mirrored by the server's CHAT_BUTTON_* lists. */
  chatButtonEnabled: boolean;
  chatButtonChannel: ChatButtonChannel;
  /** Messenger only, saved as https://m.me/<page>. */
  chatButtonMessengerLink: string | null;
  chatButtonSide: 'LEFT' | 'RIGHT';
  chatButtonPages: ChatButtonPage[];
  chatButtonProductMessage: boolean;
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
