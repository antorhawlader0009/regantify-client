import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Camera, ChevronDown, Eye, EyeOff, GripVertical, Plus, Star, UploadCloud, X } from 'lucide-react';
import { productInputClass } from './ProductFormPieces';

// Pieces shared by Add Product and Edit Product (theme-update-plan.md
// Step 2), so both forms get the same photos, price, status, search
// listing and save bar.

// ------------------------------------------------------------------ small

/** Round "+" button next to a select, to create a missing category / brand without leaving the form. */
export function QuickAddButton({ title, disabled, onClick }: { title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Plus size={15} />
    </button>
  );
}

/** Two or three choices as one segmented control (instead of radio buttons). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-lg border border-line bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-8 rounded-md px-3 text-sm transition-colors ${
            value === o.id ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** An on/off switch with a label and one line of help. */
export function ToggleRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-regantify-text">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-neutral-500">{hint}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-6 w-10 rounded-full bg-neutral-200 transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

/** A ৳ amount input. */
export function MoneyInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-500">৳</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        min={0}
        max={10000000}
        className={`${productInputClass} pl-7`}
      />
    </div>
  );
}

// ------------------------------------------------------------------ photos

export interface PhotoItem {
  id: string;
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * Product photos: drop files on the box or pick them, drag a photo to
 * reorder (the first one is the cover shoppers see first), "Make cover"
 * on any other photo, remove with ×. Photo size is a segmented control.
 */
export function PhotoManager<P extends PhotoItem>({
  photos,
  onFiles,
  onRemove,
  onReorder,
  photoSize,
  onPhotoSizeChange,
}: {
  photos: P[];
  onFiles: (files: FileList) => void;
  onRemove: (id: string) => void;
  /** Move the photo at `from` to `to`. */
  onReorder: (from: number, to: number) => void;
  photoSize: 'SQUARE' | 'PORTRAIT';
  onPhotoSizeChange: (size: 'SQUARE' | 'PORTRAIT') => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [fileOver, setFileOver] = useState(false);

  const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  const onDropZone = (e: DragEvent) => {
    e.preventDefault();
    setFileOver(false);
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          ariaLabel="Photo shape"
          options={[
            { id: 'SQUARE', label: 'Square' },
            { id: 'PORTRAIT', label: 'Portrait' },
          ]}
          value={photoSize}
          onChange={onPhotoSizeChange}
        />
        <p className="text-xs text-neutral-500">
          Best size: {photoSize === 'SQUARE' ? '800 × 800 px' : '800 × 1200 px'}. JPG, PNG, WEBP or GIF.
        </p>
      </div>

      {photos.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {photos.map((photo, i) => (
              <li
                key={photo.id}
                draggable
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== i) onReorder(dragIndex, i);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={`group relative aspect-square cursor-grab overflow-hidden rounded-lg border bg-neutral-100 active:cursor-grabbing ${
                  overIndex === i && dragIndex !== i ? 'border-brand ring-2 ring-brand/30' : 'border-line'
                } ${dragIndex === i ? 'opacity-50' : ''}`}
              >
                <img src={photo.uploadedUrl || photo.previewUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-brand px-1.5 py-0.5 text-[11px] font-medium text-white">
                    <Star size={10} aria-hidden />
                    Cover
                  </span>
                )}
                <GripVertical
                  size={14}
                  className="absolute bottom-1.5 left-1.5 rounded bg-white/90 text-neutral-600 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
                {photo.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
                {photo.error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-600/75 px-1 text-center text-xs text-white">{photo.error}</div>
                )}
                {i > 0 && !photo.uploading && !photo.error && (
                  <button
                    type="button"
                    onClick={() => onReorder(i, 0)}
                    className="absolute bottom-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-regantify-text opacity-0 transition-opacity hover:bg-white focus:opacity-100 group-hover:opacity-100"
                  >
                    Make cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(photo.id)}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
          {photos.length > 1 && <p className="text-xs text-neutral-500">Drag photos to change the order. The first one is the cover.</p>}
        </>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          if (!isFileDrag(e)) return;
          e.preventDefault();
          setFileOver(true);
        }}
        onDragLeave={() => setFileOver(false)}
        onDrop={onDropZone}
        className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 text-center transition-colors ${
          photos.length > 0 ? 'py-6' : 'py-12'
        } ${fileOver ? 'border-brand bg-brand-lime/20' : 'border-neutral-300 bg-neutral-50 hover:border-neutral-400'}`}
      >
        {photos.length > 0 ? <Camera size={20} className="text-neutral-500" /> : <UploadCloud size={26} className="text-neutral-500" />}
        <span className="text-sm font-medium text-regantify-text">{photos.length > 0 ? 'Add more photos' : 'Upload photos'}</span>
        <span className="text-xs text-neutral-500">Drag and drop here, or click to choose</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}

/** Move one item of an array (for photo reordering). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ------------------------------------------------------------------ price

/**
 * Price, sale price and cost. The sale price shows its discount live
 * ("20% off") and the cost shows the profit per sale, so the vendor sees
 * the result of the numbers they type.
 */
export function PriceFields({
  price,
  onPrice,
  discountPrice,
  onDiscountPrice,
  cost,
  onCost,
  priceError,
}: {
  price: string;
  onPrice: (v: string) => void;
  discountPrice: string;
  onDiscountPrice: (v: string) => void;
  cost: string;
  onCost: (v: string) => void;
  priceError?: string | null;
}) {
  const p = Number(price);
  const d = Number(discountPrice);
  const c = Number(cost);
  const hasPrice = price.toString().trim() !== '' && p > 0;
  const hasDiscount = discountPrice.toString().trim() !== '' && d > 0;
  const selling = hasDiscount ? d : p;

  let discountNote: ReactNode = 'Leave empty if the product isn’t on sale.';
  if (hasPrice && hasDiscount) {
    discountNote =
      d >= p ? (
        <span className="text-red-600">The sale price should be lower than the price.</span>
      ) : (
        <span className="font-medium text-emerald-700">{Math.round(((p - d) / p) * 100)}% off · shoppers save ৳{(p - d).toLocaleString('en-US')}</span>
      );
  }

  let costNote: ReactNode = 'Only you see this. It’s used for the profit in your reports.';
  if (cost.toString().trim() !== '' && hasPrice) {
    const profit = selling - c;
    costNote = (
      <span className={profit < 0 ? 'text-red-600' : 'text-neutral-600'}>
        Profit per sale: <strong className="font-semibold">৳{profit.toLocaleString('en-US')}</strong>
        {selling > 0 && ` (${Math.round((profit / selling) * 100)}%)`}. Only you see the cost.
      </span>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-regantify-text">
          Price <span className="text-red-500" aria-hidden>*</span>
        </label>
        <div className={priceError ? '[&_input]:border-red-400' : undefined}>
          <MoneyInput value={price} onChange={onPrice} placeholder="0" ariaLabel="Price" />
        </div>
        <p className={`mt-1.5 text-xs ${priceError ? 'text-red-600' : 'text-neutral-500'}`}>{priceError ?? 'What shoppers pay.'}</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-regantify-text">Sale price</label>
        <MoneyInput value={discountPrice} onChange={onDiscountPrice} placeholder="Optional" ariaLabel="Sale price" />
        <p className="mt-1.5 text-xs text-neutral-500">{discountNote}</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-regantify-text">Cost</label>
        <MoneyInput value={cost} onChange={onCost} placeholder="Optional" ariaLabel="Cost" />
        <p className="mt-1.5 text-xs text-neutral-500">{costNote}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ side cards

function SideCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-regantify-text">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export { SideCard as ProductSideCard };

/** Public / Draft, with what each means. */
export function StatusCard({ visibility, onChange }: { visibility: 'PUBLIC' | 'DRAFT'; onChange: (v: 'PUBLIC' | 'DRAFT') => void }) {
  return (
    <SideCard title="Status">
      <Segmented
        ariaLabel="Product status"
        options={[
          { id: 'PUBLIC', label: 'Public' },
          { id: 'DRAFT', label: 'Draft' },
        ]}
        value={visibility}
        onChange={onChange}
      />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
        {visibility === 'PUBLIC' ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />}
        {visibility === 'PUBLIC' ? 'Shoppers can see and buy this product.' : 'Hidden from your store until you make it public.'}
      </p>
    </SideCard>
  );
}

/**
 * How the product shows up in Google: a preview always visible, the
 * three fields folded away until "Edit" (most vendors never need them;
 * the product name fills in by default).
 */
export function SearchListingCard({
  storeName,
  urlBase,
  displaySlug,
  name,
  metaTitle,
  onMetaTitle,
  metaDescription,
  onMetaDescription,
  slug,
  onSlug,
  slugPlaceholder,
  descriptionFallback,
}: {
  storeName: string;
  /** e.g. "localhost:3000/store/antor" */
  urlBase: string;
  displaySlug: string;
  name: string;
  metaTitle: string;
  onMetaTitle: (v: string) => void;
  metaDescription: string;
  onMetaDescription: (v: string) => void;
  slug: string;
  onSlug: (v: string) => void;
  slugPlaceholder: string;
  /** Plain text of the description, shown in the preview when no meta description is set. */
  descriptionFallback: string;
}) {
  const [open, setOpen] = useState(false);
  const title = metaTitle.trim() || name.trim() || 'Your product name';
  const snippet = metaDescription.trim() || descriptionFallback.trim() || 'Add a short description so shoppers know what this product is.';

  return (
    <SideCard
      title="Search engine listing"
      action={
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          {open ? 'Done' : 'Edit'}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      }
    >
      {/* Google-style preview */}
      <div className="rounded-lg border border-line bg-neutral-50 p-3">
        <p className="truncate text-xs text-neutral-600">{storeName}</p>
        <p className="truncate text-[11px] text-neutral-500">
          {urlBase}/product/{displaySlug}
        </p>
        <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-[#1a0dab]">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-neutral-600">{snippet}</p>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">Page title</label>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => onMetaTitle(e.target.value.slice(0, 70))}
              placeholder={name || 'Page title'}
              maxLength={70}
              className={productInputClass}
            />
            <p className="mt-1 text-xs text-neutral-500">{metaTitle.length} of 70 characters</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">Meta description</label>
            <textarea
              value={metaDescription}
              onChange={(e) => onMetaDescription(e.target.value.slice(0, 160))}
              rows={3}
              maxLength={160}
              className={`${productInputClass} resize-y`}
            />
            <p className="mt-1 text-xs text-neutral-500">{metaDescription.length} of 160 characters</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-regantify-text">Web address</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-500">product/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => onSlug(e.target.value)}
                placeholder={slugPlaceholder}
                maxLength={200}
                className={`${productInputClass} pl-[4.4rem]`}
              />
            </div>
          </div>
        </div>
      )}
    </SideCard>
  );
}

// ------------------------------------------------------------------ unsaved work

/** Browser warning on reload / close while the form has unsaved changes. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
}

/** Plain text of an HTML description, for the search preview. */
export function htmlToText(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------------ save bar

/**
 * Stays at the bottom of the screen while the form scrolls, so Save is
 * always one tap away (long forms, phones). `message` says what state
 * the form is in.
 */
export function SaveBar({ message, children }: { message?: ReactNode; children: ReactNode }) {
  return (
    <div className="sticky bottom-3 z-20 mt-4 rounded-xl border border-line bg-white/95 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {message && <div className="mr-auto min-w-0 text-sm text-neutral-600">{message}</div>}
        {children}
      </div>
    </div>
  );
}
