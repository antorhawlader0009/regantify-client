import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { mediaApi } from '../../lib/mediaApi';
import { toast } from '../../lib/toast';

interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

/**
 * Image input for the landing page builder's section forms: either
 * upload a new file or pick one already in the vendor's Media library
 * (landing-plan.md §4.3 - reuse the existing media flow rather than
 * inventing a second upload UI). Styled for the builder's dark panel,
 * unlike the light-theme upload controls elsewhere in the dashboard.
 */
export function ImageField({ value, onChange, label }: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // The picked picture's real size: under 600 px wide it looks blurry on a phone (shoppers zoom product photos), so say so.
  const [size, setSize] = useState<{ url: string; w: number; h: number } | null>(null);
  const small = size && size.url === value && size.w < 600 ? size : null;

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await mediaApi.upload(file);
      onChange(url);
    } catch {
      toast.error('Could not upload that image. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      {label && <span className="mb-1.5 block text-[11px] font-medium text-neutral-500">{label}</span>}

      {value ? (
        <div className="group relative overflow-hidden rounded-lg border border-line">
          {/* Whole picture, as the published page shows it (never cropped there). */}
          <img
            src={value}
            alt=""
            className="h-28 w-full bg-neutral-50 object-contain"
            onLoad={(e) => setSize({ url: value, w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
          <button
            onClick={() => onChange('')}
            className="absolute right-1.5 top-1.5 rounded-md bg-black/60 p-1.5 text-neutral-700 opacity-0
              transition-opacity hover:bg-black/80 group-hover:opacity-100"
            aria-label="Remove image"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed
              border-neutral-300 py-3 text-[12px] text-neutral-500 transition-colors hover:border-neutral-400
              hover:text-regantify-text disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <button
            onClick={() => setLibraryOpen(true)}
            className="rounded-lg border border-line px-3 text-[12px] text-neutral-500
              transition-colors hover:border-neutral-300 hover:text-regantify-text"
          >
            Library
          </button>
        </div>
      )}

      {small && (
        <p className="mt-1.5 rounded-md bg-red-600 px-2 py-1.5 text-[11.5px] text-white">
          This photo is small ({small.w} x {small.h} px) and will look blurry on phones. Use one at least 800 px wide.
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {libraryOpen && (
        <MediaLibraryPicker
          onClose={() => setLibraryOpen(false)}
          onPick={(url) => {
            onChange(url);
            setLibraryOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MediaLibraryPicker({ onClose, onPick }: { onClose: () => void; onPick: (url: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['media', 'picker'],
    queryFn: () => mediaApi.list({ type: 'image', perPage: 60 }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-line bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-[14px] font-semibold text-regantify-text">Media Library</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-regantify-text" aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[calc(80vh-56px)] overflow-y-auto p-4">
          {isLoading && <p className="py-10 text-center text-[13px] text-neutral-400">Loading…</p>}
          {!isLoading && (data?.items.length ?? 0) === 0 && (
            <p className="py-10 text-center text-[13px] text-neutral-400">
              Nothing in your media library yet - upload an image instead.
            </p>
          )}
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
            {data?.items.map((asset) => (
              <button
                key={asset.id}
                onClick={() => onPick(asset.url)}
                className="overflow-hidden rounded-lg border border-line transition-colors hover:border-violet-400"
              >
                <img src={asset.url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
