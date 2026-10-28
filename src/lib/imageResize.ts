import { toast } from './toast';

/**
 * Photos bigger than the store's plan allows are shrunk in the browser before they are sent (2026-10-28, the owner's rule):
 * Free 1000x1000, Basic 2000x2000, Starter 3000x3000, Advance 5000x5000 px, as a box the photo is fitted inside with its
 * width/height ratio kept (server plans/image-size-limit.ts is the rule; the server checks and shrinks again). Uses
 * browser-image-compression (MIT): resize to `maxWidthOrHeight` in a Web Worker, phone photo rotation respected. It is
 * loaded only when a photo really needs shrinking, so it never weighs on the first page load.
 *
 * Called by lib/api.ts for every multipart upload, so each upload screen gets it without its own code.
 */

/** Used until the server's answer arrives, or if it can't be read (the Free plan's box: never too lenient). */
const FALLBACK_MAX_PX = 1000;
const RESIZABLE = /^image\/(jpeg|png|webp)$/;

type Limit = { maxPx: number; planName: string };
let cached: { at: number; limit: Promise<Limit> } | null = null;

/** The store's limit, read once and kept 5 minutes (a plan change shows within that time; the server checks anyway). */
function limitOf(fetchLimit: () => Promise<Limit>): Promise<Limit> {
  if (!cached || Date.now() - cached.at > 5 * 60_000) {
    const limit = fetchLimit().catch(() => ({ maxPx: FALLBACK_MAX_PX, planName: 'your' }));
    cached = { at: Date.now(), limit };
  }
  return cached.limit;
}

/** Forget the cached limit (after a plan change or a sign-out). */
export function forgetImageLimit(): void {
  cached = null;
}

async function sizeOf(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

/**
 * Returns the same FormData when nothing needed shrinking, else a new one with every too-big photo replaced by a shrunk copy
 * (same field names and order). Tells the store what happened, once per upload.
 */
export async function shrinkFormDataImages(form: FormData, fetchLimit: () => Promise<Limit>): Promise<FormData> {
  const entries = [...form.entries()];
  const photos = entries.filter(([, v]) => v instanceof File && RESIZABLE.test(v.type));
  if (photos.length === 0) return form;

  const { maxPx, planName } = await limitOf(fetchLimit);
  const replaced = new Map<File, File>();
  let first: { from: string; to: string } | null = null;
  for (const [, value] of photos) {
    const file = value as File;
    const size = await sizeOf(file);
    if (!size || Math.max(size.width, size.height) <= maxPx) continue;
    const { default: imageCompression } = await import('browser-image-compression');
    const out = await imageCompression(file, { maxWidthOrHeight: maxPx, useWebWorker: true, initialQuality: 0.9, fileType: file.type });
    const shrunk = new File([out], file.name, { type: out.type || file.type, lastModified: file.lastModified });
    replaced.set(file, shrunk);
    if (!first) {
      const scale = maxPx / Math.max(size.width, size.height);
      first = { from: `${size.width}×${size.height}`, to: `${Math.round(size.width * scale)}×${Math.round(size.height * scale)}` };
    }
  }
  if (replaced.size === 0) return form;

  const next = new FormData();
  for (const [key, value] of entries) {
    if (value instanceof File) next.append(key, replaced.get(value) ?? value, (replaced.get(value) ?? value).name);
    else next.append(key, value);
  }
  if (first) {
    const more = replaced.size > 1 ? ` (${replaced.size} photos)` : '';
    toast.info(`Photo was ${first.from} px. The ${planName} plan keeps photos up to ${maxPx}×${maxPx} px, so it was made ${first.to}${more}. Upgrade your plan for bigger photos.`);
  }
  return next;
}
