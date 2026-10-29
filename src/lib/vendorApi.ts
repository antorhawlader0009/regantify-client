import { api } from './api';

export type StoreTheme = 'MEDIUM' | 'MINIMAL' | 'STOREPAL';

export interface VendorThemeInfo {
  theme: StoreTheme;
  // Which themes the vendor's current plan unlocks (PLAN.md Step 7) —
  // Themes.tsx uses this to show locked cards with an "Upgrade to
  // unlock" badge instead of a plain Select button.
  allowedThemes: StoreTheme[];
}

export async function getVendorTheme(): Promise<VendorThemeInfo> {
  const { data } = await api.get<VendorThemeInfo>('/v1/vendor/theme');
  return data;
}

export async function updateVendorTheme(theme: StoreTheme): Promise<StoreTheme> {
  const { data } = await api.patch<{ theme: StoreTheme }>('/v1/vendor/theme', { theme });
  return data.theme;
}

// Store > Social — every field optional/nullable; a vendor only fills
// in the platforms they actually use. See Vendor.facebookUrl etc in
// schema.prisma for the full field set this mirrors one-to-one.
export interface SocialLinks {
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  linkedinUrl: string | null;
  whatsappUrl: string | null;
}

export async function getVendorSocialLinks(): Promise<SocialLinks> {
  const { data } = await api.get<SocialLinks>('/v1/vendor/social-links');
  return data;
}

export async function updateVendorSocialLinks(links: Partial<SocialLinks>): Promise<SocialLinks> {
  const { data } = await api.patch<SocialLinks>('/v1/vendor/social-links', links);
  return data;
}

// Settings > Store name / Store URL / Address. Store name and Store URL
// (subdomain) are deliberately separate fields — changing the name is
// just a display-label edit, while changing the URL immediately moves
// where the live storefront is reachable (see VendorController.updateSettings).
export interface VendorSettings {
  storeName: string;
  subdomain: string;
  address: string | null;
  /** The owner's phone (read only; used by the ready policy pages). */
  phone?: string | null;
}

export async function getVendorSettings(): Promise<VendorSettings> {
  const { data } = await api.get<VendorSettings>('/v1/vendor/settings');
  return data;
}

export async function updateVendorSettings(
  fields: Partial<Pick<VendorSettings, 'storeName' | 'subdomain' | 'address'>>,
): Promise<VendorSettings> {
  const { data } = await api.patch<VendorSettings>('/v1/vendor/settings', fields);
  return data;
}

// Store > Delivery Charge / VAT.
// Values are BDT amounts — insideDhakaCharge/outsideDhakaCharge drive the
// storefront checkout's zone-based shipping charge, vatChargeBdt is a
// flat fee added to EVERY order regardless of payment method (see
// Vendor.vatChargeBdt in schema.prisma / OrdersService.create) — a
// gateway's own Platform Charge (Store > Payment Gateway,
// paymentGatewaysApi) is a separate, independent setting. All three ship
// as strings from the API (Prisma Decimal), same convention as
// ordersApi's own subtotal/deliveryCharge/total fields.
export interface DeliveryCharges {
  insideDhakaCharge: string;
  outsideDhakaCharge: string;
  vatChargeBdt: string;
  // Delivery time (tracking-plan.md Step 7): working days per zone (null = no "Expected by" date for
  // that zone), days to get an order ready, and the weekdays that don't count (0 = Sunday ... 6 = Saturday).
  insideDhakaDays: number | null;
  outsideDhakaDays: number | null;
  // "Around Dhaka" (Savar, Gazipur, Narayanganj...): an optional third zone, StorePal checkout only.
  aroundDhakaEnabled: boolean;
  aroundDhakaCharge: string;
  aroundDhakaDays: number | null;
  // Express delivery (TellMe idea 132), StorePal checkout only.
  expressEnabled: boolean;
  expressZones: string[];
  expressCharge: string;
  expressCutoffMinutes: number | null;
  expressDay: 'TODAY' | 'NEXT_DAY';
  expressWaivedByFree: boolean;
  // Store pickup (TellMe idea 46): the shopper collects the order at the shop, StorePal checkout only.
  pickupEnabled: boolean;
  pickupAddress: string | null;
  pickupHours: string | null;
  // Preferred delivery day (TellMe idea 50): the shopper may pick a day at checkout (StorePal).
  preferredDeliveryEnabled: boolean;
  preferredDeliveryMinDays: number;
  /** Delivery time slots (TellMe idea 90); null = none. */
  deliverySlots?: DeliverySlotInput[] | null;
  // Checkout rules (TellMe ideas 56, 57, 58). Decimals arrive as strings.
  minOrderAmount: string | null;
  giftOptionEnabled: boolean;
  giftWrapCharge: string;
  /** Taka per 1 US dollar for "about $X" prices to gift senders abroad; null = off. */
  giftUsdRate?: string | null;
  weightChargeEnabled: boolean;
  weightFreeKg: string;
  weightPerKgInside: string;
  weightPerKgAround: string;
  weightPerKgOutside: string;
  weightChargeMax: string | null;
  // Delivery area control (TellMe idea 65), StorePal checkout only.
  deliveryAreaMode: 'OFF' | 'ONLY' | 'EXCEPT';
  deliveryAreaDistricts: string[];
  deliveryAreaMessage: string | null;
  // Daily order limit and cut-off (TellMe idea 69).
  dailyOrderLimit: number | null;
  orderCutoffMinutes: number | null;
  deliveryProcessingDays: number;
  deliveryOffDays: number[];
}

