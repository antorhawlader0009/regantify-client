import { api } from './api';
import type { FooterTemplateKey, PaymentIconKey } from './footerTemplates';

// Store > Footer — see FooterConfig in server/prisma/schema.prisma for
// the field-by-field reasoning this mirrors one-to-one, and
// footer-templates.ts for what `template` values mean.
export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterConfig {
  template: FooterTemplateKey;
  menuTitle: string;
  menuLinks: FooterLink[];
  infoTitle: string;
  infoLinks: FooterLink[];
  aboutBlurb: string | null;
  showSocialIcons: boolean;
  showSubscribeBlock: boolean;
  subscribeHeading: string;
  subscribeSubheading: string;
  showPaymentIcons: boolean;
  paymentIcons: PaymentIconKey[];
}

export type FooterConfigPayload = Partial<FooterConfig>;

/**
 * Store > Footer's initial form values — a vendor who's never saved one
 * gets the model's own defaults back (CLASSIC template, empty columns),
 * not a 404, so the builder always opens pre-filled. See
 * VendorService.getFooterConfig's own comment on the backend.
 */
export async function getFooterConfig(): Promise<FooterConfig> {
  const { data } = await api.get<FooterConfig>('/v1/vendor/footer');
  return data;
}

/** Store > Footer's "Save" action — partial update, same convention as updateVendorBranding. */
export async function updateFooterConfig(payload: FooterConfigPayload): Promise<FooterConfig> {
  const { data } = await api.patch<FooterConfig>('/v1/vendor/footer', payload);
  return data;
}
