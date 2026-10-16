/**
 * A small copy of a Cloudinary photo for list thumbnails (PERFORMANCE-PLAN.md Step 10): the dashboard's lists used to
 * download each product's full upload (often 1-3 MB) to show it at 32-40 px. Cloudinary makes and keeps the small copy
 * (`c_limit,w_<px>,f_auto,q_auto`, twice the shown size for sharp phone screens). Anything that isn't a plain Cloudinary
 * upload address comes back unchanged.
 */
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/;

export function cloudinaryThumb(url: string, width = 120): string {
  const m = CLOUDINARY_UPLOAD.exec(url);
  return m ? `${m[1]}c_limit,w_${width},f_auto,q_auto/${m[2]}` : url;
}
