/**
 * Links printed as a QR code (TellMe idea 125). With "track" on, the link carries the usual UTM tags (`utm_source=qr`), which the store already records with each
 * visit and order (Analytics > Marketing, the Orders "Came from" filter), where "QR code" is its own source. `campaign` says which QR it was (the store, a
 * product's slug, a landing page's slug).
 */
export function withQrTag(url: string, campaign: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}utm_source=qr&utm_medium=qr_code&utm_campaign=${encodeURIComponent(campaign.slice(0, 80))}`;
}