export interface DeliveryChargesUpdate {
  insideDhakaCharge?: number;
  outsideDhakaCharge?: number;
  vatChargeBdt?: number;
  insideDhakaDays?: number | null;
  outsideDhakaDays?: number | null;
  aroundDhakaEnabled?: boolean;
  aroundDhakaCharge?: number;
  aroundDhakaDays?: number | null;
  expressEnabled?: boolean;
  expressZones?: string[];
  expressCharge?: number;
  /** Minutes after midnight (Dhaka); null = no cut-off. */
  expressCutoffMinutes?: number | null;
  expressDay?: 'TODAY' | 'NEXT_DAY';
  expressWaivedByFree?: boolean;
  pickupEnabled?: boolean;
  pickupAddress?: string | null;
  pickupHours?: string | null;
  preferredDeliveryEnabled?: boolean;
  preferredDeliveryMinDays?: number;
  /** Up to 4 slots; an empty list clears them. */
  deliverySlots?: DeliverySlotInput[] | null;
  /** 0 or null clears the minimum / the cap. */
  minOrderAmount?: number | null;
  giftOptionEnabled?: boolean;
  giftWrapCharge?: number;
  giftUsdRate?: number | null;
  weightChargeEnabled?: boolean;
  weightFreeKg?: number;
  weightPerKgInside?: number;
  weightPerKgAround?: number;
  weightPerKgOutside?: number;
  weightChargeMax?: number | null;
  deliveryAreaMode?: 'OFF' | 'ONLY' | 'EXCEPT';
  deliveryAreaDistricts?: string[];
  deliveryAreaMessage?: string | null;
  /** 0 or null = no limit. */
  dailyOrderLimit?: number | null;
  /** Minutes after midnight (Dhaka); null = no cut-off. */
  orderCutoffMinutes?: number | null;
  deliveryProcessingDays?: number;
  deliveryOffDays?: number[];
}

/** Shop and support hours (TellMe idea 73): keys "0" (Sunday) to "6" (Saturday), Dhaka time. */
export type BusinessHours = Record<string, { open: boolean; from: string; to: string }>;

export async function getBusinessHours(): Promise<{ businessHours: BusinessHours | null }> {
  const { data } = await api.get('/v1/vendor/business-hours');
  return data;
}

export async function updateBusinessHours(businessHours: BusinessHours | null): Promise<{ businessHours: BusinessHours | null }> {
  const { data } = await api.patch('/v1/vendor/business-hours', { businessHours });
  return data;
}

/** Districts shoppers asked for delivery to and were refused (TellMe idea 65), most attempts first. */
export async function getBlockedAreas(): Promise<Array<{ district: string; count: number; lastAt: string }>> {
  const { data } = await api.get('/v1/vendor/blocked-areas');
  return data;
}

export async function getVendorDeliveryCharges(): Promise<DeliveryCharges> {
  const { data } = await api.get<DeliveryCharges>('/v1/vendor/delivery-charges');
  return data;
}

export async function updateVendorDeliveryCharges(charges: DeliveryChargesUpdate): Promise<DeliveryCharges> {
  const { data } = await api.patch<DeliveryCharges>('/v1/vendor/delivery-charges', charges);
  return data;
}

export async function getVendorLogo(): Promise<string | null> {
  const { data } = await api.get<{ logoUrl: string | null }>('/v1/vendor/logo');
  return data.logoUrl;
}

