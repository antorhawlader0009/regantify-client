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
