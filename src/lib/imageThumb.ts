/**
 * A small copy of an uploaded picture for list thumbnails: the dashboard's lists used to download each product's full upload (often
 * 1-3 MB) to show it at 32-40 px. The server saves a WebP in a few widths next to every upload (server/src/upload/image-variants.ts), and
 * this picks the smallest one that is at least twice the shown size (sharp on phone screens). Anything that is not one of our uploads
 * comes back unchanged. The ladder and the name rule are kept in step by hand with the server's and the storefront's copies.
 */
const WIDTH_LADDER = [320, 640, 960, 1280, 1920];
const OWN = /^(.*\/Regantify\/[^/?#]+)\.(?:jpe?g|png|webp|gif|avif)(\?[^#]*)?$/i;

export function imageThumb(url: string, width = 120): string {
  const m = OWN.exec(url);
  if (!m) return url;
  const w = WIDTH_LADDER.find((step) => step >= width) ?? WIDTH_LADDER[WIDTH_LADDER.length - 1];
  return `${m[1]}.w${w}.webp${m[2] ?? ''}`;
}
