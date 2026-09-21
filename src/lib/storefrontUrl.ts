// Builds a link to the public storefront app (storefront/ — a separate
// Next.js app, its own origin/port, not this dashboard). Same
// auto-detect-from-current-host pattern as api.ts, so the SAME running
// dashboard works unmodified from http://localhost:5173 and from a
// tester's PC on the LAN (http://192.168.x.x:5173) without per-machine
// config. The storefront app is assumed to run on port 3000 on that same
// host in dev.
//
// If VITE_ROOT_DOMAIN is set (e.g. gadgetdepobd.com), that's the real
// production case — the storefront's own middleware.ts rewrites
// {subdomain}.VITE_ROOT_DOMAIN to /store/:subdomain, so links point
// straight at the subdomain host instead of the path, matching how a
// shopper would actually reach the store. Falls back to
// VITE_STOREFRONT_URL (a single fixed origin, no subdomain support) for
// any deploy that has a storefront domain but no ROOT_DOMAIN yet.
function storefrontOrigin(subdomain: string): string {
  const rootDomain = (import.meta.env.VITE_ROOT_DOMAIN as string | undefined)?.replace(/\/$/, '');
  if (rootDomain) return `https://${subdomain}.${rootDomain}`;

  const configured = import.meta.env.VITE_STOREFRONT_URL as string | undefined;
  if (configured) return `${configured.replace(/\/$/, '')}/store/${subdomain}`;

  return `${window.location.protocol}//${window.location.hostname}:3000/store/${subdomain}`;
}

/** Link to a vendor's storefront home page. */
export function storefrontStoreUrl(subdomain: string): string {
  return storefrontOrigin(subdomain);
}

/** Link to one product's public storefront page — used by the small "view on storefront" icon wherever a product name is shown in the vendor dashboard. */
export function storefrontProductUrl(subdomain: string, slug: string): string {
  return `${storefrontOrigin(subdomain)}/product/${slug}`;
}

/**
 * Link to one landing page's public URL (Store > Landing Pages' "Visit"
 * column). Landing pages live under /l/:slug, except the single reserved
 * slug "/" which means "this page IS the store's homepage" — see
 * LandingPage.slug's schema comment and landing-plan.md §6.
 */
export function storefrontLandingPageUrl(subdomain: string, slug: string): string {
  const origin = storefrontOrigin(subdomain);
  return slug === '/' ? origin : `${origin}/l/${slug}`;
}