// Store > Logo's upload action — same pattern as Settings' own
// profile-picture upload (see authApi.uploadAvatar): the server
// resizes/recompresses the file itself, so it's sent as picked with no
// client-side processing first.
export async function uploadVendorLogo(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('logo', file);
  const { data } = await api.post<{ logoUrl: string | null }>('/v1/vendor/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.logoUrl;
}

// Store > Branding — see Vendor.accentColor etc in schema.prisma for the
// full field set this mirrors one-to-one. logoUrl is included read-only
// (saved via the separate uploadVendorLogo action above) so the
// Branding page can preview it without a second fetch.
export interface Branding {
  logoUrl: string | null;
  faviconUrl: string | null;
  accentColor: string | null;
  bodyBackgroundColor: string | null;
  brandHeadingFont: string | null;
  brandBodyFont: string | null;
  /** The font for Bangla letters; null = the default, Hind Siliguri. */
  brandBanglaFont: string | null;
  brandCoverImageUrl: string | null;
  /** The website's own cover picture (first slide of the home page hero), separate from the link-preview cover above. */
  brandSiteCoverUrl: string | null;
  brandSiteCoverOnly: boolean;
  brandMetaTitle: string | null;
  brandMetaDescription: string | null;
}

export async function getVendorBranding(): Promise<Branding> {
  const { data } = await api.get<Branding>('/v1/vendor/branding');
  return data;
}

// Store > Branding's "Update Branding" action — colors/fonts/meta only.
// logoUrl/faviconUrl/brandCoverImageUrl are excluded from the request
// shape (they're read-only here, saved via their own upload actions
// below), same split Store > Logo already has.
export async function updateVendorBranding(
  branding: Partial<Omit<Branding, 'logoUrl' | 'faviconUrl' | 'brandCoverImageUrl' | 'brandSiteCoverUrl' | 'brandSiteCoverOnly'>>,
): Promise<Branding> {
  const { data } = await api.patch<Branding>('/v1/vendor/branding', branding);
  return data;
}

// Store > Branding's favicon upload action — same multipart pattern as uploadVendorLogo.
export async function uploadVendorFavicon(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('favicon', file);
  const { data } = await api.post<{ faviconUrl: string | null }>('/v1/vendor/branding/favicon', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.faviconUrl;
}

// Store > Branding's cover-photo upload action — same multipart pattern as uploadVendorLogo.
export async function uploadVendorBrandCover(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('cover', file);
  const { data } = await api.post<{ brandCoverImageUrl: string | null }>('/v1/vendor/branding/cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.brandCoverImageUrl;
}

// Store > Domain — a bare hostname, no protocol/path. null = no custom
// domain connected yet (the store is still reachable at its subdomain
// either way).
export async function getVendorDomain(): Promise<string | null> {
  const { data } = await api.get<{ customDomain: string | null }>('/v1/vendor/domain');
  return data.customDomain;
}

export async function connectVendorDomain(domain: string): Promise<string | null> {
  const { data } = await api.patch<{ customDomain: string | null }>('/v1/vendor/domain', { domain });
  return data.customDomain;
}

export async function removeVendorDomain(): Promise<void> {
  await api.delete('/v1/vendor/domain');
}

/** One delivery time slot (TellMe idea 90): times are 24 hour "HH:MM" in Dhaka time. */
export interface DeliverySlotInput {
  id?: string;
  name: string;
  from: string;
  to: string;
  maxPerDay?: number | null;
}

/** Store > Order Tracking > "How did you hear about us?" (TellMe idea 100). `options` are the store's own answers; empty = the built-in six (`defaults`). */
export interface HeardFromSettings {
  enabled: boolean;
  options: string[];
  defaults: string[];
}

export async function getHeardFromSettings(): Promise<HeardFromSettings> {
  const { data } = await api.get<HeardFromSettings>('/v1/vendor/heard-from');
  return data;
}

export async function updateHeardFromSettings(body: { enabled?: boolean; options?: string[] }): Promise<HeardFromSettings> {
  const { data } = await api.patch<HeardFromSettings>('/v1/vendor/heard-from', body);
  return data;
}

/** Store > Branding > Photo watermark (TellMe idea 103). */
export interface WatermarkSettings {
  mode: 'OFF' | 'LOGO' | 'TEXT';
  position: 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT' | 'CENTER';
  opacity: number;
  /** The logo is an uploaded picture, which the LOGO mark needs. */
  hasLogo: boolean;
  logoUrl: string | null;
  storeName: string;
  subdomain: string;
}

export async function getWatermarkSettings(): Promise<WatermarkSettings> {
  const { data } = await api.get<WatermarkSettings>('/v1/vendor/watermark');
  return data;
}

export async function updateWatermarkSettings(body: Partial<Pick<WatermarkSettings, 'mode' | 'position' | 'opacity'>>): Promise<WatermarkSettings> {
  const { data } = await api.patch<WatermarkSettings>('/v1/vendor/watermark', body);
  return data;
}

// Store > Branding's "Website cover photo" (the home page hero's first slide), separate from the link-preview cover above.
export async function uploadVendorSiteCover(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('cover', file);
  const { data } = await api.post<{ brandSiteCoverUrl: string | null }>('/v1/vendor/branding/site-cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.brandSiteCoverUrl;
}

export async function removeVendorSiteCover(): Promise<void> {
  await api.delete('/v1/vendor/branding/site-cover');
}

/** "Show only this cover": the hero shows the website cover alone, without the category covers after it. */
export async function setVendorSiteCoverOnly(only: boolean): Promise<void> {
  await api.patch('/v1/vendor/branding/site-cover', { only });
}
