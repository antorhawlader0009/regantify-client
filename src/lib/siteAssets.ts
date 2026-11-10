// The marketing homepage's own pictures live on R2 behind Cloudflare (2026-11-10), not on the VPS: smaller WebP copies,
// cached for a year. Uploaded by server/prisma/upload-site-images.ts; a changed picture goes into a new folder version (v2...).
export const SITE_ASSETS_BASE = 'https://cdn.regantify.com/site/v1';

/** `siteAsset('site/hero-1.webp')` -> the picture's address on the CDN. */
export const siteAsset = (path: string) => `${SITE_ASSETS_BASE}/${path}`;
