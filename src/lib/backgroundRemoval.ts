/**
 * Product photo background removal, done entirely in the browser (TellMe IDEA-45). No server, no AI Credits.
 *
 * Model: U2-Net small ("u2netp", 4.6 MB, Apache-2.0, the same file the rembg tool ships), served from our own
 * dashboard at /models/ with a version in its name (nginx keeps it a year). Runtime: onnxruntime-web on the CPU
 * (WASM), loaded only when a seller first uses it, so nothing reaches the first page download.
 * Measured 2026-10-26 on 8 product photos: about 0.8 s a photo with 4 threads; the dashboard isn't cross-origin
 * isolated, so it runs on one thread here (a bit slower). ORMBG (trained on people), BiRefNet (runs out of memory)
 * and @imgly (AGPL) were tried or checked and dropped; the test page is z-others/bg-remove-test/.
 *
 * Two steps, so changing the colour never runs the model again:
 *   cutOutProduct(blob)              -> the product alone on a transparent canvas, cropped to it
 *   placeOnBackground(cut, color, …) -> that product centred on a plain colour, ready to upload
 */
import type { InferenceSession } from 'onnxruntime-web';

const MODEL_URL = '/models/bg-u2netp-v1.onnx';
const ORT_FILES = '/models/ort-1.22.0/';
const SIZE = 320; // u2netp input is 320 x 320
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/** Default background: white, the marketplace look. The seller may pick another colour. */
export const DEFAULT_BG_COLOR = '#ffffff';

let sessionPromise: Promise<{ ort: typeof import('onnxruntime-web'); session: InferenceSession }> | null = null;

function loadModel() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import('onnxruntime-web/wasm');
      // The runtime's own .mjs + .wasm are copied from node_modules into public/models/ort-<version>/ (Vite doesn't
      // emit them). Upgrading onnxruntime-web means copying the new pair into a new folder and changing this line.
      ort.env.wasm.wasmPaths = ORT_FILES;
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      const session = await ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      return { ort: ort as unknown as typeof import('onnxruntime-web'), session };
    })().catch((err) => {
      sessionPromise = null; // let a later try load it again
      throw err;
    });
  }
  return sessionPromise;
}

/** The product cut out of its photo: transparent around it, cropped to the product. */
export interface CutOut {
  canvas: HTMLCanvasElement;
  /** False when the model found nothing that looks like a product (the whole photo is kept). */
  found: boolean;
}

/** Fetch a photo (a link from our image storage) as a Blob, so the canvas isn't blocked by the browser. */
export async function photoBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load the photo.');
  return res.blob();
}

export async function cutOutProduct(blob: Blob): Promise<CutOut> {
  const [{ ort, session }, img] = await Promise.all([loadModel(), createImageBitmap(blob)]);
  const W = img.width;
  const H = img.height;

  // Model input: the photo squeezed to 320 x 320, normalised per channel.
  const small = document.createElement('canvas');
  small.width = small.height = SIZE;
  const sx = small.getContext('2d', { willReadFrequently: true })!;
  sx.drawImage(img, 0, 0, SIZE, SIZE);
  const px = sx.getImageData(0, 0, SIZE, SIZE).data;
  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    for (let c = 0; c < 3; c++) input[c * SIZE * SIZE + i] = (px[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  }
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
  const pred = out[session.outputNames[0]].data as Float32Array;

  // Saliency 0..1 (stretched to the full range), as the alpha of a 320 x 320 mask.
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (pred[i] < lo) lo = pred[i];
    if (pred[i] > hi) hi = pred[i];
  }
  const mask = document.createElement('canvas');
  mask.width = mask.height = SIZE;
  const mx = mask.getContext('2d')!;
  const md = mx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    md.data[i * 4] = md.data[i * 4 + 1] = md.data[i * 4 + 2] = 255;
    md.data[i * 4 + 3] = Math.round((255 * (pred[i] - lo)) / (hi - lo || 1));
  }
  mx.putImageData(md, 0, 0);

  // Mask scaled up to the photo (smoothed), then used as the photo's alpha.
  const full = document.createElement('canvas');
  full.width = W;
  full.height = H;
  const fx = full.getContext('2d', { willReadFrequently: true })!;
  fx.imageSmoothingQuality = 'high';
  fx.drawImage(mask, 0, 0, W, H);
  const alpha = fx.getImageData(0, 0, W, H).data;
  fx.clearRect(0, 0, W, H);
  fx.drawImage(img, 0, 0);
  const photo = fx.getImageData(0, 0, W, H);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = alpha[i + 3];
      photo.data[i + 3] = a;
      if (a > 128) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  img.close();
  if (x1 < 0) return { canvas: full, found: false };
  fx.putImageData(photo, 0, 0);

  const cut = document.createElement('canvas');
  cut.width = x1 - x0 + 1;
  cut.height = y1 - y0 + 1;
  cut.getContext('2d')!.drawImage(full, x0, y0, cut.width, cut.height, 0, 0, cut.width, cut.height);
  return { canvas: cut, found: true };
}

/** The cut-out product centred on a plain colour, in the store's photo shape (square, or portrait 2:3). */
export function placeOnBackground(cut: HTMLCanvasElement, color: string, shape: 'SQUARE' | 'PORTRAIT'): HTMLCanvasElement {
  const PAD = 0.08; // empty border around the product, as a share of the side
  const MAX_W = 1600;
  const ratio = shape === 'PORTRAIT' ? 1.5 : 1; // height / width
  // Wide enough that the product fits inside the padding, never bigger than the cut-out needs.
  let w = Math.max(cut.width, cut.height / ratio) / (1 - 2 * PAD);
  w = Math.round(Math.min(MAX_W, Math.max(400, w)));
  const h = Math.round(w * ratio);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const o = out.getContext('2d')!;
  o.fillStyle = color;
  o.fillRect(0, 0, w, h);
  const s = Math.min((w * (1 - 2 * PAD)) / cut.width, (h * (1 - 2 * PAD)) / cut.height);
  const dw = cut.width * s;
  const dh = cut.height * s;
  o.imageSmoothingQuality = 'high';
  o.drawImage(cut, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return out;
}

/** A finished canvas as a JPEG file, ready for productsApi.uploadPhoto. */
export function canvasToFile(canvas: HTMLCanvasElement, name = 'product-photo.jpg'): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(new File([b], name, { type: 'image/jpeg' })) : reject(new Error('Could not make the photo.'))),
      'image/jpeg',
      0.92,
    );
  });
}
