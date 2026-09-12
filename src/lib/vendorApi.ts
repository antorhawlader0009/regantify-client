import { api } from './api';

export type StoreTheme = 'MEDIUM' | 'MINIMAL' | 'STOREPAL';

export async function getVendorTheme(): Promise<StoreTheme> {
  const { data } = await api.get<{ theme: StoreTheme }>('/api/v1/vendor/theme');
  return data.theme;
}

export async function updateVendorTheme(theme: StoreTheme): Promise<StoreTheme> {
  const { data } = await api.patch<{ theme: StoreTheme }>('/api/v1/vendor/theme', { theme });
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
  const { data } = await api.get<SocialLinks>('/api/v1/vendor/social-links');
  return data;
}

export async function updateVendorSocialLinks(links: Partial<SocialLinks>): Promise<SocialLinks> {
  const { data } = await api.patch<SocialLinks>('/api/v1/vendor/social-links', links);
  return data;
}

export async function getVendorLogo(): Promise<string | null> {
  const { data } = await api.get<{ logoUrl: string | null }>('/api/v1/vendor/logo');
  return data.logoUrl;
}

// Store > Logo's upload action — same pattern as Settings' own
// profile-picture upload (see authApi.uploadAvatar): the server
// resizes/recompresses the file itself, so it's sent as picked with no
// client-side processing first.
export async function uploadVendorLogo(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('logo', file);
  const { data } = await api.post<{ logoUrl: string | null }>('/api/v1/vendor/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.logoUrl;
}
