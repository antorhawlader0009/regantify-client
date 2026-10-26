import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Eraser, Eye, FileImage, HardDrive, Info, Maximize2, Pencil, UploadCloud, X } from 'lucide-react';
import { mediaApi } from '../../lib/mediaApi';
import { productsApi } from '../../lib/productsApi';
import { apiErrorMessage } from '../../lib/api';
import { imageThumb } from '../../lib/imageThumb';

/**
 * Photo tools shared by Add / Edit Product (main photos and variation photos):
 * - PhotoHoverActions: a frosted-glass capsule with two icons (preview, change) over a photo on hover or keyboard focus.
 * - PhotoLightbox: the photo full screen, with arrows through the others.
 * - PhotoPickerDialog: upload new photos or pick from the store's Media library, one (Change) or several (Add).
 * Uploads go through the product photo upload, so they land in the Media library and count toward the plan's photos.
 */

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_MB = 8;
const PAGE_SIZE = 24;

// ------------------------------------------------------------------ hover actions

export function PhotoHoverActions({
  onPreview,
  onChange,
  onCleanBackground,
  size = 'md',
}: {
  onPreview: () => void;
  onChange: () => void;
  /** Optional third button: clean the background (RemoveBackgroundDialog). */
  onCleanBackground?: () => void;
  /** sm = a small tile (variation photos): the two icons side by side. */
  size?: 'md' | 'sm';
}) {
  const sm = size === 'sm';
  const btn = `flex ${sm ? 'h-6 w-6' : 'h-9 w-9'} items-center justify-center rounded-full text-white transition-colors hover:bg-white/25 focus-visible:bg-white/25 focus-visible:outline-none`;
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition duration-150
        group-hover:bg-black/15 group-hover:opacity-100 group-focus-within:bg-black/15 group-focus-within:opacity-100
        [@media(hover:none)]:opacity-100 [@media(hover:none)]:bg-transparent"
    >
      <div
        className={`pointer-events-auto flex ${sm ? 'flex-row p-0.5' : 'flex-col gap-0.5 p-1'} items-center rounded-full border border-white/40 bg-white/15
          shadow-[0_6px_20px_rgba(0,0,0,0.25)] backdrop-blur-md backdrop-saturate-150`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          aria-label="Preview photo"
          title="Preview"
          className={btn}
        >
          <Eye size={sm ? 12 : 16} strokeWidth={2.2} />
        </button>
        <span className={sm ? 'h-3 w-px bg-white/35' : 'h-px w-5 bg-white/35'} aria-hidden />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange();
          }}
          aria-label="Change photo"
          title="Change"
          className={btn}
        >
          <Pencil size={sm ? 11 : 15} strokeWidth={2.2} />
        </button>
        {onCleanBackground && (
          <>
            <span className={sm ? 'h-3 w-px bg-white/35' : 'h-px w-5 bg-white/35'} aria-hidden />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCleanBackground();
              }}
              aria-label="Clean background"
              title="Clean background"
              className={btn}
            >
              <Eraser size={sm ? 11 : 15} strokeWidth={2.2} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ lightbox

