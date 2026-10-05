/*
 * The few ESC/POS commands the counter sends to a receipt printer (POS-system-plan.md Step 12).
 * Plain functions with no imports, so they can be checked on their own.
 */

export const ESC = 0x1b;
export const GS = 0x1d;

/** Reset the printer. */
export const INIT = [ESC, 0x40];
/** The cash drawer pulse on pin 2: 50 ms on, 500 ms off. */
export const KICK = [ESC, 0x70, 0x00, 25, 250];
/** Feed 4 lines past the cutter, then a partial cut (printers without a cutter ignore it). */
export const FEED_CUT = [ESC, 0x64, 4, GS, 0x56, 0x42, 0x00];

/** Rows per GS v 0 band, so a printer with a small buffer copes with a long receipt. */
export const BAND_ROWS = 255;

/**
 * RGBA pixels (ImageData order) as black-and-white raster (GS v 0, normal density), one command
 * per band of rows. A pixel prints when it's darker than mid-grey over white paper.
 */
export function rasterFromPixels(pixels: Uint8ClampedArray | Uint8Array, width: number, height: number): Uint8Array {
  const bytesPerRow = Math.ceil(width / 8);
  const bands = Math.ceil(height / BAND_ROWS);
  const out = new Uint8Array(bands * 8 + bytesPerRow * height);
  let o = 0;
  for (let top = 0; top < height; top += BAND_ROWS) {
    const rows = Math.min(BAND_ROWS, height - top);
    out.set([GS, 0x76, 0x30, 0x00, bytesPerRow & 0xff, bytesPerRow >> 8, rows & 0xff, rows >> 8], o);
    o += 8;
    for (let y = top; y < top + rows; y++) {
      for (let bx = 0; bx < bytesPerRow; bx++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit;
          if (x >= width) continue;
          const i = (y * width + x) * 4;
          const a = pixels[i + 3] / 255;
          const lum = (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) * a + 255 * (1 - a);
          if (lum < 160) byte |= 0x80 >> bit;
        }
        out[o++] = byte;
      }
    }
  }
  return out;
}

/** A whole print job: reset, the drawer pulse if asked, the picture, feed and cut. */
export function printJob(raster: Uint8Array, kick: boolean): Uint8Array {
  const head = kick ? [...INIT, ...KICK] : INIT;
  const job = new Uint8Array(head.length + raster.length + FEED_CUT.length);
  job.set(head, 0);
  job.set(raster, head.length);
  job.set(FEED_CUT, head.length + raster.length);
  return job;
}
