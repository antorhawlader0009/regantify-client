import { isLocalApiUp, VPS_ROOT_DOMAIN } from './detectApiOrigin';

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
//
// With neither set, auto-detects local-vs-VPS the same way api.ts does
// for the API itself: if the local API answered its liveness probe
// (see detectApiOrigin.ts), this points at the local storefront
// (assumed port 3000 on the same host); otherwise it points at the real
// VPS's real subdomains (VPS_ROOT_DOMAIN), same as if VITE_ROOT_DOMAIN
// had been set by hand. Both this and the API check are driven by the
// one shared probe — isLocalApiUp() reads its synchronous result rather
// than re-checking the storefront's own port, since "is this dev
// machine's local stack up" is one fact, not two independent ones.
function storefrontOrigin(subdomain: string): string {
  const rootDomain = (import.meta.env.VITE_ROOT_DOMAIN as string | undefined)?.replace(/\/$/, '');
  if (rootDomain) return `https://${subdomain}.${rootDomain}`;

  const configured = import.meta.env.VITE_STOREFRONT_URL as string | undefined;
  if (configured) return `${configured.replace(/\/$/, '')}/store/${subdomain}`;

  const localOrigin = `${window.location.protocol}//${window.location.hostname}:3000/store/${subdomain}`;
  if (isLocalApiUp()) return localOrigin;
  return `https://${subdomain}.${VPS_ROOT_DOMAIN}`;
}

/** Link to a vendor's storefront home page. */
export function storefrontStoreUrl(subdomain: string): string {
  return storefrontOrigin(subdomain);
}

/** Link to one product's public storefront page — used by the small "view on storefront" icon wherever a product name is shown in the vendor dashboard. */
export function storefrontProductUrl(subdomain: string, slug: string): string {
  return `${storefrontOrigin(subdomain)}/product/${slug}`;
}