export function PhotoLightbox({
  urls,
  index,
  onIndexChange,
  onClose,
  onChange,
}: {
  urls: string[];
  /** Null = closed. */
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** Opens the picker for the photo on screen. */
  onChange?: (i: number) => void;
}) {
  const open = index !== null && urls.length > 0;
  const i = Math.min(index ?? 0, Math.max(urls.length - 1, 0));
  const many = urls.length > 1;

  useEffect(() => {
    if (!open || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndexChange((i + 1) % urls.length);
      if (e.key === 'ArrowLeft') onIndexChange((i - 1 + urls.length) % urls.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, many, i, urls.length, onIndexChange]);

  const glass =
    'flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

  return (
    <RadixDialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[60] bg-neutral-950/90 backdrop-blur-sm" />
        <RadixDialog.Content className="fixed inset-0 z-[61] flex flex-col focus:outline-none" aria-describedby={undefined}>
          <RadixDialog.Title className="sr-only">Photo preview</RadixDialog.Title>
          <div className="flex items-center justify-between px-4 pt-4 sm:px-6">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium tabular-nums text-white/85 backdrop-blur-md">
              {i + 1} / {urls.length}
            </span>
            <div className="flex items-center gap-2">
              {onChange && (
                <button type="button" onClick={() => onChange(i)} aria-label="Change this photo" title="Change" className={glass}>
                  <Pencil size={17} />
                </button>
              )}
              <a href={urls[i]} target="_blank" rel="noopener noreferrer" aria-label="Open full size" title="Full size" className={glass}>
                <Maximize2 size={17} />
              </a>
              <RadixDialog.Close aria-label="Close" title="Close" className={glass}>
                <X size={19} />
              </RadixDialog.Close>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-20" onClick={onClose}>
            {open && (
              <img
                key={urls[i]}
                src={urls[i]}
                alt=""
                onClick={(e) => e.stopPropagation()}
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              />
            )}
            {many && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onIndexChange((i - 1 + urls.length) % urls.length);
                  }}
                  aria-label="Previous photo"
                  className={`${glass} absolute left-3 sm:left-6`}
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onIndexChange((i + 1) % urls.length);
                  }}
                  aria-label="Next photo"
                  className={`${glass} absolute right-3 sm:right-6`}
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
          {many && (
            <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-5">
              {urls.map((u, k) => (
                <button
                  key={`${u}-${k}`}
                  type="button"
                  onClick={() => onIndexChange(k)}
                  aria-label={`Photo ${k + 1}`}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-md transition ${
                    k === i ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-90'
                  }`}
                >
                  <img src={imageThumb(u, 120)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// ------------------------------------------------------------------ picker

interface Uploading {
  id: string;
  previewUrl: string;
  error?: string;
}

export function PhotoPickerDialog({
  open,
  onOpenChange,
  mode,
  title,
  photoSize = 'SQUARE',
  current,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** SINGLE = Change one photo; MULTI = Add photos. */
  mode: 'SINGLE' | 'MULTI';
  title?: string;
  photoSize?: 'SQUARE' | 'PORTRAIT';
  /** The photo being changed (marked "In use"), or the product's photos (Add): shown as already in the product. */
  current?: string[];
  onPick: (urls: string[]) => void;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [uploads, setUploads] = useState<Uploading[]>([]);
  const [fresh, setFresh] = useState<string[]>([]);
  const [fileOver, setFileOver] = useState(false);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setUploads([]);
    setFresh([]);
    setShowTips(false);
  }, [open]);

  const media = useInfiniteQuery({
    queryKey: ['media-picker'],
    queryFn: ({ pageParam }) => mediaApi.list({ type: 'image', page: pageParam, perPage: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.perPage < last.total ? last.page + 1 : undefined),
    enabled: open,
  });

  // Photos uploaded in this dialog first, then the library (newest first), without repeats.
  const urls = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of [...fresh, ...(media.data?.pages.flatMap((p) => p.items.map((m) => m.url)) ?? [])]) {
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
    return out;
  }, [fresh, media.data]);

  const inUse = new Set(current ?? []);

  const toggle = (url: string) => {
    setSelected((prev) => {
      if (mode === 'SINGLE') return prev[0] === url ? [] : [url];
      return prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url];
    });
  };

  const uploadFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => /^image\/(jpe?g|png|webp|gif)$/.test(f.type));
    const picked = mode === 'SINGLE' ? list.slice(0, 1) : list;
    for (const file of picked) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (file.size > MAX_MB * 1024 * 1024) {
        setUploads((u) => [...u, { id, previewUrl: URL.createObjectURL(file), error: `Over ${MAX_MB} MB` }]);
        continue;
      }
      setUploads((u) => [...u, { id, previewUrl: URL.createObjectURL(file) }]);
      productsApi
        .uploadPhoto(file)
        .then(({ url }) => {
          setUploads((u) => u.filter((x) => x.id !== id));
          setFresh((f) => [url, ...f]);
          setSelected((s) => (mode === 'SINGLE' ? [url] : [...s, url]));
          queryClient.invalidateQueries({ queryKey: ['media'] });
        })
        .catch((err) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, error: apiErrorMessage(err, 'Upload failed') } : x))));
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setFileOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const busy = uploads.some((u) => !u.error);
  const confirmLabel =
    mode === 'SINGLE' ? 'Use this photo' : selected.length > 1 ? `Add ${selected.length} photos` : 'Add photo';

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl focus:outline-none"
        >
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4 sm:px-6">
            <RadixDialog.Title className="text-[16px] font-semibold text-regantify-text">
              {title ?? (mode === 'SINGLE' ? 'Change photo' : 'Add photos')}
            </RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text"
            >
              <X size={17} />
            </RadixDialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                if (!Array.from(e.dataTransfer.types).includes('Files')) return;
                e.preventDefault();
                setFileOver(true);
              }}
              onDragLeave={() => setFileOver(false)}
              onDrop={onDrop}
              className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                fileOver ? 'border-brand bg-brand/5' : 'border-neutral-300 bg-neutral-50/70 hover:border-brand/60 hover:bg-brand/[0.03]'
              }`}
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${fileOver ? 'bg-brand text-white' : 'bg-brand/10 text-brand'}`}>
                <UploadCloud size={20} />
              </span>
              <span className="text-sm font-semibold text-regantify-text">
                {fileOver ? 'Drop to upload' : mode === 'SINGLE' ? 'Drop a photo here or click to choose' : 'Drop photos here or click to choose'}
              </span>
              <span className="mt-1 flex flex-wrap justify-center gap-1.5">
                <Chip icon={<FileImage size={12} />} text="JPG, PNG, WEBP, GIF" />
                <Chip icon={<HardDrive size={12} />} text={`Up to ${MAX_MB} MB each`} />
                <Chip icon={<Maximize2 size={12} />} text={photoSize === 'SQUARE' ? 'Best 800 × 800 px' : 'Best 800 × 1200 px'} />
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple={mode === 'MULTI'}
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) uploadFiles(e.target.files);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => setShowTips((v) => !v)}
              aria-expanded={showTips}
              className="mx-auto mt-2 flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              <Info size={13} /> Photo tips
            </button>
            {showTips && (
              <ul className="mt-2 space-y-1 rounded-lg bg-neutral-50 px-4 py-3 text-xs text-regantify-text-muted">
                <li>Use the same shape for every photo of a product, so the store grid lines up.</li>
                <li>Plain, light background; the product fills most of the frame.</li>
                <li>Daylight or soft light. Avoid heavy filters: shoppers want the real colour.</li>
                <li>Show the front first, then the back, details, and the product in use.</li>
              </ul>
            )}

            <div className="mb-2 mt-5 flex items-baseline justify-between">
              <p className="text-sm font-semibold text-regantify-text">Your photos</p>
              {media.data && <p className="text-xs text-regantify-text-muted">{media.data.pages[0]?.total ?? 0} in Media</p>}
            </div>

            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {uploads.map((u) => (
                <li key={u.id} className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
                  <img src={u.previewUrl} alt="" className="h-full w-full object-cover opacity-60" />
                  <div className={`absolute inset-0 flex items-center justify-center ${u.error ? 'bg-red-600/75' : 'bg-black/30'}`}>
                    {u.error ? (
                      <span className="px-1 text-center text-[11px] font-medium text-white">{u.error}</span>
                    ) : (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                  </div>
                </li>
              ))}
              {urls.map((url) => {
                const order = selected.indexOf(url);
                const isSel = order >= 0;
                return (
                  <li key={url}>
                    <button
                      type="button"
                      onClick={() => toggle(url)}
                      aria-pressed={isSel}
                      className={`group relative block aspect-square w-full overflow-hidden rounded-lg bg-neutral-100 outline-none transition
                        focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                          isSel ? 'ring-[3px] ring-brand ring-offset-2' : 'hover:brightness-95'
                        }`}
                    >
                      <img src={imageThumb(url, 240)} alt="" loading="lazy" className={`h-full w-full object-cover transition-transform duration-200 ${isSel ? 'scale-[0.94] rounded-md' : ''}`} />
                      {inUse.has(url) && !isSel && (
                        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-medium text-white backdrop-blur">
                          In use
                        </span>
                      )}
                      <span
                        className={`absolute right-1.5 top-1.5 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-[11px] font-bold transition ${
                          isSel ? 'bg-brand text-white shadow' : 'border border-white/80 bg-black/20 text-transparent opacity-0 group-hover:opacity-100'
                        }`}
                        aria-hidden
                      >
                        {isSel ? mode === 'MULTI' ? order + 1 : <Check size={13} strokeWidth={3} /> : '0'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {media.isLoading && (
              <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: 10 }).map((_, k) => (
                  <li key={k} className="aspect-square animate-pulse rounded-lg bg-neutral-100" />
                ))}
              </ul>
            )}
            {media.isError && <p className="mt-3 text-sm text-red-600">Could not load your photos. Close and open this again.</p>}
            {!media.isLoading && urls.length === 0 && uploads.length === 0 && (
              <p className="mt-2 rounded-lg bg-neutral-50 px-4 py-6 text-center text-sm text-regantify-text-muted">
                No photos in your Media yet. Upload one above.
              </p>
            )}
            {media.hasNextPage && (
              <button
                type="button"
                onClick={() => media.fetchNextPage()}
                disabled={media.isFetchingNextPage}
                className="mx-auto mt-4 block rounded-lg border border-line px-4 py-2 text-sm font-medium text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
              >
                {media.isFetchingNextPage ? 'Loading…' : 'Show more photos'}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line bg-neutral-50/60 px-5 py-3 sm:px-6">
            <p className="text-xs text-regantify-text-muted">
              {busy ? 'Uploading…' : selected.length === 0 ? (mode === 'SINGLE' ? 'Pick a photo' : 'Pick one or more photos') : `${selected.length} selected`}
            </p>
            <div className="flex gap-2">
              <RadixDialog.Close className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-regantify-text hover:bg-neutral-50">
                Cancel
              </RadixDialog.Close>
              <button
                type="button"
                disabled={selected.length === 0 || busy}
                onClick={() => {
                  onPick(selected);
                  onOpenChange(false);
                }}
                className="rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function Chip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] font-medium text-regantify-text-muted">
      {icon}
      {text}
    </span>
  );
}
