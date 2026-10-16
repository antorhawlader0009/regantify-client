import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import type { PopupImageCrop, PopupShape } from '../../lib/popupCampaignsApi';
import { POPUP_SHAPE_RATIO } from './PopupCard';

/** The banner shapes a popup picture can take, in the order they're offered. */
export const POPUP_SHAPES: { id: PopupShape; label: string; ratio: string }[] = [
  { id: 'WIDE', label: 'Wide', ratio: '16:9' },
  { id: 'BANNER', label: 'Banner', ratio: '2:1' },
  { id: 'PHOTO', label: 'Photo', ratio: '3:2' },
  { id: 'STANDARD', label: 'Standard', ratio: '4:3' },
  { id: 'SQUARE', label: 'Square', ratio: '1:1' },
  { id: 'PORTRAIT', label: 'Portrait', ratio: '4:5' },
];

const MIN_W = 0.1;
const MAX_VIEW = { w: 600, h: 420 };

/** One of the eight drag handles: which edges it moves (-1 left/top, 1 right/bottom, 0 none). */
interface Handle {
  hx: -1 | 0 | 1;
  hy: -1 | 0 | 1;
}
const HANDLES: Handle[] = [
  { hx: -1, hy: -1 },
  { hx: 0, hy: -1 },
  { hx: 1, hy: -1 },
  { hx: -1, hy: 0 },
  { hx: 1, hy: 0 },
  { hx: -1, hy: 1 },
  { hx: 0, hy: 1 },
  { hx: 1, hy: 1 },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * "Frame your campaign dialog": drag a box over the picture, locked to the
 * chosen shape, so the storefront shows exactly that part. Works in 0..1
 * fractions of the picture (what PopupCampaign.imageCrop stores), so the
 * same box can be reopened later and rendered at any size.
 */
export function ImageCropDialog({
  open,
  imageUrl,
  shape: initialShape,
  crop: initialCrop,
  onClose,
  onApply,
}: {
  open: boolean;
  imageUrl: string;
  shape: PopupShape;
  crop: PopupImageCrop | null;
  onClose: () => void;
  onApply: (shape: PopupShape, crop: PopupImageCrop) => void;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [shape, setShape] = useState<PopupShape>(initialShape);
  const [box, setBox] = useState<PopupImageCrop | null>(null);
  const [failed, setFailed] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: 'move' | 'resize'; handle?: Handle; start: PopupImageCrop; px: number; py: number } | null>(null);

  const ratio = POPUP_SHAPE_RATIO[shape];

  /** Height of a box `w` wide, as a fraction of the picture, for this shape. */
  const heightFor = useCallback((w: number, r: number) => (size ? (w * size.w) / (size.h * r) : 0), [size]);
  /** Widest a box of this shape can be inside the picture. */
  const maxWidthFor = useCallback((r: number) => (size ? Math.min(1, (size.h * r) / size.w) : 1), [size]);

  const biggestBox = useCallback(
    (r: number): PopupImageCrop => {
      const w = maxWidthFor(r);
      const h = heightFor(w, r);
      return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
    },
    [heightFor, maxWidthFor],
  );

  // Load the picture's real size whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setSize(null);
    setFailed(false);
    setShape(initialShape);
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setFailed(true);
    img.src = imageUrl;
  }, [open, imageUrl, initialShape]);

  // Start from the saved box (when it still fits the shape) or the biggest one.
  useEffect(() => {
    if (!size) return;
    if (initialCrop) {
      const r = POPUP_SHAPE_RATIO[initialShape];
      const h = (initialCrop.w * size.w) / (size.h * r);
      if (Math.abs(h - initialCrop.h) < 0.02) {
        setBox(initialCrop);
        return;
      }
    }
    setBox(biggestBox(POPUP_SHAPE_RATIO[initialShape]));
    // Only when the picture finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const pickShape = (next: PopupShape) => {
    if (!size || !box) return setShape(next);
    const r = POPUP_SHAPE_RATIO[next];
    const w = Math.min(box.w, maxWidthFor(r));
    const h = heightFor(w, r);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    setShape(next);
    setBox({ x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h });
  };

  const view = size
    ? (() => {
        const s = Math.min(MAX_VIEW.w / size.w, MAX_VIEW.h / size.h);
        return { w: Math.round(size.w * s), h: Math.round(size.h * s) };
      })()
    : null;

  const onPointerDown = (e: ReactPointerEvent, kind: 'move' | 'resize', handle?: Handle) => {
    if (!box) return;
    e.preventDefault();
    e.stopPropagation();
    stageRef.current?.setPointerCapture(e.pointerId);
    drag.current = { kind, handle, start: box, px: e.clientX, py: e.clientY };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || !view || !size) return;
    const dx = (e.clientX - d.px) / view.w;
    const dy = (e.clientY - d.py) / view.h;
    const s = d.start;
    if (d.kind === 'move') {
      setBox({ ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) });
      return;
    }
    const { hx, hy } = d.handle!;
    const wPerH = (size.h * ratio) / size.w; // a box h tall is h * wPerH wide
    const hMax = Math.min(1, 1 / wPerH);
    let w: number;
    let x: number;
    let y: number;
    if (hx !== 0 && hy !== 0) {
      // Corner: the opposite corner stays put.
      const ax = hx > 0 ? s.x : s.x + s.w;
      const ay = hy > 0 ? s.y : s.y + s.h;
      const px = ax + (hx > 0 ? s.w : -s.w) + dx;
      const py = ay + (hy > 0 ? s.h : -s.h) + dy;
      const room = Math.min(hx > 0 ? 1 - ax : ax, (hy > 0 ? 1 - ay : ay) * wPerH);
      w = clamp(Math.max(Math.abs(px - ax), Math.abs(py - ay) * wPerH), MIN_W, Math.min(room, maxWidthFor(ratio)));
      const h = heightFor(w, ratio);
      x = hx > 0 ? ax : ax - w;
      y = hy > 0 ? ay : ay - h;
    } else if (hx !== 0) {
      // Left / right edge: the other edge stays put, the box grows around its middle.
      const ax = hx > 0 ? s.x : s.x + s.w;
      const px = ax + (hx > 0 ? s.w : -s.w) + dx;
      w = clamp(Math.abs(px - ax), MIN_W, Math.min(hx > 0 ? 1 - ax : ax, maxWidthFor(ratio)));
      const h = heightFor(w, ratio);
      x = hx > 0 ? ax : ax - w;
      y = clamp(s.y + s.h / 2 - h / 2, 0, 1 - h);
    } else {
      // Top / bottom edge.
      const ay = hy > 0 ? s.y : s.y + s.h;
      const py = ay + (hy > 0 ? s.h : -s.h) + dy;
      const h = clamp(Math.abs(py - ay), MIN_W / wPerH, Math.min(hy > 0 ? 1 - ay : ay, hMax));
      w = h * wPerH;
      x = clamp(s.x + s.w / 2 - w / 2, 0, 1 - w);
      y = hy > 0 ? ay : ay - h;
    }
    const h = heightFor(w, ratio);
    setBox({ x: clamp(x, 0, 1 - w), y: clamp(y, 0, 1 - h), w, h });
  };

  const endDrag = () => {
    drag.current = null;
  };

  const handleSize = 16;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Frame your campaign dialog" maxWidth="max-w-3xl">
      <div className="px-6 pb-5 pt-1">
        <p className="text-sm text-neutral-500">
          Drag the box over the part you want to show. It stays at {POPUP_SHAPES.find((s) => s.id === shape)?.ratio} so the storefront shows exactly this, nothing more gets cut off.
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {POPUP_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pickShape(s.id)}
              aria-pressed={shape === s.id}
              className={`h-8 rounded-full border px-3 text-[13px] transition-colors ${
                shape === s.id ? 'border-brand bg-brand-lime/60 font-medium text-regantify-text' : 'border-line text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {s.label} <span className="text-neutral-500">{s.ratio}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex min-h-[200px] items-center justify-center rounded-lg bg-neutral-100 p-4">
          {failed ? (
            <p className="text-sm text-red-600">Couldn’t load this picture. Close this and try uploading it again.</p>
          ) : !view || !box ? (
            <Loader2 size={22} className="animate-spin text-neutral-400" aria-label="Loading picture" />
          ) : (
            <div
              ref={stageRef}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{ position: 'relative', width: view.w, height: view.h, touchAction: 'none', userSelect: 'none', overflow: 'hidden' }}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={imageUrl} draggable={false} style={{ width: '100%', height: '100%', display: 'block' }} />
              <div
                onPointerDown={(e) => onPointerDown(e, 'move')}
                style={{
                  position: 'absolute',
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                  border: '2px solid #fff',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  cursor: 'move',
                  boxSizing: 'border-box',
                }}
              >
                {HANDLES.map((h) => (
                  <span
                    key={`${h.hx}${h.hy}`}
                    onPointerDown={(e) => onPointerDown(e, 'resize', h)}
                    style={{
                      position: 'absolute',
                      left: `calc(${(h.hx + 1) * 50}% - ${handleSize / 2}px)`,
                      top: `calc(${(h.hy + 1) * 50}% - ${handleSize / 2}px)`,
                      width: handleSize,
                      height: handleSize,
                      borderRadius: 999,
                      background: '#4F46E5',
                      border: '2px solid #fff',
                      cursor: h.hx !== 0 && h.hy !== 0 ? (h.hx === h.hy ? 'nwse-resize' : 'nesw-resize') : h.hx !== 0 ? 'ew-resize' : 'ns-resize',
                      boxSizing: 'border-box',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={() => size && setBox(biggestBox(ratio))} className={outlineBtn} disabled={!size}>
            <RotateCcw size={14} aria-hidden />
            Reset
          </button>
          <button type="button" onClick={onClose} className={outlineBtn}>
            Cancel
          </button>
          <button type="button" disabled={!box} onClick={() => box && onApply(shape, box)} className={primaryBtn}>
            Use this box
          </button>
        </div>
      </div>
    </Dialog>
  );
}
