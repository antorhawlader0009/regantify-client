import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { productsApi } from '../../lib/productsApi';
import { apiErrorMessage } from '../../lib/api';
import {
  DEFAULT_BG_COLOR,
  canvasToFile,
  cutOutProduct,
  photoBlob,
  placeOnBackground,
  type CutOut,
} from '../../lib/backgroundRemoval';

/** Ready colours; any other one through the colour box. White first: it is the default. */
const SWATCHES = [
  { color: '#ffffff', name: 'White' },
  { color: '#f3f4f6', name: 'Light grey' },
  { color: '#faf6ef', name: 'Cream' },
  { color: '#fdecef', name: 'Soft pink' },
  { color: '#e8f1fb', name: 'Soft blue' },
  { color: '#111111', name: 'Black' },
];

/**
 * "Background" on a product photo (IDEA-45): the product is cut out in this browser (lib/backgroundRemoval.ts)
 * and put on white, or a colour the seller picks. "Use this photo" uploads the result and puts it in the old
 * photo's place; the old photo stays in Media. Nothing is saved until the product itself is saved.
 */
export function RemoveBackgroundDialog({
  photoUrl,
  photoSize,
  onClose,
  onDone,
}: {
  /** The photo to clean; null keeps the dialog closed. */
  photoUrl: string | null;
  photoSize: 'SQUARE' | 'PORTRAIT';
  onClose: () => void;
  /** The new photo's link, already uploaded. */
  onDone: (url: string) => void;
}) {
  const [cut, setCut] = useState<CutOut | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(DEFAULT_BG_COLOR);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const finalRef = useRef<HTMLCanvasElement | null>(null);

  // Cut the product out once per photo; colour changes reuse it.
  useEffect(() => {
    if (!photoUrl) return;
    let live = true;
    setCut(null);
    setPreview(null);
    setError(null);
    setColor(DEFAULT_BG_COLOR);
    setWorking(true);
    photoBlob(photoUrl)
      .then(cutOutProduct)
      .then((c) => live && setCut(c))
      .catch(() => live && setError('Could not clean this photo. Check your connection and try again.'))
      .finally(() => live && setWorking(false));
    return () => {
      live = false;
    };
  }, [photoUrl]);

  useEffect(() => {
    if (!cut?.found) return;
    const canvas = placeOnBackground(cut.canvas, color, photoSize);
    finalRef.current = canvas;
    setPreview(canvas.toDataURL('image/jpeg', 0.85));
  }, [cut, color, photoSize]);

  const save = async () => {
    if (!finalRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const file = await canvasToFile(finalRef.current);
      const { url } = await productsApi.uploadPhoto(file);
      onDone(url);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Upload failed. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const tileClass = `w-full overflow-hidden rounded-lg border border-line bg-neutral-50 ${photoSize === 'PORTRAIT' ? 'aspect-[2/3]' : 'aspect-square'}`;
  const customColor = !SWATCHES.some((s) => s.color === color);

  return (
    <Dialog open={photoUrl !== null} onOpenChange={(o) => !o && !saving && onClose()} title="Clean background" maxWidth="max-w-2xl">
      <div className="space-y-4 px-6 pb-6 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <figure className="space-y-1.5">
            <div className={tileClass}>{photoUrl && <img src={photoUrl} alt="" className="h-full w-full object-contain" />}</div>
            <figcaption className="text-xs text-neutral-500">Before</figcaption>
          </figure>
          <figure className="space-y-1.5">
            <div className={`${tileClass} flex items-center justify-center`}>
              {preview ? (
                <img src={preview} alt="" className="h-full w-full object-contain" />
              ) : working ? (
                <span className="flex flex-col items-center gap-2 px-4 text-center text-xs text-neutral-500">
                  <Loader2 size={20} className="animate-spin" aria-hidden />
                  Cleaning the photo. The first time takes a few seconds.
                </span>
              ) : cut && !cut.found ? (
                <span className="px-4 text-center text-xs text-neutral-500">No product found in this photo. Try a photo where the product stands out.</span>
              ) : null}
            </div>
            <figcaption className="text-xs text-neutral-500">After</figcaption>
          </figure>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-regantify-text">Background colour</p>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((s) => (
              <button
                key={s.color}
                type="button"
                onClick={() => setColor(s.color)}
                aria-label={s.name}
                aria-pressed={color === s.color}
                title={s.name}
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                  color === s.color ? 'border-brand ring-2 ring-brand/30' : 'border-line'
                }`}
                style={{ backgroundColor: s.color }}
              >
                {color === s.color && <Check size={14} className={s.color === '#111111' ? 'text-white' : 'text-regantify-text'} aria-hidden />}
              </button>
            ))}
            <label
              className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border px-2.5 text-xs text-regantify-text ${
                customColor ? 'border-brand ring-2 ring-brand/30' : 'border-line'
              }`}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
                aria-label="Pick any colour"
              />
              Other colour
            </label>
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          Done on this computer, free. Check the edges before using it. The old photo stays in Media.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!preview || saving} className={primaryBtn}>
            {saving && <Loader2 size={15} className="animate-spin" aria-hidden />}
            Use this photo
          </button>
        </div>
      </div>
    </Dialog>
  );
}
