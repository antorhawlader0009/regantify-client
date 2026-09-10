// Builds a link to the public storefront app (storefront/ — a separate
// Next.js app, its own origin/port, not this dashboard). Same
// auto-detect-from-current-host pattern as api.ts, so the SAME running
// dashboard works unmodified from http://localhost:5173 and from a
// tester's PC on the LAN (http://192.168.x.x:5173) without per-machine
// config. The storefront app is assumed to run on port 3000 on that same
// host in dev.
//
// If VITE_STOREFRONT_URL is set (e.g. the real production storefront
// domain), that's used instead — set this once the storefront app is
// deployed behind its own domain.
function storefrontOrigin(): string {
  const configured = import.meta.env.VITE_STOREFRONT_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, '');
  return `${window.location.protocol}//${window.location.hostname}:3000`;
}

/** Link to a vendor's storefront home page. */
export function storefrontStoreUrl(subdomain: string): string {
  return `${storefrontOrigin()}/store/${subdomain}`;
}

/** Link to one product's public storefront page — used by the small "view on storefront" icon wherever a product name is shown in the vendor dashboard. */
export function storefrontProductUrl(subdomain: string, slug: string): string {
  return `${storefrontOrigin()}/store/${subdomain}/product/${slug}`;
}
