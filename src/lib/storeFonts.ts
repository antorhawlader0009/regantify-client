/**
 * Fonts a store can pick in Store > Branding (Vendor.brandHeadingFont / brandBodyFont for English, brandBanglaFont for Bangla), all on Google Fonts. The storefront
 * keeps the weights of the same list (storefront lib/storeFonts.ts) so its font address never asks for a weight a font
 * doesn't have; change both when a font is added. Bangla letters use the Bangla font (default Hind Siliguri, DEFAULT_BANGLA_FONT).
 */
export interface StoreFontChoice {
  name: string;
  /** Has Bangla letters of its own. */
  bangla: boolean;
}

/** The Bangla font a store gets when it picks none (the storefront self-hosts it). */
export const DEFAULT_BANGLA_FONT = 'Hind Siliguri';

export const STORE_FONTS: StoreFontChoice[] = [
  { name: 'Hind Siliguri', bangla: true },
  { name: 'Noto Sans Bengali', bangla: true },
  { name: 'Noto Serif Bengali', bangla: true },
  { name: 'Baloo Da 2', bangla: true },
  { name: 'Anek Bangla', bangla: true },
  { name: 'Tiro Bangla', bangla: true },
  { name: 'Galada', bangla: true },
  { name: 'Atma', bangla: true },
  { name: 'Mina', bangla: true },
  { name: 'Poppins', bangla: false },
  { name: 'Inter', bangla: false },
  { name: 'Roboto', bangla: false },
  { name: 'Open Sans', bangla: false },
  { name: 'Lato', bangla: false },
  { name: 'Montserrat', bangla: false },
  { name: 'Nunito', bangla: false },
  { name: 'DM Sans', bangla: false },
  { name: 'Raleway', bangla: false },
  { name: 'Work Sans', bangla: false },
  { name: 'Rubik', bangla: false },
  { name: 'Playfair Display', bangla: false },
  { name: 'Lora', bangla: false },
  { name: 'Merriweather', bangla: false },
  { name: 'Oswald', bangla: false },
  { name: 'Bebas Neue', bangla: false },
];

/** Same rule as the server: letters, digits and spaces only. */
export function isSafeFontName(name: string): boolean {
  return /^[A-Za-z0-9 ]{1,60}$/.test(name.trim());
}

/** Google Fonts address for previewing fonts in the dashboard (regular and bold only, enough for a preview). */
export function previewFontsHref(names: string[]): string | null {
  const list = [...new Set(names.map((n) => n.trim()).filter(isSafeFontName))];
  if (list.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${list.map((n) => `family=${encodeURIComponent(n).replace(/%20/g, '+')}`).join('&')}&display=swap`;
}
