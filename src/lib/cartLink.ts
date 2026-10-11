// Shared cart links (TellMe idea 77): the cart is the link. [[productSlug, quantity, { option: value }], ...] as base64url JSON,
// at most 20 lines. The server looks every line up again at the shopper's open (StorefrontService.getSharedCart), so the link
// carries no prices. Same format as the storefront's lib/cartLink.ts.
export const MAX_CART_LINK_LINES = 20;

export interface CartLinkLine {
  slug: string;
  quantity: number;
  options: Record<string, string>;
}

export function encodeCartLink(lines: CartLinkLine[]): string {
  const rows = lines.slice(0, MAX_CART_LINK_LINES).map((l) => (Object.keys(l.options).length > 0 ? [l.slug, l.quantity, l.options] : [l.slug, l.quantity]));
  const bytes = new TextEncoder().encode(JSON.stringify(rows));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
