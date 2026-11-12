/**
 * Where the Super Admin panel may open (the owner's rule, 2026-11-12).
 *
 * The admin panel has its own private address (a long random subdomain of the platform domain, kept only in the VPS
 * Caddyfile and server env, never in this code, because this bundle is public). The public dashboard address
 * (the bare platform domain and its www.) no longer serves any /admin page.
 *
 * The rule needs no host name: the public dashboard is a two-label host ("regantify.com") or its "www."; the admin
 * address is a subdomain. Stores' subdomains never reach this app (they are served by the storefront), and local or
 * LAN development (localhost, an IP address) keeps the admin pages as before.
 */
function hostOf(): string {
  return typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase();
}

function isLocalOrIp(host: string): boolean {
  return host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
}

/** The public dashboard address: no admin pages here. */
export function isPublicDashboardHost(host = hostOf()): boolean {
  if (!host || isLocalOrIp(host)) return false;
  const labels = host.split('.');
  return labels.length <= 2 || labels[0] === 'www';
}

/** The private admin address: a subdomain that isn't www. Its home page goes straight to the admin sign-in. */
export function isAdminOnlyHost(host = hostOf()): boolean {
  if (!host || isLocalOrIp(host)) return false;
  return !isPublicDashboardHost(host);
}

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}
